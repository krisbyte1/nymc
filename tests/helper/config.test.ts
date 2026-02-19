import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import fs from 'fs';
import { createConfig, configExists, readConfig, fetchPackages } from '../../src/helper/config';

jest.mock('fs');
jest.mock('../../src/helper/filesystem', () => ({
  findProjectRoot: jest.fn().mockReturnValue('/project'),
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const CONFIG_PATH = '/project/.nymc/config.json';
const CONFIG_DIR = '/project/.nymc';

describe('configExists', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns true when the config file exists', () => {
    mockFs.existsSync.mockReturnValue(true);
    expect(configExists()).toBe(true);
  });

  it('returns false when the config file does not exist', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(configExists()).toBe(false);
  });
});

describe('createConfig', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('does nothing when config already exists and force is false', () => {
    mockFs.existsSync.mockReturnValue(true);
    createConfig(false);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('creates config file when it does not exist', () => {
    mockFs.existsSync
      .mockReturnValueOnce(false) // config file does not exist
      .mockReturnValueOnce(true); // config dir exists
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));

    createConfig(false);

    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      CONFIG_PATH,
      expect.stringContaining('"version": "1.0.0"'),
      'utf8',
    );
  });

  it('creates the .nymc directory when it does not exist', () => {
    mockFs.existsSync.mockReturnValue(false); // config file and dir both absent
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));

    createConfig(false);

    expect(mockFs.mkdirSync).toHaveBeenCalledWith(CONFIG_DIR, { recursive: true });
  });

  it('initialises config with empty packages array and empty url', () => {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));

    createConfig(false);

    const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0]![1] as string;
    const parsed = JSON.parse(written);
    expect(parsed.packages).toEqual([]);
    expect(parsed.url).toBe('');
  });

  it('overwrites an existing config when force is true', () => {
    mockFs.existsSync
      .mockReturnValueOnce(true)  // config exists, but force = true
      .mockReturnValueOnce(true); // config dir exists
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '2.0.0' }));

    createConfig(true);

    expect(mockFs.writeFileSync).toHaveBeenCalled();
  });
});

describe('readConfig', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('reads and parses the config file', () => {
    const config = {
      version: '1.0.0',
      url: 'https://example.com',
      httpsHeader: '',
      packages: ['malware@1.0.0'],
    };
    mockFs.readFileSync.mockReturnValue(JSON.stringify(config));

    expect(readConfig()).toEqual(config);
  });
});

describe('fetchPackages', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockFetch: jest.Mock<(...args: any[]) => Promise<any>>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn<(...args: any[]) => Promise<any>>();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('fetches and returns the package list from the configured URL', async () => {
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({
        version: '1.0.0',
        url: 'https://example.com/packages',
        httpsHeader: '',
        packages: [],
      }),
    );
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ['pkg-a@1.0.0', 'pkg-b@2.0.0'],
    });

    const result = await fetchPackages();

    expect(result).toEqual(['pkg-a@1.0.0', 'pkg-b@2.0.0']);
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/packages', {
      headers: {},
    });
  });

  it('parses and sends a custom HTTPS header', async () => {
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({
        version: '1.0.0',
        url: 'https://example.com/packages',
        httpsHeader: 'Authorization: Bearer token123',
        packages: [],
      }),
    );
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });

    await fetchPackages();

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/packages', {
      headers: { Authorization: 'Bearer token123' },
    });
  });

  it('handles headers with colons in the value', async () => {
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({
        version: '1.0.0',
        url: 'https://example.com/packages',
        httpsHeader: 'X-Api-Key: abc:def:ghi',
        packages: [],
      }),
    );
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });

    await fetchPackages();

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/packages', {
      headers: { 'X-Api-Key': 'abc:def:ghi' },
    });
  });

  it('calls process.exit(1) when no URL is configured', async () => {
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ version: '1.0.0', url: '', httpsHeader: '', packages: [] }),
    );
    const mockExit = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => { throw new Error('process.exit:1'); });

    await expect(fetchPackages()).rejects.toThrow('process.exit:1');
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it('calls process.exit(1) when httpsHeader has no colon separator', async () => {
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({
        version: '1.0.0',
        url: 'https://example.com',
        httpsHeader: 'InvalidHeader',
        packages: [],
      }),
    );
    const mockExit = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => { throw new Error('process.exit:1'); });

    await expect(fetchPackages()).rejects.toThrow('process.exit:1');
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it('calls process.exit(1) when the fetch response is not ok', async () => {
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({
        version: '1.0.0',
        url: 'https://example.com/packages',
        httpsHeader: '',
        packages: [],
      }),
    );
    mockFetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });
    const mockExit = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => { throw new Error('process.exit:1'); });

    await expect(fetchPackages()).rejects.toThrow('process.exit:1');
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });
});
