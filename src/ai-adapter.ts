// src/ai-adapter.ts
import { SayFn } from '@slack/bolt';
import { runCommandStream } from './command.js';
import { ReadableStream } from 'node:stream/web';

export interface AIProvider {
  generatePlan(prompt: string, cwd: string, say: SayFn, threadTs: string): Promise<string>;
  executePlan(plan: string, cwd: string, say: SayFn, threadTs: string): Promise<void>;
}

class QwenAIProvider implements AIProvider {
  // This is our generic streaming function that handles the core logic
  private async streamOutputToSlack(
    command: string,
    args: string[],
    options: { cwd: string; input?: string },
    say: SayFn,
    threadTs: string,
    prefix: string = '', // Optional prefix for messages
  ): Promise<string> {
    // 1. Get the child process object from our command runner
    const subprocess = runCommandStream(command, args, options);
    
    // 2. Convert the Node.js stdout stream to a Web ReadableStream using the native API
    //    Node.js Readable streams are async iterables, so this works directly.
    const webStream = ReadableStream.from(subprocess.stdout!);

    // 3. Process the stream chunk by chunk
    const reader = webStream.getReader();
    const decoder = new TextDecoder();
    let fullOutput = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break; // The stream has ended
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      // Split the buffer by newlines to send complete lines to Slack
      const lines = buffer.split('\n');
      if (lines.length > 1) {
        const linesToSend = lines.slice(0, -1).join('\n');
        if (linesToSend.trim()) {
          say({ text: `${prefix}${linesToSend}`, thread_ts: threadTs });
        }
        buffer = lines[lines.length - 1]; // Keep the remaining partial line
      }
      fullOutput += chunk;
    }
    
    // After the loop, send any final text left in the buffer
    if (buffer.trim()) {
      say({ text: `${prefix}${buffer}`, thread_ts: threadTs });
    }

    // Await the subprocess to ensure it has exited and to catch any potential errors
    await subprocess;
    return fullOutput;
  }

  async generatePlan(prompt: string, cwd: string, say: SayFn, threadTs: string): Promise<string> {
    const planningPrompt = `Based on the user request, create a detailed implementation plan. Do not execute any commands or modify any files; only output the plan. The user's request is:\n\n${prompt}`;
    
    await say({ text: '🧠 *Planning...*', thread_ts: threadTs });
    return this.streamOutputToSlack('qwen', [], { cwd, input: planningPrompt }, say, threadTs, '📝 ');
  }

  async executePlan(plan: string, cwd: string, say: SayFn, threadTs: string): Promise<void> {
    const executionPrompt = `Please execute the following plan:\n\n${plan}`;
    
    await say({ text: '⚙️ *Executing...*', thread_ts: threadTs });
    await this.streamOutputToSlack('qwen', ['-y'], { cwd, input: executionPrompt }, say, threadTs, '➡️ ');
  }
}

export const ai = new QwenAIProvider();