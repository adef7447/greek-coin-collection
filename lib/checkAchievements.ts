import { supabase } from "./supabase";
import { achievements } from "./achievements";

export async function checkAchievements(userId: string) {
  // Load user's owned coins
  const { data: userCoins } = await supabase
    .from("user_coins")
    .select(`
      coin_id,
      condition,
      coins (
        id,
        year,
        rarity,
        metal
      )
    `)
    .eq("user_id", userId);

  const ownedCoins =
    userCoins?.map((row: any) => ({
      ...row.coins,
      userCondition: row.condition,
    })) || [];

  // Load currently unlocked achievements
  const { data: unlocked } = await supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", userId);

  const unlockedNames =
    unlocked?.map((a: any) => a.achievement_name) || [];

  for (const achievement of achievements) {
    const completed = achievement.check(ownedCoins);

    const alreadyUnlocked =
      unlockedNames.includes(achievement.name);

    // Unlock achievement
    if (completed && !alreadyUnlocked) {
      await supabase
        .from("user_achievements")
        .insert([
          {
            user_id: userId,
            achievement_name: achievement.name,
            points: achievement.points,
          },
        ]);

      await supabase.rpc("increment_score", {
        user_id_input: userId,
        amount: achievement.points,
      });
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

      await supabase.rpc("decrement_score", {
        user_id_input: userId,
        amount: achievement.points,
      });
    }
  }
}