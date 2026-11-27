// After `vite build`: ship the concept pages, and make the site's main page the top-down beach game (FEAT-17).
// The old 2D game stays reachable at classic.html, the diorama at concepts/diorama.html. The beach page's relative
// imports resolve from concepts/ through a <base> tag, so the page itself is not duplicated or edited.
import { cpSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

cpSync('concepts', 'dist/concepts', { recursive: true });
rmSync('dist/concepts/beach-gesture.test.js', { force: true });
renameSync('dist/index.html', 'dist/classic.html');
const page = readFileSync('concepts/beach.html', 'utf8').replace('<head>', '<head>\n<base href="concepts/">');
writeFileSync('dist/index.html', page);
console.log('pages: index.html = concepts/beach.html, old game at classic.html');
