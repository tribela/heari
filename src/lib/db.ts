import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'cache.db');

let db: SqlJsDatabase | null = null;
let initPromise: Promise<void> | null = null;

async function ensureDb(): Promise<SqlJsDatabase> {
  if (db) return db;
  if (initPromise) {
    await initPromise;
    return db!;
  }
  initPromise = (async () => {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    const SQL = await initSqlJs({
      locateFile: (file: string) =>
        path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    });

    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    db.run(`CREATE TABLE IF NOT EXISTS hint_cache (
      input TEXT NOT NULL,
      answer TEXT NOT NULL,
      hint TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (input, answer)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS game_state (
      date TEXT PRIMARY KEY,
      word TEXT NOT NULL
    )`);

    save();
  })();
  await initPromise;
  return db!;
}

function save(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export async function getCachedHint(input: string, answer: string): Promise<string | null> {
  const d = await ensureDb();
  const stmt = d.prepare(
    `SELECT hint FROM hint_cache WHERE input = ? AND answer = ?`
  );
  stmt.bind([input, answer]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as { hint: string };
    stmt.free();
    return row.hint;
  }
  stmt.free();
  return null;
}

export async function setCachedHint(input: string, answer: string, hint: string): Promise<void> {
  const d = await ensureDb();
  d.run(
    `INSERT OR REPLACE INTO hint_cache (input, answer, hint, created_at) VALUES (?, ?, ?, datetime('now'))`,
    [input, answer, hint]
  );
  save();
}

export async function cleanOldCache(): Promise<void> {
  const d = await ensureDb();
  d.run(
    `DELETE FROM hint_cache WHERE created_at < datetime('now', '-3 days')`
  );
  d.run(
    `DELETE FROM game_state WHERE date < datetime('now', '-3 days')`
  );
  save();
}

export async function getWordForDate(date: string): Promise<string | null> {
  const d = await ensureDb();
  const stmt = d.prepare(
    `SELECT word FROM game_state WHERE date = ?`
  );
  stmt.bind([date]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as { word: string };
    stmt.free();
    return row.word;
  }
  stmt.free();
  return null;
}

export async function setWordForDate(date: string, word: string): Promise<void> {
  const d = await ensureDb();
  d.run(
    `INSERT OR REPLACE INTO game_state (date, word) VALUES (?, ?)`,
    [date, word]
  );
  save();
}
