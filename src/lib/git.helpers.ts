import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { SOURCE_EXTENSIONS } from "./constants";

export function getGitDiff(): string {
  try {
    return execSync("git diff --cached --minimal -U1 .", { encoding: "utf-8" });
  } catch {
    return "";
  }
}

export function getGitDiffPerFile(file: string): string {
  try {
    return execSync(`git diff --cached --minimal -U1 -- ${file}`, {
      encoding: "utf-8",
    });
  } catch {
    return "";
  }
}

export function getRecentCommits(n: number = 10): string[] {
  try {
    const output = execSync(`git log --oneline -${n}`, { encoding: "utf-8" });
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export function getCurrentRepo(): string {
  try {
    const remoteUrl = execSync("git remote get-url origin", {
      encoding: "utf-8",
    }).trim();

    const parts = remoteUrl.split("/");
    return parts[parts.length - 1].replace(".git", "");
  } catch {
    return "";
  }
}

export function getChangedFiles(): string[] {
  try {
    const output = execSync("git diff --cached --name-only", {
      encoding: "utf-8",
    });

    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export function getGitDiffStat(): string {
  try {
    return execSync("git diff --cached --stat", { encoding: "utf-8" });
  } catch {
    return "";
  }
}

export function getAllChangedFileNames(): string[] {
  try {
    const staged = execSync("git diff --cached --name-only", { encoding: "utf-8" })
      .trim().split("\n").filter(Boolean);
    const unstaged = execSync("git diff --name-only", { encoding: "utf-8" })
      .trim().split("\n").filter(Boolean);
    return [...new Set([...staged, ...unstaged])];
  } catch {
    return [];
  }
}

export function getWorkingTreeDiffPerFile(file: string): string {
  const safe = file.replace(/"/g, "");
  try {
    const diff = execSync(`git diff HEAD -- "${safe}"`, { encoding: "utf-8" });
    if (diff.trim()) return diff;
    // fallback for new files that have no HEAD entry yet
    return execSync(`git diff --cached -- "${safe}"`, { encoding: "utf-8" });
  } catch {
    return "";
  }
}

export function getAllTrackedFiles(): string[] {
  try {
    const output = execSync("git ls-files", { encoding: "utf-8" });
    return output
      .trim()
      .split("\n")
      .filter(Boolean)
      .filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return SOURCE_EXTENSIONS.has(ext) && !f.endsWith(".d.ts");
      });
  } catch {
    return [];
  }
}

export function getFileContent(file: string): string {
  try {
    return readFileSync(file, "utf-8").slice(0, 50_000);
  } catch {
    return "";
  }
}

export function getChangedFilesCount(): number {
  try {
    return getChangedFiles().length;
  } catch {
    return 0;
  }
}

export function isInsideGitRepo(): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function removeJsonTag(message: string) {
  return message
    .replaceAll("```json", "")
    .replaceAll("```", "");
}

export function removeJump(message:string){
  return message.replaceAll("\n", "");
}

export function commitMessage(message: string) {
  const clean = message.replace(/"/g, '\\"');
  try {
    execSync(`git commit -m "${clean}"`, {
      stdio: "inherit",
    });
    return true;
  } catch {
    return false;
  }
}
