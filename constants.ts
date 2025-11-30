import { MBTIProfile, MBTIGroup } from './types';

export const MBTI_PROFILES: MBTIProfile[] = [
  // Analysts
  {
    code: 'INTJ',
    name: 'Architect',
    group: 'Analysts',
    description: 'Imaginative and strategic thinkers, with a plan for everything.',
    adjectives: ['Strategic', 'Logical', 'Private', 'Independent']
  },
  {
    code: 'INTP',
    name: 'Logician',
    group: 'Analysts',
    description: 'Innovative inventors with an unquenchable thirst for knowledge.',
    adjectives: ['Analytical', 'Abstract', 'Curious', 'Detached']
  },
  {
    code: 'ENTJ',
    name: 'Commander',
    group: 'Analysts',
    description: 'Bold, imaginative and strong-willed leaders, always finding a way - or making one.',
    adjectives: ['Efficient', 'Energetic', 'Self-Confident', 'Forceful']
  },
  {
    code: 'ENTP',
    name: 'Debater',
    group: 'Analysts',
    description: 'Smart and curious thinkers who cannot resist an intellectual challenge.',
    adjectives: ['Knowledgeable', 'Quick-witted', 'Original', 'Argumentative']
  },
  // Diplomats
  {
    code: 'INFJ',
    name: 'Advocate',
    group: 'Diplomats',
    description: 'Quiet and mystical, yet very inspiring and tireless idealists.',
    adjectives: ['Insightful', 'Principled', 'Creative', 'Altruistic']
  },
  {
    code: 'INFP',
    name: 'Mediator',
    group: 'Diplomats',
    description: 'Poetic, kind and altruistic people, always eager to help a good cause.',
    adjectives: ['Empathetic', 'Idealistic', 'Open-minded', 'Passionate']
  },
  {
    code: 'ENFJ',
    name: 'Protagonist',
    group: 'Diplomats',
    description: 'Charismatic and inspiring leaders, able to mesmerize their listeners.',
    adjectives: ['Tolerant', 'Reliable', 'Charismatic', 'Natural Leaders']
  },
  {
    code: 'ENFP',
    name: 'Campaigner',
    group: 'Diplomats',
    description: 'Enthusiastic, creative and sociable free spirits, who can always find a reason to smile.',
    adjectives: ['Enthusiastic', 'Creative', 'Sociable', 'Free-spirited']
  },
  // Sentinels
  {
    code: 'ISTJ',
    name: 'Logistician',
    group: 'Sentinels',
    description: 'Practical and fact-minded individuals, whose reliability cannot be doubted.',
    adjectives: ['Honest', 'Direct', 'Responsible', 'Practical']
  },
  {
    code: 'ISFJ',
    name: 'Defender',
    group: 'Sentinels',
    description: 'Very dedicated and warm protectors, always ready to defend their loved ones.',
    adjectives: ['Supportive', 'Reliable', 'Patient', 'Imaginative']
  },
  {
    code: 'ESTJ',
    name: 'Executive',
    group: 'Sentinels',
    description: 'Excellent administrators, unsurpassed at managing things - or people.',
    adjectives: ['Dedicated', 'Strong-willed', 'Direct', 'Organized']
  },
  {
    code: 'ESFJ',
    name: 'Consul',
    group: 'Sentinels',
    description: 'Extraordinarily caring, social and popular people, always eager to help.',
    adjectives: ['Strong sense of duty', 'Loyal', 'Sensitive', 'Warm']
  },
  // Explorers
  {
    code: 'ISTP',
    name: 'Virtuoso',
    group: 'Explorers',
    description: 'Bold and practical experimenters, masters of all kinds of tools.',
    adjectives: ['Optimistic', 'Energetic', 'Creative', 'Spontaneous']
  },
  {
    code: 'ISFP',
    name: 'Adventurer',
    group: 'Explorers',
    description: 'Flexible and charming artists, always ready to explore and experience something new.',
    adjectives: ['Charming', 'Sensitive', 'Imaginative', 'Passionate']
  },
  {
    code: 'ESTP',
    name: 'Entrepreneur',
    group: 'Explorers',
    description: 'Smart, energetic and very perceptive people, who truly enjoy living on the edge.',
    adjectives: ['Bold', 'Rational', 'Original', 'Perceptive']
  },
  {
    code: 'ESFP',
    name: 'Entertainer',
    group: 'Explorers',
    description: 'Spontaneous, energetic and enthusiastic people - life is never boring around them.',
    adjectives: ['Bold', 'Original', 'Aesthetics', 'Observant']
  }
];

export const GROUP_COLORS: Record<MBTIGroup, string> = {
  Analysts: 'text-purple-400 border-purple-500 hover:bg-purple-900/20',
  Diplomats: 'text-emerald-400 border-emerald-500 hover:bg-emerald-900/20',
  Sentinels: 'text-sky-400 border-sky-500 hover:bg-sky-900/20',
  Explorers: 'text-amber-400 border-amber-500 hover:bg-amber-900/20'
};

export const GROUP_BG_COLORS: Record<MBTIGroup, string> = {
  Analysts: 'bg-purple-600',
  Diplomats: 'bg-emerald-500',
  Sentinels: 'bg-sky-500',
  Explorers: 'bg-amber-500'
};