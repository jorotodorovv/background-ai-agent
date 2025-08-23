// src/command.ts
import { execa } from 'execa';

// The options object now accepts an optional 'onStdout' callback
export interface CommandOptions {
  cwd?: string;
  input?: string;
  onStdout?: (chunk: string) => void;
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

  // We create the subprocess but don't await it immediately
  const subprocess = execa(command, args, {
    cwd,
    input: options?.input,
  });

  let stdout = '';
  let stderr = '';

  // Listen to the stdout stream in real-time
  subprocess.stdout?.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    stdout += text;
    // If a callback is provided, execute it with the new chunk of data
    if (options?.onStdout) {
      options.onStdout(text);
    }
  });

  // We can also capture stderr
  subprocess.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  try {
    // Now we await the process to complete
    await subprocess;

    // Log the final full output for debugging purposes
    console.log('Final STDOUT:', stdout);
    if (stderr) {
      console.error('Final STDERR:', stderr);
    }
    
    return { stdout, stderr };
  } catch (error: any) {
    console.error(`Error executing command: "${command} ${args.join(' ')}"`, error);
    const detailedErrorMessage = `Command failed: ${command} ${args.join(' ')}\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`;
    throw new Error(detailedErrorMessage);
  }
}