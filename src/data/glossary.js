/**
 * The stage guide.
 *
 * Order matters more than gear, and it is the thing nobody explains. This is the default
 * order and the reasoning for it, plus the specific places where the records on this site
 * deliberately break it.
 */

export const STAGES = [
  {
    id: 'pitch',
    name: 'Tuning',
    where: 'Before everything, or nowhere',
    what: 'Moves notes to where they should have been.',
    why: 'Tuning has to happen before compression and saturation, because both of those react to the signal and you do not want them reacting to something you are about to change. Offline tuning (Melodyne) is a repair and should be inaudible. Real-time tuning at a fast retune speed is an effect and should be obvious. Confusing the two is the most common mistake in modern vocal production.',
    mistake: 'Using Auto-Tune to fix a take that needed to be sung again. It flattens the pitch movement inside notes, which is where most of the emotion lives.',
    seeAlso: ['post-malone', 'bon-iver', 'travis-scott'],
  },
  {
    id: 'eq-corrective',
    name: 'Corrective EQ',
    where: 'First in the mix chain',
    what: 'Cuts the specific frequencies that are wrong: rumble, proximity buildup, boxy low-mids, ringing resonances.',
    why: 'Everything downstream reacts to what you feed it. A compressor fed a vocal with a 12 dB resonance at 300 Hz will duck the whole vocal every time that note is sung. Fix it first and every later stage gets easier.',
    mistake: 'Boosting here. This stage is for cuts. Find a resonance by boosting a narrow bell hard and sweeping until it hurts — then cut at that frequency, and remove the boost.',
    seeAlso: ['amy-winehouse', 'billie-eilish'],
  },
  {
    id: 'deesser',
    name: 'De-esser',
    where: 'After corrective EQ, before heavy compression and saturation',
    what: 'Turns down sibilance — the S, T and SH sounds — without dulling the rest.',
    why: 'Placed before compression and saturation because both exaggerate sibilance. Placed after corrective EQ because a presence boost will make the de-esser chase a problem you just created.',
    mistake: 'One setting for the whole song. Sibilance is worse in loud sections. Automate it, as Elmhirst did on the chorus of Hello.',
    seeAlso: ['adele', 'amy-winehouse'],
  },
  {
    id: 'comp-fast',
    name: 'Fast compression',
    where: 'After de-essing',
    what: 'Catches transients and consonants. FET compressors — 1176 and its models — live here.',
    why: 'A fast compressor controls the peaks that would otherwise force you to turn the whole vocal down. It also adds its own aggression, which is often the actual reason it is there.',
    mistake: 'Asking one compressor to do everything. See the next stage.',
    seeAlso: ['adele', 'post-malone'],
  },
  {
    id: 'comp-slow',
    name: 'Slow compression',
    where: 'After fast compression',
    what: 'Rides the overall shape of phrases. Optical compressors — LA-2A, CL 1B, Fairchild — live here.',
    why: 'This is the single most valuable idea on this site. Two compressors set to different speeds, each doing 3 dB, sound dramatically better than one doing 6 dB, because neither has to move fast enough to become audible. Elmhirst on Adele is the textbook case: an 1176 hitting and releasing quickly, a Fairchild underneath doing a much slower attack and release.',
    mistake: 'Reaching for more gain reduction when the answer is volume automation. Compression fixes what automation could not reach.',
    seeAlso: ['adele', 'beyonce', 'sza'],
  },
  {
    id: 'eq-tone',
    name: 'Tone EQ',
    where: 'After compression',
    what: 'The character move. Pultec, Neve, API — boosts for weight, presence and air.',
    why: 'After compression, because compression changes the tonal balance. Boosting before a compressor means the compressor reacts to your boost and partly undoes it.',
    mistake: 'Doing this stage first. Fix, then flatter — the other order makes the ugly parts louder.',
    seeAlso: ['drake', 'amy-winehouse'],
  },
  {
    id: 'saturation',
    name: 'Saturation',
    where: 'After tone EQ',
    what: 'Adds harmonics. Tape, tube, transistor, or outright distortion.',
    why: 'Harmonics buy presence that a fader cannot. A saturated vocal cuts through a dense mix at a lower level than a clean one, because you are adding new frequency content rather than turning up what is already there.',
    mistake: 'Using it as a volume control. If it is getting louder rather than denser, use the output trim, or run it on a parallel send.',
    seeAlso: ['kendrick-lamar', 'the-weeknd', 'billie-eilish'],
  },
  {
    id: 'width',
    name: 'Doubling and width',
    where: 'On the layers, not usually on the lead',
    what: 'Detuned, delayed copies spread across the stereo field.',
    why: 'A lead vocal usually wants to be centred and reasonably dry; width comes from the parts around it. The oldest version of this is simply singing the part again — Jackson, Swift and SZA all get their width from real stacked takes, not plugins.',
    mistake: 'Widening the lead. It stops sounding like a person standing in front of you and starts sounding like a chorus pedal.',
    seeAlso: ['michael-jackson', 'travis-scott', 'daft-punk'],
  },
  {
    id: 'delay',
    name: 'Delay',
    where: 'On a send',
    what: 'Repeats. Slapback for depth, tempo-synced throws for drama.',
    why: 'Delay creates space without the frequency wash of reverb, so it keeps a vocal intelligible in a way reverb cannot. Several quiet delays at different times beat one loud one. Guzauski also used a delay in front of the plate as pre-delay, which is what keeps consonants dry.',
    mistake: 'Setting it and leaving it. Automate the send so the delay arrives on line ends and gets out of the way of the next line.',
    seeAlso: ['taylor-swift', 'the-weeknd', 'daft-punk'],
  },
  {
    id: 'reverb',
    name: 'Reverb',
    where: 'On a send, last',
    what: 'The room. Plate, chamber, room or hall.',
    why: 'Plates and chambers sit behind a vocal because they have no early reflections to tell your ear how far away the source is. Halls put the singer at the back of a large space, which is almost never what you want on a lead.',
    mistake: 'Too much, too long, and not filtered. High-pass the return around 300–400 Hz and the reverb stops muddying the mix immediately.',
    seeAlso: ['adele', 'the-weeknd', 'daft-punk'],
  },
]

