/**
 * The gear registry.
 *
 * Every item a chain references lives here exactly once, so the app can answer questions
 * the chain data alone can't: which plugins show up across the most records, what a given
 * tool costs, and what you can put in its place when you don't own it.
 *
 * `tier` drives almost all of the UI:
 *   hardware — a real box. You are not buying this; the entry exists so the chain is
 *              honest about what was actually in the room, and `emulations` points at the
 *              plugins that model it.
 *   paid     — a plugin you buy.
 *   free     — a plugin that costs nothing. No demo timers, no rent.
 *   stock    — ships with a DAW. Named per-DAW in STOCK_BY_JOB rather than here.
 *
 * `capture: true` marks the physical link in the chain — microphones and interfaces. No
 * plugin substitutes for a transducer, and offering one would be the exact dishonesty this
 * catalog exists to avoid. Capture items only ever appear in a recording chain, which is
 * presented as history rather than as instructions, and they are excluded from the "what
 * can I build" scoring for the same reason.
 *
 * Prices are list price in USD, rounded, and go stale — Waves in particular discounts so
 * hard that list price is close to fiction. They are here for rough ordering, not quoting.
 */

export const CATEGORIES = {
  mic: 'Microphone',
  preamp: 'Preamp',
  eq: 'EQ',
  comp: 'Compressor',
  deesser: 'De-esser',
  channelstrip: 'Channel strip',
  saturation: 'Saturation',
  pitch: 'Pitch / tuning',
  width: 'Doubling / width',
  delay: 'Delay',
  reverb: 'Reverb',
  lofi: 'Lo-fi / degrade',
  limiter: 'Limiter',
  modulation: 'Modulation',
  harmony: 'Harmony',
}

/**
 * What each DAW already gives you for a given job. The single most useful thing this app
 * can tell a beginner is "you already own something that does this" — a $179 EQ and a
 * stock EQ are not the same, but they are far closer than either is to no EQ at all.
 */
export const DAWS = {
  logic: 'Logic Pro',
  ableton: 'Ableton Live',
  flstudio: 'FL Studio',
  protools: 'Pro Tools',
  reaper: 'Reaper',
  studioone: 'Studio One',
}

export const STOCK_BY_JOB = {
  eq: {
    logic: 'Channel EQ',
    ableton: 'EQ Eight',
    flstudio: 'Parametric EQ 2',
    protools: 'EQ3 7-Band',
    reaper: 'ReaEQ',
    studioone: 'Pro EQ3',
  },
  comp: {
    logic: 'Compressor (try the FET or Opto model)',
    ableton: 'Compressor / Glue Compressor',
    flstudio: 'Fruity Compressor / Limiter',
    protools: 'Dyn3 Compressor',
    reaper: 'ReaComp',
    studioone: 'Compressor / Fat Channel',
  },
  deesser: {
    logic: 'DeEsser 2',
    ableton: 'Multiband Dynamics (high band only)',
    flstudio: 'Maximus (high band)',
    protools: 'Dyn3 De-Esser',
    reaper: 'ReaXcomp (high band only)',
    studioone: 'De-Esser',
  },
  channelstrip: {
    logic: 'Channel EQ + Compressor',
    ableton: 'EQ Eight + Compressor',
    flstudio: 'Parametric EQ 2 + Fruity Compressor',
    protools: 'Channel Strip',
    reaper: 'ReaEQ + ReaComp',
    studioone: 'Fat Channel XT',
  },
  saturation: {
    logic: 'Phat FX / Distortion / Tape (Vintage console strips)',
    ableton: 'Saturator',
    flstudio: 'Fruity Waveshaper / Soft Clipper',
    protools: 'Lo-Fi / AIR Distortion',
    reaper: 'ReaDistortion',
    studioone: 'Console Shaper / RedLightDist',
  },
  pitch: {
    logic: 'Pitch Correction / Flex Pitch',
    ableton: 'Auto Shift (11+) — otherwise none, use Graillon 2',
    flstudio: 'Pitcher / NewTone',
    protools: 'Elastic Pitch — otherwise none, use Graillon 2',
    reaper: 'ReaTune',
    studioone: 'Melodyne Essential (bundled)',
  },
  width: {
    logic: 'Doubler / Stereo Spread',
    ableton: 'Chorus-Ensemble (Ensemble mode)',
    flstudio: 'Fruity Stereo Enhancer / Chorus',
    protools: 'AIR Multi-Chorus',
    reaper: 'ReaPitch (two instances, ±8 cents, panned)',
    studioone: 'Chorus / Analog Delay',
  },
  delay: {
    logic: 'Tape Delay / Delay Designer',
    ableton: 'Echo / Delay',
    flstudio: 'Fruity Delay 3',
    protools: 'Mod Delay III',
    reaper: 'ReaDelay',
    studioone: 'Analog Delay / Beat Delay',
  },
  reverb: {
    logic: 'ChromaVerb / Space Designer',
    ableton: 'Reverb / Hybrid Reverb',
    flstudio: 'Fruity Reeverb 2 / Fruity Convolver',
    protools: 'D-Verb / Space',
    reaper: 'ReaVerbate / ReaVerb',
    studioone: 'Room Reverb / Open AIR',
  },
  lofi: {
    logic: 'Bitcrusher',
    ableton: 'Redux',
    flstudio: 'Fruity Bit Crusher',
    protools: 'Lo-Fi',
    reaper: 'ReaFir (or bounce at a lower rate)',
    studioone: 'Bitcrusher',
  },
  limiter: {
    logic: 'Limiter / Adaptive Limiter',
    ableton: 'Limiter',
    flstudio: 'Fruity Limiter',
    protools: 'Maxim',
    reaper: 'ReaLimit',
    studioone: 'Limiter²',
  },
  modulation: {
    logic: 'Modulation > Flanger / Phaser',
    ableton: 'Phaser-Flanger',
    flstudio: 'Fruity Flanger / Phaser',
    protools: 'AIR Flanger / Phaser',
    reaper: 'JS: Flanger',
    studioone: 'Flanger / Phaser',
  },
  harmony: {
    logic: 'Pitch Shifter / Vocal Transformer',
    ableton: 'Shifter',
    flstudio: 'Pitcher (harmony mode)',
    protools: 'Elastic Pitch',
    reaper: 'ReaPitch',
    studioone: 'Melodyne Essential (bundled)',
  },
}

