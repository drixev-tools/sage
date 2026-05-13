import { existsSync } from "fs";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { HOME_DIR } from "../lib/constants";

const DOC_HOME = join(HOME_DIR, ".docs");

export async function generateDoc(message: string) {
  const currentTime = Date.now();
  const fileName = `risk_${currentTime}.md`;
  const path = join(DOC_HOME, fileName);

  if (!existsSync(DOC_HOME)) {
    await mkdir(DOC_HOME, { recursive: true });
  }

  await writeFile(path, message, { encoding: "utf-8" });
}
