'use strict';
/* =====================================================================
   JELLYSHOT — contract data: world layout, cast, schedules, dialogue,
   challenges and progression. Everything that makes the Jubilee tick.
   ===================================================================== */

const WORLD = { w: 2000, h: 1300 };
const MISSION_LEN = 300; // seconds of festival
const TAU = Math.PI * 2;

const PAL = {
  pink: ['#ff599c', '#ffd0e5', '#ba2871'],
  lime: ['#83dc65', '#dcffac', '#409c49'],
  sky: ['#57c9f6', '#c1f6ff', '#2688bd'],
  gold: ['#ffcc4c', '#fff5b0', '#d58c21'],
  grape: ['#b882f5', '#f0d9ff', '#7951be'],
  peach: ['#ff9464', '#ffe0ae', '#d35b42'],
  mint: ['#5fe0c0', '#d4fff2', '#2a9c86'],
  berry: ['#e0457a', '#ffc2d6', '#9c1f4f'],
  cocoa: ['#c38a66', '#f3d9c4', '#86543a'],
  navy: ['#6a86ea', '#dbe2ff', '#3a4fae'],
  lemon: ['#f2e85a', '#fffbc8', '#b5a51e'],
  rose: ['#ff8fb0', '#ffe3ec', '#c95378']
};
const PAL_KEYS = Object.keys(PAL);

/* ---------- key places ---------- */
const LOC = {
  fountain: { x: 1000, y: 640 },
  podium: { x: 1000, y: 302 },
  shed: { x: 1262, y: 300 },
  pieTable: { x: 560, y: 492 },
  oven: { x: 660, y: 462 },
  gumball: { x: 300, y: 222 },
  dock: { x: 580, y: 908 },
  hive: { x: 1628, y: 650 },
  bench: { x: 1508, y: 712 },
  balloon: { x: 1665, y: 245 },
  maypole: { x: 1350, y: 965 },
  icecream: { x: 790, y: 812 },
  busker: { x: 1165, y: 782 },
  vendor: { x: 872, y: 486 },
  gate: { x: 1000, y: 1292 },
  carriage: { x: 1000, y: 1205 },
  lemonade: { x: 770, y: 1066 },
  cotton: { x: 1232, y: 1066 },
  crane: { x: 1128, y: 262 }
};

const WATER = [
  { id: 'pond', x: 420, y: 935, rx: 235, ry: 132, name: 'the duck pond' },
  { id: 'lily', x: 1560, y: 770, rx: 88, ry: 46, name: 'the lily pond' },
  { id: 'choc', x: 1000, y: 640, rx: 70, ry: 38, name: 'the chocolate fountain' }
];

const BUSHES = [
  { x: 1415, y: 560, rx: 46, ry: 26 }, { x: 1470, y: 545, rx: 40, ry: 22 },
  { x: 1690, y: 720, rx: 44, ry: 26 }, { x: 1440, y: 790, rx: 50, ry: 26 },
  { x: 1700, y: 600, rx: 38, ry: 22 }, { x: 790, y: 230, rx: 52, ry: 26 },
  { x: 1180, y: 432, rx: 40, ry: 22 }, { x: 650, y: 690, rx: 46, ry: 24 },
  { x: 230, y: 470, rx: 52, ry: 26 }, { x: 1580, y: 1000, rx: 50, ry: 26 },
  { x: 1840, y: 420, rx: 46, ry: 26 }, { x: 140, y: 720, rx: 50, ry: 28 },
  { x: 1300, y: 1180, rx: 44, ry: 24 }, { x: 700, y: 1180, rx: 46, ry: 24 }
];

const PATHS = [
  [[1000, 1300], [1000, 1060], [1000, 760]],
  [[1000, 540], [1000, 360]],
  [[880, 600], [720, 540], [600, 520]],
  [[540, 470], [450, 380], [340, 290]],
  [[1120, 620], [1300, 640], [1480, 650]],
  [[1550, 600], [1620, 420], [1660, 290]],
  [[900, 720], [760, 830], [650, 900]],
  [[1090, 720], [1220, 850], [1330, 940]],
  [[1000, 1060], [780, 1066]], [[1000, 1060], [1232, 1066]],
  [[1110, 420], [1250, 330]]
];

