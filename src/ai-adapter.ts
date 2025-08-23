import { runCommand } from './command.js';

export interface AIProvider {
  generatePlan(prompt: string, cwd: string): Promise<string>;
  executePlan(plan: string, cwd: string): Promise<void>;
}

class QwenAIProvider implements AIProvider {
  async generatePlan(prompt: string, cwd: string): Promise<string> {
    const planningPrompt = `Based on the user request, create a detailed implementation plan. Do not execute any commands or modify any files; only output the plan. The user\'s request is:\n\n \"${prompt}\"`;
    const { stdout } = await runCommand(`qwen -p "${planningPrompt}"`, { cwd });
    return stdout;
  }

  async executePlan(plan: string, cwd: string): Promise<void> {
    const executionPrompt = `Please execute the following plan:\n\n \"${plan}\"`;
    await runCommand(`qwen -p "${executionPrompt}" -y`, { cwd });
  }
}

export const aiProvider = new QwenAIProvider();