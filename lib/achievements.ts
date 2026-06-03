type Coin = {
  year: number;
  rarity: number;
  metal: string;
  condition: number; // ✅ MUST match your Supabase column
};

type Achievement = {
  id: number;
  category: string;
  name: string;
  points: number;
  check: (coins: Coin[]) => boolean;
};

export const achievements: Achievement[] = [
  {
    id: 1,
    category: "Collection",
    name: "First Coin",
    points: 5,
    check: (coins: Coin[]) => coins.length >= 1,
  },
  {
    id: 2,
    category: "Collection",
    name: "Coin Hoarder",
    points: 50,
    check: (coins: Coin[]) => coins.length >= 50,
  },
  {
    id: 3,
    category: "Collection",
    name: "Museum",
    points: 500,
    check: (coins: Coin[]) => coins.length >= 200,
  },

  // YEARS
  {
    id: 4,
    category: "Years",
    name: "1828 Collector",
    points: 50,
    check: (coins: Coin[]) => coins.some(c => c.year === 1828),
  },
  {
    id: 5,
    category: "Years",
    name: "19th Century",
    points: 100,
    check: (coins: Coin[]) =>
      coins.some(c => c.year >= 1800 && c.year <= 1899),
  },

  // MATERIALS
  {
    id: 6,
    category: "Materials",
    name: "Bronze Collector",
    points: 25,
    check: (coins: Coin[]) =>
      coins.some(c => c.metal === "Bronze"),
  },
  {
    id: 7,
    category: "Materials",
    name: "Silver Enthusiast",
    points: 100,
    check: (coins: Coin[]) =>
      coins.filter(c => c.metal === "Silver").length >= 10,
  },
  {
    id: 8,
    category: "Materials",
    name: "Silver Hoarder",
    points: 500,
    check: (coins: Coin[]) =>
      coins.filter(c => c.metal === "Silver").length >= 50,
  },

  // RARITY
  {
    id: 9,
    category: "Rarity",
    name: "Rare Find",
    points: 25,
    check: (coins: Coin[]) =>
      coins.some(c => c.rarity >= 30),
  },
  {
    id: 10,
    category: "Rarity",
    name: "Legendary Hunter",
    points: 500,
    check: (coins: Coin[]) =>
      coins.some(c => c.rarity >= 50),
  },
  {
    id: 11,
    category: "Rarity",
    name: "One Of A Kind",
    points: 5000,
    check: (coins: Coin[]) =>
      coins.some(c => c.rarity >= 70),
  },

  // CONDITION (FIXED)
  {
    id: 12,
    category: "Condition",
    name: "Brilliant",
    points: 100,
    check: (coins: Coin[]) =>
      coins.some(c => c.condition >= 12),
  },
  {
    id: 13,
    category: "Condition",
    name: "Perfection",
    points: 1000,
    check: (coins: Coin[]) =>
      coins.some(c => c.condition >= 13),
  },
];