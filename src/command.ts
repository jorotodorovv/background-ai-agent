import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function runCommand(
  command: string,
  options?: { cwd: string },
): Promise<{ stdout: string; stderr: string }> {
  const cwd = options?.cwd || process.cwd();
  console.log(`[${cwd}]> ${command}`);
  try {
    const { stdout, stderr } = await execPromise(command, { ...options, maxBuffer: 1024 * 1024 * 10 }); // 10 MB
    if (stdout) console.log(stdout);
    if (stderr) console.error('STDERR:', stderr);
    return { stdout, stderr };
  } catch (error: any) {
    console.error(`Error executing command: "${command}"`, error);
    const detailedErrorMessage = `Command failed: ${command}\nSTDOUT: ${error.stdout}\nSTDERR: ${error.stderr}`;
    throw new Error(detailedErrorMessage);
  }
}