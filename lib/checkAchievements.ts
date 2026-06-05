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

  // 2. Initialize dynamic tracking records for any custom years
  const dynamicYears: Record<number, number> = {};
  const dynamicCenturies: Record<string, number> = {};
  const yearRawPointsTracker: Record<number, number> = {};

  const uniqueYearVariants: Record<number, Set<number>> = {};
  const uniqueCenturyVariants: Record<string, Set<number>> = {};

  masterCoins?.forEach((coin) => {
    const y = Number(coin.year);
    if (isNaN(y)) return;

    // Track unique variants per year
    if (!uniqueYearVariants[y]) uniqueYearVariants[y] = new Set();
    uniqueYearVariants[y].add(coin.id);

    // Sum up raw scores using our rarity point matrix
    const coinScore = getScoreFromRarity(coin.rarity);
    yearRawPointsTracker[y] = (yearRawPointsTracker[y] || 0) + coinScore;

    // Track unique variants for the 19th century (1800-1899)
    if (y >= 1800 && y <= 1899) {
      if (!uniqueCenturyVariants["19th"]) uniqueCenturyVariants["19th"] = new Set();
      uniqueCenturyVariants["19th"].add(coin.id);
    }
  });

  // Convert mapping sets back into numeric lengths and half-value math pools
  const dynamicYearPoints: Record<number, number> = {};
  Object.keys(uniqueYearVariants).forEach((y) => {
    const yearNum = Number(y);
    dynamicYears[yearNum] = uniqueYearVariants[yearNum].size;
    
    // Calculate achievement reward: half of all combined points, rounded down
    const totalCombinedPoints = yearRawPointsTracker[yearNum] || 0;
    dynamicYearPoints[yearNum] = Math.floor(totalCombinedPoints / 2);
  });

  if (uniqueCenturyVariants["19th"]) {
    dynamicCenturies["19th"] = uniqueCenturyVariants["19th"].size;
  }

  // Combine into the structural shape required by achievements.ts
  const catalogTotals: CatalogTotals = { 
    years: dynamicYears, 
    centuries: dynamicCenturies, 
    yearPointsPool: dynamicYearPoints 
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

    // Determine exact points contextually (dynamic calculation override vs static rule)
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