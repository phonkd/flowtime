// This file patches the import.meta.dirname property on older Node.js versions
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

// Only add the property if it doesn't exist
if (import.meta.dirname === undefined) {
  Object.defineProperty(import.meta, 'dirname', {
    get() {
      return dirname(fileURLToPath(import.meta.url));
    }
  });
}

// Export a function to get the dirname from a URL
export function getDirname(url) {
  return dirname(fileURLToPath(url));
}

// Export a function to create a require function from a URL
export function getRequire(url) {
  return createRequire(url);
}