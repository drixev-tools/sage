# sage

[![npm version](https://img.shields.io/npm/v/@drixev/sage.svg)](https://www.npmjs.com/package/@drixev/sage)
[![License](https://img.shields.io/npm/l/@drixev/sage.svg)](LICENSE)

> AI-powered Git assistant CLI — smarter commits, PR summaries, code reviews & risk analysis

Built with **Node.js + TypeScript**, supports **Claude, OpenAI, and Ollama**, and stores your commit history locally with **SQLite**.

---

## Why sage?

Writing good commit messages is painful. PR descriptions are even worse. `sage` reads your actual code changes and generates meaningful, conventional commit messages, PR descriptions, code reviews, and risk reports — using your own API key, stored securely on your machine.

**Your key never touches this codebase.**

---

## Install

```bash
npm install -g sage
# or
pnpm add -g sage
```

---

## Setup

### Claude (default)

Get your key at [console.anthropic.com](https://console.anthropic.com) and run:

```bash
sage auth -a claude -k sk-ant-xxxxxxxxxx -m claude-haiku-4-5-20251001
```

### OpenAI

```bash
sage auth -a openai -k sk-xxxxxxxxxx -m gpt-4o-mini
```

### Ollama (local)

```bash
sage auth -a ollama -m llama3.2 -u http://localhost:11434
```

Your config is saved to `~/.config/sage/config.json` with restricted permissions (`0o600`). It never leaves your machine.

---

## Commands

### `sage commit`

Analyzes your staged changes and suggests a [Conventional Commit](https://www.conventionalcommits.org/) message. For small-to-medium diffs a single AI call is made; for large diffs the tool uses `git diff --stat` plus the most-changed files to stay within context limits.

```bash
git add .
sage commit          # show suggestion, confirm manually
sage commit --yes    # commit immediately with the suggested message
```

| Flag | Description |
|---|---|
| `-y, --yes` | Commit immediately without confirmation |

---

### `sage review`

Reviews code quality: readability, complexity, duplication, and best practices.

```bash
sage review                        # review staged changes
sage review --changes              # review all uncommitted changes
sage review --file src/foo.ts      # review a specific file's staged diff
sage review --generate             # also save the review to a markdown file
```

| Flag | Description |
|---|---|
| `-f, --file <file>` | Review a specific file's staged diff |
| `--changes` | Review all uncommitted changes (staged + unstaged) |
| `-g, --generate` | Save the review to a markdown file |

---

### `sage risk`

Identifies security vulnerabilities and operational risks. By default it scans the entire tracked codebase; use flags to narrow the scope to your current changes.

```bash
sage risk                  # analyze whole codebase
sage risk --staged         # analyze only staged changes
sage risk --changes        # analyze staged + unstaged changes
sage risk --generate       # also save the report to a markdown file
```

| Flag | Description |
|---|---|
| `-s, --staged` | Analyze only staged changes |
| `--changes` | Analyze staged + unstaged changes |
| `-g, --generate` | Save the report to a markdown file |

Output includes a per-file severity table, detailed risk breakdown, and an overall summary.

---

### `sage summary`

Generates a Pull Request description from your recent commits.

```bash
sage summary             # last 10 commits
sage summary -n 20      # last 20 commits
sage summary --generate  # also save the summary to a markdown file
```

| Flag | Description |
|---|---|
| `-n, --number <n>` | Number of recent commits to analyze (default: `10`) |
| `-g, --generate` | Save the summary to a markdown file |

---

### `sage auth`

Configure your AI provider, API key, model, language, and connection settings.

```bash
sage auth -a claude -k <key> -m <model>
sage auth -a ollama -m llama3.2 -u http://localhost:11434
```

| Flag | Description | Default |
|---|---|---|
| `-a, --agent <agent>` | AI provider: `claude`, `openai`, `ollama` | `claude` |
| `-k, --apikey <key>` | API key for the selected provider | — |
| `-m, --model <model>` | Model name to use | — |
| `-l, --lang <lang>` | Output language: `en`, `es` | `en` |
| `-t, --timeout <ms>` | Request timeout in milliseconds | — |
| `-r, --maxRetries <n>` | Max retries on transient failures | `2` |
| `-u, --url <url>` | Base URL (required for Ollama, optional for proxies) | — |

---

### `sage config`

Display your current configuration.

```bash
sage config              # show all settings
sage config --apikey     # show only the API key
sage config --model      # show only the model
```

| Flag | Description |
|---|---|
| `-a, --all` | Show all settings |
| `-k, --apikey` | Show API key |
| `-m, --model` | Show model |
| `-t, --timeout` | Show timeout |
| `-r, --maxRetries` | Show max retries |

---

## Architecture

| Decision | Choice | Reason |
|---|---|---|
| Language | TypeScript | Type safety in CLI error handling is critical |
| CLI framework | Commander.js | Lightweight, widely adopted, great subcommand support |
| AI providers | Claude, OpenAI, Ollama | Flexibility: cloud or fully local |
| Database | SQLite via better-sqlite3 | Zero-config, local, no server needed for a CLI tool |
| Key storage | `~/.config/sage/` | Standard XDG pattern, same as AWS CLI and GitHub CLI |
| Package manager | pnpm | Faster installs, disk-efficient, deterministic lockfile |

---

## Security

- API keys are stored with `mode: 0o600` — only readable by your user
- Zero secrets in the published package
- Each user brings their own key and pays for their own API usage

---

## Local development

```bash
git clone https://github.com/drixev-tools/sage
cd sage
pnpm install
pnpm dev commit       # run without building
pnpm build            # compile to dist/
```

---

## License

MIT
