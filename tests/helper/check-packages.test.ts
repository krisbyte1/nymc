import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import fs from 'fs';
import {
  validatePackages,
  checkPackageJson,
  checkLockFile,
  checkNodeModules,
  checkDependencyTree,
  checkMonorepoWorkspaces,
} from '../../src/helper/check-packages';

jest.mock('fs');
jest.mock('../../src/helper/filesystem', () => ({
  findProjectRoot: jest.fn().mockReturnValue('/project'),
  findMonorepoWorkspaces: jest.fn().mockReturnValue([]),
}));
jest.mock('../../src/helper/package-manager', () => ({
  detectPackageManager: jest.fn().mockReturnValue('npm'),
}));
jest.mock('../../src/helper/command', () => ({
  executeCommand: jest.fn(),
}));

import { detectPackageManager } from '../../src/helper/package-manager';
import { executeCommand } from '../../src/helper/command';
import { findMonorepoWorkspaces } from '../../src/helper/filesystem';

const mockFs = fs as jest.Mocked<typeof fs>;
const mockDetectPM = detectPackageManager as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockExecuteCommand = executeCommand as jest.Mock<(...args: any[]) => Promise<any>>;
const mockFindMonorepoWorkspaces = findMonorepoWorkspaces as jest.Mock;

// ---------------------------------------------------------------------------
// validatePackages
// ---------------------------------------------------------------------------
describe('validatePackages', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns valid packages from config', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ packages: ['malware@1.0.0', 'evil@2.3.4'] }),
    );
    expect(validatePackages('/project')).toEqual(['malware@1.0.0', 'evil@2.3.4']);
  });

  it('accepts packages with only a major version', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ packages: ['pkg@1'] }),
    );
    expect(validatePackages('/project')).toEqual(['pkg@1']);
  });

  it('calls process.exit(1) for a package without a version', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ packages: ['no-version'] }),
    );
    const mockExit = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => { throw new Error('process.exit:1'); });

    expect(() => validatePackages('/project')).toThrow('process.exit:1');
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it('calls process.exit(1) for a package with a non-numeric version', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ packages: ['pkg@latest'] }),
    );
    const mockExit = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => { throw new Error('process.exit:1'); });

    expect(() => validatePackages('/project')).toThrow('process.exit:1');
    mockExit.mockRestore();
  });

  it('throws when config file does not exist', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(() => validatePackages('/project')).toThrow('Config file not found');
  });
});

// ---------------------------------------------------------------------------
// checkPackageJson
// ---------------------------------------------------------------------------
describe('checkPackageJson', () => {
  const ROOT = '/project';

  beforeEach(() => { jest.clearAllMocks(); });

  it('returns true when the package is listed in dependencies with exact version', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { malware: '1.0.0' } }),
    );
    expect(checkPackageJson(ROOT, 'malware@1.0.0')).toBe(true);
  });

  it('returns true when the package is listed in devDependencies', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ devDependencies: { malware: '1.0.0' } }),
    );
    expect(checkPackageJson(ROOT, 'malware@1.0.0')).toBe(true);
  });

  it('returns true when dependency version has a range prefix (e.g. ^1.0.0)', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { malware: '^1.0.0' } }),
    );
    expect(checkPackageJson(ROOT, 'malware@1.0.0')).toBe(true);
  });

  it('returns true for a scoped package using lastIndexOf semantics', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { '@scope/malware': '1.0.0' } }),
    );
    expect(checkPackageJson(ROOT, '@scope/malware@1.0.0')).toBe(true);
  });

  it('returns false when the package is not in any dependencies', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { express: '4.18.0' } }),
    );
    expect(checkPackageJson(ROOT, 'malware@1.0.0')).toBe(false);
  });

  it('returns false when version does not match', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { malware: '2.0.0' } }),
    );
    expect(checkPackageJson(ROOT, 'malware@1.0.0')).toBe(false);
  });

  it('throws when package.json does not exist', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(() => checkPackageJson(ROOT, 'malware@1.0.0')).toThrow(
      'package.json not found',
    );
  });
});

