// Print every part of the Judge with its triangle count and world-space bounds (debugging the sculpt).
// Run: node --import ./scripts/register-cdn-three.mjs scripts/inspect-judge.mjs [hero|mid|far] [gavel|turnaround]
import { assemble, DETAIL } from '../concepts/gumbo-model.js';
const [lod = 'far', pose = 'turnaround'] = process.argv.slice(2);
const { root } = await assemble(DETAIL[lod], { pose });
root.updateMatrixWorld(true);
root.traverse(m => {
  if (!m.isMesh) return;
  m.geometry.computeBoundingBox();
  const b = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld), f = v => v.toArray().map(n => n.toFixed(2)).join(',');
  console.log(m.userData.tag.padEnd(6), String(m.geometry.index ? m.geometry.index.count / 3 : 0).padStart(6), f(b.min), '|', f(b.max));
});
