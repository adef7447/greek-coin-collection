import { supabase } from "./supabase";
import { achievements, getScoreFromRarity, CatalogTotals } from "./achievements";

type Coin = {
  id: number;
  year: number;
  rarity: number;
  metal: string;
  condition: number;
};

// HELPER: Move master calculation out of the main loop so it can eventually be cached
async function getCatalogTotals(): Promise<CatalogTotals | null> {
  const { data: masterCoins, error: masterError } = await supabase
    .from("coins")
    .select("id, year, rarity");

  if (masterError) {
    console.error("Error fetching master coins:", masterError);
    return null;
  }

  const dynamicYears: Record<number, number> = {};
  const dynamicCenturies: Record<string, number> = {};
  const dynamicDecades: Record<string, number> = {};
  const dynamicEras: Record<string, number> = {};

  // NEW: Easier variant tracks
  const dynamicYearsEasier: Record<number, number> = {};
  const dynamicDecadesEasier: Record<string, number> = {};
  const dynamicErasEasier: Record<string, number> = {};

  const yearRawPointsTracker: Record<number, number> = {};
  const decadeRawPointsTracker: Record<string, number> = {};
  const eraRawPointsTracker: Record<string, number> = {};

  // NEW: Easier point trackers
  const yearEasierRawPointsTracker: Record<number, number> = {};
  const decadeEasierRawPointsTracker: Record<string, number> = {};
  const eraEasierRawPointsTracker: Record<string, number> = {};

  const uniqueYearVariants: Record<number, Set<number>> = {};
  const uniqueCenturyVariants: Record<string, Set<number>> = {};
  const uniqueDecadeVariants: Record<string, Set<number>> = {};
  const uniqueEraVariants: Record<string, Set<number>> = {};

  // NEW: Easier unique maps
  const uniqueYearEasierVariants: Record<number, Set<number>> = {};
  const uniqueDecadeEasierVariants: Record<string, Set<number>> = {};
  const uniqueEraEasierVariants: Record<string, Set<number>> = {};

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

  masterCoins?.forEach((coin) => {
    const y = Number(coin.year);
    if (isNaN(y)) return;

    const coinScore = getScoreFromRarity(coin.rarity);
    const isEasier = coin.rarity < 50;

    // Process Master Years
    if (!uniqueYearVariants[y]) uniqueYearVariants[y] = new Set();
    uniqueYearVariants[y].add(coin.id);
    yearRawPointsTracker[y] = (yearRawPointsTracker[y] || 0) + coinScore;

    // Process Easier Years
    if (isEasier) {
      if (!uniqueYearEasierVariants[y]) uniqueYearEasierVariants[y] = new Set();
      uniqueYearEasierVariants[y].add(coin.id);
      yearEasierRawPointsTracker[y] = (yearEasierRawPointsTracker[y] || 0) + coinScore;
    }

    // Process Centuries
    if (y >= 1800 && y <= 1899) {
      if (!uniqueCenturyVariants["19th"]) uniqueCenturyVariants["19th"] = new Set();
      uniqueCenturyVariants["19th"].add(coin.id);
    }

    // Process Decades
    decadeDefinitions.forEach((dec) => {
      if (y >= dec.start && y <= dec.end) {
        if (!uniqueDecadeVariants[dec.name]) uniqueDecadeVariants[dec.name] = new Set();
        uniqueDecadeVariants[dec.name].add(coin.id);
        decadeRawPointsTracker[dec.name] = (decadeRawPointsTracker[dec.name] || 0) + coinScore;

        if (isEasier) {
          if (!uniqueDecadeEasierVariants[dec.name]) uniqueDecadeEasierVariants[dec.name] = new Set();
          uniqueDecadeEasierVariants[dec.name].add(coin.id);
          decadeEasierRawPointsTracker[dec.name] = (decadeEasierRawPointsTracker[dec.name] || 0) + coinScore;
        }
      }
    });

    // Process Eras
    eraDefinitions.forEach((era) => {
      if (y >= era.start && y <= era.end) {
        if (!uniqueEraVariants[era.name]) uniqueEraVariants[era.name] = new Set();
        uniqueEraVariants[era.name].add(coin.id);
        eraRawPointsTracker[era.name] = (eraRawPointsTracker[era.name] || 0) + coinScore;

        if (isEasier) {
          if (!uniqueEraEasierVariants[era.name]) uniqueEraEasierVariants[era.name] = new Set();
          uniqueEraEasierVariants[era.name].add(coin.id);
          eraEasierRawPointsTracker[era.name] = (eraEasierRawPointsTracker[era.name] || 0) + coinScore;
        }
      }
    });
  });

  // Finalize Year Points Pool
  const dynamicYearPoints: Record<number, number> = {};
  const dynamicYearEasierPoints: Record<number, number> = {};
  Object.keys(uniqueYearVariants).forEach((y) => {
    const yearNum = Number(y);
    dynamicYears[yearNum] = uniqueYearVariants[yearNum].size;
    dynamicYearPoints[yearNum] = Math.floor((yearRawPointsTracker[yearNum] || 0) / 2);

    dynamicYearsEasier[yearNum] = uniqueYearEasierVariants[yearNum]?.size || 0;
    dynamicYearEasierPoints[yearNum] = Math.floor((yearEasierRawPointsTracker[yearNum] || 0) / 2);
  });

  // Finalize Decade Points Pool
  const dynamicDecadePoints: Record<string, number> = {};
  const dynamicDecadeEasierPoints: Record<string, number> = {};
  Object.keys(uniqueDecadeVariants).forEach((name) => {
    dynamicDecades[name] = uniqueDecadeVariants[name].size;
    dynamicDecadePoints[name] = Math.ceil(((decadeRawPointsTracker[name] || 0) * 0.25) / 100) * 100;

    dynamicDecadesEasier[name] = uniqueDecadeEasierVariants[name]?.size || 0;
    dynamicDecadeEasierPoints[name] = Math.ceil(((decadeEasierRawPointsTracker[name] || 0) * 0.25) / 100) * 100;
  });

  // Finalize Era Points Pool
  const dynamicEraPoints: Record<string, number> = {};
  const dynamicEraEasierPoints: Record<string, number> = {};
  Object.keys(uniqueEraVariants).forEach((name) => {
    dynamicEras[name] = uniqueEraVariants[name].size;
    dynamicEraPoints[name] = Math.ceil(((eraRawPointsTracker[name] || 0) * 0.10) / 100) * 100;

    dynamicErasEasier[name] = uniqueEraEasierVariants[name]?.size || 0;
    dynamicEraEasierPoints[name] = Math.ceil(((eraEasierRawPointsTracker[name] || 0) * 0.10) / 100) * 100;
  });

  if (uniqueCenturyVariants["19th"]) {
    dynamicCenturies["19th"] = uniqueCenturyVariants["19th"].size;
  }

  return { 
    years: dynamicYears, 
    centuries: dynamicCenturies, 
    yearPointsPool: dynamicYearPoints,
    decades: dynamicDecades,
    decadePointsPool: dynamicDecadePoints,
    eras: dynamicEras,
    eraPointsPool: dynamicEraPoints,
    // Add missing tracking objects to satisfy CatalogTotals type rules
    yearsEasier: dynamicYearsEasier,
    yearEasierPointsPool: dynamicYearEasierPoints,
    decadesEasier: dynamicDecadesEasier,
    decadeEasierPointsPool: dynamicDecadeEasierPoints,
    erasEasier: dynamicErasEasier,
    eraEasierPointsPool: dynamicEraEasierPoints
  };
}

