import { SayFn } from '@slack/bolt';
import { runCommand, runCommandStream } from './command.js';
import { ReadableStream } from 'node:stream/web';

// Define a structure for our expected metadata
export interface GitMetadata {
  commitMessage: string;
  prTitle: string;
  prBody: string;
}

export interface AIProvider {
  generateBranchName(prompt: string, cwd: string): Promise<string>;
  generateCommitInfo(prompt: string, diff: string, cwd: string): Promise<GitMetadata>;
  generatePlan(prompt: string, cwd: string): Promise<string>;
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

  async executePlan(plan: string, cwd: string, say: SayFn, threadTs: string): Promise<void> {
    // --- NEW PROMPT ENGINEERING ---
    // Instruct the AI to use a special prefix for all explanatory text.
    const executionPrompt = `
Please execute the following plan. You will run the necessary shell commands yourself.
When you are providing explanations, comments, or reasoning, you MUST prefix each line with the special marker "[REASONING]".
Any line that does not start with this marker will be considered internal command output and will be hidden from the user.

The plan is:
---
${plan}
---
`;

    const subprocess = runCommandStream('qwen', ['-y'], {
      cwd,
      input: executionPrompt,
    });

    const webStream = ReadableStream.from(subprocess.stdout!);
    const reader = webStream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // --- Watchdog and Timeout (unchanged) ---
    let lastOutput = Date.now();
    const watchdogInterval = setInterval(() => {
      if (Date.now() - lastOutput > 60000) {
        console.warn('⚠️ Qwen has been silent for >60s');
        say({ text: '⚠️ Qwen has been silent for over a minute, might be stuck.', thread_ts: threadTs });
      }
    }, 60000);

    const timeoutMs = 15 * 60 * 1000;
    const timeout = setTimeout(() => {
      console.error('⏰ Qwen execution timed out, killing process.');
      subprocess.kill('SIGKILL');
      say({ text: '⏰ Qwen execution timed out and was killed.', thread_ts: threadTs });
    }, timeoutMs);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        lastOutput = Date.now();

        const lines = buffer.split('\n');
        if (lines.length > 1) {
          const linesToProcess = lines.slice(0, -1);
          buffer = lines[lines.length - 1];

          for (const line of linesToProcess) {
            // --- NEW FILTERING LOGIC ---
            if (line.startsWith('[REASONING]')) {
              // This is an explanation. Clean it up and send it to Slack.
              const reasoningText = line.substring('[REASONING]'.length).trim();
              if (reasoningText) {
                say({ text: `➡️ ${reasoningText}`, thread_ts: threadTs });
              }
            } else {
              // This is internal command output. Log it for debugging but don't send to Slack.
              console.log('[Qwen Execution]:', line);
            }
          }
        }
      }

      // Process any final text left in the buffer
      if (buffer.trim().startsWith('[REASONING]')) {
        const reasoningText = buffer.substring('[REASONING]'.length).trim();
        if (reasoningText) {
          say({ text: `➡️ ${reasoningText}`, thread_ts: threadTs });
        }
      } else {
        console.log('[Qwen Execution]:', buffer);
      }

      await subprocess; // Wait for the main Qwen process to exit
    } finally {
      clearInterval(watchdogInterval);
      clearTimeout(timeout);
    }
  }

  async generateBranchName(prompt: string, cwd: string): Promise<string> {
    const branchPrompt = `Based on the following user request, generate a short, descriptive, git-compliant branch name (kebab-case, max 40 characters). User request: "${prompt}"\n\nOutput only the branch name and nothing else.`;
    const { stdout } = await runCommand('qwen', [], { cwd, input: branchPrompt });

    const lines = stdout.trim().split('\n').map(l => l.trim()).filter(Boolean);
    const lastLine = lines[lines.length - 1] || 'ai-agent-task';

    return lastLine
      .toLowerCase()
      .replace(/\s+/g, '-')       // spaces -> dashes
      .replace(/[^a-z0-9-]/g, ''); // remove invalid chars
  }

  async generateCommitInfo(prompt: string, diff: string, cwd: string): Promise<GitMetadata> {
    const metaPrompt = `
You are an expert software developer. Based on the original user request and the following code changes (git diff), generate the necessary metadata for a pull request.

Original Request:
---
${prompt}
---

Code Changes (diff):
---
${diff}
---

Provide the output in a single, raw JSON object. Do not include any other text, explanations, or markdown formatting. The JSON object should have the following keys:
- "commitMessage": A conventional commit message (e.g., "feat: add user authentication").
- "prTitle": A clear, concise title for the pull request.
- "prBody": A detailed description for the pull request body. Summarize the changes, explain the "why", and reference the original prompt. Use Markdown.
`;

    const { stdout } = await runCommand('qwen', [], { cwd, input: metaPrompt });

    try {
      // Find the JSON block in the AI's output
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("AI did not return a valid JSON object.");
      }
      return JSON.parse(jsonMatch[0]) as GitMetadata;
    } catch (error) {
      console.error("Failed to parse JSON from AI for git metadata:", error);
      // Fallback to a generic message if JSON parsing fails
      return {
        commitMessage: `feat: AI-driven changes for prompt: ${prompt.slice(0, 50)}...`,
        prTitle: `AI Agent: ${prompt}`,
        prBody: `This PR was automatically generated by the AI agent based on the prompt:\n\n> ${prompt}`,
      };
    }
  }
}

export const ai = new QwenAIProvider();