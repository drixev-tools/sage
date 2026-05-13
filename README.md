# gitwise 🧠

> AI-powered Git assistant CLI — smarter commits, PR summaries & code reviews

Built with **Node.js + TypeScript**, powered by the **Anthropic API**, and stores your commit history locally with **SQLite**.

---

## Why gitwise?

Writing good commit messages is painful. PR descriptions are even worse. `gitwise` reads your actual code changes and generates meaningful, conventional commit messages and PR descriptions — using your own API key, stored securely on your machine.

**Your key never touches this codebase.**

---

## Install

```bash
npm install -g gitwise
# or
pnpm add -g gitwise
```

---

## Setup (one-time)

Get your key at [console.anthropic.com](https://console.anthropic.com) and run:

```bash
gitwise auth set sk-ant-xxxxxxxxxx
```

Your key is saved to `~/.config/gitwise/config.json` with restricted file permissions (`0o600`). It never leaves your machine.

---

## Commands

### `gitwise commit`
Analyzes your staged changes (`git diff --cached`) and suggests a [Conventional Commit](https://www.conventionalcommits.org/) message.

```bash
git add .
gitwise commit         # shows suggestion
gitwise commit --yes   # commits immediately
```

### `gitwise summary`
Generates a PR description from your recent commits.

```bash
gitwise summary              # last 10 commits
gitwise summary -n 20        # last 20 commits
gitwise summary --review     # also runs a risk review on staged diff
```

### `gitwise stats`
Shows your commit patterns stored in local SQLite database.

```bash
gitwise stats
```

### `gitwise auth`
Manage your API key.

```bash
gitwise auth set <key>    # save key
gitwise auth status       # check current key
gitwise auth remove       # delete key
```

---

## Architecture decisions

| Decision | Choice | Reason |
|---|---|---|
| Language | TypeScript | Type safety in CLI error handling is critical |
| CLI framework | Commander.js | Lightweight, widely adopted, great subcommand support |
| AI | Anthropic API | Best instruction-following for structured output |
| Database | SQLite via better-sqlite3 | Zero-config, local, no server needed for a CLI tool |
| Key storage | `~/.config/gitwise/` | Standard XDG pattern, same as AWS CLI and GitHub CLI |
| Package manager | pnpm | Faster installs, disk-efficient, deterministic lockfile |

---

## Security

- API keys are stored with `mode: 0o600` — only readable by your user
- Zero secrets in the published package
- Each user brings their own key and pays for their own API usage
- The repo is 100% safe to be public

---

## Local development

```bash
git clone https://github.com/your-username/gitwise
cd gitwise
pnpm install
pnpm dev commit   # run without building
```

---

## License

MIT