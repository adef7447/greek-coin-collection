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
  // 1. Fetch ALL master coins to determine the absolute target boundaries dynamically
  const { data: masterCoins, error: masterError } = await supabase
    .from("coins")
    .select("year, rarity");

  if (masterError) {
    console.error("Error fetching master coins in calculation script:", masterError);
    return;
  }

  // Calculate total possible unique variants existing in your game engine catalog
  const total1828 = new Set(masterCoins?.filter(c => Number(c.year) === 1828).map(c => c.rarity)).size;
  const total19th = new Set(masterCoins?.filter(c => {
    const y = Number(c.year);
    return y >= 1800 && y <= 1899;
  }).map(c => c.rarity)).size;

  const catalogTotals = { total1828Coins: total1828, total19thCenturyCoins: total19th };

  // 2. Load user's owned coins
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

  // 3. Load unlocked achievements records from database storage
  const { data: unlocked } = await supabase
    .from("user_achievements")
    .select("achievement_name")
    .eq("user_id", userId);

  const unlockedNames = new Set(
    (unlocked || []).map(
      (a: any) => a.achievement_name
    )
  );

  // 4. Check every achievement against requirements
  for (const achievement of achievements) {
    // Pass both ownedCoins AND the required catalogTotals configuration down into the local check methods
    const completed = achievement.check(ownedCoins, catalogTotals);

    const alreadyUnlocked = unlockedNames.has(achievement.name);

    // Unlock achievement rule
    if (completed && !alreadyUnlocked) {
      const { error: insertError } = await supabase
        .from("user_achievements")
        .insert({
          user_id: userId,
          achievement_name: achievement.name,
          points: achievement.points,
        });

      if (!insertError) {
        await supabase.rpc(
          "increment_score",
          {
            user_id_input: userId,
            amount: achievement.points,
          }
        );
      }
    }

    // Remove achievement rule (This now runs perfectly if they drop below the master target count!)
    if (!completed && alreadyUnlocked) {
      await supabase
        .from("user_achievements")
        .delete()
        .eq("user_id", userId)
        .eq(
          "achievement_name",
          achievement.name
        );

      await supabase.rpc(
        "decrement_score",
        {
          user_id_input: userId,
          amount: achievement.points,
        }
      );
    }
  }
}