const EXITS = {
  gate: { x: 1000, y: 1300 }
};

/* ---------- festival schedule ---------- */
const PHASES = [
  { t: 0, id: 'arrive', name: 'ARRIVALS', sub: 'Guests mingle in the square' },
  { t: 50, id: 'cake', name: 'THE BIG CAKE CEREMONY', sub: 'The Mayor speaks at the stage' },
  { t: 100, id: 'pie', name: 'THE GREAT PIE JUDGING', sub: 'Judge Gumbo tastes the entries' },
  { t: 160, id: 'maypole', name: 'MAYPOLE MERRIMENT', sub: 'Dancing in the south meadow' },
  { t: 220, id: 'meeting', name: 'THE SYNDICATE MEETING', sub: 'The targets slip away to talk' },
  { t: 270, id: 'farewell', name: 'FAREWELLS', sub: 'Targets head for the exits' }
];

/* ---------- dialogue ---------- */
const LINES = {
  greet: ['Welcome, welcome!', 'Vote Wobbleton!', 'Lovely to see you!', 'Mind the fountain, it\'s chocolate.', 'Have you SEEN my sash?', 'Ha ha! Ha. Ha.'],
  speech: ['Citizens of Gumdrop Hollow!', 'This cake... is a metaphor.', 'Nine years of FAIR jam contests!', 'Applause here, please.', 'I am a humble jelly.', 'The cake is HUGE. Like my heart.'],
  speechAlt: ['The cake fell, but I shall speak!', 'This was ALWAYS the plan.', 'A fountain is basically a stage.', 'Someone fire the crane guy.'],
  chat: ['Did you try the fudge?', 'Lovely weather for it.', 'I heard the Mayor rigs the jam.', 'My cousin is a gummy worm.', 'Is that a new wobble?', 'I could eat this whole fair.', 'Shh, the Baroness is here.', 'I\'ve never been happier!', 'Is something... watching us?', 'This is the best day of my life.'],
  cheer: ['Woo!', 'Cut the cake!', 'Speech! Speech!', 'Hooray!', 'Bravo!', 'Cake! Cake! Cake!'],
  watch: ['Ooh.', 'Look at that!', 'So exciting!', 'I can\'t see!', 'Move your head, Gerald.'],
  present: ['Please let it be me.', 'Gooseberry surprise!', 'My best pie yet!', 'Pick mine, Judge!', 'I used real lard.'],
  taste: ['Mmmf. Adequate.', 'Too much crust.', 'Is this... a bribe?', 'More. For science.', 'This one tastes like money.', 'Hmm. Hmmm. HMMMM.'],
  inspect: ['Dreadful.', 'Crumb structure: weak.', 'Where are the bribes?', 'Who baked THIS?'],
  dance: ['Wheee!', 'Do-si-do!', 'Wobble wobble!', 'Feel the jiggle!', 'Spin me!', 'La la la!'],
  sell_ice: ['Ice cream! Get your ice cream!', 'Two scoops, no waiting!', 'Fresh-churned!', 'Sprinkles are free!'],
  music: ['♪ Oh my darling gumdrop ♪', '♪ plinky plunk ♪', '♪ twang twang ♪', 'Tips appreciated!', '♪ Jelly on the mountain ♪'],
  fish: ['Nothing biting.', 'Patience...', 'In my day, ducks were ducks.', 'C\'mon, little fishy.', 'Zzz... huh?'],
  garden: ['Grow, my pretties.', 'Who trampled the tulips?', 'Mind the bees!', 'Snip snip.'],
  photo: ['Smile, Mayor!', 'Front page!', '*click*', 'One more!', 'Work it!'],
  kid: ['I want ice cream!', 'Mama look!', 'Are we there yet?', 'Wheee!', 'I\'m bored.', 'Can I have a balloon?'],
  kidCone: ['Mmm!', 'Best day ever!', 'Sprinkles!!', 'It\'s melting!'],
  couple: ['I love you.', 'You\'re my gumdrop.', 'Hold my tentacle.', 'Look, a maypole!', 'Promise you\'ll never leave.'],
  guard: ['All clear.', 'Keep moving.', 'Nothing to see here.', 'I love this job.', 'Eyes open.', 'Hmm.'],
  bodyguard: ['Stay close, boss.', 'Perimeter secure.', 'Eyes on the crowd.', 'Nobody touches the client.'],
  guardAlert: ['Body jelly!', 'We have a puddle!', 'Secure the area!', 'Call it in!', 'Everybody stay calm!'],
  panic: ['AAAAH!', 'A PUDDLE!', 'Somebody help!', 'Oh my gumdrops!', 'Was that Doug?!', 'Not again!', 'RUN!'],
  accidentSeen: ['Oh no, an accident!', 'Such a tragedy...', 'Freak accident!', 'Somebody call a mop!'],
  mourn: ['NOOOO!', 'Why?! WHY?!', 'You were so wobbly!', 'Come back to me!', '*sob*', 'Who will hold my tentacle?!'],
  mournKid: ['MAMAAA!', 'PAPA?!', '*waaah*'],
  investigate: ['What was that?', 'Huh?', 'Hello?', 'Did someone drop something?', 'I heard a pew.', 'Weird.'],
  sad: ['My ice cream!', '*sniff*', 'Waaah!', 'Not fair!'],
  argue: ['You sold my kid a cursed cone!', 'Refund! NOW!', 'Unacceptable!', 'Your scoops are flimsy!'],
  argueBack: ['It was a perfectly good cone!', 'No refunds!', 'Physics did that, lady!'],
  crane: ['Rope\'s holding... probably.', 'Don\'t look up, folks.', 'That cake weighs a ton.', 'Who tied this knot?'],
  tinker: ['Fuse... check.', 'Do NOT smoke near these.', 'Big finale tonight!', 'Oops. No. We\'re fine.'],
  sniff: ['Ahh, roses.', 'Mmm, peonies.', 'Is that a bee?', 'Ugh, bees. I loathe bees.'],
  feed: ['Here, ducky ducky!', 'Who\'s a good duck?', 'Quack quack!', 'The ducks love me.'],
  admire: ['Biggest gumball machine in the land.', 'Think of the profits!', 'Glass is a bit thin.', 'Magnificent.'],
  whisper: ['About the jam money...', 'Nobody can know.', 'We split it three ways.', 'Keep your voice down.', 'Granny Marmalade suspects.'],
  leave: ['Well, that was lovely.', 'My carriage awaits!', 'Toodle-oo!', 'Time to go.'],
  flee: ['GET ME OUT OF HERE!', 'TO THE EXIT!', 'Protect me!', 'Not the face!'],
  lockdownCiv: ['Stay down!', 'Is it over?', 'I just came for pie!', 'Mommy...'],
  balloons: ['Balloons! Balloons!', 'One for a penny!', 'Every color!', 'Don\'t let go!'],
  sleep: ['Zzz...', 'Zzzz...', '*snore*'],
  lemonade: ['Fresh lemonade!', 'Ice cold!', 'Sour as my ex!'],
  cotton: ['Cotton candy!', 'Fluffy fluffy!', 'Spun fresh!'],
  granny: ['That cheat Gumbo...', 'Nine years. NINE.', 'Revenge is a pie best served cold.', 'Heh heh heh.'],
  boo: ['Booo!', 'Play something!', 'Lame!', 'Aww.'],
  bees: ['BEES!!', 'NOT THE BEES!', 'AAAH BEES!'],
  sadBusker: ['My banjo...', 'She was a family heirloom.', 'The show must go... on?'],
  bobber: ['Got one! ...a boot?', 'A BOOT!', 'Finally! ...oh.'],
  mc: ['Give it up for the Mayor!', 'Let\'s hear it!', 'Isn\'t this magical?', 'Testing, testing.'],
  dazed: ['Whoa...', '@#%!', 'Who pushed me?', 'My wobble!'],
  shocked: ['WHERE\'D SHE GO?', 'THE CAKE!', 'Is that... frosting?', 'Oh dear.'],
  meeting_reroute: ['The shed is GONE. Garden bench.', 'Bench. Now.', 'This is a sign.'],
  balloonGone: ['My balloon! Carriage it is.'],
  vendorChase: ['MY BALLOONS!', 'Come back!', 'That\'s my whole stock!']
};

