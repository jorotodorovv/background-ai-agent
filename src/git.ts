// src/git.ts
import { runCommand } from './command';

export class Git {
  async clone(repoUrl: string, cwd: string): Promise<void> {
    await runCommand('git', ['clone', repoUrl, '.'], { cwd });
  }

  async branch(branchName: string, cwd: string): Promise<void> {
    await runCommand('git', ['checkout', '-b', branchName], { cwd });
  }

  async add(cwd: string): Promise<void> {
    await runCommand('git', ['add', '.'], { cwd });
  }

  async status(cwd: string): Promise<string> {
    const { stdout } = await runCommand('git', ['status', '--porcelain'], { cwd });
    return stdout.trim();
  }

  async commit(message: string, cwd: string): Promise<void> {
    // Use stdin for commit message to avoid shell splitting
    await runCommand('git', ['commit', '-F', '-'], { cwd, input: message });
  }

  async push(branchName: string, cwd: string): Promise<void> {
    await runCommand('git', ['push', 'origin', branchName], { cwd });
  }

  async diff(cwd: string): Promise<string> {
    const { stdout } = await runCommand('git', ['diff', '--staged'], { cwd });
    return stdout.trim();
  }

  async createPullRequest(
    title: string,
    body: string,
    base: string,
    cwd: string,
  ): Promise<string> {
    const args = [
      'pr',
      'create',
      '--base', base,
      '--title', title,
      '-F', '-',   // read body from stdin
    ];
    const { stdout } = await runCommand('gh', args, { cwd, input: body });
    return stdout.trim();
  }
}

export const git = new Git();