// ---------------------------------------------------------------------------
// checkLockFile
// ---------------------------------------------------------------------------
describe('checkLockFile', () => {
  const ROOT = '/project';

  beforeEach(() => { jest.clearAllMocks(); });

  it('returns false when the lock file does not exist', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(checkLockFile(ROOT, 'malware@1.0.0')).toBe(false);
  });

  it('returns true when npm lock file contains "name": "version" entry', () => {
    mockDetectPM.mockReturnValue('npm');
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { malware: { version: '1.0.0' } } }) +
        '\n"malware": "1.0.0"',
    );
    expect(checkLockFile(ROOT, 'malware@1.0.0')).toBe(true);
  });

  it('returns true when lock file contains name@version string', () => {
    mockDetectPM.mockReturnValue('npm');
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('resolved: malware@1.0.0');
    expect(checkLockFile(ROOT, 'malware@1.0.0')).toBe(true);
  });

  it('returns true when yarn.lock contains the package entry', () => {
    mockDetectPM.mockReturnValue('yarn');
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('malware@1.0.0:\n  version "1.0.0"');
    expect(checkLockFile(ROOT, 'malware@1.0.0')).toBe(true);
  });

  it('returns false when the package is not present in the lock file', () => {
    mockDetectPM.mockReturnValue('npm');
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('{"dependencies": {"express": "4.18.0"}}');
    expect(checkLockFile(ROOT, 'malware@1.0.0')).toBe(false);
  });

  it('uses package-lock.json for npm and yarn.lock for yarn', () => {
    for (const pm of ['yarn-classic', 'yarn-modern'] as const) {
      mockDetectPM.mockReturnValue(pm);
      mockFs.existsSync.mockReturnValue(false);
      checkLockFile(ROOT, 'malware@1.0.0');
      expect(mockFs.existsSync).toHaveBeenCalledWith('/project/yarn.lock');
      jest.clearAllMocks();
    }

    mockDetectPM.mockReturnValue('npm');
    mockFs.existsSync.mockReturnValue(false);
    checkLockFile(ROOT, 'malware@1.0.0');
    expect(mockFs.existsSync).toHaveBeenCalledWith('/project/package-lock.json');
  });
});

// ---------------------------------------------------------------------------
// checkNodeModules
// ---------------------------------------------------------------------------
describe('checkNodeModules', () => {
  const ROOT = '/project';

  beforeEach(() => { jest.clearAllMocks(); });

  it('returns false when the module package.json does not exist', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(checkNodeModules(ROOT, 'malware@1.0.0')).toBe(false);
  });

  it('returns true when installed version matches exactly', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
    expect(checkNodeModules(ROOT, 'malware@1.0.0')).toBe(true);
  });

  it('returns false when installed version does not match', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '2.0.0' }));
    expect(checkNodeModules(ROOT, 'malware@1.0.0')).toBe(false);
  });

  it('resolves the correct path for a scoped package', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
    checkNodeModules(ROOT, '@scope/malware@1.0.0');
    expect(mockFs.existsSync).toHaveBeenCalledWith(
      '/project/node_modules/@scope/malware/package.json',
    );
  });
});

