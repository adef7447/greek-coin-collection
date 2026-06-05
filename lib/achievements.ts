export type Coin = {
  id?: number; 
  year: number;
  rarity: number;
  metal: string;
  condition: number;
};

export type CatalogTotals = {
  years: Record<number, number>;      
  centuries: Record<string, number>;  
};

export type Achievement = {
  id: number;
  category: string;
  name: string;
  points: number;
  check: (coins: Coin[], catalogTotals: CatalogTotals) => boolean;
  // New function to calculate running progress dynamically
  getProgress: (coins: Coin[], catalogTotals: CatalogTotals) => { current: number; target: number };
};

export const achievements: Achievement[] = [
  {
    id: 1,
    category: "Collection",
    name: "First Coin",
    points: 5,
    check: (coins) => coins.length >= 1,
    getProgress: (coins) => ({ current: Math.min(coins.length, 1), target: 1 })
  },
  {
    id: 2,
    category: "Collection",
    name: "Coin Hoarder",
    points: 50,
    check: (coins) => coins.length >= 50,
    getProgress: (coins) => ({ current: Math.min(coins.length, 50), target: 50 })
  },
  {
    id: 3,
    category: "Collection",
    name: "Museum",
    points: 500,
    check: (coins) => coins.length >= 200,
    getProgress: (coins) => ({ current: Math.min(coins.length, 200), target: 200 })
  },
  {
    id: 4,
    category: "Years",
    name: "1828 Collector",
    points: 50,
    check: (coins, catalogTotals) => {
      const targetYear = 1828;
      const totalRequired = catalogTotals.years[targetYear] ?? 0;
      const userUniqueCount = new Set(coins.filter((c) => Number(c.year) === targetYear).map((c) => c.rarity)).size;
      return userUniqueCount >= totalRequired && totalRequired > 0;
    },
    getProgress: (coins, catalogTotals) => {
      const targetYear = 1828;
      const totalRequired = catalogTotals.years[targetYear] ?? 0;
      const userUniqueCount = new Set(coins.filter((c) => Number(c.year) === targetYear).map((c) => c.rarity)).size;
      return { current: userUniqueCount, target: totalRequired };
    }
  },
  {
    id: 5,
    category: "Years",
    name: "19th Century",
    points: 100,
    check: (coins, catalogTotals) => {
      const totalRequired = catalogTotals.centuries["19th"] ?? 0;
      const userUnique19thCount = new Set(coins.filter((c) => Number(c.year) >= 1800 && Number(c.year) <= 1899).map((c) => c.rarity)).size;
      return userUnique19thCount >= totalRequired && totalRequired > 0;
    },
    getProgress: (coins, catalogTotals) => {
      const totalRequired = catalogTotals.centuries["19th"] ?? 0;
      const userUnique19thCount = new Set(coins.filter((c) => Number(c.year) >= 1800 && Number(c.year) <= 1899).map((c) => c.rarity)).size;
      return { current: userUnique19thCount, target: totalRequired };
    }
  },
  {
    id: 6,
    category: "Materials",
    name: "Bronze Collector",
    points: 25,
    check: (coins) => coins.some((c) => c.metal === "Bronze"),
    getProgress: (coins) => ({ current: coins.some((c) => c.metal === "Bronze") ? 1 : 0, target: 1 })
  },
  {
    id: 7,
    category: "Materials",
    name: "Silver Enthusiast",
    points: 100,
    check: (coins) => coins.filter((c) => c.metal === "Silver").length >= 10,
    getProgress: (coins) => {
      const count = coins.filter((c) => c.metal === "Silver").length;
      return { current: Math.min(count, 10), target: 10 };
    }
  },
  {
    id: 8,
    category: "Materials",
    name: "Silver Hoarder",
    points: 500,
    check: (coins) => coins.filter((c) => c.metal === "Silver").length >= 50,
    getProgress: (coins) => {
      const count = coins.filter((c) => c.metal === "Silver").length;
      return { current: Math.min(count, 50), target: 50 };
    }
  },
  {
    id: 9,
    category: "Rarity",
    name: "Rare Find",
    points: 25,
    check: (coins) => coins.some((c) => c.rarity >= 30),
    getProgress: (coins) => ({ current: coins.some((c) => c.rarity >= 30) ? 1 : 0, target: 1 })
  },
  {
    id: 10,
    category: "Rarity",
    name: "Legendary Hunter",
    points: 500,
    check: (coins) => coins.some((c) => c.rarity >= 50),
    getProgress: (coins) => ({ current: coins.some((c) => c.rarity >= 50) ? 1 : 0, target: 1 })
  },
  {
    id: 11,
    category: "Rarity",
    name: "One Of A Kind",
    points: 5000,
    check: (coins) => coins.some((c) => c.rarity >= 70),
    getProgress: (coins) => ({ current: coins.some((c) => c.rarity >= 70) ? 1 : 0, target: 1 })
  },
  {
    id: 12,
    category: "Condition",
    name: "Brilliant",
    points: 100,
    check: (coins) => coins.some((c) => c.condition >= 12),
    getProgress: (coins) => ({ current: coins.some((c) => c.condition >= 12) ? 1 : 0, target: 1 })
  },
  {
    id: 13,
    category: "Condition",
    name: "Perfection",
    points: 1000,
    check: (coins) => coins.some((c) => c.condition >= 13),
    getProgress: (coins) => ({ current: coins.some((c) => c.condition >= 13) ? 1 : 0, target: 1 })
  },

  // ========================================================
  // AUTOMATIC DYNAMIC YEAR ACHIEVEMENTS (99 POINTS EACH)
  // ========================================================
  ...[
    1830, 1831, 1832, 1833, 1834, 1836, 1837, 1838, 1839, 1840,
    1841, 1842, 1843, 1844, 1845, 1846, 1847, 1848, 1849, 1850,
    1851, 1852, 1855, 1857, 1868, 1869, 1870, 1873, 1874, 1875,
    1876, 1878, 1879, 1882, 1883, 1884, 1893, 1894, 1895
  ].map((year, index) => ({
    id: 100 + index, 
    category: "Years",
    name: `${year} Collector`,
    points: 99,
    check: (coins: Coin[], catalogTotals: CatalogTotals) => {
      const totalRequired = catalogTotals.years[year] ?? 0;
      const userUniqueCount = new Set(coins.filter((c) => Number(c.year) === year).map((c) => c.rarity)).size;
      return userUniqueCount >= totalRequired && totalRequired > 0;
    },
    getProgress: (coins: Coin[], catalogTotals: CatalogTotals) => {
      const totalRequired = catalogTotals.years[year] ?? 0;
      const userUniqueCount = new Set(coins.filter((c) => Number(c.year) === year).map((c) => c.rarity)).size;
      return { current: userUniqueCount, target: totalRequired };
    }
  }))
];