"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { achievements, Coin, CatalogTotals } from "../../lib/achievements";

export default function AchievementsPage() {
  const [completedNames, setCompletedNames] = useState<string[]>([]);
  const [catalogTotals, setCatalogTotals] = useState<CatalogTotals>({
    total1828Coins: 0,
    total19thCenturyCoins: 0,
  });

  useEffect(() => {
    loadAchievements();
  }, []);

  async function loadAchievements() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch ALL master coins to determine the absolute targets dynamically
    const { data: masterCoins, error: masterError } = await supabase
      .from("coins")
      .select("year, rarity");

    if (masterError) {
      console.error("Error fetching master coins:", masterError);
      return;
    }

    // Calculate total possible unique variants existing in your game
    const total1828 = new Set(masterCoins?.filter(c => Number(c.year) === 1828).map(c => c.rarity)).size;
    const total19th = new Set(masterCoins?.filter(c => {
      const y = Number(c.year);
      return y >= 1800 && y <= 1899;
    }).map(c => c.rarity)).size;

    const currentTotals = { total1828Coins: total1828, total19thCenturyCoins: total19th };
    setCatalogTotals(currentTotals);

    // 2. Fetch the user's CURRENT coins to validate against targets
    const { data: userCoinsData, error: coinsError } = await supabase
      .from("user_coins")
      .select(`
        condition,
        coins (
          year,
          rarity,
          metal
        )
      `)
      .eq("user_id", user.id);

    if (coinsError) {
      console.error("Error fetching user inventory:", coinsError);
      return;
    }

    // Flatten relation into your local Coin[] type structure
    const userCoins: Coin[] = (userCoinsData || []).map((uc: any) => ({
      year: uc.coins.year,
      rarity: uc.coins.rarity,
      metal: uc.coins.metal,
      condition: uc.condition,
    }));

    // 3. Evaluate dynamically which achievements match right now
    const validCompletedNames = achievements
      .filter((achievement) => achievement.check(userCoins, currentTotals))
      .map((achievement) => achievement.name);

    setCompletedNames(validCompletedNames);

    // 4. Sync the database state so stale entries vanish and scores update
    const { data: dbAchievements } = await supabase
      .from("user_achievements")
      .select("achievement_name")
      .eq("user_id", user.id);

    const dbNames: string[] = dbAchievements?.map(a => a.achievement_name) || [];
    const lostAchievements = dbNames.filter(name => !validCompletedNames.includes(name));

    if (lostAchievements.length > 0) {
      // Calculate total points to deduct based on your local achievements settings
      const pointsToDeduct = achievements
        .filter(a => lostAchievements.includes(a.name))
        .reduce((sum, a) => sum + a.points, 0);

      // Remove the unearned achievement rows from the user's profile
      await supabase
        .from("user_achievements")
        .delete()
        .eq("user_id", user.id)
        .in("achievement_name", lostAchievements);

      // Fetch the user's profile to adjust their running total score
      const { data: profile } = await supabase
        .from("profiles")
        .select("score")
        .eq("id", user.id)
        .single();

      if (profile) {
        // Enforce a minimum floor of 0 so scores never drop below zero
        const newScore = Math.max(0, (profile.score || 0) - pointsToDeduct);

        await supabase
          .from("profiles")
          .update({ score: newScore })
          .eq("id", user.id);
      }
    }
  }

  const completedList = achievements.filter((a) =>
    completedNames.includes(a.name)
  );

  const notCompletedList = achievements.filter(
    (a) => !completedNames.includes(a.name)
  );

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Achievements</h1>
        <Link
          href="/"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Back Home
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-green-700 mb-4">
        Completed Achievements
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {completedList.map((achievement) => (
          <div
            key={achievement.id}
            className="border p-4 rounded shadow bg-green-100 border-green-500 text-green-800"
          >
            <h3 className="text-2xl font-bold">{achievement.name}</h3>
            <p className="mt-2">Category: {achievement.category}</p>
            <p className="mt-2 font-bold">Reward: {achievement.points} points</p>
            <p className="mt-4 font-bold">✅ Completed</p>
          </div>
        ))}
      </div>

      <div className="my-10 border-t border-gray-300"></div>

      <h2 className="text-2xl font-bold text-gray-600 mb-4">
        Not Completed Yet
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notCompletedList.map((achievement) => (
          <div
            key={achievement.id}
            className="border p-4 rounded shadow bg-white"
          >
            <h3 className="text-2xl font-bold">{achievement.name}</h3>
            <p className="mt-2">Category: {achievement.category}</p>
            <p className="mt-2 font-bold">Reward: {achievement.points} points</p>
            <p className="mt-4 font-bold text-gray-500">Not Completed</p>
          </div>
        ))}
      </div>
    </main>
  );
}