// ---------------------------------------------------------------------------
// checkDependencyTree
// ---------------------------------------------------------------------------
describe('checkDependencyTree', () => {
  const ROOT = '/project';

  beforeEach(() => { jest.clearAllMocks(); });

  it('returns true when the npm dependency tree output contains name@version', async () => {
    mockDetectPM.mockReturnValue('npm');
    mockExecuteCommand.mockResolvedValue({
      stdout: '└── malware@1.0.0',
      stderr: '',
      exitCode: 0,
    });
    expect(await checkDependencyTree(ROOT, 'malware@1.0.0')).toBe(true);
  });

  it('returns false when the package is absent from the dependency tree', async () => {
    mockDetectPM.mockReturnValue('npm');
    mockExecuteCommand.mockResolvedValue({
      stdout: '└── express@4.18.0',
      stderr: '',
      exitCode: 0,
    });
    expect(await checkDependencyTree(ROOT, 'malware@1.0.0')).toBe(false);
  });

  it('uses the correct npm ls command', async () => {
    mockDetectPM.mockReturnValue('npm');
    mockExecuteCommand.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
    await checkDependencyTree(ROOT, 'malware@1.0.0');
    expect(mockExecuteCommand).toHaveBeenCalledWith(
      `npm ls malware --prefix ${ROOT} --all`,
    );
  });

  it('uses the correct yarn list command for yarn-classic', async () => {
    mockDetectPM.mockReturnValue('yarn-classic');
    mockExecuteCommand.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
    await checkDependencyTree(ROOT, 'malware@1.0.0');
    expect(mockExecuteCommand).toHaveBeenCalledWith(
      `yarn list --pattern malware --depth=Infinity`,
    );
  });

  it('uses the correct yarn info command for yarn-modern', async () => {
    mockDetectPM.mockReturnValue('yarn-modern');
    mockExecuteCommand.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
    await checkDependencyTree(ROOT, 'malware@1.0.0');
    expect(mockExecuteCommand).toHaveBeenCalledWith(
      `yarn info malware --all --recursive`,
    );
  });

  it('also searches stderr output (npm may write tree to stderr)', async () => {
    mockDetectPM.mockReturnValue('npm');
    mockExecuteCommand.mockResolvedValue({
      stdout: '',
      stderr: '└── malware@1.0.0',
      exitCode: 1,
    });
    expect(await checkDependencyTree(ROOT, 'malware@1.0.0')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkMonorepoWorkspaces
// ---------------------------------------------------------------------------
describe('checkMonorepoWorkspaces', () => {
  const ROOT = '/project';

  beforeEach(() => {
    jest.clearAllMocks();
    mockDetectPM.mockReturnValue('npm');
  });

  it('returns empty array when no workspaces are found', () => {
    mockFindMonorepoWorkspaces.mockReturnValue([]);
    expect(checkMonorepoWorkspaces(ROOT, ['malware@1.0.0'])).toEqual([]);
  });

  it('returns a result for each workspace × package combination', () => {
    mockFindMonorepoWorkspaces.mockReturnValue(['/project/packages/app', '/project/packages/lib']);
    // package.json exists but does not contain the malware package
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ dependencies: {} }));

    const results = checkMonorepoWorkspaces(ROOT, ['malware@1.0.0', 'evil@2.0.0']);
    expect(results).toHaveLength(4); // 2 workspaces × 2 packages
  });

  it('detects malware in a workspace package.json', () => {
    mockFindMonorepoWorkspaces.mockReturnValue(['/project/packages/app']);
    mockFs.existsSync.mockImplementation((p) => {
      // package.json exists; lock file does not
      return (p as string).endsWith('package.json');
    });
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { malware: '1.0.0' } }),
    );

    const results = checkMonorepoWorkspaces(ROOT, ['malware@1.0.0']);
    expect(results).toHaveLength(1);
    expect(results[0]!.packageJson).toBe(true);
    expect(results[0]!.lockFile).toBe(false);
  });

  it('detects malware in a workspace lock file', () => {
    mockFindMonorepoWorkspaces.mockReturnValue(['/project/packages/lib']);
    mockFs.existsSync.mockImplementation((p) => {
      const s = p as string;
      // package.json exists (but clean); lock file exists
      return s.endsWith('package.json') || s.endsWith('package-lock.json');
    });
    mockFs.readFileSync.mockImplementation((p) => {
      if ((p as string).endsWith('package-lock.json')) {
        return 'malware@1.0.0';
      }
      return JSON.stringify({ dependencies: {} });
    });

    const results = checkMonorepoWorkspaces(ROOT, ['malware@1.0.0']);
    expect(results[0]!.lockFile).toBe(true);
    expect(results[0]!.packageJson).toBe(false);
  });

  it('skips package.json check when workspace has no package.json', () => {
    mockFindMonorepoWorkspaces.mockReturnValue(['/project/packages/empty']);
    // package.json does NOT exist; lock file also absent
    mockFs.existsSync.mockReturnValue(false);

    const results = checkMonorepoWorkspaces(ROOT, ['malware@1.0.0']);
    expect(results[0]!.packageJson).toBe(false);
    expect(results[0]!.lockFile).toBe(false);
  });

  it('includes the workspace path in each result', () => {
    mockFindMonorepoWorkspaces.mockReturnValue(['/project/packages/app']);
    mockFs.existsSync.mockReturnValue(false);

    const results = checkMonorepoWorkspaces(ROOT, ['malware@1.0.0']);
    expect(results[0]!.workspace).toBe('/project/packages/app');
    expect(results[0]!.pkg).toBe('malware@1.0.0');
  });
});