/* ---------- the handler (your voice in the ear) ---------- */
const HANDLER = {
  intro: [
    'Afternoon. Welcome to the Gumdrop Jubilee.',
    'Three marks: the Mayor, the Baroness, the Judge. The Sugarplum Syndicate.',
    'Our client wants them popped before the festival ends. Accidents preferred. Discretion appreciated.'
  ],
  arrivals: 'The Mayor and the Baroness are chatting by the chocolate fountain. That pump beside it has been making noises all morning.',
  cakeSoon: 'The Mayor takes the stage soon. That cake is hanging by one sad little rope.',
  cake: 'Ceremony\'s on. All three marks are on that stage. Just saying.',
  pie: 'Pie judging. Gumbo is tasting next to an oven that has never passed inspection.',
  pie2: 'The Mayor is feeding ducks on the dock. Docks are only as strong as their posts.',
  pie3: 'The Baroness is sniffing flowers by a beehive. She hates bees. Interesting.',
  maypole: 'Maypole time. The Baroness is dancing. The Mayor and the Judge are ogling that gumball machine on the hill.',
  meeting: 'They\'re meeting in private by the fireworks shed. Fireworks are famously stable.',
  meetingAlt: 'Shed\'s gone, so they\'ve moved to the garden bench. Under the beehive. Of course they have.',
  farewell: 'They\'re leaving. Baroness to her balloon, the rest to the carriage at the south gate. Last chance.',
  lockdown: 'They know. Lockdown — the marks are running for the exits. Stop them.',
  suspicious: 'People are getting twitchy. Ease off for a bit.',
  accident: ['Tragic. Truly. Nobody will suspect a thing.', 'An accident. How unfortunate.', 'Lovely work. Very... sticky.'],
  pop: ['Mark down.', 'That\'s one less Syndicate member.', 'Clean.', 'Splendid splatter.'],
  allDown: 'All three marks popped. Leave whenever you like... or don\'t. Nobody\'s stopping you.',
  client: 'You just popped the CLIENT. Who exactly is paying us now?',
  collateral: 'That\'s a lot of collateral. I\'m not judging. Much.',
  escape: 'A mark escaped. The client will not be pleased.',
  reroute: 'Cake\'s down early. Mayor\'s moving his speech to the fountain. Improvising, are we?',
  balloonDown: 'Balloon\'s grounded. The Baroness will have to leave by carriage.',
  kid: 'You shot a child\'s ice cream. I want that noted in your file.',
  banjo: 'You killed the music. Literally.',
  ghostLost: 'Someone found a puddle. So much for a ghost run.',
  oneMin: 'One minute left. They\'ll be gone soon.',
  quiet: ['Patience. Watch their routines.', 'Everyone here has a schedule. Learn it.', 'Linger your scope on odd things. Opportunities hide in plain sight.']
};

