import fs from "node:fs";
import path from "node:path";

const srcDir = path.join(__dirname, "..", "src");
const allowedEnvReader = path.join(srcDir, "config", "env.ts");

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

describe("mobile environment variable boundary", () => {
  it("keeps EXPO_PUBLIC reads centralized in src/config/env.ts", () => {
    const offenders = listSourceFiles(srcDir).filter((filePath) => {
      if (filePath === allowedEnvReader) {
        return false;
      }

      return /process\.env\.EXPO_PUBLIC_/.test(fs.readFileSync(filePath, "utf8"));
    });

    expect(offenders.map((filePath) => path.relative(srcDir, filePath))).toEqual([]);
  });
});
