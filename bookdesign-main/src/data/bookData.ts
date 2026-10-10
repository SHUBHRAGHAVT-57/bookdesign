import type { BookInfo, Passage } from '../types';

export const BOOK: BookInfo = {
  title: 'Small Wonders',
  subtitle: 'Six short study passages',
  edition: 'Memory Edition',
};

// All passages are original text written for this project.
// Keep them single-spaced, plain ASCII, with no line breaks.
export const PASSAGES: Passage[] = [
  {
    id: 'plants',
    chapterNumber: 1,
    chapterTitle: 'Living Things',
    title: 'How Plants Make Food',
    text:
      'Plants make their own food through a process called photosynthesis. Inside the green parts of a leaf, a pigment named chlorophyll captures sunlight. The plant combines this light energy with water from the soil and carbon dioxide from the air. The result is a sugar that fuels growth, and oxygen that is released back into the air. Without this quiet exchange, most animals could not breathe.',
    concepts: ['photosynthesis', 'chlorophyll', 'oxygen'],
    question: {
      prompt: 'Which gas does a plant release back into the air during this process?',
      accepted: ['oxygen'],
      modelAnswer: 'Oxygen.',
      concept: 'oxygen',
    },
  },
  {
    id: 'water',
    chapterNumber: 2,
    chapterTitle: 'Earth and Sky',
    title: 'The Water Cycle',
    text:
      'Water is always moving between the ocean, the sky, and the land. Heat from the sun causes evaporation, which lifts invisible vapour into the air. High above, the cooler air makes the vapour condense into tiny droplets that form clouds. When the droplets grow heavy, they fall as precipitation, such as rain or snow. Rivers then carry the water back to the sea, and the cycle begins again.',
    concepts: ['evaporation', 'vapour', 'condense', 'precipitation'],
    question: {
      prompt: 'What happens to the vapour when it rises into the cooler air high above?',
      accepted: ['condense', 'condenses', 'condensed', 'condensation', 'condensing', 'droplets', 'clouds'],
      modelAnswer: 'It condenses into tiny droplets that form clouds.',
      concept: 'condense',
    },
  },
  {
    id: 'habits',
    chapterNumber: 3,
    chapterTitle: 'The Mind',
    title: 'Why Habits Stick',
    text:
      'A habit is a behaviour that the brain repeats until it needs very little effort. At first, each step demands attention. With repetition, the brain stores the sequence as a routine, so conscious thought can rest. A small cue, such as the smell of coffee, can trigger the whole routine at once. This is why tiny actions practised daily often beat large efforts made rarely.',
    concepts: ['behaviour', 'routine', 'cue', 'repetition'],
    question: {
      prompt: 'According to the passage, what can trigger a whole routine at once?',
      accepted: ['cue', 'cues', 'smell of coffee', 'coffee'],
      modelAnswer: 'A small cue, such as the smell of coffee.',
      concept: 'cue',
    },
  },
  {
    id: 'maps',
    chapterNumber: 4,
    chapterTitle: 'People and Places',
    title: 'Why Maps Distort',
    text:
      'A globe is round, but a map is flat, and that difference creates a problem. When a curved surface is spread onto paper, something must stretch or shrink. Some maps keep shapes accurate but exaggerate the size of lands near the poles. Others keep area fair while bending the shapes. Every flat map is therefore a compromise, and a careful reader asks what the mapmaker chose to preserve.',
    concepts: ['curved', 'exaggerate', 'compromise', 'preserve'],
    question: {
      prompt: 'What problem appears when a curved surface is spread onto flat paper?',
      accepted: ['stretch', 'stretches', 'stretched', 'shrink', 'shrinks', 'shrunk', 'distort', 'distorts', 'distorted', 'distortion'],
      modelAnswer: 'Something must stretch or shrink, so the map distorts the world.',
      concept: 'compromise',
    },
  },
  {
    id: 'echoes',
    chapterNumber: 5,
    chapterTitle: 'Light and Sound',
    title: 'Sound and Echoes',
    text:
      'An echo is a sound that bounces off a hard surface and returns to your ears. Sound travels as vibrations through the air, and a wall or cliff can reflect those vibrations. If the surface is far enough away, you hear the reflection as a separate, delayed copy of the original sound. Soft materials such as curtains absorb sound instead, which is why a carpeted room feels so quiet.',
    concepts: ['vibrations', 'reflect', 'absorb', 'delayed'],
    question: {
      prompt: 'Why does a carpeted room feel so quiet?',
      accepted: ['absorb', 'absorbs', 'absorbed', 'absorbing', 'absorption', 'soft'],
      modelAnswer: 'Soft materials absorb sound instead of reflecting it.',
      concept: 'absorb',
    },
  },
  {
    id: 'pollination',
    chapterNumber: 6,
    chapterTitle: 'Living Things',
    title: 'How Flowers Share Pollen',
    text:
      'A flower cannot move pollen by itself, so it relies on wind or visiting animals. Bees drink nectar, a sugary liquid made by flowers. As a bee reaches inside, grains of pollen cling to its body. The bee carries some grains to another flower, where pollen can reach the part that forms seeds. This transfer, called pollination, helps many plants reproduce.',
    concepts: ['pollen', 'nectar', 'pollination', 'reproduce'],
    question: {
      prompt: 'How can a bee help a flower form seeds?',
      accepted: ['pollen', 'pollination', 'pollinate', 'pollinates'],
      modelAnswer: 'Pollen clings to a bee and is carried to another flower, where it can reach the seed-forming part.',
      concept: 'pollination',
    },
  },
];
