// Premium mountain destination images from Unsplash (royalty-free, optimized)
export const MOUNTAIN_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
  manali: 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=800&q=80',
  ladakh: 'https://images.unsplash.com/photo-1562602876-0c50d6244924?w=800&q=80',
  munnar: 'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?w=800&q=80',
  swissAlps: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  sunrise: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80',
  lake: 'https://images.unsplash.com/photo-1439853949127-fa647821eba0?w=800&q=80',
  road: 'https://images.unsplash.com/photo-1465056836041-7f43ac27dcb5?w=800&q=80',
  valley: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&q=80',
  snow: 'https://images.unsplash.com/photo-1519681393798-3828fb4090bb?w=800&q=80',
  greenHills: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80',
  adventure: 'https://images.unsplash.com/photo-1520962889616-a5f98b4506cd?w=800&q=80',
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
