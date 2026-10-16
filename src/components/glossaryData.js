// Content for the "hover, then click" explanation boxes.
// To add a word: add an entry here, then use <Term id="yourId">the word</Term> anywhere in the app.
//   cat     label shown on the box ("Eye anatomy", "Retina cell", ...)
//   short   one-line text shown while hovering
//   body    paragraphs in the box
//   does    "What it does" block (optional)
//   fact    fun fact (optional)
//   related ids of other entries, shown as buttons (optional)
//   math    true = adds a button that opens the maths walk-through (optional)

export const TERMS = {
  cornea: {
    title: 'Cornea',
    cat: 'Eye anatomy',
    short: 'The clear, curved window at the front of the eye.',
    body: [
      'The cornea is a transparent dome that covers the iris and pupil. It has no blood vessels (they would scatter light), so it takes its oxygen straight from the air and from your tears.',
    ],
    does: 'It does about two thirds of the eye’s focusing by bending incoming light. The lens only has to fine-tune it.',
    fact: 'Because it has no blood vessels, the cornea is one of the easiest tissues to transplant: the risk of rejection is low.',
    related: ['pupil', 'lens'],
  },
  pupil: {
    title: 'Pupil',
    cat: 'Eye anatomy',
    short: 'The adjustable opening that lets light into the eye.',
    body: [
      'The pupil is not a structure but a hole: the gap in the middle of the iris. It looks black because the light that enters is absorbed inside the eye.',
    ],
    does: 'It shrinks in bright light, which protects the retina and sharpens the image, and widens in the dark to let in more light.',
    related: ['lens', 'retina'],
  },
  lens: {
    title: 'Lens',
    cat: 'Eye anatomy',
    short: 'A flexible, transparent disc that fine-tunes the focus.',
    body: [
      'Behind the pupil sits the lens. Small muscles change its shape: rounder to focus on something close, flatter for something far away. This is called accommodation.',
    ],
    does: 'It makes sure light from one point in the world is focused onto one point on the retina.',
    fact: 'The lens stiffens with age, which is why many people need reading glasses from around 45.',
    related: ['cornea', 'retina'],
  },
  retina: {
    title: 'Retina',
    cat: 'Eye anatomy',
    short: 'The light-sensitive tissue lining the back of the eye.',
    body: [
      'The retina is only about a third of a millimetre thick, but it contains several layers of nerve cells. It is actually a piece of the brain that grew out into the eye.',
      'It does not just record the image. It already processes it before anything is sent on to the brain.',
    ],
    does: 'It converts light into electrical signals and starts analysing them, for example contrast and edges.',
    related: ['photoreceptor', 'bipolar', 'ganglion'],
  },
  photoreceptor: {
    title: 'Photoreceptors (rods and cones)',
    cat: 'Retina cell',
    short: 'Cells that catch light: rods for dim light, cones for colour and detail.',
    body: [
      'A human retina has roughly 120 million rods and 6 million cones. Rods work in dim light but only see shades of grey. Cones need brighter light and come in three types, which gives us colour vision.',
    ],
    does: 'They convert light into an electrical signal and hand it on to bipolar cells.',
    related: ['bipolar', 'horizontal'],
  },
  bipolar: {
    title: 'Bipolar cell',
    cat: 'Retina cell',
    short: 'Passes the signal from photoreceptors on to ganglion cells.',
    body: [
      'Bipolar cells sit in the middle layer of the retina. They come in two kinds: ON bipolar cells become more active when light increases, OFF bipolar cells when light decreases.',
    ],
    does: 'This is where the ON and OFF pathways split, which is why we model ON-center and OFF-center ganglion cells.',
    related: ['ganglion', 'oncentre'],
  },
  horizontal: {
    title: 'Horizontal cell',
    cat: 'Retina cell',
    short: 'Links neighbouring photoreceptors sideways.',
    body: [
      'Horizontal cells spread out in a thin layer and listen to many photoreceptors at once. They then feed back to those photoreceptors and to the bipolar cells.',
    ],
    does: 'They create the surround: each spot is told how bright its neighbourhood is, so it can be compared with the centre. This is called lateral inhibition.',
    related: ['surround', 'lateralinhibition'],
  },
  ganglion: {
    title: 'Retinal ganglion cell',
    cat: 'Retina cell',
    short: 'The output cell of the retina. Its axon is a fibre of the optic nerve.',
    body: [
      'Each eye has about a million of them. Most other retinal cells use smooth, graded signals, but ganglion cells send action potentials (spikes) along their long axons to the brain.',
      'Each ganglion cell only “sees” a small patch of the retina: its receptive field.',
    ],
    does: 'It reports how the light in its patch differs from the light around it. This is the cell our model simulates.',
    related: ['receptivefield', 'actionpotential', 'oncentre'],
  },
  receptivefield: {
    title: 'Receptive field',
    cat: 'Model concept',
    short: 'The patch of retina that can change one cell’s firing.',
    body: [
      'For a ganglion cell, this is the group of photoreceptors that feed into it. It has two zones: a small centre and a ring around it, the surround.',
      'Light on the centre pushes the cell one way. Light on the surround pushes it the other way.',
    ],
    does: 'Because the two zones work against each other, the cell measures contrast (a difference) rather than brightness.',
    related: ['centre', 'surround', 'dog'],
  },
  centre: {
    title: 'Centre',
    cat: 'Model concept',
    short: 'The small middle zone of a receptive field.',
    body: [
      'The centre is small but strong. In an ON-center cell, light here excites the cell (amber in our model). In an OFF-center cell, light here suppresses it.',
    ],
    related: ['surround', 'oncentre', 'offcentre'],
  },
  surround: {
    title: 'Surround',
    cat: 'Model concept',
    short: 'The ring around the centre, with the opposite effect.',
    body: [
      'The surround is wider but weaker than the centre. It comes from horizontal cells and always works against the centre (blue in our model).',
    ],
    does: 'It cancels the centre when light is spread evenly, so only differences get through.',
    related: ['centre', 'horizontal', 'lateralinhibition'],
  },
  oncentre: {
    title: 'ON-center cell',
    cat: 'Model concept',
    short: 'Fires more when light falls on its centre.',
    body: [
      'An ON-center cell is excited by light in the centre and inhibited by light in the surround. A small bright spot makes it fire fast. A dark spot in the centre makes it go quiet.',
    ],
    does: 'It signals “brighter than my surroundings”.',
    related: ['offcentre', 'receptivefield'],
  },
  offcentre: {
    title: 'OFF-center cell',
    cat: 'Model concept',
    short: 'Fires more when its centre goes dark.',
    body: [
      'The mirror image of an ON cell: inhibited by light in the centre and excited by light in the surround. A small dark spot on a bright background makes it fire.',
    ],
    does: 'It signals “darker than my surroundings”.',
    related: ['oncentre', 'receptivefield'],
  },
  lateralinhibition: {
    title: 'Lateral inhibition',
    cat: 'Physiology',
    short: 'Active cells quieten their neighbours, which sharpens contrast.',
    body: [
      'When one patch of the retina is strongly lit, it turns down its neighbours (through horizontal cells). The difference between lit and unlit areas gets exaggerated.',
    ],
    does: 'It exaggerates edges. It is the biological reason the surround exists.',
    related: ['horizontal', 'surround'],
  },
  actionpotential: {
    title: 'Action potential (spike)',
    cat: 'Physiology',
    short: 'A brief electrical pulse that neurons use to send signals.',
    body: [
      'A spike lasts about a millisecond and is all-or-nothing: it is always the same size. When the voltage inside the cell reaches the threshold (−50 mV in our oscilloscope), the cell fires.',
      'So the information is not in the size of a spike but in how often spikes happen.',
    ],
    does: 'The brain reads the firing rate: more spikes per second means a stronger signal.',
    related: ['firingrate', 'ganglion'],
  },
  firingrate: {
    title: 'Firing rate',
    cat: 'Physiology',
    short: 'How many spikes a cell fires per second.',
    body: [
      'Even when the light does not change, ganglion cells keep firing at a resting (baseline) rate: 20 spikes per second in our model. Going above the baseline means “more”, going below means “less”.',
    ],
    does: 'The baseline lets one cell report both directions: an ON cell rises above it for a bright spot, an OFF cell for a dark one.',
    related: ['actionpotential'],
  },
  contrast: {
    title: 'Contrast',
    cat: 'Model concept',
    short: 'The difference in brightness between neighbouring regions.',
    body: [
      'High contrast: black text on white paper. Low contrast: grey text on a slightly lighter grey. In the simulator, the Contrast slider sets how much brighter (or darker) the stimulus is than its background.',
    ],
    does: 'Contrast, not absolute brightness, is what ganglion cells report.',
    related: ['edge'],
  },
  edge: {
    title: 'Edge',
    cat: 'Model concept',
    short: 'A place where brightness changes abruptly.',
    body: [
      'Outlines of objects, letters and shadows are all edges. At an edge, one part of a cell’s receptive field is lit and another part is dark.',
    ],
    does: 'This is exactly the situation in which centre and surround no longer cancel, so the cell responds strongly.',
    related: ['dog', 'contrast'],
  },
  gaussian: {
    title: 'Gaussian',
    cat: 'Model concept',
    short: 'A smooth, bell-shaped curve.',
    body: [
      'A Gaussian is tall in the middle and falls off smoothly on both sides. Its width is set by a number, σ (sigma): small σ means narrow and tall, large σ means wide and low.',
    ],
    does: 'We use one narrow Gaussian for the centre and one wide Gaussian for the surround.',
    related: ['dog'],
    math: true,
  },
  dog: {
    title: 'Difference of Gaussians (DoG)',
    cat: 'Model concept',
    short: 'A narrow bell curve minus a wide one: the “Mexican hat”.',
    body: [
      'The DoG describes how strongly each spot of the receptive field counts: positive in the middle (centre) and negative in a ring around it (surround).',
      'Plotted in one dimension it looks like a Mexican hat. Spin it around its middle and you get the amber-and-blue receptive field in the simulator.',
    ],
    does: 'It lets us calculate exactly how a given stimulus changes the cell’s firing rate.',
    related: ['gaussian', 'receptivefield'],
    math: true,
  },
}
