import { join } from "path";
import Database from "better-sqlite3";
import { existsSync } from "fs";
import { CommitRecord, CommitStats } from "../types/db.types";
import { APPNAME, HOME_DIR } from "../lib/constants";
import { mkdir } from "fs/promises";

const DB_PATH = join(HOME_DIR, `${APPNAME}.db`);

async function getDB(): Promise<Database.Database> {
  if (!existsSync(HOME_DIR)) {
    await mkdir(HOME_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);

  db.exec(`
        CREATE TABLE IF NOT EXISTS commits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repo TEXT NOT NULL,
            message TEXT NOT NULL,
            files_changed integer,
            created_at TEXT DEFAULT (datetime('now'))
        );
    `);

  return db;
}

export async function saveCommit(record: CommitRecord): Promise<void> {
  const db = await getDB();

  db.prepare(
    `INSERT INTO commits (repo, message, files_changed)
        VALUES (?,?,?)`,
  ).run(record.repo, record.message, record.filesChanged);

  db.close();
}

export async function getStats(): Promise<CommitStats> {
  const db = await getDB();

  const totalCommits = (
    db.prepare(`SELECT COUNT(*) as count FROM commits`).get() as {
      count: number;
    }
  ).count;

  const recentCommits = db
    .prepare(
      `SELECT message, repo, created_at FROM commits ORDER BY created_at DESC LIMIT 10`,
    )
    .all() as {
    message: string;
    repo: string;
    created_at: string;
  }[];

  const allMessages = db.prepare(`SELECT message FROM commits`).all() as {
    message: string;
  }[];

  const typeCounts: Record<string, number> = {};

  for (const { message } of allMessages) {
    const match = message.match(/^(\w+)[\(:]/);
    if (match) {
      const type = match[1];
      typeCounts[type] = (typeCounts[type] ?? 0) + 1;
    }
  }

  const topTypes = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  db.close();

  return {
    totalCommits,
    recentCommits,
    topTypes,
  };
}
