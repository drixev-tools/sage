import { existsSync } from "fs";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";
import { HOME_DIR } from "../lib/constants";

const DOC_HOME = join(HOME_DIR, ".docs");

function openFile(filePath: string) {
  const cmd =
    process.platform === "win32" ? "start" :
    process.platform === "darwin" ? "open" :
    "xdg-open";

  spawn(cmd, [filePath], { detached: true, stdio: "ignore" }).unref();
}

export async function generateDoc(message: string, initialName: string) {
  const currentTime = Date.now();
  const fileName = `${initialName}_${currentTime}.md`;
  const path = join(DOC_HOME, fileName);

  if (!existsSync(DOC_HOME)) {
    await mkdir(DOC_HOME, { recursive: true });
  }

  await writeFile(path, message, { encoding: "utf-8" });
  openFile(path);

  return path;
}
