// After `vite build`: ship the concept pages next to the game. The site's main page is the classic 2D game
// (index.html, reskinned to the Palmetto Point beach); the 3D and 2.5D experiments stay reachable under concepts/.
import { cpSync, rmSync } from 'node:fs';

cpSync('concepts', 'dist/concepts', { recursive: true });
rmSync('dist/concepts/beach-gesture.test.js', { force: true });
console.log('pages: index.html = the classic 2D game; concepts/ copied alongside');
