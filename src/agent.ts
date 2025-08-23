import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { SayFn } from '@slack/bolt';
import { createAIProvider, AIProviderConfig } from './ai-adapter.js';
import { git } from './git.js';

export async function runAgentTask(
  prompt: string,
  say: SayFn,
  threadTs: string,
): Promise<string> {
  const repoUrl = process.env.TARGET_REPO_URL;
  if (!repoUrl) {
    throw new Error('TARGET_REPO_URL environment variable is not set.');
  }

  // Create AI provider based on configuration
  const aiProviderConfig: AIProviderConfig = {
    provider: (process.env.AI_PROVIDER as 'qwen' | 'openai') || 'qwen',
    model: process.env.AI_MODEL,
    apiKey: process.env.OPENAI_API_KEY,
  };
  
  const ai = createAIProvider(aiProviderConfig);

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-agent-'));

  try {
    await git.clone(repoUrl, tempDir);
    await say({ text: '✅ Cloned repository successfully.', thread_ts: threadTs });

    // --- NEW: AI generates the branch name ---
    await say({ text: '💡 Thinking of a good branch name...', thread_ts: threadTs });
    const branchName = await ai.generateBranchName(prompt, tempDir);
    await git.branch(branchName, tempDir);
    await say({ text: `🌿 Created and checked out new branch: \`${branchName}\``, thread_ts: threadTs });

    // --- Plan and Execute (unchanged) ---
    await say({ text: '🤔 Generating an implementation plan...', thread_ts: threadTs });
    const plan = await ai.generatePlan(prompt, tempDir);
    await say({
      text: `🧠 Here's the plan:\n\`\`\`\n${plan}\n\`\`\`\nI will now proceed with the implementation.`,
      thread_ts: threadTs,
    });
    await say({ text: '🏗️ Implementing the plan...', thread_ts: threadTs });
    await ai.executePlan(plan, tempDir, say, threadTs);
    await say({ text: '📝 AI has finished. Staging changes...', thread_ts: threadTs });

    await git.add(tempDir);
    
    const changedFiles = await git.status(tempDir);
    if (!changedFiles) {
      return `Task complete for prompt: "*${prompt}*". The AI found no changes to make.`;
    }
    await say({ text: `📂 Changed files:\n\`\`\`\n${changedFiles}\n\`\`\`\n`, thread_ts: threadTs });

    // --- NEW: AI generates commit message and PR details ---
    await say({ text: '✍️ Generating commit message and PR details based on the code changes...', thread_ts: threadTs });
    const diff = await git.diff(tempDir);
    const metadata = await ai.generateCommitInfo(prompt, diff, tempDir);

    // --- Use the AI-generated metadata ---
    await say({ text: `Committing with message: "${metadata.commitMessage}"`, thread_ts: threadTs });
    await git.commit(metadata.commitMessage, tempDir);
    
    await say({ text: '🔗 Pushing branch to remote...', thread_ts: threadTs });
    await git.push(branchName, tempDir);

    await say({ text: '🔗 Creating Pull Request on GitHub...', thread_ts: threadTs });
    const prUrl = await git.createPullRequest(metadata.prTitle, metadata.prBody, 'main', tempDir);

    return `✅ Task complete! A pull request has been created: ${prUrl}`;
  } catch (error: any) {
    throw new Error(`Agent task failed: ${error.message || 'Unknown error occurred'}.`);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}