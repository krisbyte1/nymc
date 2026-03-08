import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import fs from "fs";
import {
  findProjectRoot,
  findGitRoot,
  findMonorepoWorkspaces,
} from "../../src/helper/filesystem";

jest.mock("fs");
const mockFs = fs as jest.Mocked<typeof fs>;

describe("findProjectRoot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns startDir when package.json is present there", () => {
    mockFs.existsSync.mockReturnValue(true);
    expect(findProjectRoot("/project")).toBe("/project");
  });

  it("traverses up directories until it finds package.json", () => {
    mockFs.existsSync.mockImplementation(
      (p) => (p as string) === "/project/package.json",
    );
    expect(findProjectRoot("/project/src/utils")).toBe("/project");
  });

  it("stops at a middle directory if package.json is found there", () => {
    mockFs.existsSync.mockImplementation(
      (p) => (p as string) === "/project/src/package.json",
    );
    expect(findProjectRoot("/project/src/utils")).toBe("/project/src");
  });

  it("falls back to startDir when no package.json is found", () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(findProjectRoot("/project/src")).toBe("/project/src");
  });
});

describe("findGitRoot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns startDir when .git is present there", () => {
    mockFs.existsSync.mockReturnValue(true);
    expect(findGitRoot("/repo")).toBe("/repo");
  });

  it("traverses up directories until it finds .git", () => {
    mockFs.existsSync.mockImplementation((p) => (p as string) === "/repo/.git");
    expect(findGitRoot("/repo/src/lib")).toBe("/repo");
  });

  it("returns null when no .git directory is found", () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(findGitRoot("/some/dir")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findMonorepoWorkspaces
// ---------------------------------------------------------------------------
describe("findMonorepoWorkspaces", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty array when package.json does not exist", () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(findMonorepoWorkspaces("/project")).toEqual([]);
  });

  it("returns empty array when package.json has no workspaces field", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ name: "root" }));
    expect(findMonorepoWorkspaces("/project")).toEqual([]);
  });

  it("returns empty array when workspaces array is empty", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ workspaces: [] }));
    expect(findMonorepoWorkspaces("/project")).toEqual([]);
  });

  it('expands a wildcard workspace pattern (e.g. "packages/*")', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ workspaces: ["packages/*"] }),
    );
    mockFs.readdirSync.mockReturnValue(["app", "lib", "README.md"] as any);
    mockFs.statSync.mockImplementation(
      (p) =>
        ({
          isDirectory: () => !(p as string).endsWith("README.md"),
        }) as any,
    );

    const result = findMonorepoWorkspaces("/project");
    expect(result).toEqual(["/project/packages/app", "/project/packages/lib"]);
  });

  it("handles a literal (non-glob) workspace path", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ workspaces: ["apps/my-app"] }),
    );
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);

    const result = findMonorepoWorkspaces("/project");
    expect(result).toEqual(["/project/apps/my-app"]);
  });

  it("supports the yarn classic { packages: [] } workspaces shape", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ workspaces: { packages: ["packages/*"] } }),
    );
    mockFs.readdirSync.mockReturnValue(["core"] as any);
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);

    const result = findMonorepoWorkspaces("/project");
    expect(result).toEqual(["/project/packages/core"]);
  });

  it("deduplicates directories matched by multiple patterns", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ workspaces: ["packages/*", "packages/app"] }),
    );
    mockFs.readdirSync.mockReturnValue(["app"] as any);
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);

    const result = findMonorepoWorkspaces("/project");
    expect(result).toEqual(["/project/packages/app"]);
  });

  it("excludes the project root itself from results", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ workspaces: ["."] }));
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);

    const result = findMonorepoWorkspaces("/project");
    expect(result).toEqual([]);
  });

  it("returns empty array when package.json cannot be parsed", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("not-valid-json");
    expect(findMonorepoWorkspaces("/project")).toEqual([]);
  });
});
