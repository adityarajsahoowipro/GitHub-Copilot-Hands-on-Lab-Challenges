import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Data directory can be overridden (e.g. by tests) via the DATA_DIR env var,
// read lazily so it can be changed between test files.
function getDataDir() {
  return process.env.DATA_DIR || path.join(__dirname, '..', 'data');
}

function getFilePath(fileName) {
  return path.join(getDataDir(), fileName);
}

async function ensureFile(fileName, defaultValue) {
  const dir = getDataDir();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  const filePath = getFilePath(fileName);
  if (!existsSync(filePath)) {
    await writeFile(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
  }
}

// Reads a JSON array file, tolerating missing or corrupted content by resetting to the default.
export async function readJsonFile(fileName, defaultValue = []) {
  await ensureFile(fileName, defaultValue);
  const filePath = getFilePath(fileName);
  try {
    const raw = await readFile(filePath, 'utf-8');
    if (!raw.trim()) return defaultValue;
    return JSON.parse(raw);
  } catch {
    // Corrupted or unreadable JSON: fail safe instead of crashing the API.
    return defaultValue;
  }
}

// Writes via a temp file + rename so a crash mid-write cannot corrupt the JSON file.
export async function writeJsonFile(fileName, data) {
  const dir = getDataDir();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  const filePath = getFilePath(fileName);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  await rename(tempPath, filePath);
}
