// After `vite build`: ship the concept pages, and make the site's main page the level 1 diorama.
// The old 2D game stays reachable at classic.html. The diorama's relative imports and assets resolve
// from concepts/ through a <base> tag, so the page itself is not duplicated or edited.
import { cpSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

cpSync('concepts', 'dist/concepts', { recursive: true });
renameSync('dist/index.html', 'dist/classic.html');
const page = readFileSync('concepts/diorama.html', 'utf8').replace('<head>', '<head>\n<base href="concepts/">');
writeFileSync('dist/index.html', page);
console.log('pages: index.html = concepts/diorama.html, old game at classic.html');
