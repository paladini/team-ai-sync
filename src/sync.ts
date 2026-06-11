import fs from 'node:fs/promises';
import path from 'node:path';
import { isExcluded, resolveInside } from './path-safety.js';
import type { SyncConfig, SyncSummary } from './types.js';

export async function syncFiles(sourceRoot: string, targetRoot: string, config: SyncConfig): Promise<SyncSummary> {
  const summary: SyncSummary = { copied: [], skipped: [], deleted: [] };

  for (const file of config.files) {
    if (isExcluded(file, config.exclude)) {
      summary.skipped.push(file);
      continue;
    }

    await copyFile(sourceRoot, targetRoot, file, config.syncMode, summary);
  }

  for (const directory of config.directories) {
    await copyDirectory(sourceRoot, targetRoot, directory, config, summary);
  }

  return summary;
}

async function copyFile(
  sourceRoot: string,
  targetRoot: string,
  repoPath: string,
  syncMode: SyncConfig['syncMode'],
  summary: SyncSummary
): Promise<void> {
  const sourcePath = resolveInside(sourceRoot, repoPath);
  const targetPath = resolveInside(targetRoot, repoPath);

  const sourceStats = await statRequired(sourcePath, `Configured file does not exist: ${repoPath}`);
  if (!sourceStats.isFile()) {
    throw new Error(`Configured file is not a file: ${repoPath}`);
  }

  if (syncMode === 'skip' && (await pathExists(targetPath))) {
    summary.skipped.push(repoPath);
    return;
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  summary.copied.push(repoPath);
}

async function copyDirectory(
  sourceRoot: string,
  targetRoot: string,
  repoPath: string,
  config: SyncConfig,
  summary: SyncSummary
): Promise<void> {
  const sourcePath = resolveInside(sourceRoot, repoPath);
  const sourceStats = await statRequired(sourcePath, `Configured directory does not exist: ${repoPath}`);

  if (!sourceStats.isDirectory()) {
    throw new Error(`Configured directory is not a directory: ${repoPath}`);
  }

  const sourceFiles = await listFiles(sourcePath, repoPath);
  const copiedSourceFiles = new Set<string>();

  for (const file of sourceFiles) {
    if (isExcluded(file, config.exclude)) {
      summary.skipped.push(file);
      continue;
    }

    copiedSourceFiles.add(file);
    await copyFile(sourceRoot, targetRoot, file, config.syncMode, summary);
  }

  if (config.deleteOrphans) {
    const targetPath = resolveInside(targetRoot, repoPath);
    if (await pathExists(targetPath)) {
      const targetFiles = await listFiles(targetPath, repoPath);

      for (const file of targetFiles) {
        if (isExcluded(file, config.exclude) || copiedSourceFiles.has(file)) {
          continue;
        }

        await fs.rm(resolveInside(targetRoot, file), { force: true });
        summary.deleted.push(file);
      }

      await removeEmptyDirectories(targetPath, targetPath);
    }
  }
}

async function listFiles(root: string, repoPrefix: string): Promise<string[]> {
  const results: string[] = [];

  async function visit(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute);
        continue;
      }

      if (entry.isFile()) {
        const relative = path.relative(root, absolute).replace(/\\/g, '/');
        results.push(relative ? `${repoPrefix}/${relative}` : repoPrefix);
      }
    }
  }

  await visit(root);
  return results.sort();
}

async function removeEmptyDirectories(current: string, stopAt: string): Promise<boolean> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  let isEmpty = entries.length === 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      isEmpty = false;
      continue;
    }

    const child = path.join(current, entry.name);
    const childEmpty = await removeEmptyDirectories(child, stopAt);
    if (!childEmpty) {
      isEmpty = false;
    }
  }

  if (isEmpty && current !== stopAt) {
    await fs.rmdir(current);
  }

  return isEmpty;
}

async function statRequired(filePath: string, message: string): Promise<import('node:fs').Stats> {
  try {
    return await fs.stat(filePath);
  } catch {
    throw new Error(message);
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
