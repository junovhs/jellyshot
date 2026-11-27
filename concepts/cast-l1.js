// Level 1 cast (docs/levels/01-spring-break-boardwalk.md) as jelly specs for concepts/jelly-rig.js.
// Outfits only use what the kit has so far; where the brief asks for a 2D piece that isn't drawn yet (DEC-07),
// the note says so. Sizes: an adult is ~.66, kids ~.38, the Moes and Rick ~.9.
const C = { lemon: '#ffd84a', pink: '#ff86c4', orange: '#ff9a3c', grape: '#a68cff', blue: '#4a8dff', mint: '#4fdcb9', cherry: '#ff5a6e', aqua: '#3cc8e0', lime: '#8ad84a', straw: '#ff7aa8',
  lobster: '#ff6a4a', silver: '#c8ccd8', sand: '#f2c88a', teal: '#2fc4a8', navy: '#5a6aff' };
const hawaii = (ground, flowers) => ['hawaiian shirt', { ground, flowers }];
export const CAST = [
  // targets, client, guards
  { name: 'Brayden "Moonboy" Kessler', role: 'target · crypto bro', zone: 'Pier', col: C.lemon, size: .7, hat: ['backwards cap', { col: '#2a2035' }], extras: ['aviators', 'gold chain'], prop: 'phone', beh: 'phone', target: true },
  { name: 'Skylar Lux', role: 'target · influencer', zone: 'Beach', col: C.pink, size: .66, hat: ['sun hat', { col: '#fff1d6', band: '#ff4f9a' }], extras: ['cat-eye shades'], prop: 'selfie stick', beh: 'selfie', target: true },
  { name: '"Big" Rick Gillis', role: 'target · resort owner', zone: 'Boardwalk', col: C.orange, size: .92, hat: 'captain hat', paints: [hawaii('#1f8fa0')], prop: 'cigar', beh: 'smoking', target: true },
  { name: 'Doris Pembrook', role: 'client · retiree', zone: 'Pier', col: C.grape, size: .6, hat: ['visor', { col: '#fff', bill: '#ff86c4' }], extras: [], beh: 'idle', note: 'Knitting needles are a 2D prop to draw.' },
  { name: 'Chip', role: 'lifeguard', zone: 'Beach tower A', col: C.cherry, size: .7, hat: 'lifeguard hat', paints: ['zinc', 'lifeguard tank'], extras: ['whistle'], beh: 'scanning', propL: 'binoculars' },
  { name: 'Marisol', role: 'lifeguard', zone: 'Beach tower B', col: C.aqua, size: .68, hat: 'lifeguard hat', paints: ['zinc', 'lifeguard tank'], extras: ['whistle'], beh: 'scanning', propL: 'binoculars' },
  { name: 'Trent', role: 'lifeguard', zone: 'Pool deck', col: C.lime, size: .68, hat: 'lifeguard hat', paints: ['zinc', 'lifeguard tank'], extras: ['whistle', 'wraparounds'], beh: 'scanning' },
  { name: 'Officer Gary Plunk', role: 'beach patrol', zone: 'Beach (ATV)', col: C.blue, size: .72, hat: ['backwards cap', { col: '#22305a' }], extras: ['aviators'], beh: 'idle', note: 'Ticket book is 2D; the cap should face forward (kit has backwards only).' },
  { name: 'Big Moe', role: 'bouncer', zone: 'Pool gate', col: '#6a5aff', size: .9, hat: ['bucket hat', { col: '#2a2035' }], extras: ['wraparounds'], beh: 'idle', note: 'Brief wants a bouncer beanie; stand-in.' },
  { name: 'Little Moe', role: 'bouncer', zone: 'Pool gate', col: '#5a4ae0', size: 1.0, hat: ['bucket hat', { col: '#2a2035' }], extras: ['wraparounds'], beh: 'idle' },
  { name: 'Tank', role: 'bodyguard', zone: 'Follows Brayden', col: '#7a7aa0', size: .86, extras: ['aviators'], beh: 'scanning' },
  // pier
  { name: 'Earl Bassmeyer', role: 'fisher', zone: 'Pier end', col: C.sand, size: .64, hat: 'bucket hat', prop: 'fishing rod', beh: 'fishing' },
  { name: 'Lorna', role: 'vendor · bait shop', zone: 'Pier', col: C.teal, size: .64, hat: ['visor', { col: '#2fc4a8', bill: '#2a6a8a' }], beh: 'chatting' },
  { name: 'Chet', role: 'mascot handler', zone: 'Pier', col: C.mint, size: .64, hat: ['backwards cap', { col: '#ff6b5a' }], beh: 'napping', eyes: 'sleepy' },
  { name: 'Walt Hutchins', role: 'retiree', zone: 'Pier', col: C.blue, size: .6, hat: ['visor', { col: '#fff', bill: '#3a7aff' }], paints: [hawaii('#ffd84a', ['#3a7aff', '#ff5a6e', '#fff'])], beh: 'chatting' },
  { name: 'Bev Hutchins', role: 'retiree', zone: 'Pier', col: C.straw, size: .58, hat: ['sun hat', { col: '#ffffff', band: '#a68cff' }], beh: 'chatting' },
  { name: 'Sal Trombetta', role: 'retiree', zone: 'Pier', col: C.silver, size: .6, hat: 'bucket hat', beh: 'idle', note: 'Hearing aid is 2D.' },
  { name: 'Kazoo Kevin', role: 'street performer', zone: 'Pier bench', col: C.orange, size: .62, hat: 'bucket hat', prop: 'kazoo', propL: 'tip jar', beh: 'dancing', note: 'One-man band kit to build.' },
  { name: 'Jaxon', role: 'hype man', zone: 'Pier', col: C.lime, size: .66, hat: ['backwards cap', { col: '#ffd84a' }], extras: ['gold chain'], prop: 'phone', beh: 'cheering' },
  // boardwalk
  { name: 'Rosa', role: 'vendor · margaritas', zone: 'Boardwalk', col: C.cherry, size: .64, prop: ['drink', { col: '#8ad84a' }], beh: 'chatting' },
  { name: 'Hot Dog Hal', role: 'vendor · hot dogs', zone: 'Boardwalk', col: C.lemon, size: .7, hat: 'paper hat', prop: 'hot dog', beh: 'chatting' },
  { name: 'Vinnie Spray', role: 'vendor · airbrush', zone: 'Boardwalk', col: C.grape, size: .64, hat: ['backwards cap', { col: '#ff4f9a' }], paints: [hawaii('#2a2035', ['#ff4f9a', '#7fffe0', '#ffd84a'])], beh: 'idle' },
  { name: 'Tyler', role: 'arcade kid', zone: 'Arcade', col: C.blue, size: .48, hat: ['backwards cap', { col: '#3cc8a0' }], beh: 'idle' },
  { name: 'Gator Gus', role: 'vendor · mini-golf', zone: 'Mini-golf', col: C.lime, size: .62, hat: ['visor', { col: '#2f8a3a', bill: '#ffd84a' }], beh: 'chatting', note: 'Dentures are 2D.' },
  { name: 'Pam', role: 'vendor · souvenirs', zone: 'Boardwalk', col: C.straw, size: .62, hat: ['sun hat', { col: '#ffd84a', band: '#3a7aff' }], beh: 'waving' },
  { name: 'Silver Steve', role: 'living statue', zone: 'Boardwalk', col: C.silver, size: .7, beh: 'statue' },
  { name: 'Craig Feldman', role: 'tourist parent', zone: 'Boardwalk', col: C.lobster, size: .7, hat: 'bucket hat', paints: [hawaii('#3a7aff'), 'tan lines'], beh: 'walking', note: 'Map is a 2D prop to draw.' },
  { name: 'Linda Feldman', role: 'tourist parent', zone: 'Boardwalk', col: C.pink, size: .66, hat: ['visor', { col: '#fff', bill: '#ff4f9a' }], beh: 'walking' },
  { name: 'Mason Feldman', role: 'kid', zone: 'Boardwalk', col: C.orange, size: .38, hat: 'bucket hat', beh: 'walking' },
  { name: 'Ava Feldman', role: 'kid', zone: 'Boardwalk', col: C.mint, size: .36, beh: 'walking' },
  { name: 'Kayden', role: 'teen', zone: 'Pool gate', col: C.aqua, size: .52, hat: ['backwards cap', { col: '#ff6b5a' }], extras: ['wraparounds'], beh: 'idle' },
  // beach
  { name: 'Brock', role: 'volleyball · Thunderthighs', zone: 'Volleyball', col: C.orange, size: .74, paints: ['board shorts', 'tan lines'], extras: ['wraparounds'], beh: 'volleyball' },
  { name: 'Duke', role: 'volleyball · Thunderthighs', zone: 'Volleyball', col: C.cherry, size: .74, paints: ['board shorts'], hat: ['backwards cap', { col: '#ff8a3c' }], beh: 'volleyball' },
  { name: 'Jess', role: 'volleyball · Sandy Cheeks', zone: 'Volleyball', col: C.mint, size: .66, hat: ['visor', { col: '#fff', bill: '#2fc4a8' }], beh: 'volleyball' },
  { name: 'Bree', role: 'volleyball · Sandy Cheeks', zone: 'Volleyball', col: C.aqua, size: .66, extras: ['wraparounds'], beh: 'volleyball' },
  { name: 'Ref Dennis', role: 'referee', zone: 'Volleyball', col: C.lemon, size: .64, paints: ['ref stripes'], hat: ['backwards cap', { col: '#1c1426' }], extras: ['whistle'], beh: 'idle' },
  { name: 'Glenda', role: 'sunbather', zone: 'Beach', col: C.lobster, size: .66, hat: ['visor', { col: '#fff', bill: '#ff8a3c' }], extras: ['cat-eye shades'], paints: ['tan lines'], beh: 'sunbathing' },
  { name: 'Ronnie Fitch', role: 'conspiracy guy', zone: 'Beach', col: C.sand, size: .64, hat: 'bucket hat', extras: ['aviators'], prop: 'metal detector', beh: 'walking' },
  { name: 'Lily', role: 'kid', zone: 'Sandcastle', col: C.straw, size: .38, hat: ['sun hat', { col: '#ff86c4', band: '#ffd84a' }], beh: 'eating' },
  { name: 'Ollie', role: 'kid', zone: 'Sandcastle', col: C.lime, size: .36, hat: 'bucket hat', beh: 'idle' },
  { name: 'Marcus', role: 'sleeping parent', zone: 'Beach', col: C.blue, size: .7, paints: [hawaii('#ff8a3c')], beh: 'napping', eyes: 'sleepy' },
  { name: 'Devin', role: 'first date', zone: 'Beach', col: C.grape, size: .66, extras: ['aviators'], beh: 'chatting' },
  { name: 'Priya', role: 'first date', zone: 'Beach', col: C.mint, size: .62, hat: ['sun hat', { col: '#fff1d6', band: '#2fc4a8' }], beh: 'idle' },
  { name: 'Tony', role: 'fighting couple', zone: 'Beach', col: C.orange, size: .68, hat: ['backwards cap', { col: '#2a5acc' }], beh: 'chatting' },
  { name: 'Gina', role: 'fighting couple', zone: 'Beach', col: C.cherry, size: .64, extras: ['cat-eye shades'], beh: 'chatting' },
  { name: 'Uncle Rudy', role: 'drunk uncle', zone: 'Beach chair', col: C.lobster, size: .72, hat: 'soda-can hat', paints: [hawaii('#e8343c')], beh: 'napping', eyes: 'sleepy' },
  { name: 'Kai', role: 'surfer', zone: 'Water', col: C.aqua, size: .66, paints: ['board shorts'], beh: 'floating', note: 'Bandana and surfboard to build.' },
  { name: 'Frosty Frank', role: 'vendor · ice cream', zone: 'Beach', col: '#e8f4ff', size: .68, hat: 'paper hat', prop: 'ice cream', beh: 'walking' },
  // pool deck
  { name: 'DJ Turbo Splash', role: 'DJ', zone: 'Pool deck', col: C.grape, size: .68, hat: ['backwards cap', { col: '#7fffe0' }], extras: ['wraparounds', 'gold chain'], beh: 'djing' },
  { name: 'Tiki Tom', role: 'bartender', zone: 'Tiki bar', col: C.orange, size: .66, paints: [hawaii('#ff4f9a', ['#ffd84a', '#fff'])], prop: 'drink', beh: 'chatting' },
  { name: 'Floatie Phil', role: 'pool floater', zone: 'Pool', col: C.lemon, size: .64, hat: 'swim cap', extras: ['aviators'], beh: 'floating' },
  { name: 'Madison', role: "influencer's assistant", zone: 'Pool deck', col: C.straw, size: .6, hat: ['sun hat', { col: '#ff86c4', band: '#fff' }], prop: 'phone', beh: 'phone', note: 'Ring light is 2D.' },
  { name: 'Brody', role: 'spring breaker', zone: 'Pool deck', col: C.cherry, size: .7, hat: ['backwards cap', { col: '#ffffff' }], paints: ['board shorts'], prop: 'drink', beh: 'cheering' },
  { name: 'Zack', role: 'spring breaker', zone: 'Pool deck', col: C.blue, size: .68, extras: ['wraparounds'], prop: 'drink', beh: 'dancing' },
  { name: 'Felicia', role: 'resort manager', zone: 'Pool deck', col: C.mint, size: .64, beh: 'walking', note: 'Clipboard is 2D.' },
  { name: 'Benny', role: 'waiter', zone: 'Pool deck', col: C.silver, size: .62, prop: 'drink', beh: 'walking', note: 'Drinks tray to build.' },
  // water and marina
  { name: 'Darnell', role: 'vendor · jet skis', zone: 'Dock', col: C.teal, size: .7, hat: ['visor', { col: '#fff', bill: '#2fc4a8' }], extras: ['wraparounds'], beh: 'chatting' },
  { name: 'Captain Lou', role: 'boat operator', zone: 'Parasail boat', col: C.sand, size: .7, hat: ['captain hat', { stack: 3 }], beh: 'idle' },
  { name: 'Pierre', role: 'yacht steward', zone: 'Moonshot', col: '#f4f4ff', size: .64, prop: ['drink', { col: '#fff3c0' }], beh: 'idle' },
  { name: 'Ziggy', role: 'deckhand', zone: 'Moonshot', col: C.lime, size: .62, hat: ['backwards cap', { col: '#22305a' }], beh: 'napping', eyes: 'sleepy' },
  { name: 'Sparky', role: 'fireworks tech', zone: 'Barge', col: C.orange, size: .66, hat: ['backwards cap', { col: '#e8343c' }], prop: 'cigar', beh: 'smoking', note: 'Tattoo paint to add.' },
  { name: 'Stan', role: 'lost kayaker', zone: 'Water', col: C.grape, size: .62, hat: 'bucket hat', beh: 'floating' },
];
export const BY_NAME = Object.fromEntries(CAST.map(c => [c.name, c]));
// the crowd's outfit pool: zero or one level 1 piece each, so targets never stand out by being dressed
export const CROWD_KIT = {
  beach: [null, null, 'bucket hat', ['sun hat', {}], ['visor', {}], ['backwards cap', {}], 'paints:board shorts', 'paints:tan lines', 'extras:wraparounds'],
  pool: [null, ['backwards cap', {}], 'extras:wraparounds', 'paints:board shorts', 'prop:drink', 'prop:drink'],
  boardwalk: [null, null, 'bucket hat', ['visor', {}], 'paints:hawaiian shirt', 'prop:ice cream', 'prop:hot dog', 'prop:drink'],
  pier: [null, ['visor', {}], ['sun hat', {}], 'bucket hat', 'paints:hawaiian shirt'],
};
export function crowdSpec(zone) {
  const pickA = a => a[Math.floor(Math.random() * a.length)];
  const k = pickA(CROWD_KIT[zone]), s = {};
  if (k == null) return s;
  if (typeof k === 'string' && k.startsWith('paints:')) s.paints = [k.slice(7)];
  else if (typeof k === 'string' && k.startsWith('extras:')) s.extras = [k.slice(7)];
  else if (typeof k === 'string' && k.startsWith('prop:')) s.prop = k.slice(5);
  else s.hat = k;
  return s;
}