/* ---------- people ---------- */
const TARGET_INFO = {
  mayor: {
    name: 'Mayor Wobbleton', short: 'MAYOR',
    dossier: 'Host of the Jubilee. Rigged the Great Jam Contest nine years running. Loves ducks, speeches and the sound of his own wobble.',
    sched: ['Greets guests at the chocolate fountain', 'Speech under the Big Cake (0:50)', 'Feeds ducks on the dock (1:40)', 'Admires the gumball machine (2:40)', 'Secret meeting (3:40)', 'Carriage at the south gate (4:30)']
  },
  baroness: {
    name: 'Baroness Fondant', short: 'BARONESS',
    dossier: 'Sugar tycoon. Owns every beet for 400 miles. Arrives by hot air balloon. Loathes bees. Adores dancing.',
    sched: ['Lands by balloon, chats at the fountain', 'Stands beside the podium (0:50)', 'Sniffs flowers in the garden (1:40)', 'Dances around the maypole (2:40)', 'Secret meeting (3:40)', 'Leaves by balloon (4:30)']
  },
  judge: {
    name: 'Judge Gumbo', short: 'JUDGE',
    dossier: 'Pie judge. Has never awarded a ribbon he didn\'t get a cut of. Will eat absolutely anything placed in front of him.',
    sched: ['Inspects the pie tent', 'Stands on stage for the cake (0:50)', 'Tastes pies beside the oven (1:40)', 'Admires the gumball machine (2:40)', 'Secret meeting (3:40)', 'Carriage at the south gate (4:30)']
  }
};

