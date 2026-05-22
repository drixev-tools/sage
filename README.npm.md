# sage

[![npm version](https://img.shields.io/npm/v/@drixev/sage.svg)](https://www.npmjs.com/package/@drixev/sage)
[![License](https://img.shields.io/npm/l/@drixev/sage.svg)](LICENSE)

> AI-powered Git assistant — commit messages, PR summaries, code reviews & risk reports from your terminal.

Supports **Claude, OpenAI, and Ollama**. Your API key stays on your machine.

---

## Install

```bash
pnpm add -g @drixev/sage
# or
npm install -g @drixev/sage
```

---

## Quick start (60 seconds)

**1. Configure your AI provider**

```bash
# Claude (recommended)
sage auth -a claude -k sk-ant-xxxxxxxxxx -m claude-haiku-4-5-20251001

# OpenAI
sage auth -a openai -k sk-xxxxxxxxxx -m gpt-4o-mini

# Ollama (fully local, no API key needed)
sage auth -a ollama -m llama3.2 -u http://localhost:11434
```

**2. Stage your changes and run**

```bash
git add .
sage commit
```

```
✔ Commit message ready!

  Suggested commit:

    feat(auth): add JWT refresh token rotation on expiry
```

---

## Commands

### `sage commit` — generate a commit message

```bash
git add .
sage commit          # shows suggestion, you decide
sage commit --yes    # commits immediately
```

### `sage review` — code quality review

```bash
sage review                      # staged changes
sage review --file src/auth.ts   # specific file
sage review --changes            # staged + unstaged
sage review --generate           # save to markdown
```

### `sage risk` — security & risk analysis

```bash
sage risk                # whole codebase
sage risk --staged       # staged changes only
sage risk --generate     # save report to markdown
```

```
  File              Severity   Risks
  ─────────────────────────────────────────────────
  src/auth.ts       HIGH       JWT secret from env without validation
  src/db.ts         MEDIUM     Raw SQL interpolation on line 42
```

### `sage summary` — PR description from your commits

```bash
sage summary           # last 10 commits
sage summary -n 20     # last 20 commits
sage summary --generate
```

### `sage config` — view current settings

```bash
sage config
sage config --model
sage config --apikey
```

---

## Privacy

- API keys stored in `~/.config/sage/config.json` with `0o600` permissions
- Nothing is sent to any server other than your chosen AI provider
- No telemetry, no tracking

---

## License

MIT © [drixev](https://github.com/drixev)
