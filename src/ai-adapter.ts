// src/ai-adapter.ts
import { runCommand } from './command.js';

export interface AIProvider {
  generatePlan(prompt: string, cwd: string): Promise<string>;
  executePlan(plan: string, cwd: string): Promise<void>;
}

class QwenAIProvider implements AIProvider {
  async generatePlan(prompt: string, cwd: string): Promise<string> {
    const planningPrompt = `Based on the user request, create a detailed implementation plan. Do not execute any commands or modify any files; only output the plan. The user's request is:\n\n${prompt}`;
    
    // We now call 'qwen' with no arguments, but pass the prompt via the 'input' option.
    const { stdout } = await runCommand('qwen', [], { 
      cwd, 
      input: planningPrompt 
    });
    return stdout;
  }

  async executePlan(plan: string, cwd: string): Promise<void> {
    const executionPrompt = `Please execute the following plan:\n\n${plan}`;
    
    // We keep the '-y' argument, but pass the main prompt via 'input'.
    await runCommand('qwen', ['-y'], { 
      cwd, 
      input: executionPrompt 
    });
  }
}

export const ai = new QwenAIProvider();