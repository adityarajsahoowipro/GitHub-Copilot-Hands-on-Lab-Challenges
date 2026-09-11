import { writeJsonFile } from '../src/utils/fileStore.js';

// Resets the isolated test data files to a known-empty state before each test.
export async function resetTestData() {
  await writeJsonFile('incidents.json', []);
  await writeJsonFile('rcas.json', []);
  await writeJsonFile('links.json', []);
}
