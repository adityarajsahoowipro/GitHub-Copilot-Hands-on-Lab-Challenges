import { readJsonFile, writeJsonFile } from '../utils/fileStore.js';

const FILE_NAME = 'links.json';

export async function getAllLinks() {
  return readJsonFile(FILE_NAME, []);
}

export async function saveLink(link) {
  const links = await getAllLinks();
  links.push(link);
  await writeJsonFile(FILE_NAME, links);
  return link;
}
