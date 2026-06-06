import { supabase } from "./supabase";
import { achievements, getScoreFromRarity, CatalogTotals } from "./achievements";

type Coin = {
  id: number;
  year: number;
  rarity: number;
  metal: string;
  condition: number;
};

export async function checkAchievements(userId: string) {
  // 1. Fetch ALL master coins from Supabase
  const { data: masterCoins, error: masterError } = await supabase
    .from("coins")
    .select("id, year, rarity");

  if (masterError) {
    console.error("Error fetching master coins in calculation script:", masterError);
    return;
  }

  // 2. Initialize dynamic tracking records
  const dynamicYears: Record<number, number> = {};
  const dynamicCenturies: Record<string, number> = {};
  const dynamicDecades: Record<string, number> = {};

  const yearRawPointsTracker: Record<number, number> = {};
  const decadeRawPointsTracker: Record<string, number> = {};

  const uniqueYearVariants: Record<number, Set<number>> = {};
  const uniqueCenturyVariants: Record<string, Set<number>> = {};
  const uniqueDecadeVariants: Record<string, Set<number>> = {};

  // Decade boundary definitions mirroring your achievements configuration
  const decadeDefinitions = [
    { name: "90s", start: 1990, end: 2000 },
    { name: "80s", start: 1980, end: 1989 },
    { name: "70s", start: 1970, end: 1979 },
    { name: "60s", start: 1960, end: 1969 },
    { name: "50s", start: 1950, end: 1959 },
    { name: "40s", start: 1940, end: 1949 },
    { name: "30s", start: 1930, end: 1939 },
    { name: "20s", start: 1920, end: 1929 },
    { name: "10s", start: 1910, end: 1919 },
    { name: "the other 90s", start: 1890, end: 1899 },
    { name: "the other 80s", start: 1880, end: 1889 },
    { name: "the other 70s", start: 1870, end: 1879 },
    { name: "the other 60s", start: 1860, end: 1869 },
    { name: "the other 50s", start: 1850, end: 1859 },
    { name: "the other 40s", start: 1840, end: 1849 },
    { name: "the other 30s", start: 1830, end: 1839 },
    { name: "the other 20s", start: 1820, end: 1829 },
  ];

  masterCoins?.forEach((coin) => {
    const y = Number(coin.year);
    if (isNaN(y)) return;

    const coinScore = getScoreFromRarity(coin.rarity);

    // Track unique variants and points per year
    if (!uniqueYearVariants[y]) uniqueYearVariants[y] = new Set();
    uniqueYearVariants[y].add(coin.id);
    yearRawPointsTracker[y] = (yearRawPointsTracker[y] || 0) + coinScore;

    // Track unique variants for the 19th century (1800-1899)
    if (y >= 1800 && y <= 1899) {
      if (!uniqueCenturyVariants["19th"]) uniqueCenturyVariants["19th"] = new Set();
      uniqueCenturyVariants["19th"].add(coin.id);
    }

    // Track unique variants and points per decade range
    decadeDefinitions.forEach((dec) => {
      if (y >= dec.start && y <= dec.end) {
        if (!uniqueDecadeVariants[dec.name]) uniqueDecadeVariants[dec.name] = new Set();
        uniqueDecadeVariants[dec.name].add(coin.id);
        decadeRawPointsTracker[dec.name] = (decadeRawPointsTracker[dec.name] || 0) + coinScore;
      }
    });
  });

  // Finalize Year Points Pool (Half values, rounded down)
  const dynamicYearPoints: Record<number, number> = {};
  Object.keys(uniqueYearVariants).forEach((y) => {
    const yearNum = Number(y);
    dynamicYears[yearNum] = uniqueYearVariants[yearNum].size;
    const totalCombinedPoints = yearRawPointsTracker[yearNum] || 0;
    dynamicYearPoints[yearNum] = Math.floor(totalCombinedPoints / 2);
  });

  // Finalize Decade Points Pool (25% calculation rounded UP to the nearest 100)
  const dynamicDecadePoints: Record<string, number> = {};
  Object.keys(uniqueDecadeVariants).forEach((name) => {
    dynamicDecades[name] = uniqueDecadeVariants[name].size;
    const totalCombinedPoints = decadeRawPointsTracker[name] || 0;
    dynamicDecadePoints[name] = Math.ceil((totalCombinedPoints * 0.25) / 100) * 100;
  });

  if (uniqueCenturyVariants["19th"]) {
    dynamicCenturies["19th"] = uniqueCenturyVariants["19th"].size;
  }

  // Combine into the structural shape matching your CatalogTotals interface
  const catalogTotals: CatalogTotals = { 
    years: dynamicYears, 
    centuries: dynamicCenturies, 
    yearPointsPool: dynamicYearPoints,
    decades: dynamicDecades,
    decadePointsPool: dynamicDecadePoints
  };

  // 3. Load user's owned coins
  const { data: userCoins, error } = await supabase
    .from("user_coins")
    .select(`
      condition,
      coin_id,
      coins (
        id,
        year,
        rarity,
        metal
      )
    `)
    .eq("user_id", userId);

  if (error) {
    console.log("Error loading coins:", error);
    return;
  }

  const ownedCoins: Coin[] = [];

  for (const row of userCoins || []) {
    const coin = row.coins as any;

    if (!coin) continue;

    ownedCoins.push({
      id: coin.id,
      year: coin.year,
      rarity: coin.rarity,
      metal: coin.metal,
      condition: Number(row.condition),
    });
  }

  // 4. Load unlocked achievements
  const { data: unlocked } = await supabase
    .from("user_achievements")
    .select("achievement_name")
    .eq("user_id", userId);

  const unlockedNames = new Set(
    (unlocked || []).map((a: any) => a.achievement_name)
  );

  // 5. Check every achievement
  for (const achievement of achievements) {
    const completed = achievement.check(ownedCoins, catalogTotals);
    const alreadyUnlocked = unlockedNames.has(achievement.name);

    // Determine exact points contextually (dynamic year calculation vs dynamic decade vs static)
    const finalPoints = achievement.getDynamicPoints 
      ? achievement.getDynamicPoints(catalogTotals) 
      : achievement.points;

    // Unlock achievement
    if (completed && !alreadyUnlocked) {
      const { error: insertError } = await supabase
        .from("user_achievements")
        .insert({
          user_id: userId,
          achievement_name: achievement.name,
          points: finalPoints,
        });

      if (!insertError) {
        await supabase.rpc("increment_score", {
          user_id_input: userId,
          amount: finalPoints,
        });
      }
    }

    // Remove achievement
    if (!completed && alreadyUnlocked) {
      await supabase
        .from("user_achievements")
        .delete()
        .eq("user_id", userId)
        .eq("achievement_name", achievement.name);

      await supabase.rpc("decrement_score", {
        user_id_input: userId,
        amount: finalPoints,
      });
    }
  }
}