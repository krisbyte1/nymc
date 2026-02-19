import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import fs from 'fs';
import { detectPackageManager } from '../../src/helper/package-manager';

jest.mock('fs');
jest.mock('../../src/helper/filesystem', () => ({
  findProjectRoot: jest.fn().mockReturnValue('/project'),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('detectPackageManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns "yarn" when yarn.lock exists in the project root', () => {
    mockFs.existsSync.mockReturnValue(true);
    expect(detectPackageManager('/project')).toBe('yarn');
  });

  it('returns "npm" when yarn.lock does not exist', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(detectPackageManager('/project')).toBe('npm');
  });

  it('defaults to "npm" when called without arguments', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(detectPackageManager()).toBe('npm');
  });
});