const OPPS = {
  cake: { name: 'The Big Cake', hint: 'A one-ton cake dangles over the podium by a single rope. The ceremony starts at 0:50.' },
  oven: { name: 'The Rickety Oven', hint: 'The pie tent oven is held together with hope. A shot will make it overheat… and blow.' },
  gumball: { name: 'Giant Gumball Machine', hint: 'Thin glass. Lots of gumballs. A steep path downhill.' },
  dock: { name: 'The Duck Dock', hint: 'Two wobbly posts hold up the dock. Anyone on it goes for a swim. Jellies can\'t swim.' },
  hive: { name: 'The Beehive', hint: 'Angry bees chase anyone nearby straight into the lily pond.' },
  maypole: { name: 'The Maypole', hint: 'Shoot the topknot and the pole topples south. Timing is everything.' },
  balloon: { name: 'The Baroness\'s Balloon', hint: 'Pop it on the ground to strand her. Pop it in the air for something… worse.' },
  fireworks: { name: 'Fireworks Crates', hint: 'Enough fireworks for a finale. Very flammable. Very loud.' },
  icecream: { name: 'Ice Cream Cones', hint: 'Kids carry cones. Cones can be… shot.' },
  banjo: { name: 'Banjo Bill\'s Banjo', hint: 'Snap a string, stop the music, ruin the dance.' },
  bobber: { name: 'The Fishing Bobber', hint: 'Old Finnegan has been waiting all day for a bite.' },
  bunch: { name: 'The Balloon Bunch', hint: 'Bubbles the vendor holds an entire bouquet of balloons.' },
  pump: { name: 'Fountain Pump', hint: 'The chocolate fountain’s pump is over-pressurised. Shoot it and anyone at the rim gets fondue’d. The Mayor and the Baroness chat there until 0:50.' },
  fountain: { name: 'The Chocolate Fountain', hint: 'Anything popped in the chocolate is hidden from view. Same goes for ponds and bushes.' }
};

