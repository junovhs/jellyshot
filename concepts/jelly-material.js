// The character jelly look, as used everywhere (DEC: fake jelly, no transmission).
// Opaque glossy jelly: clearcoat gloss, a view-angle rim glow and a little inner light,
// plus a world-space jiggle in the vertex shader shared by every part of a character.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

// uniforms are shared objects so one clock drives every material: { uTime: {value}, uJig: {value} }
export const jiggleUniforms = () => ({ uTime: { value: 0 }, uJig: { value: 0 } });

export function wobbly(mat, U) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    sh.uniforms.uTime = U.uTime; sh.uniforms.uJig = U.uJig;
    sh.vertexShader = 'uniform float uTime; uniform float uJig;\n' + sh.vertexShader.replace('#include <project_vertex>', `
      vec4 wp = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wp = instanceMatrix * wp;
      #endif
      wp = modelMatrix * wp;
      vec3 org = (modelMatrix * vec4(0., 0., 0., 1.)).xyz;
      float h = max(wp.y - org.y, 0.0);
      float amp = 0.008 + uJig * 0.04;
      wp.x += sin(uTime * 3.1 + h * 3.0 + org.z) * amp * h * h;
      wp.z += cos(uTime * 2.7 + h * 2.6 + org.x) * amp * .7 * h * h;
      wp.y += sin(uTime * 6.0) * uJig * 0.03 * h;
      vec4 mvPosition = viewMatrix * wp;
      gl_Position = projectionMatrix * mvPosition;`);
  };
  mat.customProgramCacheKey = () => 'wobbly-' + (prev ? 'x' : '');
  return mat;
}

export function fakeJelly(U, color = '#ffffff', extra = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color, vertexColors: true, roughness: .14, clearcoat: 1, clearcoatRoughness: .06, ...extra });
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float rimF = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.2);
      totalEmissiveRadiance += diffuseColor.rgb * (0.03 + rimF * 0.4);`);
  };
  return wobbly(m, U);
}
