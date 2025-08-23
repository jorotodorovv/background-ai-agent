// src/command.ts
import { execa } from 'execa';

export async function runCommand(
  command: string,
  args: string[],
  options?: { cwd: string },
): Promise<{ stdout: string; stderr: string }> {
  const cwd = options?.cwd || process.cwd();
  console.log(`[${cwd}]> ${command} ${args.map(arg => `'${arg}'`).join(' ')}`);

  try {
    const result = await execa(command, args, {
      cwd,
      shell: true, // Important for finding commands like 'gh' in the PATH
    });

    // Log stderr on success as well, as some tools use it for progress
    if (result.stderr) {
      console.error('STDERR:', result.stderr);
    }
    console.log(result.stdout);
    
    return { stdout: result.stdout, stderr: result.stderr };
  } catch (error: any) {
    console.error(`Error executing command: "${command} ${args.join(' ')}"`, error);
    
    const detailedErrorMessage = `Command failed: ${command} ${args.join(' ')}\nSTDOUT: ${error.stdout}\nSTDERR: ${error.stderr}`;
    throw new Error(detailedErrorMessage);
  }
}