/** The places where the records on this site deliberately break the order above. */
export const EXCEPTIONS = [
  {
    title: 'Reverb before distortion',
    who: 'Kevin Parker, Tame Impala',
    what: 'Reverb placed early as an insert, so the distortion and compression downstream act on the reverb tail as well as the voice.',
    effect: 'Fuses the vocal into the track. The standard order layers a voice on top of a mix; this one dissolves it into the mix.',
    slug: 'tame-impala',
  },
  {
    title: 'Ruin the signal first',
    who: 'Kevin Parker, Tame Impala',
    what: 'A hard, narrow EQ boost around 8 kHz at the very start of the chain, specifically to make a good microphone sound like a bad one, before compression.',
    effect: 'Everything downstream reacts to the damage, so the character is baked in rather than applied.',
    slug: 'tame-impala',
  },
  {
    title: 'Downsample instead of filter',
    who: 'Noah "40" Shebib, Drake',
    what: 'Rendering a copy of the vocal at a reduced sample rate rather than low-passing it.',
    effect: 'Removes high frequencies and leaves aliasing grain behind. A filter gets you dark; this gets you dark and degraded.',
    slug: 'drake',
  },
  {
    title: 'Compression before the DAW',
    who: 'Bruce Swedien, Michael Jackson',
    what: 'Committing compression to tape at the moment of recording, with no option to undo it.',
    effect: 'Forces the decision to be right in the room. A great deal of what reads as "vintage polish" is really the sound of decisions that could not be deferred.',
    slug: 'michael-jackson',
  },
  {
    title: 'Effects in the headphones only',
    who: 'Rob Bisel, SZA',
    what: 'Extreme Auto-Tune, reverb or distorted delay pushed up in the artist\'s cue mix while the recording stays comparatively clean.',
    effect: 'Changes the performance rather than the recording. The best vocal processing decision is sometimes not a processing decision.',
    slug: 'sza',
  },
]

export const TERMS = [
  { term: 'Attack', def: 'How fast a compressor reacts once the signal crosses the threshold. Fast catches consonants; slow lets them through and grabs the body of the note.' },
  { term: 'Release', def: 'How fast a compressor stops working. Too fast pumps audibly; too slow and it never lets go between phrases.' },
  { term: 'Ratio', def: 'How much it compresses once it engages. 2:1 is gentle, 4:1 is a vocal standard, 20:1 and above is limiting.' },
  { term: 'Opto', def: 'A compressor using a light and a photocell. Physically incapable of being fast, which is why LA-2As and CL 1Bs sound so smooth.' },
  { term: 'FET', def: 'A transistor-based compressor. Extremely fast, adds its own bite. The 1176 is the archetype.' },
  { term: 'Variable-mu', def: 'A tube compressor whose ratio increases with input level. Fairchilds and Manleys. Thick and slow.' },
  { term: 'Pre-delay', def: 'The gap between the dry sound and the start of the reverb. Longer pre-delay keeps consonants clear and the singer close, even in a big space.' },
  { term: 'Plate', def: 'Reverb made by vibrating a sheet of metal. Dense, bright, no early reflections — the classic vocal reverb.' },
  { term: 'Chamber', def: 'A real reflective room used as a reverb. Capitol\'s are under a car park in Hollywood.' },
  { term: 'Formant', def: 'The resonances that make a voice sound like that particular body and throat. Shift them without shifting pitch and the same performance sounds like a different person.' },
  { term: 'Retune speed', def: 'How fast a tuner drags a note to the target. Around 20 ms it is invisible correction; at 0 it is the hard, stepped sound of modern pop.' },
  { term: 'Parallel processing', def: 'Blending a heavily processed copy under the original instead of processing the original. Gets you the density without losing the dynamics.' },
  { term: 'Proximity effect', def: 'The bass boost that happens when you sing close to a directional microphone. Why close-mic\'d vocals almost always need a cut below 200 Hz.' },
  { term: 'Sibilance', def: 'The harsh energy in S, T and SH sounds, usually between 5 and 9 kHz.' },
  { term: 'Gain staging', def: 'Keeping levels sensible between stages so nothing is clipping or starved. Boring, and the reason a lot of chains sound worse than the sum of their parts.' },
]
