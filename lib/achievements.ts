export type Coin = {
  id: number; 
  year: number;
  rarity: number;
  metal: string;
  condition: number;
};

export type CatalogTotals = {
  years: Record<number, number>;      
  centuries: Record<string, number>;  
  yearPointsPool: Record<number, number>; 
  decades: Record<string, number>;
  decadePointsPool: Record<string, number>;
  eras: Record<string, number>;
  eraPointsPool: Record<string, number>;
  
  // NEW: Easier variant maps tracking sets containing only Standard through Epic (Rarity < 50)
  yearsEasier: Record<number, number>;
  yearEasierPointsPool: Record<number, number>;
  decadesEasier: Record<string, number>;
  decadeEasierPointsPool: Record<string, number>;
  erasEasier: Record<string, number>;
  eraEasierPointsPool: Record<string, number>;
};

export type Achievement = {
  id: number;
  category: string;
  name: string;
  points: number;
  getDynamicPoints?: (catalogTotals: CatalogTotals) => number;
  check: (coins: Coin[], catalogTotals: CatalogTotals) => boolean;
  getProgress: (coins: Coin[], catalogTotals: CatalogTotals) => { current: number; target: number };
};

// Your rarity point engine
export function getScoreFromRarity(rarity: number): number {
  if (rarity >= 70) return 100000; // Unique
  if (rarity >= 60) return 5000;   // Mythic
  if (rarity >= 50) return 500;    // Legendary
  if (rarity >= 40) return 100;    // Epic
  if (rarity >= 30) return 30;     // Rare
  if (rarity >= 20) return 10;     // Uncommon
  if (rarity >= 10) return 3;      // Common
  return 1;                        // Standard
}

// Map decade names to their structural year evaluation definitions
const decadeDefinitions: { name: string; start: number; end: number }[] = [
  // 1900s Decades (90s handles 1990-2000 explicitly)
  { name: "90s", start: 1990, end: 2000 },
  { name: "80s", start: 1980, end: 1989 },
  { name: "70s", start: 1970, end: 1979 },
  { name: "60s", start: 1960, end: 1969 },
  { name: "50s", start: 1950, end: 1959 },
  { name: "40s", start: 1940, end: 1949 },
  { name: "30s", start: 1930, end: 1939 },
  { name: "20s", start: 1920, end: 1929 },
  { name: "10s", start: 1910, end: 1919 },
  
  // 1800s Decades ("the other" prefixes)
  { name: "the other 90s", start: 1890, end: 1899 },
  { name: "the other 80s", start: 1880, end: 1889 },
  { name: "the other 70s", start: 1870, end: 1879 },
  { name: "the other 60s", start: 1860, end: 1869 },
  { name: "the other 50s", start: 1850, end: 1859 },
  { name: "the other 40s", start: 1840, end: 1849 },
  { name: "the other 30s", start: 1830, end: 1839 },
  { name: "the other 20s", start: 1820, end: 1829 },
];

// Era Definitions mapping custom historical boundaries 
const eraDefinitions = [
  { name: "3rd Democracy Collector", start: 1976, end: 2000 },
  { name: "Constantinos II", start: 1966, end: 1973 },
  { name: "Paul", start: 1954, end: 1965 },
  { name: "2nd Democracy", start: 1926, end: 1930 },
  { name: "George I", start: 1868, end: 1922 },
  { name: "Otto", start: 1832, end: 1857 },
  { name: "Kapodistrias", start: 1828, end: 1831 },
  { name: "19th Century Scope", start: 1828, end: 1895 },
  { name: "20th Century Scope", start: 1910, end: 2000 },
];

