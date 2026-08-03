/**
 * The chains.
 *
 * Every stage carries a `confidence`, and the app shows it. That field is the whole
 * integrity of this project, so it is worth being precise about what each value claims:
 *
 *   documented   — the engineer or producer said this, on the record, in the source cited
 *                  on the entry. Not "someone posted a session screenshot".
 *   reported     — trade press or a manufacturer's artist feature states it, but not in
 *                  the engineer's own words, or the account is second-hand.
 *   reconstructed— nobody has published this. It is an informed reconstruction from the
 *                  finished record, adjacent interviews, and what the era's tools were.
 *                  Treat it as a good starting point and nothing more.
 *
 * `settingsOrigin` is the same distinction applied one level down. `engineer` means the
 * numbers came from the source. `starting-point` means they are ours — a place to begin,
 * not a claim about anyone's session.
 *
 * Nothing here is affiliated with or endorsed by any artist, engineer or manufacturer.
 */

export const CHAINS = [
  // ==========================================================================
  {
    slug: 'michael-jackson',
    name: 'Michael Jackson',
    tagline: 'A $400 broadcast mic, and the loudest quiet vocal ever cut.',
    era: '1982–1991',
    genres: ['pop', 'r&b', 'funk'],
    daw: 'None — 3M and Studer analogue tape, Westlake Recording Studios',
    credits: [
      { name: 'Bruce Swedien', role: 'recording & mix engineer' },
      { name: 'Quincy Jones', role: 'producer' },
    ],
    records: ['Thriller (1982)', 'Bad (1987)', 'Dangerous (1991)'],
    sound:
      'Close, dry and startlingly present, with none of the glassy top that a condenser would have added. Swedien tracked the biggest-selling album in history through a dynamic broadcast microphone — an SM7, serial number 232, which he kept for decades — because Jackson sang hard and close, and a dynamic could take it without turning brittle. Almost everything you hear as "polish" on Thriller is arrangement and performance, not processing: the chain to tape was three links long.',
    tracking: [
      { job: 'mic', plugin: 'shure-sm7', confidence: 'documented', note: 'Serial no. 232, an original 1970s unit. Used on Billie Jean, Thriller, Beat It, Bad and The Way You Make Me Feel.' },
      { job: 'preamp', plugin: 'neve-1084', confidence: 'documented', note: 'Neve preamp and EQ, straight off the desk.' },
      { job: 'comp', plugin: 'urei-1176', confidence: 'documented', note: 'Then to multitrack tape. That is the entire recording chain.' },
    ],
    chain: [
      {
        job: 'preamp', title: 'Neve colour', plugin: 'neve-1084', confidence: 'documented',
        doing: 'The 1084 is a 1073 with an extra midrange band. Its job here is weight and an unfussy top-end lift, not correction.',
        settings: ['Low shelf +2 to +3 dB at 110 Hz', 'High shelf +2 dB at 12 kHz', 'Drive the input for a little transformer thickening'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'comp', title: 'FET compression to tape', plugin: 'urei-1176', confidence: 'documented',
        doing: 'Committed on the way in, so the compression is part of the recording rather than a decision deferred to the mix. That commitment is most of why these vocals sit so solidly.',
        settings: ['Ratio 4:1', 'Attack fast-ish (7 o\'clock is slowest on an 1176 — go about halfway)', 'Release fast', '4–6 dB of gain reduction on the loudest phrases'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'reverb', title: 'EMT 250', plugin: 'emt-250', confidence: 'documented',
        doing: 'The first commercial digital reverb, and the space the whole album lives in. Short and bright rather than long — it thickens the voice without pushing it back.',
        settings: ['Plate or Chorus program', 'Decay 1.4–1.8 s', 'Pre-delay 20–30 ms so consonants stay dry', 'Roll off below 300 Hz and above 8 kHz on the return'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'width', title: 'Stacked doubles, sung not generated', plugin: null, confidence: 'reported',
        doing: 'The width on the choruses is Jackson singing the part again, several times, hard-panned — not a doubler plugin. This is the part people skip and then wonder why their stacks sound artificial.',
        settings: ['Record 2–4 real doubles', 'Pan the pairs 100% L/R', 'Do not tune them to each other — the drift is the effect'],
        settingsOrigin: 'starting-point',
      },
    ],
    moves: [
      'Use a dynamic mic. A loud, bright singer through an SM7 needs less fixing than the same singer through a $3,000 condenser.',
      'Commit the compression while recording instead of stacking three plugins later.',
      'Sing the doubles. Every width plugin on this site is an imitation of what the tape stack did first.',
    ],
    caveat: 'Swedien mixed to half-inch analogue and used the room as an instrument. You are not going to get to Thriller with plugins, and that was never the assignment — the transferable part is the shortness of the chain.',
    sources: [
      { title: 'Bruce Swedien: Recording Michael Jackson', publication: 'Sound on Sound', url: 'https://www.soundonsound.com/people/bruce-swedien-recording-michael-jackson' },
      { title: 'Making Michael Jackson\'s Thriller', publication: 'Vintage King', url: 'https://vintageking.com/blog/michael-jackson-thriller/' },
      { title: 'Bruce Swedien Shares the Techniques He Used to Capture Michael Jackson\'s Voice', publication: 'Reverb', url: 'https://reverb.com/news/interview-bruce-swedien-shares-the-techniques-he-used-to-capture-michael-jacksons-voice' },
    ],
  },

  // ==========================================================================
  {
    slug: 'amy-winehouse',
    name: 'Amy Winehouse',
    tagline: 'Mixed in 1963, on purpose.',
    era: '2006',
    genres: ['soul', 'jazz', 'pop'],
    daw: 'Pro Tools, into and out of an analogue front end',
    credits: [
      { name: 'Tom Elmhirst', role: 'mix engineer' },
      { name: 'Mark Ronson', role: 'producer' },
      { name: 'Salaam Remi', role: 'producer' },
    ],
    records: ['Back to Black (2006)', 'Rehab', 'Back to Black'],
    sound:
      'Dry, upfront and slightly hard, sitting in a mono-ish 1960s soul picture rather than a wide modern one. Elmhirst has said he mixed the record with a 1963 mindset. The interesting technical story is corrective: Winehouse\'s voice had specific resonant frequencies — possibly from the mic she tracked on — that had to be cut hard before any of the vintage colour could go on top.',
    tracking: [
      { job: 'note', plugin: null, confidence: 'reconstructed', note: 'Tracking varied across Ronson\'s New York sessions and Remi\'s Miami sessions and is not consistently documented per song.' },
    ],
    chain: [
      {
        job: 'eq', title: 'Cut the resonances first', plugin: 'mcdsp-filterbank', confidence: 'documented',
        doing: 'Elmhirst filtered with FilterBank F2, shelving around 40 Hz, and cut hard at the problem frequencies in her voice before adding anything. On the chorus of Back to Black he used hard notch EQ.',
        settings: ['High-pass / low shelf around 40 Hz', 'Narrow cuts at the notes that jump out — sweep a bell at +10 dB, find the pain, then cut it 3–6 dB'],
        settingsOrigin: 'engineer',
      },
      {
        job: 'deesser', title: 'De-ess', plugin: 'waves-deesser', confidence: 'documented',
        doing: 'Sibilance control, placed after the corrective EQ so it is not chasing a problem the EQ already created.',
        settings: ['Centred around 5.5 kHz', 'Just enough to stop the S from spitting — 2–4 dB on the worst syllables'],
        settingsOrigin: 'engineer',
      },
      {
        job: 'eq', title: 'Pultec, for character', plugin: 'pultec-eqp1a', confidence: 'documented',
        doing: 'Outboard Pultec after the correction. This is the tone move: the tube EQ is adding the era, not fixing anything.',
        settings: ['Low boost and attenuate together at 60 or 100 Hz', 'High boost 2–4 dB at 8 or 10 kHz, bandwidth wide'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'comp', title: '1176 blackface', plugin: 'urei-1176', confidence: 'documented',
        doing: 'Pultec into a blackface 1176. Fast, gritty, and it gives the vocal the forward aggression the record runs on.',
        settings: ['Ratio 4:1', 'Attack fast, release fast', '4–8 dB gain reduction — she sings hard, let it work'],
        settingsOrigin: 'starting-point',
      },
    ],
    moves: [
      'Fix before you flatter. Notch out the ugly resonances, then add the vintage EQ — the other order just makes the ugly parts louder and more expensive.',
      'Find the resonance by boosting a narrow bell hard and sweeping until it hurts, then cut there.',
      'Keep the picture narrow. Reaching for stereo width fights the era this sound comes from.',
    ],
    caveat: 'The corrective moves are documented; the specific Pultec and 1176 settings are a starting point, not Elmhirst\'s session.',
    sources: [
      { title: 'Secrets Of The Mix Engineers: Tom Elmhirst', publication: 'Sound on Sound', url: 'https://www.soundonsound.com/techniques/secrets-mix-engineers-tom-elmhirst' },
    ],
  },

  // ==========================================================================
  {
    slug: 'adele',
    name: 'Adele',
    tagline: 'Two compressors doing opposite jobs, and a room built under a car park.',
    era: '2011–2021',
    genres: ['pop', 'soul'],
    daw: 'Pro Tools, out through hardware and back',
    credits: [
      { name: 'Tom Elmhirst', role: 'mix engineer' },
      { name: 'Greg Kurstin', role: 'producer (Hello)' },
    ],
    records: ['25 (2015)', 'Hello', '21 (2011)', 'Rolling in the Deep'],
    sound:
      'Enormous but never harsh, and startlingly steady given how far her dynamic range travels inside a single line. The trick is serial compression with two boxes set to different speeds: an 1176 catching the fast peaks, a Fairchild riding the slow shape underneath. Neither is working hard on its own. Together they make a voice that goes from a whisper to a belt sound like it never changed level.',
    tracking: [
      { job: 'note', plugin: null, confidence: 'documented', note: 'Elmhirst\'s chain ran during mixing: the vocal left Pro Tools into hardware and came back on the insert return.' },
    ],
    chain: [
      {
        job: 'preamp', title: 'Neve 1066 line amp', plugin: 'neve-1066', confidence: 'documented',
        doing: 'The multitrack return hits the line amp of a Neve 1066 first — colour and a little iron before any dynamics.',
        settings: ['Modest low shelf for weight', 'Push the line amp for transformer saturation rather than for level'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'comp', title: '1176 bluestripe — the fast one', plugin: 'urei-1176', confidence: 'documented',
        doing: 'In Elmhirst\'s words, the UREI is hitting and releasing quicker. It catches transients and consonants; it is not there to control the overall shape.',
        settings: ['Bluestripe model if your plugin has one', 'Ratio 4:1', 'Fast attack, fast release', '3–5 dB on peaks only'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'comp', title: 'Fairchild 660 — the slow one', plugin: 'fairchild-660', confidence: 'documented',
        doing: 'Doing a much slower attack and release. This is the box that holds the verse and the chorus at the same apparent level. Two compressors at 3 dB each beat one at 6 dB, because neither has to move fast enough to be audible.',
        settings: ['Slowest time constant your model offers', '2–4 dB, moving with phrases rather than syllables'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'deesser', title: 'De-ess and notch', plugin: 'waves-deesser', confidence: 'documented',
        doing: 'Elmhirst used a different de-esser and hard notch EQ specifically on the chorus of Hello — the section where she is loudest and the top end turns hard.',
        settings: ['De-ess only where it is a problem, automated by section', 'Narrow notch at whatever frequency screams in the chorus'],
        settingsOrigin: 'engineer',
      },
      {
        job: 'reverb', title: 'Capitol chambers and plates', plugin: 'capitol-chambers', confidence: 'documented',
        doing: 'A large part of the vocal sound is the physical chambers Les Paul designed under Capitol Studios in the 1940s, plus plates. Not a plugin decision — but the closest plugin equivalents are the Capitol Chambers models UA and Waves both ship, and a good plate.',
        settings: ['Chamber: 1.2–1.8 s, pre-delay 25 ms', 'Plate underneath, shorter, for density', 'High-pass the returns at 300 Hz'],
        settingsOrigin: 'starting-point',
      },
    ],
    moves: [
      'Two compressors, different speeds, small amounts each. This is the single most transferable idea on the site.',
      'Automate the de-esser by section instead of setting one threshold for the whole song.',
      'Use a chamber or a plate, not a hall. Halls put a voice at the back of the room.',
    ],
    caveat: 'The chain and the reasoning are documented from Elmhirst\'s interviews; exact ratios and decay times are ours.',
    sources: [
      { title: 'Inside Adele\'s "25": How Tom Elmhirst Mixed a Masterpiece', publication: 'SonicScoop', url: 'https://sonicscoop.com/inside-adeles-25-how-tom-elmhirst-mixed-a-masterpiece/' },
      { title: 'Writing and Recording a Huge #1: Inside Adele\'s "Hello" with Greg Kurstin', publication: 'SonicScoop', url: 'https://sonicscoop.com/writing-recording-1-hit-inside-adeles-hello-producer-greg-kurstin/' },
      { title: 'Secrets Of The Mix Engineers: Tom Elmhirst', publication: 'Sound on Sound', url: 'https://www.soundonsound.com/techniques/secrets-mix-engineers-tom-elmhirst' },
    ],
  },

  // ==========================================================================
  {
    slug: 'daft-punk',
    name: 'Daft Punk',
    tagline: 'Two PCM 42s, a real plate, and the oldest widening trick there is.',
    era: '2013',
    genres: ['electronic', 'disco', 'funk'],
    daw: 'Pro Tools through a Neve 88R',
    credits: [
      { name: 'Mick Guzauski', role: 'mix engineer' },
      { name: 'Peter Franco', role: 'recording engineer' },
      { name: 'Thomas Bangalter & Guy-Manuel de Homem-Christo', role: 'production' },
    ],
    records: ['Random Access Memories (2013)', 'Get Lucky', 'Instant Crush'],
    sound:
      'Wide, warm and conspicuously uncompressed for a modern record — Guzauski\'s advice from these sessions was to use compression sparingly. The human vocals are handled like a 1970s disco record; the robot vocals were vocoded by the band themselves in Paris and arrived as a finished instrument rather than something to be processed.',
    tracking: [
      { job: 'note', plugin: null, confidence: 'documented', note: 'Daft Punk recorded most of their own vocoded robot vocals at their own studio in Paris before the mix.' },
    ],
    chain: [
      {
        job: 'eq', title: 'Neve 88R console EQ', plugin: 'neve-88r', confidence: 'documented',
        doing: 'Shaping happened on the desk, not in the box. Broad moves — this is a console EQ, so it is not being used surgically.',
        settings: ['Wide, gentle boosts', 'High-pass to taste and otherwise leave it alone'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'comp', title: 'LA-2A, gently', plugin: 'la-2a', confidence: 'documented',
        doing: 'An optical compressor on the lead. Guzauski used LA-2As on bass and vocals across the record, and repeatedly said to use compression sparingly.',
        settings: ['2–3 dB of gain reduction, no more', 'Let the meter breathe rather than sit'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'deesser', title: 'dbx 902', plugin: 'dbx-902', confidence: 'documented',
        doing: 'Hardware de-esser, plus more de-essing on background vocals as needed.',
        settings: ['Enough to stop the S, and no more'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'delay', title: 'PCM 42 as pre-delay', plugin: 'lexicon-pcm42', confidence: 'documented',
        doing: 'A digital delay placed in front of the plate to generate pre-delay. Keeps the consonants dry and the reverb behind the words instead of on top of them.',
        settings: ['30–60 ms, no feedback', 'Feeding the reverb, not the mix'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'reverb', title: 'Real EMT 140 plate', plugin: 'emt-140', confidence: 'documented',
        doing: 'An actual plate, fed from the delay. Dense and bright with no early reflections, which is why it sits behind a voice without moving it backwards.',
        settings: ['Decay 1.5–2.2 s', 'High-pass the return at 250–400 Hz'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'delay', title: 'Chorused slap, hidden', plugin: 'lexicon-pcm42', confidence: 'documented',
        doing: 'A second PCM 42 doing a slight slap echo, chorused a little, and deliberately mixed low enough that you feel it rather than hear it.',
        settings: ['80–120 ms slap', 'A touch of modulation', 'Well under the vocal — if you can identify it, it is too loud'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'width', title: 'The harmonizer cross-trick', plugin: null, confidence: 'documented',
        doing: 'Guzauski\'s described move on backgrounds: one side pitched down a few cents, one side pitched up a few cents, then mixed across — right feeding left, left feeding right. This is the ancestor of every micro-shift plugin on this site, and you can build it with two pitch shifters.',
        settings: ['Left copy −7 cents, right copy +7 cents', 'Cross-feed the two sides', 'Small delay offset of 10–20 ms if it still feels narrow'],
        settingsOrigin: 'engineer',
      },
    ],
    moves: [
      'Delay in front of the reverb. Pre-delay is what keeps a big space from swallowing the words.',
      '2–3 dB of compression on a well-sung take is often the correct amount.',
      'Build the detune-and-cross widener by hand once, so you understand what MicroShift is doing for you.',
    ],
    caveat: 'The gear and the techniques are from Guzauski\'s own interviews. Numbers are ours.',
    sources: [
      { title: 'Mick Guzauski On Mixing Daft Punk\'s Random Access Memories', publication: 'Universal Audio', url: 'https://www.uaudio.com/blogs/ua/artist-interview-mick-guzauski' },
      { title: 'Recording Random Access Memories', publication: 'Sound on Sound', url: 'https://www.soundonsound.com/people/recording-random-access-memories-daft-punk' },
      { title: 'Mick Guzauski: Why Daft Punk\'s Random Access Memories Was Geek Heaven', publication: 'The Recording Academy', url: 'https://www.grammy.com/news/mick-guzauski-why-daft-punks-random-access-memories-was-geek-heaven/' },
    ],
  },

  // ==========================================================================
  {
    slug: 'drake',
    name: 'Drake',
    tagline: 'Everything sounds like it is happening in the next room. That is deliberate.',
    era: '2011–present',
    genres: ['hip-hop', 'r&b'],
    daw: 'Pro Tools',
    credits: [
      { name: 'Noah "40" Shebib', role: 'producer & engineer' },
    ],
    records: ['Take Care (2011)', 'Headlines', 'Nothing Was the Same (2013)'],
    sound:
      'Muffled, submerged, intimate — the "underwater" sound that reset what a rap record was allowed to sound like. The important detail is how 40 gets there: not by low-passing the mix, but by rendering audio at a reduced sample rate so there are physically fewer high frequencies present. The result is a darkness with grain in it, which a filter alone will not give you.',
    tracking: [
      { job: 'mic', plugin: 'sony-c800g', confidence: 'documented', note: 'The standard chain — or an SM57 when Drake is recording in the control room rather than the booth, which is often.' },
      { job: 'mic', plugin: 'shure-sm57', confidence: 'documented', note: 'A $110 dynamic on multi-platinum vocals. Comfort beats specification.' },
      { job: 'preamp', plugin: 'neve-1073', confidence: 'documented', note: 'Or a 1081.' },
      { job: 'comp', plugin: 'la-2a', confidence: 'documented', note: 'Teletronix LA-2A on the way in.' },
    ],
    chain: [
      {
        job: 'eq', title: 'Waves Q10', plugin: 'waves-q10', confidence: 'documented',
        doing: 'Corrective EQ. Part of the single processing chain 40 used on the Headlines lead vocal.',
        settings: ['High-pass 80–100 Hz', 'Cut the boxy 300–500 Hz region if the room is in the take'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'deesser', title: 'Waves DeEsser', plugin: 'waves-deesser', confidence: 'documented',
        doing: 'Placed early, before the tone EQ and heavy compression that would otherwise exaggerate sibilance.',
        settings: ['5–7 kHz', '3–5 dB reduction on peaks'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'eq', title: 'Renaissance EQ', plugin: 'waves-req', confidence: 'documented',
        doing: 'Musical, broad-stroke tone shaping after the surgical pass.',
        settings: ['Gentle presence lift 2–3 dB around 3 kHz', 'Low shelf for body'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'comp', title: 'Renaissance Vox', plugin: 'waves-rvox', confidence: 'documented',
        doing: 'One fader for compression, gating and makeup at once. Unfashionable, effective, and on an enormous number of finished rap vocals.',
        settings: ['Pull the Gain fader until it sits — typically 6–10 dB of movement', 'Gate just above the room noise'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'eq', title: 'Bomb Factory Pultec', plugin: 'bomb-factory-pultec', confidence: 'documented',
        doing: 'Tube EQ character on top. The low boost-and-cut trick gives weight without mud, which matters when the whole mix is already dark.',
        settings: ['Boost and attenuate together at 60 Hz', 'High boost at 10 kHz if anything is left up there to boost'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'comp', title: 'Avid Smack!', plugin: 'avid-smack', confidence: 'documented',
        doing: 'The aggressive stage at the end of the chain, adding density rather than control.',
        settings: ['Norm mode to start', 'A few dB — Wall mode if you want it genuinely crushed'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'lofi', title: 'The underwater move', plugin: 'avid-lo-fi', confidence: 'documented',
        doing: 'Rather than low-passing, 40 creates a new file at a lower sample rate so there are fewer frequencies present at all. Lo-Fi is one of his most-used plugins. The distinction matters: a filter removes highs cleanly, downsampling removes them and leaves aliasing grain behind.',
        settings: ['Bounce a copy at 22.05 or 16 kHz, then reimport it', 'Or: Lo-Fi with sample rate reduced, anti-alias off', 'Blend under the clean vocal rather than replacing it'],
        settingsOrigin: 'engineer',
      },
    ],
    moves: [
      'Bounce a duplicate of your vocal at 22 kHz, bring it back, and blend it under the original. That single move is most of the aesthetic.',
      'A dynamic mic in the control room beats a C-800G in a booth if the artist performs better there.',
      'Dark does not mean quiet. Everything is dark and the vocal is still the loudest thing.',
    ],
    caveat: 'The Headlines chain is documented plugin-by-plugin in Sound on Sound. The settings are ours.',
    sources: [
      { title: 'Noah \'40\' Shebib: Recording Drake\'s \'Headlines\'', publication: 'Sound on Sound', url: 'https://www.soundonsound.com/techniques/noah-40-shebib-recording-drakes-headlines' },
    ],
  },

  // ==========================================================================
  {
    slug: 'beyonce',
    name: 'Beyoncé',
    tagline: 'The preamp was chosen for what it does when the singer changes volume.',
    era: '2016–present',
    genres: ['r&b', 'pop'],
    daw: 'Pro Tools',
    credits: [
      { name: 'Stuart White', role: 'recording & mix engineer' },
    ],
    records: ['Lemonade (2016)', 'Renaissance (2022)'],
    sound:
      'Immediate and unflinching across an enormous dynamic range — she can go from a spoken aside to a full belt inside a bar. White\'s chain is built around exactly that problem, and his reason for rejecting the obvious choice is the most useful thing in this entry: he loves Neve preamps on vocals, but says they tend to crackle when you turn the pre gain, and with her he is turning it constantly.',
    tracking: [
      { job: 'mic', plugin: 'telefunken-elam251', confidence: 'documented', note: 'Vintage tube condenser — silky rather than hyped.' },
      { job: 'preamp', plugin: 'avalon-737', confidence: 'documented', note: 'Chosen over a Neve specifically because the gain can be ridden mid-take without noise.' },
      { job: 'comp', plugin: 'tube-tech-cl1b', confidence: 'documented', note: 'Tube opto, slow release. Holds the level without sounding like it is holding anything.' },
    ],
    chain: [
      {
        job: 'channelstrip', title: 'Avalon VT-737', plugin: 'avalon-737', confidence: 'documented',
        doing: 'Tube preamp, opto compressor and EQ in one box, on the way in. The point is not the tone — it is that you can move the gain during a take without the box complaining.',
        settings: ['Ride the gain by section rather than fixing it once', 'Gentle opto compression at the input stage'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'comp', title: 'Tube-Tech CL 1B', plugin: 'tube-tech-cl1b', confidence: 'documented',
        doing: 'The steadiness. A slow-release opto is what lets a vocal with 25 dB of natural range read as one continuous performance.',
        settings: ['Ratio around 3:1', 'Attack slow, release set to Fixed/slow', '4–8 dB on the loud sections, near zero on the quiet ones'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'eq', title: 'Corrective, then colour', plugin: 'fabfilter-pro-q', confidence: 'reconstructed',
        doing: 'Not documented per-song. On a voice this dynamic the timbre changes between quiet and loud sections, so static EQ fights you — dynamic bands or section-by-section automation is the practical answer.',
        settings: ['Dynamic band around 2.5–4 kHz that only engages on the belts', 'High-pass 90 Hz'],
        settingsOrigin: 'starting-point',
      },
    ],
    moves: [
      'Pick gear for the performance problem, not the tone. "Which preamp sounds best" is a less useful question than "which preamp lets me do what I have to do during the take".',
      'A slow opto compressor is how you handle a wide dynamic range without audible pumping.',
      'Automate before you compress harder. Compression fixes what automation could not reach, not the other way round.',
    ],
    caveat: 'The tracking chain and White\'s reasoning are documented. The mix-side EQ stage is a reconstruction.',
    sources: [
      { title: 'Stuart White: Recording & Mixing Beyoncé', publication: 'Sound on Sound', url: 'https://www.soundonsound.com/techniques/stuart-white-recording-mixing-beyonce' },
      { title: 'Beyoncé\'s recording engineer explains why the star\'s huge dynamic range dictated his choice of preamp', publication: 'MusicRadar', url: 'https://www.musicradar.com/news/beyonce-vocal-chain' },
      { title: 'Mix Masters: Making Lemonade', publication: 'AudioTechnology', url: 'https://www.audiotechnology.com/features/mix-masters-making-lemonade' },
    ],
  },

  // ==========================================================================
  {
    slug: 'billie-eilish',
    name: 'Billie Eilish',
    tagline: 'A $99 mic in a bedroom, mixed like a stadium record.',
    era: '2019–present',
    genres: ['alt-pop', 'electropop'],
    daw: 'Logic Pro',
    credits: [
      { name: 'FINNEAS', role: 'producer & engineer' },
      { name: 'Rob Kinelski', role: 'mix engineer' },
    ],
    records: ['When We All Fall Asleep, Where Do We Go? (2019)', 'bad guy', 'xanny'],
    sound:
      'Whispered, so close you can hear the room-less-ness of it, and yet completely competitive in loudness with anything else on the radio. The record was made in a bedroom in Highland Park on stock Logic plugins and a cheap condenser. The gap between "recorded at home" and "sounds home-made" is closed by mix decisions, not by gear.',
    tracking: [
      { job: 'mic', plugin: 'at2020', confidence: 'reported', note: 'A $99 large-diaphragm condenser, in a bedroom, close.' },
      { job: 'comp', plugin: 'waves-puigchild-670', confidence: 'documented', note: 'Kinelski notes she had the PuigChild 670 on an insert for compression during recording.' },
    ],
    chain: [
      {
        job: 'comp', title: 'PuigChild 670 on the way in', plugin: 'waves-puigchild-670', confidence: 'documented',
        doing: 'A Fairchild model committed at tracking. On a vocal this quiet, a slow tube limiter brings the whisper up without making the breaths sound like a horror film.',
        settings: ['Slow time constant', '3–5 dB of gain reduction', 'Committed, not printed dry'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'eq', title: 'Pro-Q on everything', plugin: 'fabfilter-pro-q', confidence: 'documented',
        doing: 'Kinelski uses Pro-Q on all of her vocals. On a close-mic\'d whisper the work is proximity buildup below 200 Hz and the mouth noise that close-miking exaggerates.',
        settings: ['High-pass 70–90 Hz', 'Broad cut 2–4 dB around 200–300 Hz for proximity', 'Narrow dynamic cut where clicks and mouth noise live, 1.5–3 kHz'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'saturation', title: 'Inflator on the stacks', plugin: 'sonnox-inflator', confidence: 'documented',
        doing: 'Kinelski puts Oxford Inflator on virtually all his background vocals — used subtly, to add harmonic colour and make them pop and open up. This is why her doubled and harmonised parts sit forward instead of turning into mush.',
        settings: ['Effect around 30–50%', 'Curve at 0', 'Input just short of clipping'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'reverb', title: 'Space, used sparingly', plugin: 'valhalla-vintageverb', confidence: 'reconstructed',
        doing: 'Not documented per-track. Her lead is usually drier than instinct suggests — most of the depth is delay throws and stacked harmonies, with reverb kept low so the intimacy survives.',
        settings: ['Short plate, 0.8–1.2 s', 'Pre-delay 20 ms', 'Wet level low enough that bypassing it is barely noticeable'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'limiter', title: 'Master', plugin: 'fabfilter-pro-l', confidence: 'documented',
        doing: 'Kinelski\'s Pro-L 2 sat on the EDM Aggressive and Tight preset, with a TC Electronic Clarity M for metering. A soft, transparent limiter setting would not hold a whisper against a full arrangement.',
        settings: ['Aggressive style', 'Watch true peak', 'Metering matters more than the setting'],
        settingsOrigin: 'engineer',
      },
    ],
    moves: [
      'Sing quietly, close, and compress hard. Intimacy is a performance and a gain-staging decision, not a plugin.',
      'Put a subtle saturator on your background stacks. It is the difference between stacks that widen and stacks that smear.',
      'Stop buying microphones. A $99 condenser made this album.',
    ],
    caveat: 'The mix-side plugins are documented from Kinelski\'s interviews. The tracking mic is widely reported rather than stated by FINNEAS in the sources below.',
    sources: [
      { title: 'Inside Track: Billie Eilish \'Bad Guy\'', publication: 'Sound on Sound', url: 'https://www.soundonsound.com/techniques/inside-track-billie-eilish-bad-guy' },
      { title: 'Rob Kinelski Talks Mixing For Billie Eilish', publication: 'Billboard', url: 'https://www.billboard.com/articles/columns/pop/8512952/rob-kinelski-billie-eilish-engineer-interview' },
      { title: 'Helping Billie Eilish Craft Hits', publication: 'Universal Audio', url: 'https://www.uaudio.com/blogs/ua/helping-billie-eilish-craft-hits' },
    ],
  },

  // ==========================================================================
  {
    slug: 'sza',
    name: 'SZA',
    tagline: 'The classic LA pop chain, with the effects turned all the way up in her headphones.',
    era: '2017–present',
    genres: ['r&b', 'alt-r&b', 'pop'],
    daw: 'Pro Tools',
    credits: [
      { name: 'Rob Bisel', role: 'producer, engineer & mixer' },
      { name: 'ThankGod4Cody', role: 'producer' },
    ],
    records: ['SOS (2022)', 'Kill Bill', 'Ctrl (2017)'],
    sound:
      'Conversational and unguarded, with texture left in — cracks, breaths and doubles that a tidier engineer would have removed. Bisel\'s tracking chain is deliberately conventional. What is not conventional is the monitoring: he bakes extreme effects into the session and pushes them in the artist\'s headphones, because what a singer hears changes what they sing.',
    tracking: [
      { job: 'mic', plugin: 'neumann-u47', confidence: 'documented', note: 'Bisel calls this "the classic L.A. pop vocal chain".' },
      { job: 'preamp', plugin: 'neve-1073', confidence: 'documented' },
      { job: 'comp', plugin: 'tube-tech-cl1b', confidence: 'documented' },
    ],
    chain: [
      {
        job: 'comp', title: 'CL 1B while tracking', plugin: 'tube-tech-cl1b', confidence: 'documented',
        doing: 'Committed on the way in. The same opto that steadies Beyoncé, doing the same job on a much more conversational delivery.',
        settings: ['Ratio 2:1 to 3:1', 'Slow release', '3–6 dB'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'pitch', title: 'Effects in the headphones', plugin: 'antares-autotune', confidence: 'documented',
        doing: 'The signature technique. Bisel has said that having extreme effects — Auto-Tune, reverb, distorted delay — turned all the way up in the artist\'s headphones can bring something out of them they would not otherwise have thought of. This is a performance tool, not a mix stage.',
        settings: ['Set up the effect chain before the artist arrives', 'Push it much further in the cue mix than in the mix', 'Print the dry take as well'],
        settingsOrigin: 'engineer',
      },
      {
        job: 'width', title: 'Doubles kept loose', plugin: null, confidence: 'reconstructed',
        doing: 'Her stacks are sung, not generated, and left imperfect. The looseness is the character — tuning them into alignment removes the thing that makes them sound like a person.',
        settings: ['Real doubles, panned wide', 'Resist the urge to time-align or tune them together'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'reverb', title: 'Big, but on a send', plugin: 'valhalla-vintageverb', confidence: 'reconstructed',
        doing: 'Not documented per-song. The records move between very dry and very wet inside a single track, which is send automation rather than a setting.',
        settings: ['Long plate or hall on a send', 'Automate the send, not the return', 'Throw it on the last word of a line and pull it back'],
        settingsOrigin: 'starting-point',
      },
    ],
    moves: [
      'Change the cue mix, not the singer. Put the effect they want to hear in their headphones and let it change the take.',
      'Print the dry take alongside the effected one, always.',
      'Leave the imperfections in. Bisel\'s records keep the cracks on purpose.',
    ],
    caveat: 'The tracking chain and headphone technique are documented from Bisel\'s interviews. The mix stages are reconstructions.',
    sources: [
      { title: 'Capturing SZA\'s Vocals with Rob Bisel, Part 1', publication: 'Mix', url: 'https://www.mixonline.com/recording/music-production/rob-bisel-on-songs-and-sza' },
      { title: 'Capturing SZA\'s Vocals with Rob Bisel, Part 2', publication: 'Mix', url: 'https://www.mixonline.com/recording/capturing-szas-vocals-with-rob-bisel-part-2' },
      { title: 'Inside Track: SZA \'Kill Bill\'', publication: 'Sound on Sound', url: 'https://www.soundonsound.com/techniques/inside-track-sza-kill-bill' },
    ],
  },

  // ==========================================================================
  {
    slug: 'post-malone',
    name: 'Post Malone',
    tagline: 'Tuned properly in Melodyne, then Auto-Tuned again on purpose.',
    era: '2016–present',
    genres: ['pop', 'hip-hop', 'rock'],
    daw: 'FL Studio / Pro Tools',
    credits: [
      { name: 'Louis Bell', role: 'producer, engineer & vocal producer' },
    ],
    records: ['beerbongs & bentleys (2018)', 'Hollywood\'s Bleeding (2019)', 'rockstar', 'Circles'],
    sound:
      'Big, wide and processed in a way that is clearly audible and clearly intentional. Bell is explicit about the two-stage approach that most people collapse into one: Melodyne does the actual tuning, invisibly and offline. Auto-Tune then goes on specific lines as an effect — he compares it to a flanger or a slap delay — not because the vocal needs correcting, but because it sounds cooler.',
    tracking: [
      { job: 'mic', plugin: 'sony-c800g', confidence: 'documented', note: 'Straight into an Apollo Twin using the interface\'s own preamp. No outboard.' },
      { job: 'preamp', plugin: 'apollo-twin', confidence: 'documented', note: 'The built-in preamp. Worth sitting with — this is a chart-topping vocal through a $900 interface.' },
    ],
    chain: [
      {
        job: 'pitch', title: 'Melodyne — the actual tuning', plugin: 'melodyne', confidence: 'documented',
        doing: 'Offline, note by note. This is the invisible stage: done properly, nobody can tell it happened. Getting this right first is what allows the next stage to be a creative choice rather than a rescue.',
        settings: ['Correct pitch centre, not pitch drift — leave the movement inside notes', 'Fix timing here too'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'pitch', title: 'Auto-Tune as an effect', plugin: 'antares-autotune', confidence: 'documented',
        doing: 'Applied on specific lines, treated like a modulation effect. Bell is clear it is not there because Post cannot sing in tune.',
        settings: ['Retune speed 0–10 for the hard, obvious sound', 'Correct key and scale, or it will chase wrong notes', 'Automate it on and off by line rather than leaving it across the track'],
        settingsOrigin: 'engineer',
      },
      {
        job: 'eq', title: 'Neve or API colour', plugin: 'api-550', confidence: 'documented',
        doing: 'Bell reaches for Neve 1073 or API 550A/550B models in his vocal chain. Broad, musical, console-style moves.',
        settings: ['API: stepped boost at 5 kHz for presence, small low-shelf lift', 'Neve: 110 Hz weight, 12 kHz air'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'comp', title: '1176', plugin: 'urei-1176', confidence: 'documented',
        doing: 'Bell\'s go-to for vocals, for what he describes as attack, roundness and warmth.',
        settings: ['Ratio 4:1', 'Attack around the middle, release fast', '4–6 dB'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'modulation', title: 'Chorus on the ad-libs only', plugin: 'brigade-chorus', confidence: 'documented',
        doing: 'A CE-1 pedal model on ad-libs to give them a quality that separates them from the lead. Ad-libs should sound like a different character, not a quieter copy.',
        settings: ['Ad-lib bus only', 'Wide, slow modulation', 'Pair it with a pitch or formant shift for more separation'],
        settingsOrigin: 'starting-point',
      },
    ],
    moves: [
      'Tune in Melodyne first. Then, and only then, decide whether you want Auto-Tune as an effect.',
      'Automate hard tuning by line. Across the whole track it is a texture; on chosen lines it is a hook.',
      'Process ad-libs into a different character. Chorus, formant shift, more width — anything that stops them reading as the lead again.',
    ],
    caveat: 'The chain and the two-stage tuning philosophy are documented from Bell\'s interviews. Specific values are ours.',
    sources: [
      { title: 'Nailing the Tone for Post Malone', publication: 'Universal Audio', url: 'https://www.uaudio.com/blogs/ua/louis-bell-nailing-tone-for-post-malone' },
      { title: 'Louis Bell: Songwriter & Producer', publication: 'Sound on Sound', url: 'https://www.soundonsound.com/people/louis-bell-songwriter-producer' },
      { title: 'How to Get Vocals like Post Malone Using Only Auto-Tune Plugins', publication: 'Antares', url: 'https://www.antarestech.com/blog/post-malone-vocal-chain-autotune-plugins' },
    ],
  },

  // ==========================================================================
  {
    slug: 'bon-iver',
    name: 'Bon Iver',
    tagline: 'Not Auto-Tune. A custom instrument that happens to contain two of them.',
    era: '2016–present',
    genres: ['indie folk', 'experimental'],
    daw: 'Ableton Live, plus hardware',
    credits: [
      { name: 'Chris Messina', role: 'engineer & instrument builder' },
      { name: 'Justin Vernon', role: 'artist & producer' },
    ],
    records: ['22, A Million (2016)', '715 – CRΣΣKS', 'i,i (2019)'],
    sound:
      'A voice turned into a choir that no plugin preset produces, and which most reviewers heard as "heavy Auto-Tune" — a reading Messina has spent years correcting. The Messina is a purpose-built hardware and software instrument. Vernon plays it: he sings, and simultaneously plays the white keys of a MIDI keyboard, and the harmony follows his hands.',
    tracking: [
      { job: 'note', plugin: null, confidence: 'documented', note: 'Messina says they tried every vocoder available first; all of them sounded like vocoders, and they wanted the character of the input signal to survive.' },
    ],
    chain: [
      {
        job: 'pitch', title: 'Auto-Tune #1 — tune the input', plugin: 'antares-autotune', confidence: 'documented',
        doing: 'The signal enters Ableton Live and hits the first Auto-Tune, which simply tunes the vocal. This is the boring, necessary stage — the harmoniser downstream needs a stable pitch to work from.',
        settings: ['Correct key and scale', 'Retune speed fast but not zero'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'pitch', title: 'Auto-Tune #2 — collapse to the tonic', plugin: 'antares-autotune', confidence: 'documented',
        doing: 'The clever part. A second instance forces the signal to a single note — the tonic of the key of the phrase being sung — so the harmoniser receives one stable pitch regardless of the melody.',
        settings: ['Scale edited so only the tonic is available', 'Retune speed 0'],
        settingsOrigin: 'engineer',
      },
      {
        job: 'harmony', title: 'Eventide H8000, played live', plugin: 'eventide-h8000', confidence: 'documented',
        doing: 'The tonic-locked signal is sent to an H8000 running a MIDI harmony program. Vernon plays the white keys while singing and the H8000 responds — so the choir is performed, not programmed.',
        settings: ['MIDI harmony program', 'Play the chord you want under the sung line', 'Blend against the dry vocal rather than replacing it'],
        settingsOrigin: 'engineer',
      },
      {
        job: 'width', title: 'The dry voice stays', plugin: null, confidence: 'reconstructed',
        doing: 'The reason this reads as human rather than as a synth is that the untreated vocal is still in the mix underneath. Remove it and the whole thing collapses into a vocoder — the exact outcome they were avoiding.',
        settings: ['Keep the dry take audible', 'Automate the balance between dry and Messina by section'],
        settingsOrigin: 'starting-point',
      },
    ],
    moves: [
      'A cheap approximation: duplicate your vocal, hard-tune the copy to a single note, then run a pitch shifter or harmoniser on it and play chords underneath.',
      'Always keep the dry vocal in. The hybrid is the sound; the effect alone is a vocoder.',
      'Build the instrument before the session. Vernon can perform this because it responds to him in real time.',
    ],
    caveat: 'The Messina\'s architecture is documented by Messina himself. Exactly which stages were used on which songs is not.',
    sources: [
      { title: 'Inside Track: Bon Iver \'22, A Million\'', publication: 'Sound on Sound', url: 'https://www.soundonsound.com/techniques/inside-track-bon-iver-22-a-million' },
      { title: 'The Sound Engineer Behind Bon Iver\'s "22, A Million" Clears Up Any Confusion', publication: 'W Magazine', url: 'https://www.wmagazine.com/story/the-engineer-behind-bon-ivers-22-a-million-clears-up-any-confusion-about-its-high-tech-sound' },
      { title: 'i For Detail: Recording Bon Iver', publication: 'AudioTechnology', url: 'https://www.audiotechnology.com/features/bon-iver-ii' },
    ],
  },

  // ==========================================================================
  {
    slug: 'kendrick-lamar',
    name: 'Kendrick Lamar',
    tagline: 'A long chain of small moves, most of them Waves.',
    era: '2012–present',
    genres: ['hip-hop'],
    daw: 'Pro Tools',
    credits: [
      { name: 'Derek "MixedByAli" Ali', role: 'mix engineer' },
      { name: 'Matt Schaeffer', role: 'engineer' },
    ],
    records: ['good kid, m.A.A.d city (2012)', 'To Pimp a Butterfly (2015)', 'DAMN. (2017)'],
    sound:
      'Dense and forward, with a vocal that stays intelligible over arrangements that have no business allowing it. The approach is the opposite of the short chains elsewhere on this site: many stages, each doing a small amount, with a console strip at the front and character boxes layered after it. It works because no single plugin is being asked to do anything drastic.',
    tracking: [
      { job: 'note', plugin: null, confidence: 'reconstructed', note: 'Tracking varied by session and is not consistently documented. A large-diaphragm condenser into a clean preamp with light opto compression is the safe assumption.' },
    ],
    chain: [
      {
        job: 'channelstrip', title: 'SSL E-Channel', plugin: 'waves-ssl-e-channel', confidence: 'reported',
        doing: 'Console strip at the head of the vocal bus — filters, EQ and dynamics in desk order before anything with character goes on.',
        settings: ['High-pass around 80 Hz', 'Small presence lift', 'Light compression, 2–3 dB'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'comp', title: 'Renaissance Compressor', plugin: 'waves-rcomp', confidence: 'reported',
        doing: 'A second, gentle stage. The pattern across this whole chain is compression distributed over several plugins rather than concentrated in one.',
        settings: ['Ratio 2:1', '2–3 dB'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'eq', title: 'Q10 and de-esser', plugin: 'waves-q10', confidence: 'reported',
        doing: 'Surgical cleanup, then sibilance control before the saturation stages exaggerate it.',
        settings: ['Notch out resonances', 'De-ess 5–7 kHz'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'comp', title: 'LA-2A', plugin: 'uad-la-2a', confidence: 'reported',
        doing: 'Opto compression for steadiness, after the faster stages have caught the peaks.',
        settings: ['3–4 dB, slow'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'eq', title: 'Pultec', plugin: 'uad-pultec', confidence: 'reported',
        doing: 'Tube EQ for weight and air. The boost-and-cut-together move at the bottom.',
        settings: ['Boost + attenuate at 100 Hz', 'High boost at 10 kHz'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'saturation', title: 'Decapitator', plugin: 'soundtoys-decapitator', confidence: 'reported',
        doing: 'Harmonic distortion for presence — this is what keeps the vocal above a dense arrangement without simply being louder.',
        settings: ['E model', 'Drive low — 2 to 4', 'Mix around 30–50% if your version has it, otherwise use a parallel send'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'delay', title: 'Tape echo throws', plugin: 'uad-galaxy-tape-echo', confidence: 'reported',
        doing: 'Space Echo model on a send, thrown on line ends rather than run across the whole vocal.',
        settings: ['1/4 or dotted 1/8', 'Feedback low', 'Automate the send'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'width', title: 'MicroShift and AlterBoy on the layers', plugin: 'soundtoys-microshift', confidence: 'reported',
        doing: 'Width on doubles and ad-libs. Little AlterBoy formant-shifts ad-libs into a different character.',
        settings: ['MicroShift preset 2 on doubles', 'AlterBoy formant −2 to −4 semitones on ad-libs'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'reverb', title: 'VintageVerb', plugin: 'valhalla-vintageverb', confidence: 'reported',
        doing: 'Plate or room on a send, kept short so the vocal stays forward.',
        settings: ['Plate, 1.2 s', 'Pre-delay 30 ms', 'High-pass the return at 400 Hz'],
        settingsOrigin: 'starting-point',
      },
    ],
    moves: [
      'Distribute compression. Four plugins at 2 dB sound better than one at 8 dB, and this chain is the extreme version of that idea.',
      'Saturate rather than turn up. Harmonics buy you presence that fader moves cannot.',
      'Formant-shift your ad-libs so they occupy a different space from the lead.',
    ],
    caveat: 'This is the weakest sourcing on the site. The plugin list circulates via session photographs, manufacturer artist features and community reconstruction rather than a single interview where Ali walks through a named song. Every stage is marked reported for that reason — treat it as a well-informed picture of a working method, not as a transcript of a session.',
    sources: [
      { title: 'Instant Radio-Ready Rap Vocals by Matt Schaeffer', publication: 'Waves Audio', url: 'https://www.waves.com/radio-ready-rap-vocals-studiorack-unchained' },
      { title: 'Kendrick Lamar gear index', publication: 'Equipboard', url: 'https://equipboard.com/pros/kendrick-lamar' },
    ],
  },

  // ==========================================================================
  {
    slug: 'the-weeknd',
    name: 'The Weeknd',
    tagline: 'Effects automated to the bar, not set and left.',
    era: '2011–present',
    genres: ['r&b', 'alt-r&b', 'pop'],
    daw: 'Pro Tools / Ableton Live',
    credits: [
      { name: 'Illangelo', role: 'producer & mix engineer' },
    ],
    records: ['House of Balloons (2011)', 'Trilogy (2012)', 'Beauty Behind the Madness', 'After Hours (2020)'],
    sound:
      'Cavernous, cold and constantly moving. Illangelo\'s vocal chains are elaborate by design and, more importantly, automated — effects arrive at specific moments rather than sitting across the track. The signature is a clean falsetto suddenly dropped into a huge space or through a flanger for one word, then pulled back.',
    tracking: [
      { job: 'note', plugin: null, confidence: 'reconstructed', note: 'Early Trilogy material was recorded fast and cheaply; the aesthetic came from processing, not from the room.' },
    ],
    chain: [
      {
        job: 'saturation', title: 'Little Radiator', plugin: 'soundtoys-little-radiator', confidence: 'documented',
        doing: 'Confirmed by Illangelo on The Weeknd\'s vocal for The Hills. An Altec tube preamp model — it makes a clean modern vocal sound like it came off worse equipment, which is the entire aesthetic of these records.',
        settings: ['Drive to taste — this stage should be audible', 'Back the output off to compensate'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'modulation', title: 'MXR Flanger/Doubler', plugin: 'uad-mxr-flanger', confidence: 'documented',
        doing: 'Also confirmed on The Hills. Used as a moment, not a setting — automated in for a phrase and back out.',
        settings: ['Automate the mix control from 0 to ~40% on chosen words', 'Slow rate'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'delay', title: 'H-Delay', plugin: 'waves-h-delay', confidence: 'documented',
        doing: 'On the vocal for The Hills. Dotted eighth throws with the analogue mode on for filtering.',
        settings: ['Dotted 1/8', 'Feedback 20–30%', 'LoFi on', 'Send automated per line'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'comp', title: 'Pro-MB for the problem notes', plugin: 'fabfilter-pro-mb', confidence: 'reported',
        doing: 'Illangelo has discussed Pro-MB in interviews. On a falsetto that only turns harsh on certain notes, multiband dynamics fix the notes without dulling the whole take.',
        settings: ['Single band, 2–5 kHz', 'Threshold set so it only engages on the harsh notes'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'reverb', title: 'Huge, and automated', plugin: 'valhalla-vintageverb', confidence: 'reconstructed',
        doing: 'The defining space. Long, dark and on a send whose level moves constantly — the drama is in the changes, not in the setting.',
        settings: ['Hall or large plate, 3–5 s', '1970s or 1980s colour mode', 'Automate the send hard: near zero in verses, full on the last word of a hook'],
        settingsOrigin: 'starting-point',
      },
    ],
    moves: [
      'Automate your sends. A reverb that is always on is wallpaper; one that arrives is an event.',
      'Make the vocal sound worse on purpose. Tube saturation and lo-fi colour are doing the emotional work here.',
      'Fix harshness with multiband dynamics, not with a static high shelf that dulls the whole performance.',
    ],
    caveat: 'The named plugins are documented for The Hills specifically. Reverb and general approach are reconstructed from his mix walkthroughs.',
    sources: [
      { title: 'Studio Sessions: Illangelo talks The Weeknd\'s House of Balloons, Drake, and After Hours', publication: 'REVOLT', url: 'https://www.revolt.tv/article/2021-04-29/54568/studio-sessions-illangelo-talks-the-weeknds-house-of-balloons-drake-and-after-hours' },
      { title: 'The Making of The Weeknd\'s Trilogy Mixtapes', publication: 'Reverb', url: 'https://reverb.com/news/the-making-of-the-weeknds-trilogy-mixtapes-finer-notes' },
      { title: 'Illangelo: After Hours — Inside The Track', publication: 'Mix With The Masters', url: 'https://mixwiththemasters.com/videos/illangelo-the-weeknd-after-hours' },
    ],
  },

  // ==========================================================================
  {
    slug: 'tame-impala',
    name: 'Tame Impala',
    tagline: 'Reverb before distortion. Deliberately the wrong order.',
    era: '2015–present',
    genres: ['psych rock', 'pop', 'electronic'],
    daw: 'Ableton Live',
    credits: [
      { name: 'Kevin Parker', role: 'artist, producer, engineer & mixer' },
    ],
    records: ['Currents (2015)', 'The Slow Rush (2020)', 'The Less I Know the Better'],
    sound:
      'Hazy, melting and slightly out of focus, with vocals that sit inside the track rather than in front of it. Parker records, produces, mixes and plays everything, and his methods are openly perverse: he will spike an EQ at 8 kHz to make a good mic sound like a bad one, and he puts reverb before distortion and compression so the space itself gets crushed.',
    tracking: [
      { job: 'note', plugin: null, confidence: 'documented', note: 'Parker deliberately imposes limitations on himself while recording to force different-sounding results.' },
    ],
    chain: [
      {
        job: 'eq', title: 'Ruin it first', plugin: 'fabfilter-pro-q', confidence: 'documented',
        doing: 'Parker describes being totally aggressive with EQ for no reason other than to make it sound like some shitty old microphone — spiking at 8 kHz and putting that at the start of the chain, before compressing.',
        settings: ['Narrow boost, +6 to +12 dB, around 8 kHz', 'High-pass aggressively', 'Place before the compressor so the compressor reacts to the damage'],
        settingsOrigin: 'engineer',
      },
      {
        job: 'reverb', title: 'Reverb — but early', plugin: 'valhalla-vintageverb', confidence: 'reported',
        doing: 'The structural trick. Reverb placed before the distortion and compression rather than after, so the tail gets saturated and squashed along with the voice. This is what fuses the vocal into the track instead of layering it on top.',
        settings: ['Spring or plate, medium decay', 'Printed as an insert, not on a send — the point is that later stages act on it'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'saturation', title: 'Distortion on the whole thing', plugin: 'soundtoys-decapitator', confidence: 'reported',
        doing: 'Fuzz or saturation applied to the already-reverberant signal. The reverb tail distorting is the sound.',
        settings: ['Push it further than feels correct', 'Any fuzz pedal model works — this is not a subtle stage'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'comp', title: 'Heavy compression last', plugin: 'urei-1176', confidence: 'reported',
        doing: 'Squeezing the distorted, reverberant signal pulls the tail up level with the voice and blurs the boundary between them.',
        settings: ['Fast attack, fast release', '8 dB or more — this is not transparent compression'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'comp', title: 'Mix bus: less over time', plugin: 'manley-vari-mu', confidence: 'documented',
        doing: 'On Currents the summing chain was a Neve 1073 DPA stereo preamp, an SPL Vitalizer and a Manley Variable Mu. By The Slow Rush he had, in his words, completely 180\'d — nowadays it is literally just a limiter, no EQ, with an SSL G Bus on some tracks.',
        settings: ['Currents era: preamp colour → Vitalizer → Vari-Mu', 'Slow Rush era: a limiter, and nothing else'],
        settingsOrigin: 'engineer',
      },
    ],
    moves: [
      'Put the reverb before the distortion. One reordering, and the vocal stops sounding pasted on.',
      'Damage the signal early and let everything downstream react to the damage.',
      'Notice that his mix bus got simpler as he got better. That direction is not an accident.',
    ],
    caveat: 'The EQ philosophy and mix-bus history are in Parker\'s own words. The reverb-before-distortion ordering is widely reported and audible on the records, but he has not published a stage-by-stage vocal chain.',
    sources: [
      { title: 'Tame Impala interviews', publication: 'Sound on Sound', url: 'https://www.soundonsound.com/people/tame-impala' },
      { title: 'Kevin Parker gear index', publication: 'Equipboard', url: 'https://equipboard.com/pros/kevin-parker' },
    ],
  },

  // ==========================================================================
  {
    slug: 'travis-scott',
    name: 'Travis Scott',
    tagline: 'The most imitated vocal sound of the decade, and the least documented.',
    era: '2015–present',
    genres: ['hip-hop', 'trap'],
    daw: 'Pro Tools / Ableton Live',
    credits: [
      { name: 'Alex Tumay', role: 'engineer (early work)' },
      { name: 'Mike Dean', role: 'mix & master' },
    ],
    records: ['Rodeo (2015)', 'ASTROWORLD (2018)', 'Days Before Rodeo (2014)'],
    sound:
      'Layered to the point of being an arrangement rather than a vocal: a hard-tuned lead, wide detuned doubles, formant-shifted ad-libs in the gaps, and enough saturation and delay that the voice reads as texture. The individual stages are not exotic. The reason it is hard to copy is quantity — the number of layers and the discipline of how they are placed.',
    tracking: [
      { job: 'mic', plugin: 'sony-c800g', confidence: 'reconstructed', note: 'The standard for the genre and era. Not confirmed per-record in the sources below.' },
    ],
    chain: [
      {
        job: 'pitch', title: 'Hard tuning', plugin: 'antares-autotune', confidence: 'reported',
        doing: 'Tumay is documented as a fan of Auto-Tune 5 specifically — an older version with a coarser, more obviously artefacted sound than the current one. Retune speed near zero. The tuning is the instrument, not a repair.',
        settings: ['Retune speed 0–5', 'Correct key and scale set per section', 'Track through it so the performance responds to it'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'width', title: 'Doubler on the layers', plugin: 'waves-doubler', confidence: 'reconstructed',
        doing: 'Detuned, delayed copies spread wide. The lead usually stays centred and relatively dry; the doubles carry the width.',
        settings: ['2 voices, ±8–12 cents', '15–30 ms offsets', 'Panned 70–100% L/R', 'Under the lead, not level with it'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'saturation', title: 'Decapitator', plugin: 'soundtoys-decapitator', confidence: 'reported',
        doing: 'Tumay has publicly discussed Decapitator, though in the context of 808s rather than vocals. On the vocal it buys presence inside a dense, loud mix.',
        settings: ['E model', 'Drive 3–5', 'Parallel if it starts eating the intelligibility'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'pitch', title: 'Ad-libs, shifted', plugin: 'soundtoys-little-alterboy', confidence: 'reconstructed',
        doing: 'The ad-lib bus is where most of the character lives. Formant shifting makes them read as separate voices answering the lead.',
        settings: ['Formant −3 to −6 semitones for the deep ad-libs', 'Or +3 for the strained ones', 'Hard-panned, drenched in delay'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'delay', title: 'Delay everywhere', plugin: 'soundtoys-echoboy', confidence: 'reconstructed',
        doing: 'Throws on ad-libs and line ends, often more audible than the reverb. Filtered dark so it adds depth without adding mud.',
        settings: ['1/4 note on ad-libs, feedback 30–40%', 'Low-pass the delay return around 4 kHz'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'reverb', title: 'Big and dark', plugin: 'valhalla-vintageverb', confidence: 'reconstructed',
        doing: 'A large space that the layers sit inside. Kept dark so it does not fight the already-bright tuned lead.',
        settings: ['Hall, 2.5–4 s', '1970s colour mode', 'High-pass 300 Hz, low-pass 6 kHz on the return'],
        settingsOrigin: 'starting-point',
      },
    ],
    moves: [
      'Layer count is the technique. A lead, two to four doubles, and a separate ad-lib bus — before you touch a single setting.',
      'Track through the tuning so the artist performs against it.',
      'Keep the lead comparatively dry and centred. All the width belongs to the layers around it.',
    ],
    caveat: 'The weakest entry on the site for sourcing, and it is the one people most want. Almost everything circulating online is preset-vendor marketing rather than an engineer\'s account. Only the Auto-Tune 5 preference and the Decapitator use are attributable to Tumay, and the Decapitator comment was about 808s. Everything else here is reconstruction, labelled as such.',
    sources: [
      { title: 'Alex Tumay lecture', publication: 'Red Bull Music Academy', url: 'https://www.redbullmusicacademy.com/lectures/alex-tumay-lecture/' },
      { title: 'Alex Tumay gear index', publication: 'Equipboard', url: 'https://equipboard.com/pros/alex-tumay' },
      { title: 'From T-Pain to Travis Scott: The Rap Auto-Tune Spectrum', publication: 'DJBooth', url: 'https://djbooth.net/features/2017-06-05-t-pain-travis-scott-auto-tune-in-rap/' },
    ],
  },

  // ==========================================================================
  {
    slug: 'taylor-swift',
    name: 'Taylor Swift',
    tagline: 'The most-heard vocal chain in pop is also the most boring, and that is the lesson.',
    era: '2014–present',
    genres: ['pop', 'folk', 'country'],
    daw: 'Pro Tools',
    credits: [
      { name: 'Serban Ghenea', role: 'mix engineer' },
      { name: 'Jack Antonoff', role: 'producer' },
      { name: 'Laura Sisk', role: 'recording engineer' },
    ],
    records: ['1989 (2014)', 'folklore (2020)', 'Midnights (2022)'],
    sound:
      'Clear, centred, effortless, and absolutely enormous without ever sounding processed. Ghenea has twenty-five Grammys and mixes almost entirely in the box on plugins that are decades old and unglamorous. Asked what advice he would give, he starts with the song rather than the gear. There is no secret chain here — that absence is the point.',
    tracking: [
      { job: 'note', plugin: null, confidence: 'reconstructed', note: 'Laura Sisk records the vocals; her per-album chain is not consistently published. Ghenea receives finished tracks and mixes.' },
    ],
    chain: [
      {
        job: 'channelstrip', title: 'Metric Halo ChannelStrip', plugin: 'metric-halo-channelstrip', confidence: 'documented',
        doing: 'Ghenea\'s workhorse for EQ and channel-strip duties. Transparent and unremarkable by design — across a hundred-track pop mix, a plugin with a personality becomes a hundred personalities.',
        settings: ['High-pass to taste', 'Small, decisive moves — this stage is not where the character comes from'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'comp', title: 'Waves 1176', plugin: 'waves-cla-76', confidence: 'documented',
        doing: 'His favourite compressor. Around 3 dB of gain reduction typically, or up to 10 dB when he wants it aggressive — a range worth noting, because it says the plugin is being used for two different jobs.',
        settings: ['3 dB for control', '10 dB when the vocal needs to be a wall', 'Ratio 4:1, fast release'],
        settingsOrigin: 'engineer',
      },
      {
        job: 'delay', title: 'H-Delay and Mod Delay III', plugin: 'waves-h-delay', confidence: 'documented',
        doing: 'His go-to delays. Mod Delay III ships free with Pro Tools, which is worth sitting with for a moment given the results.',
        settings: ['Dotted 1/8 throws', 'A short 80–120 ms slap for depth on verses', 'Multiple delays at different times rather than one loud one'],
        settingsOrigin: 'starting-point',
      },
      {
        job: 'width', title: 'Stacked real doubles', plugin: null, confidence: 'reconstructed',
        doing: 'The width on these choruses is performed, not generated — many takes, tuned and time-aligned tightly, panned out. The lead stays centred and dry by comparison.',
        settings: ['4–8 real doubles for a chorus', 'Tune and align these tightly, unlike the looser R&B approach', 'Lead centred, doubles wide and lower'],
        settingsOrigin: 'starting-point',
      },
    ],
    moves: [
      'Use plugins that do not have opinions. Character belongs to a few chosen stages, not to every channel.',
      'Several quiet delays at different times beat one obvious delay.',
      'The mix engineer on the biggest pop records of the last decade uses the delay that came free with his DAW.',
    ],
    caveat: 'Ghenea\'s tool preferences are documented; nothing here is a per-song recall of a Taylor Swift session, and the tracking chain is not published.',
    sources: [
      { title: 'Waves x Grammy 2021: Serban Ghenea Mixing Taylor Swift', publication: 'Waves Audio', url: 'https://www.waves.com/waves-grammys-2021-serban-ghenea-taylor-swift' },
      { title: 'Serban Ghenea', publication: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Serban_Ghenea' },
    ],
  },
]

export const CHAIN_BY_SLUG = Object.fromEntries(CHAINS.map(c => [c.slug, c]))

export const ALL_GENRES = [...new Set(CHAINS.flatMap(c => c.genres))].sort()

export const CONFIDENCE = {
  documented: {
    label: 'Documented',
    short: 'Doc',
    blurb: 'The engineer or producer said this on the record, in the cited source.',
    tone: 'good',
  },
  reported: {
    label: 'Reported',
    short: 'Rep',
    blurb: 'Trade press or a manufacturer feature states it, but not in the engineer\'s own words.',
    tone: 'warn',
  },
  reconstructed: {
    label: 'Reconstructed',
    short: 'Rec',
    blurb: 'Nobody published this. An informed reconstruction from the record and the era\'s tools.',
    tone: 'bad',
  },
}

/** Every plugin id a chain references, with the chains and stages that use it. */
export function pluginUsage() {
  const map = new Map()
  for (const chain of CHAINS) {
    for (const [where, stages] of [['tracking', chain.tracking], ['chain', chain.chain]]) {
      for (const stage of stages) {
        if (!stage.plugin) continue
        if (!map.has(stage.plugin)) map.set(stage.plugin, [])
        map.get(stage.plugin).push({
          slug: chain.slug,
          artist: chain.name,
          where,
          title: stage.title || stage.job,
          confidence: stage.confidence,
        })
      }
    }
  }
  return map
}
