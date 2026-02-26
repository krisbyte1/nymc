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

  it('returns "yarn-classic" when yarn.lock exists but .yarnrc.yml does not', () => {
    mockFs.existsSync.mockImplementation((p) => String(p).endsWith('yarn.lock'));
    expect(detectPackageManager('/project')).toBe('yarn-classic');
  });

  it('returns "yarn-modern" when both yarn.lock and .yarnrc.yml exist', () => {
    mockFs.existsSync.mockReturnValue(true);
    expect(detectPackageManager('/project')).toBe('yarn-modern');
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
