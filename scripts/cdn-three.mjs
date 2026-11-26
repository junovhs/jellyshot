// Node resolve hook: concept files import Three.js from the jsDelivr CDN (so they run as plain pages);
// under Node those URLs map to the pinned npm packages instead (three, meshoptimizer).
export async function resolve(spec, ctx, next) {
  const m = spec.match(/^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/);
  if (m) return next(m[1] === 'build/three.module.js' ? 'three' : 'three/' + m[1].replace(/^examples\/jsm\//, 'addons/'), ctx);
  if (/^https:\/\/cdn\.jsdelivr\.net\/npm\/meshoptimizer@[^/]+\/meshopt_simplifier\.js$/.test(spec)) return next('meshoptimizer/simplifier', ctx);
  return next(spec, ctx);
}
