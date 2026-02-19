import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import fs from 'fs';
import { findProjectRoot, findGitRoot } from '../../src/helper/filesystem';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('findProjectRoot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns startDir when package.json is present there', () => {
    mockFs.existsSync.mockReturnValue(true);
    expect(findProjectRoot('/project')).toBe('/project');
  });

  it('traverses up directories until it finds package.json', () => {
    mockFs.existsSync.mockImplementation(
      (p) => (p as string) === '/project/package.json',
    );
    expect(findProjectRoot('/project/src/utils')).toBe('/project');
  });

  it('stops at a middle directory if package.json is found there', () => {
    mockFs.existsSync.mockImplementation(
      (p) => (p as string) === '/project/src/package.json',
    );
    expect(findProjectRoot('/project/src/utils')).toBe('/project/src');
  });

  it('falls back to startDir when no package.json is found', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(findProjectRoot('/project/src')).toBe('/project/src');
  });
});

describe('findGitRoot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns startDir when .git is present there', () => {
    mockFs.existsSync.mockReturnValue(true);
    expect(findGitRoot('/repo')).toBe('/repo');
  });

  it('traverses up directories until it finds .git', () => {
    mockFs.existsSync.mockImplementation(
      (p) => (p as string) === '/repo/.git',
    );
    expect(findGitRoot('/repo/src/lib')).toBe('/repo');
  });

  it('returns null when no .git directory is found', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(findGitRoot('/some/dir')).toBeNull();
  });
});
