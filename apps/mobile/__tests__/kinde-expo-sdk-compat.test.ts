import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const mobileRequire = createRequire(path.join(__dirname, "..", "package.json"));

function findPackageJson(startPath: string) {
  let current = path.dirname(startPath);

  while (current !== path.dirname(current)) {
    const packageJsonPath = path.join(current, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      return packageJsonPath;
    }
    current = path.dirname(current);
  }

  throw new Error(`Could not find package.json for ${startPath}`);
}

function resolveKindeDependencyVersion(packageName: string) {
  const kindeEntry = mobileRequire.resolve("@kinde/expo");
  const kindeRequire = createRequire(kindeEntry);
  const dependencyEntry = kindeRequire.resolve(packageName);
  const packageJsonPath = findPackageJson(dependencyEntry);

  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8")).version as string;
}

describe("Kinde Expo SDK compatibility", () => {
  it.each([
    "expo-auth-session",
    "expo-crypto",
    "expo-linking",
    "expo-secure-store",
    "expo-web-browser",
  ])("%s resolves to the Expo SDK 55 package", (packageName) => {
    expect(resolveKindeDependencyVersion(packageName)).toMatch(/^55\./);
  });
});