/* civilians: built by plan helpers in npc.js */
const CAST_CIVS = [
  // id, name, role, col, size, hat, kind-specific
  { id: 'granny', name: 'Granny Marmalade', role: 'Pie contestant · the client', col: 'cocoa', hat: 'bonnet', plan: 'contestant', slot: 0, lines: 'granny' },
  { id: 'barnaby', name: 'Barnaby Crumb', role: 'Pie contestant', col: 'gold', hat: 'none', plan: 'contestant', slot: 1 },
  { id: 'pip', name: 'Pip Strudel', role: 'Pie contestant', col: 'mint', hat: 'bow', plan: 'contestant', slot: 2 },
  { id: 'muffy', name: 'Muffy Tartlet', role: 'Pie contestant', col: 'rose', hat: 'bonnet', plan: 'contestant', slot: 3 },
  { id: 'sam', name: 'Sundae Sam', role: 'Ice cream vendor', col: 'sky', hat: 'paper', plan: 'vendor', at: [790, 790], act: 'sell', lines: 'sell_ice', label: 'Scooping ice cream' },
  { id: 'lou', name: 'Lemony Lou', role: 'Lemonade vendor', col: 'lemon', hat: 'paper', plan: 'vendor', at: [770, 1046], act: 'sell', lines: 'lemonade', label: 'Squeezing lemons' },
  { id: 'flo', name: 'Candy Floss Flo', role: 'Cotton candy vendor', col: 'pink', hat: 'paper', plan: 'vendor', at: [1232, 1046], act: 'sell', lines: 'cotton', label: 'Spinning cotton candy' },
  { id: 'bubbles', name: 'Bubbles', role: 'Balloon vendor', col: 'sky', hat: 'beanie', plan: 'vendor', at: [872, 492], act: 'sell', lines: 'balloons', label: 'Selling balloons', item: 'bunch' },
  { id: 'bill', name: 'Banjo Bill', role: 'Busker', col: 'peach', hat: 'straw', plan: 'vendor', at: [1165, 776], act: 'music', lines: 'music', label: 'Playing the banjo', item: 'banjo' },
  { id: 'finn', name: 'Old Finnegan', role: 'Fisherman', col: 'navy', hat: 'straw', plan: 'fisher', item: 'rod' },
  { id: 'hedge', name: 'Hedgeworth', role: 'Gardener', col: 'lime', hat: 'straw', plan: 'gardener', item: 'can' },
  { id: 'kranz', name: 'Cranky Kranz', role: 'Crane operator', col: 'gold', hat: 'hard', plan: 'crane' },
  { id: 'flash', name: 'Flash Fizzwick', role: 'Press photographer', col: 'mint', hat: 'beret', plan: 'follow', who: 'mayor', off: [42, 16], act: 'photo', lines: 'photo', label: 'Photographing the Mayor', item: 'camera' },
  { id: 'sprinkles', name: 'MC Sprinkles', role: 'Master of ceremonies', col: 'berry', hat: 'tophat2', plan: 'mc' },
  { id: 'gelato', name: 'Mama Gelato', role: 'Festival-goer · mother of two', col: 'rose', hat: 'bow', plan: 'attendee', home: 'icecream', alt: 'plaza', dances: false },
  { id: 'jujube', name: 'Lil Jujube', role: 'Child', col: 'gold', hat: 'none', plan: 'kid', parent: 'gelato', kid: true },
  { id: 'tapioca', name: 'Tot Tapioca', role: 'Child', col: 'lime', hat: 'cap', plan: 'kid', parent: 'gelato', kid: true },
  { id: 'praline', name: 'Papa Praline', role: 'Festival-goer · father of two', col: 'cocoa', hat: 'cap', plan: 'attendee', home: 'busker', alt: 'stalls', dances: true },
  { id: 'bonbon', name: 'Baby Bonbon', role: 'Child', col: 'pink', hat: 'bow', plan: 'kid', parent: 'praline', kid: true },
  { id: 'kiwi', name: 'Kid Kiwi', role: 'Child', col: 'mint', hat: 'cap', plan: 'kid', parent: 'praline', kid: true },
  { id: 'gerald', name: 'Gerald', role: 'Festival-goer · madly in love with Gloria', col: 'navy', hat: 'none', plan: 'attendee', home: 'plaza', alt: 'garden', dances: true, partner: 'gloria' },
  { id: 'gloria', name: 'Gloria', role: 'Festival-goer · madly in love with Gerald', col: 'pink', hat: 'bow', plan: 'partner', who: 'gerald', partner: 'gerald' },
  { id: 'dmitri', name: 'Dmitri', role: 'Festival-goer · engaged to Dot', col: 'grape', hat: 'beret', plan: 'attendee', home: 'pondside', alt: 'stalls', dances: true, partner: 'dot' },
  { id: 'dot', name: 'Dot', role: 'Festival-goer · engaged to Dmitri', col: 'lemon', hat: 'none', plan: 'partner', who: 'dmitri', partner: 'dmitri' },
  { id: 'clive', name: 'Clive', role: 'Festival-goer · on a first date', col: 'peach', hat: 'cap', plan: 'attendee', home: 'stalls', alt: 'busker', dances: false, partner: 'clem' },
  { id: 'clem', name: 'Clementine', role: 'Festival-goer · on a first date', col: 'mint', hat: 'bonnet', plan: 'partner', who: 'clive', partner: 'clive' },
  { id: 'tess', name: 'Tess Twirl', role: 'Dancer', col: 'rose', hat: 'bow', plan: 'dancer', slot: 0 },
  { id: 'hal', name: 'Hopscotch Hal', role: 'Dancer', col: 'sky', hat: 'cap', plan: 'dancer', slot: 1 },
  { id: 'pam', name: 'Polka Pam', role: 'Dancer', col: 'lemon', hat: 'bow', plan: 'dancer', slot: 2 },
  { id: 'fudge', name: 'Sir Fudgington', role: 'Festival-goer · minor nobility', col: 'cocoa', hat: 'tophat2', plan: 'attendee', home: 'plaza', alt: 'garden', dances: false },
  { id: 'wanda', name: 'Wobbly Wanda', role: 'Festival-goer', col: 'grape', hat: 'bonnet', plan: 'attendee', home: 'stalls', alt: 'plaza', dances: true },
  { id: 'nibbles', name: 'Nibbles', role: 'Festival-goer · always hungry', col: 'gold', hat: 'none', plan: 'attendee', home: 'pie', alt: 'stalls', dances: false },
  { id: 'tim', name: 'Taffy Tim', role: 'Festival-goer', col: 'berry', hat: 'cap', plan: 'attendee', home: 'busker', alt: 'pondside', dances: true },
  { id: 'gwen', name: 'Gumdrop Gwen', role: 'Festival-goer', col: 'lime', hat: 'bow', plan: 'attendee', home: 'garden', alt: 'plaza', dances: true },
  { id: 'chuck', name: 'Chewy Chuck', role: 'Festival-goer', col: 'peach', hat: 'beanie', plan: 'attendee', home: 'pondside', alt: 'icecream', dances: false },
  { id: 'mallory', name: 'Marsh Mallory', role: 'Festival-goer', col: 'rose', hat: 'none', plan: 'attendee', home: 'plaza', alt: 'busker', dances: true },
  { id: 'lars', name: 'Licorice Lars', role: 'Festival-goer · suspicious type', col: 'navy', hat: 'beanie', plan: 'attendee', home: 'garden', alt: 'stalls', dances: false }
];

