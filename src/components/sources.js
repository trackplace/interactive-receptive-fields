// All references used by the app, and which slide uses which.
//
// To add a source:   1) add an entry to REFS below, 2) put its id in the `ids` list of every slide it supports (SLIDES).
//   cite   short form, e.g. "Kuffler 1953"
//   full   the full reference
//   used   one line on what in the app this source supports
//   doi    optional, gives a "doi.org" link        pmid  optional, gives a "PubMed" link        url  optional, any other link

export const REFS = {
  // ---- the model: receptive fields and the difference of Gaussians ----
  kuffler1953: {
    cite: 'Kuffler 1953',
    full: 'Kuffler, S. W. (1953). Discharge patterns and functional organization of mammalian retina. Journal of Neurophysiology, 16(1), 37–68.',
    doi: '10.1152/jn.1953.16.1.37',
    used: 'First description of ganglion cells with an excitatory centre and an opposing surround (ON-center and OFF-center cells).',
  },
  hartline1938: {
    cite: 'Hartline 1938',
    full: 'Hartline, H. K. (1938). The response of single optic nerve fibers of the vertebrate eye to illumination of the retina. American Journal of Physiology, 121(2), 400–415.',
    doi: '10.1152/ajplegacy.1938.121.2.400',
    used: 'Origin of the idea that each optic nerve fibre has a receptive field: a patch of retina that changes its firing.',
  },
  rodieckstone1965: {
    cite: 'Rodieck & Stone 1965',
    full: 'Rodieck, R. W., & Stone, J. (1965). Analysis of receptive fields of cat retinal ganglion cells. Journal of Neurophysiology, 28(5), 833–849.',
    doi: '10.1152/jn.1965.28.5.833',
    pmid: '5867882',
    used: 'Measures the receptive fields of cat ganglion cells: a centre and an opposing surround.',
  },
  rodieck1965: {
    cite: 'Rodieck 1965',
    full: 'Rodieck, R. W. (1965). Quantitative analysis of cat retinal ganglion cell response to visual stimuli. Vision Research, 5(12), 583–601.',
    doi: '10.1016/0042-6989(65)90033-7',
    used: 'Describes the centre and the surround with two Gaussians: the difference-of-Gaussians model used here.',
  },
  enroth1966: {
    cite: 'Enroth-Cugell & Robson 1966',
    full: 'Enroth-Cugell, C., & Robson, J. G. (1966). The contrast sensitivity of retinal ganglion cells of the cat. The Journal of Physiology, 187(3), 517–552.',
    doi: '10.1113/jphysiol.1966.sp008107',
    used: 'Measures the contrast sensitivity of cat ganglion cells and describes it with a centre and a surround, each a Gaussian.',
  },
  soodak1986: {
    cite: 'Soodak 1986',
    full: 'Soodak, R. E. (1986). Two-dimensional modeling of visual receptive fields using Gaussian subunits. Proceedings of the National Academy of Sciences, 83(23), 9259–9263.',
    doi: '10.1073/pnas.83.23.9259',
    pmid: '3466186',
    used: 'Builds a two-dimensional receptive field from Gaussian components and predicts how it responds to a stimulus.',
  },
  dayan2001: {
    cite: 'Dayan & Abbott 2001',
    full: 'Dayan, P., & Abbott, L. F. (2001). Theoretical Neuroscience: Computational and Mathematical Modeling of Neural Systems (chapter 2). MIT Press.',
    used: 'Textbook treatment of receptive fields as weighting functions, the difference-of-Gaussians field, and the firing rate as the weighted sum of a stimulus.',
  },
  marr1980: {
    cite: 'Marr & Hildreth 1980',
    full: 'Marr, D., & Hildreth, E. (1980). Theory of edge detection. Proceedings of the Royal Society of London. Series B, Biological Sciences, 207(1167), 187–217.',
    doi: '10.1098/rspb.1980.0020',
    used: 'Why a difference of Gaussians is a good edge detector (the "Extract edges" demo).',
  },
  soo2011: {
    cite: 'Soo et al. 2011',
    full: 'Soo, F. S., Schwartz, G. W., Sadeghi, K., & Berry, M. J. (2011). Fine spatial information represented in a population of retinal ganglion cells. Journal of Neuroscience, 31(6), 2145–2155.',
    doi: '10.1523/JNEUROSCI.5129-10.2011',
    used: 'How a whole population of ganglion cells, each with its own receptive field, together represents fine spatial detail.',
  },

  // ---- the eye and the retina ----
  purves2018: {
    cite: 'Purves et al. 2018',
    full: 'Purves, D., Augustine, G. J., Fitzpatrick, D., Hall, W. C., LaMantia, A.-S., & White, L. E. (Eds.). (2018). Neuroscience (6th ed.). Oxford University Press. See the chapter on the eye.',
    used: 'Textbook source for the optics of the eye: cornea, pupil and lens.',
  },
  kandel2021: {
    cite: 'Kandel et al. 2021',
    full: 'Kandel, E. R., Koester, J. D., Mack, S. H., & Siegelbaum, S. A. (Eds.). (2021). Principles of Neural Science (6th ed.). McGraw-Hill. See the chapters on the retina and on low-level visual processing.',
    used: 'Textbook source for the layers of the retina, ON and OFF bipolar cells, horizontal cells and the optic nerve.',
  },
  nelson: {
    cite: 'Nelson (Webvision)',
    full: 'Nelson, R. Visual responses of ganglion cells. In H. Kolb, E. Fernandez, & R. Nelson (Eds.), Webvision: The Organization of the Retina and Visual System. webvision.pitt.edu',
    url: 'https://www.webvision.pitt.edu/book/part-ii-anatomy-and-physiology-of-the-retina/ganglion-cell-physiology/',
    used: 'Free, illustrated overview of ON and OFF ganglion cells and their centre-surround receptive fields.',
  },
  curcio1990: {
    cite: 'Curcio et al. 1990',
    full: 'Curcio, C. A., Sloan, K. R., Kalina, R. E., & Hendrickson, A. E. (1990). Human photoreceptor topography. Journal of Comparative Neurology, 292(4), 497–523.',
    doi: '10.1002/cne.902920402',
    used: 'Counts of rods and cones in the human retina (on average about 92 million rods and 4.6 million cones in this study).',
  },
  curcio1990g: {
    cite: 'Curcio & Allen 1990',
    full: 'Curcio, C. A., & Allen, K. A. (1990). Topography of ganglion cells in human retina. Journal of Comparative Neurology, 300(1), 5–25.',
    doi: '10.1002/cne.903000103',
    used: 'Number and spread of ganglion cells in the human retina (on the order of one million per eye).',
  },
  hartline1956: {
    cite: 'Hartline, Wagner & Ratliff 1956',
    full: 'Hartline, H. K., Wagner, H. G., & Ratliff, F. (1956). Inhibition in the eye of Limulus. The Journal of General Physiology, 39(5), 651–673.',
    doi: '10.1085/jgp.39.5.651',
    used: 'Classic demonstration of lateral inhibition: a lit receptor reduces the response of its neighbours.',
  },
  buldyrev2013: {
    cite: 'Buldyrev & Taylor 2013',
    full: 'Buldyrev, I., & Taylor, W. R. (2013). Inhibitory mechanisms that generate centre and surround properties in ON and OFF brisk-sustained ganglion cells in the rabbit retina. The Journal of Physiology, 591(1), 303–325.',
    doi: '10.1113/jphysiol.2012.243113',
    used: 'Shows how inhibition in the retina creates the centre and the surround of ON and OFF ganglion cells.',
  },

  // ---- action potentials and firing rate ----
  adrian1926: {
    cite: 'Adrian & Zotterman 1926',
    full: 'Adrian, E. D., & Zotterman, Y. (1926). The impulses produced by sensory nerve-endings: Part II. The response of a single end-organ. The Journal of Physiology, 61(2), 151–171.',
    doi: '10.1113/jphysiol.1926.sp002281',
    used: 'The classic result that a stronger stimulus makes a neuron fire more often, while each spike stays the same: the firing-rate code.',
  },
  hodgkin1952: {
    cite: 'Hodgkin & Huxley 1952',
    full: 'Hodgkin, A. L., & Huxley, A. F. (1952). A quantitative description of membrane current and its application to conduction and excitation in nerve. The Journal of Physiology, 117(4), 500–544.',
    doi: '10.1113/jphysiol.1952.sp004764',
    used: 'The action potential: a brief, all-or-nothing voltage pulse that starts when the membrane potential reaches a threshold.',
  },

  // ---- everyday vision and illusions ----
  schiller2005: {
    cite: 'Schiller & Carvey 2005',
    full: 'Schiller, P. H., & Carvey, C. E. (2005). The Hermann grid illusion revisited. Perception, 34(11), 1375–1397.',
    doi: '10.1068/p5447',
    used: 'The Hermann grid: the centre-surround explanation is the classic one, but this paper shows that the full story is more complex.',
  },
  kingdom2014: {
    cite: 'Kingdom 2014',
    full: 'Kingdom, F. A. A. (2014). Mach bands explained by response normalization. Frontiers in Human Neuroscience, 8, 843.',
    doi: '10.3389/fnhum.2014.00843',
    used: 'Mach bands, another illusion at edges, and a modern account of what causes them (it goes beyond the simple centre-surround story).',
  },
}

