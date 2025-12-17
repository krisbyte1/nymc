import { exec, spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  shell?: boolean;
}

/**
 * Execute a command and return the result as a promise
 * @param command - The command to execute
 * @param options - Optional execution options
 * @returns Promise with stdout, stderr, and exit code
 */
export async function executeCommand(command: string): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execAsync(command);
    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    };
  } catch (error: any) {
    return {
      stdout: error.stdout?.trim() || "",
      stderr: error.stderr?.trim() || error.message,
      exitCode: error.code || 1,
    };
  }
}

/**
 * Execute a command with streaming output
 * @param command - The command to execute
 * @param args - Command arguments
 * @param options - Optional spawn options
 * @param onStdout - Callback for stdout data
 * @param onStderr - Callback for stderr data
 * @returns Promise with exit code
 */
export async function executeCommandStream(
  command: string,
  args: string[] = [],
  options?: SpawnOptions,
  onStdout?: (data: string) => void,
  onStderr?: (data: string) => void,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);

    if (onStdout) {
      child.stdout.on("data", (data) => {
        onStdout(data.toString());
      });
    }

    if (onStderr) {
      child.stderr.on("data", (data) => {
        onStderr(data.toString());
      });
    }

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      resolve(code || 0);
    });
  });
}

/**
 * Check if a command exists in the system
 * @param command - The command to check
 * @returns Promise with boolean indicating if command exists
 */
export async function commandExists(command: string): Promise<boolean> {
  const checkCommand =
    process.platform === "win32" ? `where ${command}` : `which ${command}`;

  try {
    const result = await executeCommand(checkCommand);
    return result.exitCode === 0;
  } catch {
    return false;
  }
}
