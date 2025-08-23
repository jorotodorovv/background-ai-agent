// src/ai-adapter.ts
import { runCommand } from './command.js';

export interface AIProvider {
  generatePlan(prompt: string, cwd: string): Promise<string>;
  executePlan(plan: string, cwd: string): Promise<void>;
}

class QwenAIProvider implements AIProvider {
  async generatePlan(prompt: string, cwd: string): Promise<string> {
    const planningPrompt = `Based on the user request, create a detailed implementation plan. Do not execute any commands or modify any files; only output the plan. The user's request is:\n\n "${prompt}"`;
    
    // The prompt is now a safe argument, not part of an interpreted string
    const { stdout } = await runCommand('qwen', ['-p', planningPrompt], { cwd });
    return stdout;
  }

  async executePlan(plan: string, cwd: string): Promise<void> {
    const executionPrompt = `Please execute the following plan:\n\n "${plan}"`;
    
    // The plan and the '-y' flag are passed as safe arguments
    await runCommand('qwen', ['-p', executionPrompt, '-y'], { cwd });
  }
}

export const ai = new QwenAIProvider();