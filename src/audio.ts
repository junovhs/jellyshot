/* =====================================================================
   AUDIO — everything synthesized. No files.
   ===================================================================== */
import { G } from "./state";
import { rand, rng } from "./util";

let actx: AudioContext | null = null, master: GainNode | null = null, noiseBuf: AudioBuffer | null = null;
let audioMuted = false;
export const isMuted = (): boolean => audioMuted;
export function setMuted(m: boolean): void { audioMuted = m; music.mute(m); }
type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

export function initAudio(): void {
  if (actx) { if (actx.state === 'suspended') actx.resume().catch(() => { }); return; }
  try {
    const Ctor = window.AudioContext || (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) return;
    actx = new Ctor();
    master = actx.createGain(); master.gain.value = .9; master.connect(actx.destination);
    noiseBuf = actx.createBuffer(1, actx.sampleRate * 1.5, actx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    music.start();
  } catch { actx = null; }
}
function tone(f: number, dur: number, type: OscillatorType = 'sine', vol = .06, f2: number | null = null, delay = 0): void {
  if (!actx || !master || audioMuted) return;
  const dest = master;
  const t = actx.currentTime + delay, o = actx.createOscillator(), v = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  v.gain.setValueAtTime(.0001, t); v.gain.exponentialRampToValueAtTime(vol, t + .008); v.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(v); v.connect(dest); o.start(t); o.stop(t + dur + .02);
}
function noise(dur: number, vol = .1, freq = 1200, type: BiquadFilterType = 'lowpass', delay = 0, f2: number | null = null): void {
  if (!actx || !master || !noiseBuf || audioMuted) return;
  const t = actx.currentTime + delay, s = actx.createBufferSource(), f = actx.createBiquadFilter(), v = actx.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
  v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(v); v.connect(master); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
}
export type Sfx = 'shot' | 'shotBig' | 'pop' | 'popBig' | 'splat' | 'boom' | 'snap' | 'crack' | 'glass' | 'rumble' | 'quack' | 'buzz' | 'boing' | 'clank' | 'thunk' | 'thud' | 'fuse' | 'crackle' | 'fizz' | 'plip' | 'splash' | 'whoosh' | 'whistle' | 'deflate' | 'twang' | 'reel' | 'ding' | 'chime' | 'fanfare' | 'alarm' | 'fail' | 'reload' | 'cock' | 'click' | 'beat' | 'gasp' | 'lower' | 'raise';
export function sfx(n: Sfx, k = 1): void {
  if (!actx || !master || audioMuted) return;
  switch (n) {
    case 'shot': noise(.09, .22 * k, 3000, 'lowpass', 0, 400); tone(140, .12, 'triangle', .12 * k, 60); break;
    case 'shotBig': noise(.2, .3, 2000, 'lowpass', 0, 200); tone(90, .25, 'triangle', .16, 40); break;
    case 'pop': [260, 480, 740].forEach((f, i) => tone(f, .14, i ? 'sine' : 'triangle', .06 * k, f * .48, i * .025)); noise(.08, .05 * k, 900); break;
    case 'popBig': [180, 330, 520, 760].forEach((f, i) => tone(f, .22, i ? 'sine' : 'triangle', .08, f * .45, i * .03)); noise(.16, .08, 700); break;
    case 'splat': noise(.25, .14 * k, 900, 'lowpass', 0, 120); tone(160, .2, 'sine', .07 * k, 50); break;
    case 'boom': noise(.9, .32 * k, 900, 'lowpass', 0, 60); tone(70, .7, 'sine', .22 * k, 30); break;
    case 'snap': noise(.05, .14, 5000, 'highpass'); tone(900, .06, 'square', .03, 300); break;
    case 'crack': noise(.12, .18, 2500, 'bandpass'); tone(200, .15, 'square', .03, 80); break;
    case 'glass': for (let i = 0; i < 6; i++) tone(rand(1800, 3600), .2, 'sine', .03, null, i * .03); noise(.15, .1, 6000, 'highpass'); break;
    case 'rumble': noise(1.4, .12, 300, 'lowpass', .1); break;
    case 'quack': tone(520, .09, 'square', .04, 360); tone(480, .1, 'square', .035, 330, .11); break;
    case 'buzz': { const t = actx.currentTime, o = actx.createOscillator(), v = actx.createGain(), l = actx.createOscillator(), lg = actx.createGain(); o.type = 'sawtooth'; o.frequency.value = 220; l.frequency.value = 30; lg.gain.value = 40; l.connect(lg); lg.connect(o.frequency); v.gain.setValueAtTime(.0001, t); v.gain.exponentialRampToValueAtTime(.05, t + .05); v.gain.exponentialRampToValueAtTime(.0001, t + 2.2); o.connect(v); v.connect(master); o.start(t); l.start(t); o.stop(t + 2.3); l.stop(t + 2.3); break; }
    case 'boing': tone(220, .3, 'sine', .07, 660); tone(660, .25, 'sine', .05, 220, .15); break;
    case 'clank': tone(320, .12, 'square', .04, 180); noise(.08, .08, 3000, 'bandpass'); break;
    case 'thunk': noise(.06, .08 * k, 600); tone(120, .08, 'triangle', .05 * k, 70); break;
    case 'thud': noise(.3, .2, 400, 'lowpass'); tone(80, .3, 'sine', .14, 40); break;
    case 'fuse': noise(1.2, .06, 4000, 'highpass'); break;
    case 'crackle': for (let i = 0; i < 12; i++) noise(.05, .1, 3000, 'bandpass', .4 + i * rand(.08, .16)); break;
    case 'fizz': noise(.4, .1, 6000, 'highpass', 0, 2000); tone(800, .2, 'sine', .03, 1600); break;
    case 'plip': tone(900, .08, 'sine', .04, 1400); break;
    case 'splash': noise(.4, .12, 2000, 'lowpass', 0, 300); break;
    case 'whoosh': noise(.8, .06, 500, 'bandpass', 0, 2000); break;
    case 'whistle': tone(1600, 1.2, 'sine', .04, 300); break;
    case 'deflate': tone(400, .9, 'sawtooth', .025, 80); break;
    case 'twang': tone(330, .6, 'sawtooth', .04, 160); tone(110, .5, 'triangle', .04, 90); break;
    case 'reel': for (let i = 0; i < 6; i++) tone(1400, .03, 'square', .015, null, i * .05); break;
    case 'ding': tone(1320, .3, 'sine', .05); tone(1980, .4, 'sine', .03, null, .08); break;
    case 'chime': [784, 988, 1175, 1568].forEach((f, i) => tone(f, .3, 'triangle', .05, null, i * .07)); break;
    case 'fanfare': [523, 659, 784, 1046].forEach((f, i) => tone(f, .22, 'square', .025, null, i * .09)); break;
    case 'alarm': for (let i = 0; i < 6; i++) tone(i % 2 ? 660 : 880, .22, 'square', .035, null, i * .24); break;
    case 'fail': [392, 330, 262].forEach((f, i) => tone(f, .3, 'triangle', .05, null, i * .16)); break;
    case 'reload': tone(600, .05, 'square', .03); tone(420, .05, 'square', .03, null, .12); break;
    case 'cock': tone(300, .05, 'square', .04); noise(.04, .06, 4000, 'highpass', .05); break;
    case 'click': tone(1200, .03, 'square', .02); break;
    case 'beat': tone(55, .12, 'sine', .09, 40); tone(50, .1, 'sine', .07, 38, .14); break;
    case 'gasp': noise(.35, .05, 1400, 'bandpass'); break;
    case 'lower': noise(.22, .05, 900, 'bandpass', 0, 300); tone(240, .12, 'triangle', .025, 160); break;
    case 'raise': noise(.18, .05, 500, 'bandpass', 0, 1600); tone(160, .1, 'triangle', .025, 260, .06); break;
  }
}
export type Mood = 'festive' | 'tense' | 'win' | 'sad';
export const music = (() => {
  let gain: GainNode | null = null, stepN = 0, nextT = 0, mood: Mood = 'festive', muted = false;
  const scales = { festive: [0, 2, 4, 7, 9, 12, 14, 16], tense: [0, 1, 3, 6, 7, 8, 12, 13], win: [0, 4, 7, 12, 16, 19], sad: [0, 3, 7, 10, 12] };
  const prog = { festive: [0, 5, 7, 5], tense: [0, 1, 0, 6], win: [0, 5, 7, 0], sad: [0, 8, 5, 7] };
  const r = rng(11); const mel = Array.from({ length: 32 }, () => r() < .62 ? Math.floor(r() * 8) : -1);
  function note(semi: number, t: number, dur: number, type: OscillatorType, vol: number) {
    if (!actx || !gain) return;
    const o = actx.createOscillator(), v = actx.createGain();
    o.type = type; o.frequency.value = 261.6 * Math.pow(2, semi / 12);
    v.gain.setValueAtTime(.0001, t); v.gain.exponentialRampToValueAtTime(vol, t + .01); v.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(v); v.connect(gain); o.start(t); o.stop(t + dur + .02);
  }
  function tick() {
    if (!actx) return;
    const bpm = mood === 'tense' ? 150 : mood === 'sad' ? 80 : 118, s8 = 60 / bpm / 2;
    while (nextT < actx.currentTime + .25) {
      const bar = Math.floor(stepN / 8) % 4, root = prog[mood][bar] - 12, sc = scales[mood], i = stepN % 8;
      if (!muted && G.started && !G.paused) {
        if (i % 4 === 0) note(root - 12, nextT, s8 * 1.6, 'triangle', .05);
        if (i % 4 === 2) { note(root + 4 - (mood === 'tense' || mood === 'sad' ? 1 : 0), nextT, s8 * .7, 'triangle', .022); note(root + 7, nextT, s8 * .7, 'triangle', .02); }
        const m = mel[stepN % 32];
        if (m >= 0 && !(G.flags.banjoBroken && mood === 'festive')) note(sc[m % sc.length] + (mood === 'tense' ? 0 : 12), nextT, s8 * .9, mood === 'tense' ? 'sawtooth' : 'square', mood === 'tense' ? .012 : .014);
        if (mood === 'tense' && i % 2 === 0) note(36, nextT, .05, 'square', .01);
      }
      nextT += s8; stepN++;
    }
  }
  return {
    start() { if (!actx || !master) return; gain = actx.createGain(); gain.gain.value = .6; gain.connect(master); nextT = actx.currentTime + .1; setInterval(tick, 80); },
    setMood(m: Mood) { mood = m; },
    mute(m: boolean) { muted = m; }
  };
})();

