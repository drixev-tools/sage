import { execSync } from "child_process";

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

export function getChangedFilesCount(): number {
  try {
    const files = getChangedFiles;
    return files.length;
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
    execSync(`git commit -m ${clean}`, {
      stdio: "inherit",
    });
    return true;
  } catch {
    return false;
  }
}
