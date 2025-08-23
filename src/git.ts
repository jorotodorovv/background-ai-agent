import { runCommand } from './command.js';

export class Git {
  async clone(repoUrl: string, cwd: string): Promise<void> {
    await runCommand(`git clone ${repoUrl} .`, { cwd });
  }

  async branch(branchName: string, cwd: string): Promise<void> {
    await runCommand(`git checkout -b ${branchName}`, { cwd });
  }

  async add(cwd: string): Promise<void> {
    await runCommand('git add .', { cwd });
  }

  async status(cwd: string): Promise<string> {
    const { stdout } = await runCommand('git status --porcelain', { cwd });
    return stdout.trim();
  }

  async commit(message: string, cwd: string): Promise<void> {
    await runCommand(`git commit -m "${message}"`, { cwd });
  }

  async push(branchName: string, cwd: string): Promise<void> {
    await runCommand(`git push origin ${branchName}`, { cwd });
  }

  async createPullRequest(
    title: string,
    body: string,
    base: string,
    cwd: string,
  ): Promise<string> {
    const { stdout } = await runCommand(
      `gh pr create --title "${title}" --body "${body}" --base "${base}"`,
      { cwd },
    );
    return stdout.trim();
  }
}

export const git = new Git();