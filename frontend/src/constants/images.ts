// Premium mountain destination images from Unsplash (royalty-free, optimized)
export const MOUNTAIN_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=90',
  manali: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=90',
  ladakh: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=90',
  munnar: 'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=1200&q=90',
  swissAlps: 'https://images.unsplash.com/photo-1519681393798-3828fb4090bb?auto=format&fit=crop&w=1200&q=90',
  sunrise: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=90',
  lake: 'https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=1200&q=90',
  road: 'https://images.unsplash.com/photo-1465056836041-7f43ac27dcb5?auto=format&fit=crop&w=1200&q=90',
  valley: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=90',
  snow: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1200&q=90',
  greenHills: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=90',
  adventure: 'https://images.unsplash.com/photo-1520962889616-a5f98b4506cd?auto=format&fit=crop&w=1200&q=90',
} as const;

export type MountainImageKey = keyof typeof MOUNTAIN_IMAGES;

export const mountainDestinations = [
  {
    id: 'manali',
    title: 'Manali',
    image: MOUNTAIN_IMAGES.manali,
    description: 'Snowy mountains, adventure sports, and scenic valleys.',
    budget: '₹8,000 - ₹15,000',
    bestTime: 'October to February',
    rating: 4.7,
  },
  {
    id: 'ladakh',
    title: 'Ladakh',
    image: MOUNTAIN_IMAGES.ladakh,
    description: 'High-altitude roads, lakes, monasteries, and epic views.',
    budget: '₹18,000 - ₹35,000',
    bestTime: 'May to September',
    rating: 4.9,
  },
  {
    id: 'munnar',
    title: 'Munnar',
    image: MOUNTAIN_IMAGES.munnar,
    description: 'Tea gardens, misty hills, waterfalls, and calm stays.',
    budget: '₹7,000 - ₹14,000',
    bestTime: 'September to March',
    rating: 4.6,
  },
  {
    id: 'swiss-alps',
    title: 'Swiss Alps',
    image: MOUNTAIN_IMAGES.swissAlps,
    description: 'Majestic peaks, pristine lakes, and world-class skiing.',
    budget: '₹2,50,000 - ₹5,00,000',
    bestTime: 'December to March',
    rating: 4.9,
  },
  {
    id: 'uttarakhand',
    title: 'Uttarakhand',
    image: MOUNTAIN_IMAGES.valley,
    description: 'Valleys of flowers, spiritual trails, and river rafting.',
    budget: '₹9,000 - ₹20,000',
    bestTime: 'March to June',
    rating: 4.5,
  },
];

export function getDestinationImage(nameOrId: string): string {
  const normalized = (nameOrId || '').toLowerCase();
  if (normalized.includes('manali')) return MOUNTAIN_IMAGES.manali;
  if (normalized.includes('ladakh')) return MOUNTAIN_IMAGES.ladakh;
  if (normalized.includes('munnar')) return MOUNTAIN_IMAGES.munnar;
  if (normalized.includes('swiss') || normalized.includes('alps')) return MOUNTAIN_IMAGES.swissAlps;
  if (normalized.includes('coorg')) return MOUNTAIN_IMAGES.greenHills;
  if (normalized.includes('pondicherry') || normalized.includes('beach') || normalized.includes('goa')) return MOUNTAIN_IMAGES.lake;
  if (normalized.includes('udaipur') || normalized.includes('jaipur')) return MOUNTAIN_IMAGES.sunrise;
  if (normalized.includes('uttarakhand') || normalized.includes('valley')) return MOUNTAIN_IMAGES.valley;
  
  const keys: (keyof typeof MOUNTAIN_IMAGES)[] = ['lake', 'road', 'valley', 'snow', 'adventure', 'sunrise', 'greenHills'];
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % keys.length;
  return MOUNTAIN_IMAGES[keys[index]];
}
