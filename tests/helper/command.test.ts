import { describe, it, expect } from '@jest/globals';
import { executeCommand, commandExists } from '../../src/helper/command';

describe('executeCommand', () => {
  it('returns trimmed stdout and exitCode 0 for a successful command', async () => {
    const result = await executeCommand('echo "hello"');
    expect(result.stdout).toBe('hello');
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('returns non-zero exitCode when the command fails', async () => {
    const result = await executeCommand('sh -c "exit 1"');
    expect(result.exitCode).toBe(1);
  });

  it('captures stderr output on failure', async () => {
    const result = await executeCommand('sh -c "echo myerror >&2; exit 1"');
    expect(result.stderr).toBe('myerror');
    expect(result.exitCode).not.toBe(0);
  });

  it('returns stdout even when exit code is non-zero', async () => {
    const result = await executeCommand('sh -c "echo someout; exit 2"');
    expect(result.stdout).toBe('someout');
    expect(result.exitCode).toBe(2);
  });
});

describe('commandExists', () => {
  it('returns true for "node" which is present on this system', async () => {
    expect(await commandExists('node')).toBe(true);
  });

  it('returns false for a command that does not exist', async () => {
    expect(await commandExists('definitely-not-a-real-cmd-xyz123')).toBe(false);
  });
});