const trackedYears = [
  1830, 1831, 1832, 1833, 1834, 1836, 1837, 1838, 1839, 1840,
  1841, 1842, 1843, 1844, 1845, 1846, 1847, 1848, 1849, 1850,
  1851, 1852, 1855, 1857, 1868, 1869, 1870, 1873, 1874, 1875,
  1876, 1878, 1879, 1882, 1883, 1884, 1893, 1894, 1895, 1910, 
  1911, 1912, 1921, 1922, 1926, 1930, 1940, 1954, 1957, 1959, 
  1960, 1962, 1963, 1964, 1965, 1966, 1967, 1968, 1969, 1970,
  1971, 1973, 1976, 1978, 1979, 1980, 1981, 1982, 1984, 1985,
  1986, 1988, 1990, 1991, 1992, 1993, 1994, 1996, 1997, 1998,
  1999, 2000
];

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
    points: 0,
    getDynamicPoints: (catalogTotals) => catalogTotals.yearPointsPool[1828] ?? 0,
    check: (coins, catalogTotals) => {
      const targetYear = 1828;
      const totalRequired = catalogTotals.years[targetYear] ?? 0;
      const userUniqueCount = new Set(coins.filter((c) => Number(c.year) === targetYear).map((c) => c.id)).size;
      return userUniqueCount >= totalRequired && totalRequired > 0;
    },
    getProgress: (coins, catalogTotals) => {
      const targetYear = 1828;
      const totalRequired = catalogTotals.years[targetYear] ?? 0;
      const userUniqueCount = new Set(coins.filter((c) => Number(c.year) === targetYear).map((c) => c.id)).size;
      return { current: userUniqueCount, target: totalRequired };
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
  // DYNAMIC CALCULATED MASTER ERAS
  // ========================================================
  ...eraDefinitions.map((era, index) => ({
    id: 900 + index,
    category: "Eras",
    name: era.name,
    points: 0,
    getDynamicPoints: (catalogTotals: CatalogTotals) => catalogTotals.eraPointsPool[era.name] ?? 0,
    check: (coins: Coin[], catalogTotals: CatalogTotals) => {
      const totalRequired = catalogTotals.eras[era.name] ?? 0;
      const userUniqueCount = new Set(coins.filter((c) => Number(c.year) >= era.start && Number(c.year) <= era.end).map((c) => c.id)).size;
      return userUniqueCount >= totalRequired && totalRequired > 0;
    },
    getProgress: (coins: Coin[], catalogTotals: CatalogTotals) => {
      const totalRequired = catalogTotals.eras[era.name] ?? 0;
      const userUniqueCount = new Set(coins.filter((c) => Number(c.year) >= era.start && Number(c.year) <= era.end).map((c) => c.id)).size;
      return { current: userUniqueCount, target: totalRequired };
    }
  })),

  // ========================================================
  // DYNAMIC CALCULATED "EASIER" ERAS
  // ========================================================
  ...eraDefinitions.map((era, index) => ({
    id: 1900 + index,
    category: "Eras (Easier)",
    name: `easier ${era.name}`,
    points: 0,
    getDynamicPoints: (catalogTotals: CatalogTotals) => catalogTotals.eraEasierPointsPool[era.name] ?? 0,
    check: (coins: Coin[], catalogTotals: CatalogTotals) => {
      const fullCount = catalogTotals.eras[era.name] ?? 0;
      const easierCount = catalogTotals.erasEasier[era.name] ?? 0;
      // If totals match exactly, it implies zero legendary+ coins exist in this range
      if (fullCount === easierCount || easierCount === 0) return false;

      const userCount = new Set(coins.filter((c) => Number(c.year) >= era.start && Number(c.year) <= era.end && c.rarity < 50).map((c) => c.id)).size;
      return userCount >= easierCount;
    },
    getProgress: (coins: Coin[], catalogTotals: CatalogTotals) => {
      const fullCount = catalogTotals.eras[era.name] ?? 0;
      const easierCount = catalogTotals.erasEasier[era.name] ?? 0;
      if (fullCount === easierCount || easierCount === 0) return { current: 0, target: 0 };

      const userCount = new Set(coins.filter((c) => Number(c.year) >= era.start && Number(c.year) <= era.end && c.rarity < 50).map((c) => c.id)).size;
      return { current: userCount, target: easierCount };
    }
  })),

  // ========================================================
  // DYNAMIC CALCULATED MASTER DECADES
  // ========================================================
  ...decadeDefinitions.map((dec, index) => ({
    id: 500 + index,
    category: "Decades",
    name: dec.name,
    points: 0,
    getDynamicPoints: (catalogTotals: CatalogTotals) => catalogTotals.decadePointsPool[dec.name] ?? 0,
    check: (coins: Coin[], catalogTotals: CatalogTotals) => {
      const totalRequired = catalogTotals.decades[dec.name] ?? 0;
      const userUniqueCount = new Set(coins.filter((c) => Number(c.year) >= dec.start && Number(c.year) <= dec.end).map((c) => c.id)).size;
      return userUniqueCount >= totalRequired && totalRequired > 0;
    },
    getProgress: (coins: Coin[], catalogTotals: CatalogTotals) => {
      const totalRequired = catalogTotals.decades[dec.name] ?? 0;
      const userUniqueCount = new Set(coins.filter((c) => Number(c.year) >= dec.start && Number(c.year) <= dec.end).map((c) => c.id)).size;
      return { current: userUniqueCount, target: totalRequired };
    }
  })),

  // ========================================================
  // DYNAMIC CALCULATED "EASIER" DECADES
  // ========================================================
  ...decadeDefinitions.map((dec, index) => ({
    id: 1500 + index,
    category: "Decades (Easier)",
    name: `easier ${dec.name}`,
    points: 0,
    getDynamicPoints: (catalogTotals: CatalogTotals) => catalogTotals.decadeEasierPointsPool[dec.name] ?? 0,
    check: (coins: Coin[], catalogTotals: CatalogTotals) => {
      const fullCount = catalogTotals.decades[dec.name] ?? 0;
      const easierCount = catalogTotals.decadesEasier[dec.name] ?? 0;
      if (fullCount === easierCount || easierCount === 0) return false;

      const userCount = new Set(coins.filter((c) => Number(c.year) >= dec.start && Number(c.year) <= dec.end && c.rarity < 50).map((c) => c.id)).size;
      return userCount >= easierCount;
    },
    getProgress: (coins: Coin[], catalogTotals: CatalogTotals) => {
      const fullCount = catalogTotals.decades[dec.name] ?? 0;
      const easierCount = catalogTotals.decadesEasier[dec.name] ?? 0;
      if (fullCount === easierCount || easierCount === 0) return { current: 0, target: 0 };

      const userCount = new Set(coins.filter((c) => Number(c.year) >= dec.start && Number(c.year) <= dec.end && c.rarity < 50).map((c) => c.id)).size;
      return { current: userCount, target: easierCount };
    }
  })),

  // ========================================================
  // DYNAMIC CALCULATED MASTER YEARS
  // ========================================================
  ...trackedYears.map((year, index) => ({
    id: 100 + index, 
    category: "Years",
    name: `${year} Collector`,
    points: 0, 
    getDynamicPoints: (catalogTotals: CatalogTotals) => catalogTotals.yearPointsPool[year] ?? 0,
    check: (coins: Coin[], catalogTotals: CatalogTotals) => {
      const totalRequired = catalogTotals.years[year] ?? 0;
      const userUniqueCount = new Set(coins.filter((c) => Number(c.year) === year).map((c) => c.id)).size;
      return userUniqueCount >= totalRequired && totalRequired > 0;
    },
    getProgress: (coins: Coin[], catalogTotals: CatalogTotals) => {
      const totalRequired = catalogTotals.years[year] ?? 0;
      const userUniqueCount = new Set(coins.filter((c) => Number(c.year) === year).map((c) => c.id)).size;
      return { current: userUniqueCount, target: totalRequired };
    }
  })),

  // ========================================================
  // DYNAMIC CALCULATED "EASIER" YEARS
  // ========================================================
  ...trackedYears.map((year, index) => ({
    id: 2100 + index, 
    category: "Years (Easier)",
    name: `easier ${year} Collector`,
    points: 0, 
    getDynamicPoints: (catalogTotals: CatalogTotals) => catalogTotals.yearEasierPointsPool[year] ?? 0,
    check: (coins: Coin[], catalogTotals: CatalogTotals) => {
      const fullCount = catalogTotals.years[year] ?? 0;
      const easierCount = catalogTotals.yearsEasier[year] ?? 0;
      if (fullCount === easierCount || easierCount === 0) return false;

      const userCount = new Set(coins.filter((c) => Number(c.year) === year && c.rarity < 50).map((c) => c.id)).size;
      return userCount >= easierCount;
    },
    getProgress: (coins: Coin[], catalogTotals: CatalogTotals) => {
      const fullCount = catalogTotals.years[year] ?? 0;
      const easierCount = catalogTotals.yearsEasier[year] ?? 0;
      if (fullCount === easierCount || easierCount === 0) return { current: 0, target: 0 };

      const userCount = new Set(coins.filter((c) => Number(c.year) === year && c.rarity < 50).map((c) => c.id)).size;
      return { current: userCount, target: easierCount };
    }
  }))
];