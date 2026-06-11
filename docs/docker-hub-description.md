# team-ai-sync

Open-source CI/CD automation for syncing shared AI guidance files across
repositories.

`team-ai-sync` copies files such as `AGENTS.md`, `CLAUDE.md`, prompt templates,
editor settings, and repository rules from one source repository to many target
repositories. It does not merge directly into target branches. Instead, it
opens or updates pull requests or merge requests so each team can review the
change.

Website: https://paladini.github.io/team-ai-sync/

Documentation: https://github.com/paladini/team-ai-sync/tree/main/docs

GitHub: https://github.com/paladini/team-ai-sync

## What problem does it solve?

Many engineering teams now keep AI-agent instructions, review prompts, coding
conventions, and editor settings in every repository. Keeping those files
updated manually is slow and error-prone.

`team-ai-sync` lets you maintain those files once in a source repository, then
distribute updates across your repository fleet through normal review
workflows.

## Common files to sync

- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `.github/instructions/**`
- `.github/prompts/**`
- `.cursor/rules/**`
- `.vscode/extensions.json`
- `.editorconfig`
- shared prompts, AI-agent rules, code review guidance, and repository
  conventions

## Supported platforms

Use the native package for the platform where your repositories live:

- GitHub: GitHub Action
- GitLab: GitLab CI/CD Component
- Bitbucket: Bitbucket Pipe
- Docker: shared OCI image used by the GitLab and Bitbucket wrappers

Cross-platform sync is not the supported operating model. GitHub syncs GitHub
repositories, GitLab syncs GitLab projects, and Bitbucket syncs Bitbucket
repositories.

## How it works

1. Create a source repository with your shared files.
2. Add `sync-config.json` with target repositories and paths to sync.
3. Run `team-ai-sync` from CI/CD.
4. The tool validates paths, clones targets, copies files, creates a sync
   branch, and opens or updates PRs or MRs.
5. Target repository maintainers review and merge the generated changes.

## Docker image

This image contains the `team-ai-sync` runtime used by the GitLab CI/CD
Component and Bitbucket Pipe.

Image:

```text
paladini/team-ai-sync:1.0.0
```

Pin production usage to a SemVer tag instead of a mutable tag.

## Direct Docker usage

Advanced users can run the container directly by mounting a source repository
and passing the platform, token, and config path.

```bash
docker run --rm \
  -v "$PWD:/workspace" \
  -w /workspace \
  -e TEAM_AI_SYNC_PLATFORM=gitlab \
  -e TEAM_AI_SYNC_TOKEN="$GITLAB_TOKEN" \
  -e CONFIG_PATH=sync-config.json \
  paladini/team-ai-sync:1.0.0
```

Use `DRY_RUN=true` to validate the sync without pushing branches or opening
PRs/MRs.

```bash
docker run --rm \
  -v "$PWD:/workspace" \
  -w /workspace \
  -e TEAM_AI_SYNC_PLATFORM=gitlab \
  -e TEAM_AI_SYNC_TOKEN="$GITLAB_TOKEN" \
  -e CONFIG_PATH=sync-config.json \
  -e DRY_RUN=true \
  paladini/team-ai-sync:1.0.0
```

## Documentation

Start here:

- Getting started: https://github.com/paladini/team-ai-sync/blob/main/docs/getting-started.md
- Configuration: https://github.com/paladini/team-ai-sync/blob/main/docs/configuration.md
- Authentication: https://github.com/paladini/team-ai-sync/blob/main/docs/authentication.md
- Platform packages: https://github.com/paladini/team-ai-sync/blob/main/docs/platforms.md
- Security model: https://github.com/paladini/team-ai-sync/blob/main/docs/security.md
- Public demo: https://github.com/paladini/team-ai-sync/blob/main/docs/demo.md

## License

MIT

Made by Fernando Paladini, with love for the Tech Leads Club community.
