import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import readline from "node:readline";
import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";

import { ensureLocalHumanUser } from "../src/server/auth/localUser";
import {
  parseKindeExportUserLine,
  resolveKindeUsersExportPath,
} from "../src/server/auth/kindeExport";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

async function assertReadable(filePath: string) {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Kinde users export not found: ${filePath}`);
  }
}

export async function importKindeUsers(filePath: string) {
  await assertReadable(filePath);

  let read = 0;
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const stream = readline.createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of stream) {
    read += 1;
    try {
      const identity = parseKindeExportUserLine(line);
      if (!identity) {
        skipped += 1;
        continue;
      }

      await ensureLocalHumanUser(prisma, identity);
      imported += 1;
    } catch (error) {
      errors.push(
        `line ${read}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return { read, imported, skipped, errors };
}

async function main() {
  const filePath = resolveKindeUsersExportPath(process.argv.slice(2));
  const result = await importKindeUsers(filePath);

  console.log(`Kinde users export: ${filePath}`);
  console.log(`Read: ${result.read}`);
  console.log(`Imported or updated: ${result.imported}`);
  console.log(`Skipped: ${result.skipped}`);

  if (result.errors.length > 0) {
    console.error("Errors:");
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
