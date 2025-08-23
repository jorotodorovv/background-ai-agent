// src/ai-adapter.ts
import { SayFn } from '@slack/bolt';
import { runCommand } from './command.js';

export interface AIProvider {
  generatePlan(prompt: string, cwd: string, say: SayFn, threadTs: string): Promise<string>;
  executePlan(plan: string, cwd: string, say: SayFn, threadTs: string): Promise<void>;
}

class QwenAIProvider implements AIProvider {
  async generatePlan(prompt: string, cwd: string, say: SayFn, threadTs: string): Promise<string> {
    const planningPrompt = `Based on the user request, create a detailed implementation plan. Do not execute any commands or modify any files; only output the plan. The user's request is:\n\n${prompt}`;
    
    // We pass an onStdout callback that sends each chunk of data to Slack
    const { stdout } = await runCommand('qwen', [], { 
      cwd, 
      input: planningPrompt,
      onStdout: (chunk) => {
        // Post each chunk of the plan as it's generated
        say({ text: chunk, thread_ts: threadTs });
      }
    });
    return stdout;
  }

  async executePlan(plan: string, cwd: string, say: SayFn, threadTs: string): Promise<void> {
    const executionPrompt = `Please execute the following plan:\n\n${plan}`;
    
    // We do the same for the execution step, streaming the AI's "actions"
    await runCommand('qwen', ['-y'], { 
      cwd, 
      input: executionPrompt,
      onStdout: (chunk) => {
        // Post each chunk of the execution output
        say({ text: chunk, thread_ts: threadTs });
      }
    });
  }
}

export const ai = new QwenAIProvider();