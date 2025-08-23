// src/ai-adapter.ts
import { SayFn } from '@slack/bolt';
// Import both command runners
import { runCommand, runCommandStream } from './command.js';
import { ReadableStream } from 'node:stream/web';

export interface AIProvider {
  generatePlan(prompt: string, cwd: string): Promise<string>; // No longer needs say/threadTs
  executePlan(plan: string, cwd: string, say: SayFn, threadTs: string): Promise<void>;
}

class QwenAIProvider implements AIProvider {
  /**
   * Generates the plan as a single, complete block of text.
   */
  async generatePlan(prompt: string, cwd: string): Promise<string> {
    const planningPrompt = `Based on the user request, create a detailed implementation plan. Do not execute any commands or modify any files; only output the plan. The user's request is:\n\n${prompt}`;
    
    // Use the buffered command runner to get the full plan at once.
    const { stdout } = await runCommand('qwen', [], { 
      cwd, 
      input: planningPrompt 
    });
    return stdout;
  }

  /**
   * Executes the plan and streams the output to Slack in real-time.
   */
  async executePlan(plan: string, cwd: string, say: SayFn, threadTs: string): Promise<void> {
    const executionPrompt = `Please execute the following plan:\n\n${plan}`;
    
    // Use the streaming command runner for live updates.
    const subprocess = runCommandStream('qwen', ['-y'], { 
      cwd, 
      input: executionPrompt 
    });

    const webStream = ReadableStream.from(subprocess.stdout!);
    const reader = webStream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      const lines = buffer.split('\n');
      if (lines.length > 1) {
        const linesToSend = lines.slice(0, -1).join('\n');
        if (linesToSend.trim()) {
          say({ text: `➡️ ${linesToSend}`, thread_ts: threadTs });
        }
        buffer = lines[lines.length - 1];
      }
    }
    
    if (buffer.trim()) {
      say({ text: `➡️ ${buffer}`, thread_ts: threadTs });
    }

    // Await the process to ensure it completes successfully.
    await subprocess;
  }
}

export const ai = new QwenAIProvider();