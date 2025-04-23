// Add dirname support for older Node.js versions
import { fileURLToPath } from 'url';
import { dirname } from 'path';

if (import.meta.dirname === undefined) {
  Object.defineProperty(import.meta, 'dirname', {
    get() {
      return dirname(fileURLToPath(import.meta.url));
    }
  });
}