/** id → item. Ordered loosely by category for readability, not by importance. */
export const PLUGINS = {
  // ---------------------------------------------------------------- microphones
  'shure-sm7': {
    name: 'SM7 / SM7B', maker: 'Shure', category: 'mic', capture: true, tier: 'hardware', price: 400,
    note: 'A broadcast dynamic. Rejects the room, tames sibilance and hype, needs a lot of clean gain. The reason a $400 mic keeps beating $10,000 mics on loud, bright singers.',
  },
  'sony-c800g': {
    name: 'C-800G', maker: 'Sony', category: 'mic', capture: true, tier: 'hardware', price: 13000,
    note: 'The tube condenser with a Peltier cooler bolted to it. Effectively the default lead-vocal mic in modern hip-hop and pop: forward, glassy, aggressively present in the 8–12 kHz range.',
  },
  'telefunken-elam251': {
    name: 'ELA M 251', maker: 'Telefunken', category: 'mic', capture: true, tier: 'hardware', price: 12000,
    note: 'Vintage tube condenser. Silky top without the hardness of a modern bright mic — chosen for singers whose voices already carry.',
  },
  'neumann-u47': {
    name: 'U 47', maker: 'Neumann', category: 'mic', capture: true, tier: 'hardware', price: 15000,
    note: 'The vintage tube large-diaphragm standard. Thick low-mids, unhyped top. Half of "the classic LA pop vocal chain" starts here.',
  },
  'at2020': {
    name: 'AT2020', maker: 'Audio-Technica', category: 'mic', capture: true, tier: 'hardware', price: 99,
    note: 'A $99 condenser. Proof that the mic is rarely the reason a record does not sound finished.',
  },
  'shure-sm57': {
    name: 'SM57', maker: 'Shure', category: 'mic', capture: true, tier: 'hardware', price: 110,
    note: 'The universal dynamic. Used on vocals far more often than people admit, especially when the singer is in the control room next to loud monitors.',
  },

  // ---------------------------------------------------------------- preamps / hardware
  'neve-1073': {
    name: '1073', maker: 'Neve', category: 'preamp', tier: 'hardware', price: 4000,
    emulations: ['uad-neve-1073', 'waves-scheps-73'],
    note: 'The preamp/EQ cliché that earned it. Weight around 110–220 Hz and an easy, unfussy 12 kHz shelf.',
  },
  'neve-1084': {
    name: '1084', maker: 'Neve', category: 'preamp', tier: 'hardware', price: 5000,
    emulations: ['uad-neve-1073'],
    note: 'A 1073 with an extra midrange band and more filter choices. What Michael Jackson\'s voice went through on Thriller.',
  },
  'neve-1066': {
    name: '1066', maker: 'Neve', category: 'preamp', tier: 'hardware', price: 4500,
    emulations: ['uad-neve-1073'],
    note: 'Same family as the 1073, different EQ frequencies. Tom Elmhirst ran Adele back out through one during mixing rather than at tracking.',
  },
  'neve-1081': {
    name: '1081', maker: 'Neve', category: 'preamp', tier: 'hardware', price: 4500,
    emulations: ['uad-neve-1073'],
    note: 'Four-band Neve. Slightly more surgical than a 1073, same basic character.',
  },
  'neve-88r': {
    name: '88R console', maker: 'Neve', category: 'channelstrip', tier: 'hardware', price: 500000,
    note: 'A large-format desk. Its channel EQ did most of the shaping on Random Access Memories.',
  },
  'avalon-737': {
    name: 'VT-737sp', maker: 'Avalon', category: 'channelstrip', tier: 'hardware', price: 2800,
    note: 'Tube preamp, opto compressor and EQ in one box. Unfashionable among engineers, permanently fashionable in rap and R&B vocal booths, and the reason a lot of records share a certain forward sheen.',
  },
  'apollo-twin': {
    name: 'Apollo Twin', maker: 'Universal Audio', category: 'preamp', tier: 'hardware', price: 900, capture: true,
    note: 'A two-channel interface. Worth noting that a Grammy-winning pop vocal went through its stock preamp with nothing exotic in front of it.',
  },

  // ---------------------------------------------------------------- hardware dynamics
  'urei-1176': {
    name: '1176', maker: 'UREI / Universal Audio', category: 'comp', tier: 'hardware', price: 2600,
    emulations: ['waves-cla-76', 'uad-1176', 'analog-obsession-fetish'],
    note: 'FET compressor. Microsecond attack, aggressive, adds its own bite even at low gain reduction. The blackface and bluestripe revisions sound meaningfully different — bluestripe is rawer.',
  },
  'la-2a': {
    name: 'LA-2A', maker: 'Teletronix', category: 'comp', tier: 'hardware', price: 4500,
    emulations: ['waves-cla-2a', 'uad-la-2a', 'analog-obsession-lala'],
    note: 'Optical compressor. Slow, program-dependent, essentially incapable of sounding fast or angry. Used to hold a vocal in place rather than to shape it.',
  },
  'fairchild-660': {
    name: '660', maker: 'Fairchild', category: 'comp', tier: 'hardware', price: 40000,
    emulations: ['waves-puigchild-670', 'uad-fairchild'],
    note: 'Variable-mu tube limiter. Slow, thick, expensive, and the second half of more famous vocal chains than almost any other box.',
  },
  'tube-tech-cl1b': {
    name: 'CL 1B', maker: 'Tube-Tech', category: 'comp', tier: 'hardware', price: 3500,
    emulations: ['uad-cl1b', 'softube-cl1b'],
    note: 'Tube opto compressor with a switchable slow release. If a modern R&B or pop vocal sits impossibly steady without sounding squashed, this is usually why.',
  },
  'manley-vari-mu': {
    name: 'Variable Mu', maker: 'Manley', category: 'comp', tier: 'hardware', price: 6000,
    emulations: ['uad-manley-vari-mu'],
    note: 'Tube bus compressor. Glues without flattening transients.',
  },
  'dbx-902': {
    name: '902 De-Esser', maker: 'dbx', category: 'deesser', tier: 'hardware', price: 400,
    note: 'A rack de-esser from the era when de-essing meant a dedicated box, not a plugin instance.',
  },
  'pultec-eqp1a': {
    name: 'EQP-1A', maker: 'Pultec', category: 'eq', tier: 'hardware', price: 5000,
    emulations: ['waves-puigtec-eqp1a', 'uad-pultec', 'bomb-factory-pultec', 'analog-obsession-rare'],
    note: 'Passive tube EQ. Its famous trick is boosting and cutting the same low frequency at once, which scoops just above the boost and leaves weight without mud.',
  },
  'ssl-g-bus': {
    name: 'G-Series bus compressor', maker: 'SSL', category: 'comp', tier: 'hardware', price: 3000,
    emulations: ['waves-ssl-comp', 'uad-ssl-g'],
    note: 'The mix-bus glue compressor. 2:1, slow attack, auto release, 1–2 dB.',
  },
  'spl-vitalizer': {
    name: 'Vitalizer', maker: 'SPL', category: 'saturation', tier: 'hardware', price: 1200,
    note: 'A psychoacoustic "make it sound better" box. Broadly disliked by purists; Kevin Parker put it across his mix bus anyway.',
  },

  // ---------------------------------------------------------------- hardware time
  'emt-140': {
    name: '140 plate', maker: 'EMT', category: 'reverb', tier: 'hardware', price: 12000,
    emulations: ['valhalla-plate', 'uad-emt140', 'waves-abbey-road-plates'],
    note: 'A sheet of steel in a box. Dense, bright, no early reflections — which is exactly why it disappears behind a vocal instead of pushing it back.',
  },
  'emt-250': {
    name: '250', maker: 'EMT', category: 'reverb', tier: 'hardware', price: 20000,
    emulations: ['uad-emt250'],
    note: 'The first real digital reverb, with a control surface like a fighter jet. All over Thriller.',
  },
  'capitol-chambers': {
    name: 'Capitol echo chambers', maker: 'Capitol Studios', category: 'reverb', tier: 'hardware', price: 0,
    note: 'Concrete chambers built under a Hollywood car park in the 1950s, to Les Paul\'s design. Not purchasable at any price; the closest plugin equivalents are the Capitol Chambers models UA and Waves both ship.',
  },
  'lexicon-pcm42': {
    name: 'PCM 42', maker: 'Lexicon', category: 'delay', tier: 'hardware', price: 1500,
    note: 'Rack delay from 1981. Used both for pre-delay in front of a plate and for modulated slapback.',
  },
  'eventide-h8000': {
    name: 'H8000', maker: 'Eventide', category: 'harmony', tier: 'hardware', price: 8000,
    note: 'Multi-effects and harmonizer. In the Messina rig it is the part that actually generates the choir.',
  },

  // ---------------------------------------------------------------- EQ plugins
  'fabfilter-pro-q': {
    name: 'Pro-Q 3 / 4', maker: 'FabFilter', category: 'eq', tier: 'paid', price: 179,
    note: 'The default surgical EQ of the last decade. Dynamic bands, per-band mid/side, and a display accurate enough that people mix with their eyes — which is its one real danger.',
    alts: { free: ['tdr-nova'], budget: ['waves-req'] },
  },
  'waves-q10': {
    name: 'Q10 Paragraphic EQ', maker: 'Waves', category: 'eq', tier: 'paid', price: 200,
    note: 'Waves\' original 1992 EQ. Clinical and cheap on CPU; still in working chains three decades later mostly out of muscle memory.',
    alts: { free: ['tdr-nova'] },
  },
  'waves-req': {
    name: 'Renaissance EQ', maker: 'Waves', category: 'eq', tier: 'paid', price: 100,
    note: 'Gentle, musical, hard to make sound bad. The EQ you reach for when you want a decision, not a diagnosis.',
    alts: { free: ['tdr-slick-eq'] },
  },
  'waves-puigtec-eqp1a': {
    name: 'PuigTec EQP-1A', maker: 'Waves', category: 'eq', tier: 'paid', price: 250,
    note: 'Pultec model made with Jack Joseph Puig. Do the low boost-and-cut trick at 60 or 100 Hz.',
    alts: { free: ['analog-obsession-rare'] },
  },
  'bomb-factory-pultec': {
    name: 'Pultec EQP-1A', maker: 'Bomb Factory / Avid', category: 'eq', tier: 'paid', price: 100,
    note: 'The Pro Tools-native Pultec that shipped for years with the Avid bundles. Not the most accurate model on the market, and on more hit records than most that are.',
    alts: { free: ['analog-obsession-rare'] },
  },
  'uad-pultec': {
    name: 'Pultec Passive EQ Collection', maker: 'Universal Audio', category: 'eq', tier: 'paid', price: 200,
    alts: { free: ['analog-obsession-rare'] },
  },
  'mcdsp-filterbank': {
    name: 'FilterBank F2', maker: 'McDSP', category: 'eq', tier: 'paid', price: 100,
    note: 'Filter-first EQ. Elmhirst used its shelf to pull weight out from under Amy Winehouse\'s voice.',
    alts: { free: ['tdr-nova'] },
  },
  'waves-scheps-73': {
    name: 'Scheps 73', maker: 'Waves', category: 'eq', tier: 'paid', price: 250,
    note: 'Andrew Scheps\' Neve 1073 model.',
    alts: { free: ['analog-obsession-britpre'] },
  },
  'uad-neve-1073': {
    name: 'Neve 1073 Preamp & EQ', maker: 'Universal Audio', category: 'preamp', tier: 'paid', price: 200,
    alts: { free: ['analog-obsession-britpre'] },
  },
  'metric-halo-channelstrip': {
    name: 'ChannelStrip', maker: 'Metric Halo', category: 'channelstrip', tier: 'paid', price: 250,
    note: 'Transparent EQ, gate and compressor in one window. Serban Ghenea\'s workhorse — chosen for being unremarkable, which on a hundred-track pop mix is the entire point.',
    alts: { free: ['tdr-nova'] },
  },
  'waves-ssl-e-channel': {
    name: 'SSL E-Channel', maker: 'Waves', category: 'channelstrip', tier: 'paid', price: 250,
    note: 'The console strip model. EQ, dynamics and filters in the order a real desk puts them.',
    alts: { free: ['analog-obsession-britchannel'] },
  },
  'api-550': {
    name: '550A / 550B EQ', maker: 'API', category: 'eq', tier: 'paid', price: 200,
    note: 'Stepped proportional-Q EQ. Boosts get narrower as they get bigger, so it is hard to make something sound flabby with one.',
    alts: { free: ['tdr-slick-eq'] },
  },

  // ---------------------------------------------------------------- compressor plugins
  'waves-cla-76': {
    name: 'CLA-76', maker: 'Waves', category: 'comp', tier: 'paid', price: 150,
    note: '1176 model in both bluestripe and blackface flavours.',
    alts: { free: ['analog-obsession-fetish'] },
  },
  'waves-cla-2a': {
    name: 'CLA-2A', maker: 'Waves', category: 'comp', tier: 'paid', price: 150,
    alts: { free: ['analog-obsession-lala'] },
  },
  'waves-rvox': {
    name: 'Renaissance Vox', maker: 'Waves', category: 'comp', tier: 'paid', price: 100,
    note: 'One fader that compresses, gates and makes up gain at once. Widely dismissed as a beginner plugin and quietly present on an enormous number of finished rap vocals.',
    alts: { free: ['klanghelm-dc1a'] },
  },
  'waves-rcomp': {
    name: 'Renaissance Compressor', maker: 'Waves', category: 'comp', tier: 'paid', price: 100,
    alts: { free: ['tdr-kotelnikov'] },
  },
  'waves-puigchild-670': {
    name: 'PuigChild 670', maker: 'Waves', category: 'comp', tier: 'paid', price: 300,
    note: 'Fairchild 670 model. Slow, expensive-sounding, and heavy enough on CPU that people put it on the way in rather than run six of them.',
    alts: { free: ['klanghelm-mjuc-jr'] },
  },
  'uad-la-2a': {
    name: 'Teletronix LA-2A Collection', maker: 'Universal Audio', category: 'comp', tier: 'paid', price: 200,
    alts: { free: ['analog-obsession-lala'] },
  },
  'uad-1176': {
    name: '1176 Collection', maker: 'Universal Audio', category: 'comp', tier: 'paid', price: 200,
    alts: { free: ['analog-obsession-fetish'] },
  },
  'uad-cl1b': {
    name: 'Tube-Tech CL 1B', maker: 'Universal Audio', category: 'comp', tier: 'paid', price: 200,
    alts: { free: ['klanghelm-mjuc-jr'] },
  },
  'softube-cl1b': {
    name: 'Tube-Tech CL 1B mk II', maker: 'Softube', category: 'comp', tier: 'paid', price: 200,
    alts: { free: ['klanghelm-mjuc-jr'] },
  },
  'uad-fairchild': {
    name: 'Fairchild 660/670', maker: 'Universal Audio', category: 'comp', tier: 'paid', price: 300,
    alts: { free: ['klanghelm-mjuc-jr'] },
  },
  'uad-manley-vari-mu': {
    name: 'Manley Variable Mu', maker: 'Universal Audio', category: 'comp', tier: 'paid', price: 300,
    alts: { free: ['klanghelm-mjuc-jr'] },
  },
  'waves-ssl-comp': {
    name: 'SSL G-Master Buss Compressor', maker: 'Waves', category: 'comp', tier: 'paid', price: 150,
    alts: { free: ['tdr-kotelnikov'] },
  },
  'uad-ssl-g': {
    name: 'SSL G Bus Compressor', maker: 'Universal Audio', category: 'comp', tier: 'paid', price: 200,
    alts: { free: ['tdr-kotelnikov'] },
  },
  'avid-smack': {
    name: 'Smack!', maker: 'Avid', category: 'comp', tier: 'paid', price: 100,
    note: 'Pro Tools compressor with a Norm / Opto / Wall mode switch. Wall is a brick wall in the literal sense.',
    alts: { free: ['klanghelm-dc1a'] },
  },
  'fabfilter-pro-mb': {
    name: 'Pro-MB', maker: 'FabFilter', category: 'comp', tier: 'paid', price: 179,
    note: 'Multiband dynamics. The tool for a voice that is only a problem on certain notes.',
    alts: { free: ['tdr-nova'] },
  },

  // ---------------------------------------------------------------- de-essers
  'waves-deesser': {
    name: 'DeEsser', maker: 'Waves', category: 'deesser', tier: 'paid', price: 100,
    note: 'Old, plain, fast. Set the frequency by ear in monitor mode before touching threshold.',
    alts: { free: ['tdr-nova'] },
  },
  'waves-rdeesser': {
    name: 'Renaissance DeEsser', maker: 'Waves', category: 'deesser', tier: 'paid', price: 100,
    alts: { free: ['tdr-nova'] },
  },

  // ---------------------------------------------------------------- saturation / lo-fi
  'soundtoys-decapitator': {
    name: 'Decapitator', maker: 'Soundtoys', category: 'saturation', tier: 'paid', price: 199,
    note: 'Five analogue distortion models plus a punish switch. The E setting is the one everybody actually uses.',
    alts: { free: ['klanghelm-ivgi'], budget: ['fabfilter-saturn'] },
  },
  'soundtoys-little-radiator': {
    name: 'Little Radiator', maker: 'Soundtoys', category: 'saturation', tier: 'paid', price: 99,
    note: 'Altec tube preamp model. Thick, dark, slightly broken — a way to make a clean vocal sound like it came off a worse machine.',
    alts: { free: ['klanghelm-ivgi'] },
  },
  'sonnox-inflator': {
    name: 'Oxford Inflator', maker: 'Sonnox', category: 'saturation', tier: 'paid', price: 200,
    note: 'Adds loudness and harmonic colour without obvious distortion. Kinelski puts it on essentially every background vocal stack he mixes.',
    alts: { free: ['klanghelm-ivgi'] },
  },
  'fabfilter-saturn': {
    name: 'Saturn 2', maker: 'FabFilter', category: 'saturation', tier: 'paid', price: 179,
    alts: { free: ['klanghelm-ivgi'] },
  },
  'avid-lo-fi': {
    name: 'Lo-Fi', maker: 'Avid', category: 'lofi', tier: 'paid', price: 0,
    note: 'Bit and sample-rate reducer bundled with Pro Tools. The core of the Drake "underwater" sound, though 40 gets most of it by bouncing at reduced sample rates rather than filtering.',
    alts: { free: ['tritik-krush'] },
  },

  // ---------------------------------------------------------------- pitch
  'antares-autotune': {
    name: 'Auto-Tune Pro', maker: 'Antares', category: 'pitch', tier: 'paid', price: 400,
    note: 'Retune speed is the whole instrument. Around 20 ms it is a repair tool; at 0 it is the sound of the last twenty years of popular music.',
    alts: { free: ['graillon-2'], budget: ['waves-tune-real-time'] },
  },
  'waves-tune-real-time': {
    name: 'Waves Tune Real-Time', maker: 'Waves', category: 'pitch', tier: 'paid', price: 150,
    note: 'Low-latency tuning, so singers can track through it. Cheaper than Auto-Tune and audibly not the same thing at fast settings.',
    alts: { free: ['graillon-2'] },
  },
  'melodyne': {
    name: 'Melodyne', maker: 'Celemony', category: 'pitch', tier: 'paid', price: 400,
    note: 'Offline, note-by-note, invisible when done properly. The tuning most hit vocals actually get — Auto-Tune then goes on top as an effect, not as the fix.',
    alts: { free: ['graillon-2'] },
  },
  'soundtoys-little-alterboy': {
    name: 'Little AlterBoy', maker: 'Soundtoys', category: 'pitch', tier: 'paid', price: 99,
    note: 'Pitch and formant shifting with a hard Quantize mode. Formant down a couple of semitones is the standard "make the ad-lib sound like a different person" move.',
    alts: { free: ['graillon-2'] },
  },

  // ---------------------------------------------------------------- width / doubling
  'waves-doubler': {
    name: 'Doubler', maker: 'Waves', category: 'width', tier: 'paid', price: 100,
    note: 'Two to four detuned, delayed copies. Almost the entire modern rap ad-lib width sound.',
    alts: { free: ['kilohearts-essentials'] },
  },
  'soundtoys-microshift': {
    name: 'MicroShift', maker: 'Soundtoys', category: 'width', tier: 'paid', price: 99,
    note: 'Three presets that recreate the Eventide and AMS detune tricks. Widens without any audible chorus wobble, which is why it survives on lead vocals where a chorus would not.',
    alts: { free: ['kilohearts-essentials'] },
  },
  'waves-reel-adt': {
    name: 'Abbey Road Reel ADT', maker: 'Waves', category: 'width', tier: 'paid', price: 200,
    note: 'Artificial double tracking, modelled off the tape trick invented at Abbey Road so Lennon would stop having to sing things twice.',
    alts: { free: ['kilohearts-essentials'] },
  },

  // ---------------------------------------------------------------- delay / reverb / mod
  'waves-h-delay': {
    name: 'H-Delay', maker: 'Waves', category: 'delay', tier: 'paid', price: 100,
    note: 'Digital delay with analogue-ish filtering and a lo-fi mode. Set to a dotted eighth it is responsible for a genuinely absurd share of modern pop.',
    alts: { free: ['valhalla-freq-echo'] },
  },
  'soundtoys-echoboy': {
    name: 'EchoBoy', maker: 'Soundtoys', category: 'delay', tier: 'paid', price: 199,
    note: 'Thirty delay models in one. The tape and studio modes are where most vocals end up.',
    alts: { free: ['valhalla-freq-echo'] },
  },
  'uad-galaxy-tape-echo': {
    name: 'Galaxy Tape Echo', maker: 'Universal Audio', category: 'delay', tier: 'paid', price: 150,
    note: 'Roland RE-201 Space Echo model, including its spring reverb.',
    alts: { free: ['valhalla-freq-echo'] },
  },
  'avid-mod-delay': {
    name: 'Mod Delay III', maker: 'Avid', category: 'delay', tier: 'stock', price: 0,
    note: 'The delay bundled with Pro Tools. Serban Ghenea has been mixing platinum records with it for twenty years.',
  },
  'soundtoys-crystallizer': {
    name: 'Crystallizer', maker: 'Soundtoys', category: 'delay', tier: 'paid', price: 99,
    note: 'Granular pitch-shifting echo, descended from the Eventide H3000 Crystal Echoes patch. Shimmery, unnatural, instantly recognisable.',
    alts: { free: ['valhalla-supermassive'] },
  },
  'valhalla-vintageverb': {
    name: 'VintageVerb', maker: 'Valhalla DSP', category: 'reverb', tier: 'paid', price: 50,
    note: '$50, on more professional sessions than reverbs costing six times as much. The 1970s and 1980s colour modes deliberately model converter-era grain.',
    alts: { free: ['valhalla-supermassive'] },
  },
  'valhalla-plate': {
    name: 'ValhallaPlate', maker: 'Valhalla DSP', category: 'reverb', tier: 'paid', price: 50,
    alts: { free: ['valhalla-supermassive'] },
  },
  'uad-emt140': {
    name: 'EMT 140 Plate Reverb', maker: 'Universal Audio', category: 'reverb', tier: 'paid', price: 150,
    alts: { free: ['valhalla-supermassive'] },
  },
  'uad-emt250': {
    name: 'EMT 250 Classic Electronic Reverb', maker: 'Universal Audio', category: 'reverb', tier: 'paid', price: 300,
    alts: { free: ['valhalla-supermassive'] },
  },
  'waves-abbey-road-plates': {
    name: 'Abbey Road Plates', maker: 'Waves', category: 'reverb', tier: 'paid', price: 150,
    alts: { free: ['valhalla-supermassive'] },
  },
  'uad-mxr-flanger': {
    name: 'MXR Flanger/Doubler', maker: 'Universal Audio', category: 'modulation', tier: 'paid', price: 150,
    alts: { free: ['kilohearts-essentials'] },
  },
  'brigade-chorus': {
    name: 'Brigade Chorus', maker: 'Universal Audio', category: 'modulation', tier: 'paid', price: 100,
    note: 'Boss CE-1 pedal model. Louis Bell puts it on ad-libs so they read as a separate character from the lead.',
    alts: { free: ['kilohearts-essentials'] },
  },
  'fabfilter-pro-l': {
    name: 'Pro-L 2', maker: 'FabFilter', category: 'limiter', tier: 'paid', price: 199,
    alts: { free: ['tdr-limiter-6-ge'] },
  },

  // ---------------------------------------------------------------- free tier
  'tdr-nova': {
    name: 'Nova', maker: 'Tokyo Dawn Labs', category: 'eq', tier: 'free', price: 0,
    note: 'Free dynamic EQ. Genuinely competitive with paid dynamic EQs, and it de-esses, controls resonances and does static EQ in one plugin.',
  },
  'tdr-slick-eq': {
    name: 'SlickEQ', maker: 'Tokyo Dawn Labs', category: 'eq', tier: 'free', price: 0,
    note: 'Free three-band with switchable American / British / German / Soviet curves. The broad-strokes EQ to reach for before the surgical one.',
  },
  'tdr-kotelnikov': {
    name: 'Kotelnikov', maker: 'Tokyo Dawn Labs', category: 'comp', tier: 'free', price: 0,
    note: 'Free mastering-grade compressor. Clean, precise, no character — use it when you want control rather than colour.',
  },
  'tdr-limiter-6-ge': {
    name: 'Limiter No. 6', maker: 'Tokyo Dawn Labs', category: 'limiter', tier: 'free', price: 0,
    note: 'Free multi-stage limiter: compressor, peak limiter, clipper and true-peak stage.',
  },
  'klanghelm-mjuc-jr': {
    name: 'MJUC jr.', maker: 'Klanghelm', category: 'comp', tier: 'free', price: 0,
    note: 'Free variable-mu compressor. The closest free thing to the slow tube-limiter behaviour of a Fairchild or CL 1B.',
  },
  'klanghelm-dc1a': {
    name: 'DC1A', maker: 'Klanghelm', category: 'comp', tier: 'free', price: 0,
    note: 'Free two-knob compressor that can go from gentle to completely destroyed. A remarkably good stand-in for R-Vox.',
  },
  'klanghelm-ivgi': {
    name: 'IVGI', maker: 'Klanghelm', category: 'saturation', tier: 'free', price: 0,
    note: 'Free saturation with an asymmetry control. Subtle drive that reads as "recorded through something" rather than as distortion.',
  },
  'analog-obsession-lala': {
    name: 'LALA', maker: 'Analog Obsession', category: 'comp', tier: 'free', price: 0,
    note: 'Free LA-2A model, donation-supported. Close enough to the paid ones that the difference is not what is holding your mix back.',
  },
  'analog-obsession-fetish': {
    name: 'FetDrive', maker: 'Analog Obsession', category: 'comp', tier: 'free', price: 0,
    note: 'Free FET compressor in the 1176 family, with a drive stage.',
  },
  'analog-obsession-rare': {
    name: 'RareS', maker: 'Analog Obsession', category: 'eq', tier: 'free', price: 0,
    note: 'Free Pultec EQP-1A model. Does the boost-and-cut-together trick properly.',
  },
  'analog-obsession-britpre': {
    name: 'BritPre', maker: 'Analog Obsession', category: 'preamp', tier: 'free', price: 0,
    note: 'Free Neve-style preamp colour.',
  },
  'analog-obsession-britchannel': {
    name: 'BritChannel', maker: 'Analog Obsession', category: 'channelstrip', tier: 'free', price: 0,
    note: 'Free British console channel strip.',
  },
  'valhalla-supermassive': {
    name: 'Supermassive', maker: 'Valhalla DSP', category: 'reverb', tier: 'free', price: 0,
    note: 'Free delay-reverb hybrid with absurd decay times. Not a realistic room simulator — it is the best free tool in existence for the huge, unreal spaces modern vocals sit in.',
  },
  'valhalla-freq-echo': {
    name: 'FreqEcho', maker: 'Valhalla DSP', category: 'delay', tier: 'free', price: 0,
    note: 'Free frequency-shifting echo. Set the shift to zero and it is a clean, dark analogue-style delay.',
  },
  'graillon-2': {
    name: 'Graillon 2 (free edition)', maker: 'Auburn Sounds', category: 'pitch', tier: 'free', price: 0,
    note: 'Free pitch correction and shifting. Its hard-tune is coarser than Auto-Tune, which for a deliberately robotic effect is not always a loss.',
  },
  'kilohearts-essentials': {
    name: 'Kilohearts Essentials', maker: 'Kilohearts', category: 'width', tier: 'free', price: 0,
    note: 'Free bundle of about thirty small utilities — chorus, delay, stereo, distortion, gate, pitch shifter. Covers the width and modulation jobs on this site by itself.',
  },
  'tritik-krush': {
    name: 'Krush', maker: 'Tritik', category: 'lofi', tier: 'free', price: 0,
    note: 'Free bitcrusher and sample-rate reducer with a filter. The free route to a degraded, underwater vocal.',
  },
}

/** Look-up that never throws on a bad id — chains render, and the data test catches it. */
export function getPlugin(id) {
  return PLUGINS[id] || null
}

export const PLUGIN_IDS = Object.keys(PLUGINS)

/** Everything you can actually acquire. Hardware is excluded — it isn't a shopping list. */
export const ACQUIRABLE_IDS = PLUGIN_IDS.filter(id => PLUGINS[id].tier !== 'hardware')

/** The free or already-owned substitutes for an item, flattened and de-duplicated. */
export function substitutesFor(id) {
  const p = PLUGINS[id]
  if (!p) return []
  const out = []
  if (p.tier === 'hardware') out.push(...(p.emulations || []))
  const alts = p.alts || {}
  out.push(...(alts.free || []), ...(alts.budget || []))
  // A hardware emulation is itself usually paid, so pull its free alternative up too.
  for (const emu of p.emulations || []) {
    out.push(...((PLUGINS[emu]?.alts || {}).free || []))
  }
  return [...new Set(out)].filter(x => PLUGINS[x])
}
