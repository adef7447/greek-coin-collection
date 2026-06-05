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
  // Load user's coins
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

  // Load unlocked achievements
  const { data: unlocked } = await supabase
    .from("user_achievements")
    .select("achievement_name")
    .eq("user_id", userId);

  const unlockedNames = new Set(
    (unlocked || []).map(
      (a: any) => a.achievement_name
    )
  );

  // Check every achievement
  for (const achievement of achievements) {
    const completed = achievement.check(ownedCoins);

    const alreadyUnlocked =
      unlockedNames.has(achievement.name);

    // Unlock achievement
    if (completed && !alreadyUnlocked) {
      const { error: insertError } =
        await supabase
          .from("user_achievements")
          .insert({
            user_id: userId,
            achievement_name:
              achievement.name,
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

    // Remove achievement
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