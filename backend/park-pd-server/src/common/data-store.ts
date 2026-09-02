import * as fs from 'fs';
import * as path from 'path';

/**
 * Where the file-backed stores live.
 *
 * One folder rather than three files loose in the working directory, so the
 * whole of the app's local state can be ignored, backed up or wiped in a single
 * move - and so a stray `users.json` can't be mistaken for a config file.
 */
const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * Absolute path to one store, creating the folder if it isn't there yet.
 * Called from each service's field initialiser, so the directory exists before
 * any read or write is attempted.
 */
export function dataFile(name: string): string {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  return path.join(DATA_DIR, name);
}