export async function checkAchievements(userId: string) {
  const catalogTotals = await getCatalogTotals();
  if (!catalogTotals) return;

  const [coinsResponse, achievementsResponse] = await Promise.all([
    supabase
      .from("user_coins")
      .select(`condition, coins (id, year, rarity, metal)`)
      .eq("user_id", userId),
    supabase
      .from("user_achievements")
      .select("achievement_name, points")
      .eq("user_id", userId)
  ]);

  if (coinsResponse.error || achievementsResponse.error) {
    console.error("Error fetching user data setup:", coinsResponse.error || achievementsResponse.error);
    return;
  }

  const ownedCoins: Coin[] = (coinsResponse.data || [])
    .map((row: any) => {
      const coin = row.coins;
      if (!coin) return null;
      return {
        id: coin.id,
        year: coin.year,
        rarity: coin.rarity,
        metal: coin.metal,
        condition: Number(row.condition),
      };
    })
    .filter((c): c is Coin => c !== null);

  const unlockedMap = new Map<string, number>(
    (achievementsResponse.data || []).map((a: any) => [a.achievement_name, a.points])
  );

  const achievementsToInsert: Array<{ user_id: string; achievement_name: string; points: number }> = [];
  const achievementsToDelete: string[] = [];
  let scoreDelta = 0;

  for (const achievement of achievements) {
    const completed = achievement.check(ownedCoins, catalogTotals);
    const dynamicPointsSnapshot = achievement.getDynamicPoints 
      ? achievement.getDynamicPoints(catalogTotals) 
      : achievement.points;

    const previouslyAwardedPoints = unlockedMap.get(achievement.name);
    const alreadyUnlocked = previouslyAwardedPoints !== undefined;

    if (completed && !alreadyUnlocked) {
      achievementsToInsert.push({
        user_id: userId,
        achievement_name: achievement.name,
        points: dynamicPointsSnapshot,
      });
      scoreDelta += dynamicPointsSnapshot;
    } 
    else if (!completed && alreadyUnlocked) {
      achievementsToDelete.push(achievement.name);
      scoreDelta -= previouslyAwardedPoints;
    }
  }

  const dbOperations: Promise<any>[] = [];

  if (achievementsToInsert.length > 0) {
    dbOperations.push(supabase.from("user_achievements").insert(achievementsToInsert));
  }

  if (achievementsToDelete.length > 0) {
    dbOperations.push(
      supabase
        .from("user_achievements")
        .delete()
        .eq("user_id", userId)
        .in("achievement_name", achievementsToDelete)
    );
  }

  if (scoreDelta !== 0) {
    const rpcName = scoreDelta > 0 ? "increment_score" : "decrement_score";
    dbOperations.push(
      supabase.rpc(rpcName, {
        user_id_input: userId,
        amount: Math.abs(scoreDelta),
      })
    );
  }

  if (dbOperations.length > 0) {
    const results = await Promise.all(dbOperations);
    results.forEach((res) => {
      if (res?.error) console.error("Error running batch achievement updates:", res.error);
    });
  }
}