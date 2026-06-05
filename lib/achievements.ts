export type Coin = {
  id?: number; // Added if your coins have a unique identifier row
  year: number;
  rarity: number;
  metal: string;
  condition: number;
};

export type CatalogTotals = {
  total1828Coins: number;
  total19thCenturyCoins: number;
};

export type Achievement = {
  id: number;
  category: string;
  name: string;
  points: number;
  check: (coins: Coin[], catalogTotals: CatalogTotals) => boolean;
};

export const achievements: Achievement[] = [
  {
    id: 1,
    category: "Collection",
    name: "First Coin",
    points: 5,
    check: (coins) => coins.length >= 1,
  },
  {
    id: 2,
    category: "Collection",
    name: "Coin Hoarder",
    points: 50,
    check: (coins) => coins.length >= 50,
  },
  {
    id: 3,
    category: "Collection",
    name: "Museum",
    points: 500,
    check: (coins) => coins.length >= 200,
  },
  {
    id: 4,
    category: "Years",
    name: "1828 Collector",
    points: 50,
    check: (coins, catalogTotals) => {
      // 1. Filter down to user's 1828 coins
      // 2. Map by rarity or an ID to ensure we look at UNIQUE types, not duplicates
      const userUnique1828Count = new Set(
        coins.filter((c) => Number(c.year) === 1828).map((c) => c.rarity)
      ).size;

      // True only if they own every single unique 1828 coin variant in the catalog
      return userUnique1828Count >= catalogTotals.total1828Coins && catalogTotals.total1828Coins > 0;
    },
  },
  {
    id: 5,
    category: "Years",
    name: "19th Century",
    points: 100,
    check: (coins, catalogTotals) => {
      const userUnique19thCount = new Set(
        coins
          .filter((c) => {
            const y = Number(c.year);
            return y >= 1800 && y <= 1899;
          })
          .map((c) => c.rarity)
      ).size;

      return userUnique19thCount >= catalogTotals.total19thCenturyCoins && catalogTotals.total19thCenturyCoins > 0;
    },
  },
  {
    id: 6,
    category: "Materials",
    name: "Bronze Collector",
    points: 25,
    check: (coins) => coins.some((c) => c.metal === "Bronze"),
  },
  {
    id: 7,
    category: "Materials",
    name: "Silver Enthusiast",
    points: 100,
    check: (coins) => coins.filter((c) => c.metal === "Silver").length >= 10,
  },
  {
    id: 8,
    category: "Materials",
    name: "Silver Hoarder",
    points: 500,
    check: (coins) => coins.filter((c) => c.metal === "Silver").length >= 50,
  },
  {
    id: 9,
    category: "Rarity",
    name: "Rare Find",
    points: 25,
    check: (coins) => coins.some((c) => c.rarity >= 30),
  },
  {
    id: 10,
    category: "Rarity",
    name: "Legendary Hunter",
    points: 500,
    check: (coins) => coins.some((c) => c.rarity >= 50),
  },
  {
    id: 11,
    category: "Rarity",
    name: "One Of A Kind",
    points: 5000,
    check: (coins) => coins.some((c) => c.rarity >= 70),
  },
  {
    id: 12,
    category: "Condition",
    name: "Brilliant",
    points: 100,
    check: (coins) => coins.some((c) => c.condition >= 12),
  },
  {
    id: 13,
    category: "Condition",
    name: "Perfection",
    points: 1000,
    check: (coins) => coins.some((c) => c.condition >= 13),
  },
];