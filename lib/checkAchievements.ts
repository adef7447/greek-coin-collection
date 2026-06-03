import { supabase } from "./supabase";
import { achievements } from "./achievements";

type Coin = {
  id: number;
  year: number;
  rarity: number;
  metal: string;
  userCondition?: number;
};

export async function checkAchievements(userId: string) {
  // 1. Load user's owned coins (SAFE VERSION)
  const { data: userCoins, error } = await supabase
    .from("user_coins")
    .select("condition, coin_id, coins(*)")
    .eq("user_id", userId);

  if (error) {
    console.log("Error loading coins:", error);
    return;
  }

  const ownedCoins: Coin[] =
    (userCoins || [])
      .map((row: any) => {
        if (!row.coins) return null;

        return {
          id: row.coins.id,
          year: row.coins.year,
          rarity: row.coins.rarity,
          metal: row.coins.metal,
          userCondition: Number(row.condition),
        };
      })
      .filter(Boolean);

  // 2. Load unlocked achievements
  const { data: unlocked } = await supabase
    .from("user_achievements")
    .select("achievement_name")
    .eq("user_id", userId);

  const unlockedNames = new Set(
    (unlocked || []).map((a: any) => a.achievement_name)
  );

  // 3. Loop achievements
  for (const achievement of achievements) {
    let completed = false;

    try {
      completed = achievement.check(ownedCoins);
    } catch (err) {
      console.log("Achievement check failed:", achievement.name, err);
      continue;
    }

    const alreadyUnlocked = unlockedNames.has(achievement.name);

    // UNLOCK
    if (completed && !alreadyUnlocked) {
      await supabase.from("user_achievements").insert({
        user_id: userId,
        achievement_name: achievement.name,
        points: achievement.points,
      });

      await supabase.rpc("increment_score", {
        user_id_input: userId,
        amount: achievement.points,
      });
    }

    // REMOVE
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