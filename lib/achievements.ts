type Coin = {
  year: number;
  rarity: number;
  metal: string;
  userCondition?: number;
};

export const achievements = [
  {
    category: "Collection",
    name: "First Coin",
    points: 5,
    check: (coins: Coin[]) => coins.length >= 1,
  },

  {
    category: "Collection",
    name: "Coin Hoarder",
    points: 50,
    check: (coins: Coin[]) => coins.length >= 50,
  },

  {
    category: "Collection",
    name: "Museum",
    points: 500,
    check: (coins: Coin[]) => coins.length >= 200,
  },

  {
    category: "Years",
    name: "1828 Collector",
    points: 50,
    check: (coins: Coin[]) =>
      coins.some((c: Coin) => c.year === 1828),
  },

  {
    category: "Years",
    name: "19th Century",
    points: 100,
    check: (coins: Coin[]) =>
      coins.some(
        (c: Coin) =>
          c.year >= 1800 &&
          c.year <= 1899
      ),
  },

  {
    category: "Materials",
    name: "Bronze Collector",
    points: 25,
    check: (coins: Coin[]) =>
      coins.some((c: Coin) => c.metal === "Bronze"),
  },

  {
    category: "Materials",
    name: "Silver Enthusiast",
    points: 100,
    check: (coins: Coin[]) =>
      coins.filter(
        (c: Coin) => c.metal === "Silver"
      ).length >= 10,
  },

  {
    category: "Materials",
    name: "Silver Hoarder",
    points: 500,
    check: (coins: Coin[]) =>
      coins.filter(
        (c: Coin) => c.metal === "Silver"
      ).length >= 50,
  },

  {
    category: "Rarity",
    name: "Rare Find",
    points: 25,
    check: (coins: Coin[]) =>
      coins.some((c: Coin) => c.rarity >= 30),
  },

  {
    category: "Rarity",
    name: "Legendary Hunter",
    points: 500,
    check: (coins: Coin[]) =>
      coins.some((c: Coin) => c.rarity >= 50),
  },

  {
    category: "Rarity",
    name: "One Of A Kind",
    points: 5000,
    check: (coins: Coin[]) =>
      coins.some((c: Coin) => c.rarity >= 70),
  },

  {
    category: "Condition",
    name: "Brilliant",
    points: 100,
    check: (coins: Coin[]) =>
      coins.some(
        (c: Coin) =>
          (c.userCondition ?? 0) >= 12
      ),
  },

  {
    category: "Condition",
    name: "Perfection",
    points: 1000,
    check: (coins: Coin[]) =>
      coins.some(
        (c: Coin) =>
          (c.userCondition ?? 0) >= 13
      ),
  },
];