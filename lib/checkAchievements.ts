import { supabase } from "./supabase";
import { achievements } from "./achievements";

type Coin = {
  id: number;
  year: number;
  rarity: number;
  metal: string;
  condition: number;
};

export async function checkAchievements(userId: string) {
  // 1. Fetch ALL master coins from Supabase (FIXED: Added id to select statement)
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

  const uniqueYearVariants: Record<number, Set<number>> = {};
  const uniqueCenturyVariants: Record<string, Set<number>> = {};

  masterCoins?.forEach((coin) => {
    const y = Number(coin.year);
    if (isNaN(y)) return;

    // Track unique variants per year
    if (!uniqueYearVariants[y]) uniqueYearVariants[y] = new Set();
    // FIXED: Now tracking unique coins by id rather than a non-unique rarity value
    uniqueYearVariants[y].add(coin.id);

    // Track unique variants for the 19th century (1800-1899)
    if (y >= 1800 && y <= 1899) {
      if (!uniqueCenturyVariants["19th"]) uniqueCenturyVariants["19th"] = new Set();
      // FIXED: Now tracking unique coins by id rather than a non-unique rarity value
      uniqueCenturyVariants["19th"].add(coin.id);
    }
  });

  // Convert mapping sets back into numeric lengths
  Object.keys(uniqueYearVariants).forEach((y) => {
    dynamicYears[Number(y)] = uniqueYearVariants[Number(y)].size;
  });
  if (uniqueCenturyVariants["19th"]) {
    dynamicCenturies["19th"] = uniqueCenturyVariants["19th"].size;
  }

  // Combine into the structural shape required by achievements.ts
  const catalogTotals = { years: dynamicYears, centuries: dynamicCenturies };

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
    // Pass both ownedCoins AND the new dynamic catalogTotals tracking structure
    const completed = achievement.check(ownedCoins, catalogTotals);

    const alreadyUnlocked = unlockedNames.has(achievement.name);

    // Unlock achievement
    if (completed && !alreadyUnlocked) {
      const { error: insertError } = await supabase
        .from("user_achievements")
        .insert({
          user_id: userId,
          achievement_name: achievement.name,
          points: achievement.points,
        });

      if (!insertError) {
        await supabase.rpc("increment_score", {
          user_id_input: userId,
          amount: achievement.points,
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
        amount: achievement.points,
      });
    }
  }
}