const CAST_GUARDS = [
  { id: 'g_mayor', name: 'Officer Gumm', role: 'Bodyguard · protects the Mayor', follow: 'mayor', off: [-34, 10] },
  { id: 'g_baroness', name: 'Sgt. Drops', role: 'Bodyguard · protects the Baroness', follow: 'baroness', off: [34, 10] },
  { id: 'g_judge', name: 'Constable Chew', role: 'Bodyguard · protects the Judge', follow: 'judge', off: [-32, 12] },
  { id: 'g_plaza', name: 'Deputy Fizz', role: 'Guard · plaza patrol', patrol: [[860, 560], [1140, 560], [1160, 730], [850, 740]] },
  { id: 'g_stage', name: 'Officer Nougat', role: 'Guard · stage patrol', patrol: [[850, 420], [1150, 420], [1250, 360], [1180, 300], [1300, 300]] },
  { id: 'g_garden', name: 'Cadet Taffy', role: 'Guard · garden patrol', patrol: [[1420, 640], [1600, 600], [1640, 380], [1560, 690], [1400, 720]] }
];

/* ---------- challenges (hour to hour) ---------- */
const CHALLENGES = [
  { id: 'cake', group: 'Assassinations', name: 'Let Them Eat Cake', desc: 'Pop a target with the Big Cake.' },
  { id: 'fondue', group: 'Assassinations', name: 'Fondue for Two', desc: 'Pop the Mayor and the Baroness together with the fountain pump.' },
  { id: 'cake3', group: 'Assassinations', name: 'Party\'s Over', desc: 'Pop all three targets with the Big Cake.' },
  { id: 'oven', group: 'Assassinations', name: 'Half-Baked', desc: 'Pop Judge Gumbo with the oven.' },
  { id: 'gumball', group: 'Assassinations', name: 'Gumball Wizard', desc: 'Pop a target with the gumball avalanche.' },
  { id: 'dock', group: 'Assassinations', name: 'Sleeps With the Fishies', desc: 'Drop the Mayor into the pond with the dock.' },
  { id: 'bees', group: 'Assassinations', name: 'Buzzkill', desc: 'Pop a target with the beehive.' },
  { id: 'maypole', group: 'Assassinations', name: 'Pole Position', desc: 'Pop the Baroness with the maypole.' },
  { id: 'balloon', group: 'Assassinations', name: 'What Goes Up', desc: 'Pop the Baroness\'s balloon in mid-air.' },
  { id: 'fireworks', group: 'Assassinations', name: 'Grand Finale', desc: 'Pop all three targets with the fireworks.' },
  { id: 'benchbees', group: 'Assassinations', name: 'Plan Bee', desc: 'Blow the shed early, then bee the rerouted meeting.' },
  { id: 'accidents', group: 'Mastery', name: 'Clean Hands', desc: 'Pop all three targets with accidents.' },
  { id: 'ghost', group: 'Mastery', name: 'Sugar Ghost', desc: 'Finish the contract with no lockdown and no open puddles discovered.' },
  { id: 'heads', group: 'Mastery', name: 'Sharpshooter', desc: 'Pop all three targets with headshots.' },
  { id: 'speed', group: 'Mastery', name: 'Sugar Rush', desc: 'Pop all three targets before 2:00.' },
  { id: 'targetsOnly', group: 'Mastery', name: 'Surgical', desc: 'Finish with only the three targets popped.' },
  { id: 'guards', group: 'Mastery', name: 'Off Duty', desc: 'Pop all six guards.' },
  { id: 'concealed', group: 'Mastery', name: 'Tidy Up', desc: 'Conceal 5 pops in one contract.' },
  { id: 'everyone', group: 'Diabolical', name: 'Total Jubilee', desc: 'Pop every single jelly at the festival.' },
  { id: 'client', group: 'Diabolical', name: 'Breach of Contract', desc: 'Pop Granny Marmalade. The client.' },
  { id: 'widow', group: 'Diabolical', name: 'Heartbreaker', desc: 'Pop a sweetheart, then their grieving partner.' },
  { id: 'coldfeet', group: 'Diabolical', name: 'Cold Feet', desc: 'Pop Dmitri in the middle of his proposal.' },
  { id: 'fizz', group: 'Diabolical', name: 'Dunk Tank', desc: 'Shove a jelly into water with a fizz round.' },
  { id: 'bomb', group: 'Diabolical', name: 'Overkill', desc: 'Pop 4 jellies with a single sugar bomb.' },
  { id: 'scoop', group: 'Feats', name: 'Scooped', desc: 'Shoot a kid\'s ice cream cone.' },
  { id: 'banjo', group: 'Feats', name: 'Tough Crowd', desc: 'Snap Banjo Bill\'s banjo.' },
  { id: 'fish', group: 'Feats', name: 'Fish Story', desc: 'Shoot Old Finnegan\'s bobber.' },
  { id: 'balloons', group: 'Feats', name: 'Up, Up & Away', desc: 'Free all of Bubbles\'s balloons.' },
  { id: 'reroute', group: 'Feats', name: 'Plan B', desc: 'Drop the cake before the ceremony begins.' },
  { id: 'ducks', group: 'Collectibles', name: 'Quackers', desc: 'Shoot all 6 rubber ducks.' },
  { id: 'gnomes', group: 'Collectibles', name: 'Gnome Alone', desc: 'Shoot all 5 gumdrop gnomes. Each one hides the next.' },
  { id: 'opps', group: 'Collectibles', name: 'Eagle Eye', desc: 'Discover every opportunity in one contract.' }
];