// What each slide lists. The keys are the same as in App.jsx: intro, eye0, eye1, eye2, explorer.
export const SLIDES = {
  intro: {
    title: 'Edges in an image',
    ids: ['rodieck1965', 'marr1980', 'kuffler1953', 'nelson', 'soo2011', 'curcio1990g', 'schiller2005', 'kingdom2014'],
  },
  eye0: {
    title: 'The eye',
    ids: ['purves2018', 'kandel2021', 'nelson'],
  },
  eye1: {
    title: 'Inside the retina',
    ids: ['kandel2021', 'nelson', 'curcio1990', 'curcio1990g', 'hartline1956', 'buldyrev2013'],
  },
  eye2: {
    title: 'Receptive field',
    ids: ['hartline1938', 'kuffler1953', 'rodieckstone1965', 'rodieck1965', 'enroth1966', 'buldyrev2013', 'nelson'],
  },
  explorer: {
    title: 'The simulator',
    ids: ['rodieckstone1965', 'rodieck1965', 'enroth1966', 'soodak1986', 'dayan2001', 'adrian1926', 'hodgkin1952', 'soo2011'],
    choices: true,
  },
}

// Numbers in the simulator that are modelling choices, not measurements.
export const CHOICES = [
  'The resting rate of 20 spikes/s and the gain of 100 spikes/s per unit of R are illustrative values chosen so that the effects are easy to see. Real ganglion cells differ in their resting rate and sensitivity.',
  'The resting potential (−65 mV) and the spike threshold (−50 mV) on the oscilloscope are typical round numbers for a neuron. Real cells vary around these values.',
  'The spike shape and the small ripple on the voltage trace are drawn for illustration. The spikes are spaced fairly regularly so that the rate is easy to read. Real spike trains are more irregular.',
  'The simulator treats the cell as a linear weighted sum of the stimulus followed by a limit at 0 and 120 spikes/s. This is the simplest version of the model. Real cells also adapt over time and have non-linear parts.',
]