import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Points the app at an isolated, disposable data directory so tests never touch real dev data.
process.env.DATA_DIR = path.join(__dirname, 'tmp-data');
process.env.NODE_ENV = 'test';
