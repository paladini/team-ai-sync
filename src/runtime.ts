import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, renderTemplate } from './config.js';
import {
  checkoutSyncBranch,
  cloneTargetRepository,
  commitAll,
  configureCommitter,
  hasWorkingTreeChanges,
  pushBranch
} from './git.js';
import { createPlatform } from './platforms/index.js';
import { syncFiles } from './sync.js';
import type { Logger, RuntimeInputs, RuntimeResult, TargetFailure, TargetResult } from './types.js';

const consoleLogger: Logger = {
  info(message) {
    console.log(message);
  }
};

export async function runSync(inputs: RuntimeInputs, logger: Logger = consoleLogger): Promise<RuntimeResult> {
  const config = await loadConfig(inputs.configPath, inputs.sourceRoot);
  const platform = createPlatform(inputs.platform, inputs.token);
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'team-ai-sync-'));
  const results: TargetResult[] = [];
  const failures: TargetFailure[] = [];

  try {
    for (const targetRepository of config.targetRepositories) {
      try {
        logger.startGroup?.(`Sync ${targetRepository}`);
        const repo = platform.parseRepository(targetRepository);
        const defaultBranch = await platform.getDefaultBranch(repo);
        const targetDirectory = await cloneTargetRepository(
          repo,
          inputs.token,
          defaultBranch,
          tempRoot,
          platform.authenticatedRemoteUrl(repo, inputs.token)
        );

        await checkoutSyncBranch(targetDirectory, config.prOptions.branch);
        const summary = await syncFiles(inputs.sourceRoot, targetDirectory, config);
        const changed = await hasWorkingTreeChanges(targetDirectory);

        let prUrl: string | undefined;
        if (changed && !inputs.dryRun) {
          await configureCommitter(targetDirectory, platform.committer.name, platform.committer.email);
          await commitAll(targetDirectory, config.prOptions.commitMessage);
          await pushBranch(targetDirectory, config.prOptions.branch);
          prUrl = await platform.createOrUpdateChangeRequest(
            repo,
            config.prOptions,
            defaultBranch,
            renderTemplate(config.prOptions.body, inputs.sourceRepo, inputs.sourceCommit)
          );
        }

        results.push({
          repository: targetRepository,
          changed,
          prUrl,
          dryRun: inputs.dryRun,
          summary
        });

        logger.info(
          `${targetRepository}: ${changed ? 'changes detected' : 'no changes'}; ` +
            `${summary.copied.length} copied, ${summary.skipped.length} skipped, ${summary.deleted.length} deleted`
        );
      } catch (error) {
        failures.push({
          repository: targetRepository,
          error: error instanceof Error ? error.message : String(error)
        });
      } finally {
        logger.endGroup?.();
      }
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }

  return { results, failures };
}