const DUCKS = [[330, 900], [470, 980], [560, 1010], [990, 650], [1585, 772], [250, 960]];
const GNOMES = [[1880, 1200], [120, 1180], [1900, 160], [760, 160], [1460, 1230]];

/* ---------- rifle progression ---------- */
const LEVEL_XP = 6000;
const UNLOCKS = [
  { lvl: 1, text: 'Gummy Rifle · 4-round magazine · 2.0× zoom' },
  { lvl: 2, text: 'Scope upgrade · 2.6× zoom' },
  { lvl: 3, text: 'FIZZ ROUNDS · non-lethal shove (3 per contract)' },
  { lvl: 4, text: 'Extended magazine · 6 rounds' },
  { lvl: 5, text: 'Steady breath · hold 60% longer' },
  { lvl: 6, text: 'SUGAR BOMBS · explosive rounds (2 per contract)' },
  { lvl: 7, text: 'Scope upgrade · 3.2× zoom' },
  { lvl: 8, text: 'Speed loader · 40% faster reloads' },
  { lvl: 10, text: 'Golden Scope · pure bragging rights' }
];
function rifleFor(level) {
  return {
    maxZoom: level >= 7 ? 3.2 : level >= 2 ? 2.6 : 2.0,
    mag: level >= 4 ? 6 : 4,
    fizz: level >= 3 ? 3 : 0,
    bomb: level >= 6 ? 2 : 0,
    breath: level >= 5 ? 1.6 : 1,
    reload: level >= 8 ? 1.0 : 1.65,
    golden: level >= 10
  };
}
