// src/command.ts
import { execa } from 'execa';

// The options object now accepts an optional 'input' string
export interface CommandOptions {
  cwd?: string;
  input?: string;
}

export function runCommandStream(
  command: string,
  args: string[],
  options?: CommandOptions,
) {
  const cwd = options?.cwd || process.cwd();
  console.log(`[${cwd}]> ${command} ${args.map(arg => `'${arg}'`).join(' ')}`);
  if (options?.input) {
    console.log(`[stdin]> Piping input to command...`);
  }

  // Create and return the subprocess immediately
  const subprocess = execa(command, args, {
    cwd,
    input: options?.input,
  });

  return subprocess;
}

export async function runCommand(
  command: string,
  args: string[],
  options?: CommandOptions,
): Promise<{ stdout: string; stderr: string }> {
  const cwd = options?.cwd || process.cwd();
  console.log(`[${cwd}]> ${command} ${args.map(arg => `'${arg}'`).join(' ')}`);
  if (options?.input) {
    console.log(`[stdin]> Piping input to command...`);
  }

  try {
    // We pass the optional 'input' property directly to execa.
    // execa will pipe this string to the process's stdin.
    const result = await execa(command, args, {
      cwd,
      input: options?.input, // <-- This is the key change
    });

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