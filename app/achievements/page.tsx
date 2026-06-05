"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { achievements, Coin, CatalogTotals, getScoreFromRarity } from "../../lib/achievements";

export default function AchievementsPage() {
  const [completedNames, setCompletedNames] = useState<string[]>([]);
  // Store the active inventory locally to reference inside the UI card loop
  const [userCoins, setUserCoins] = useState<Coin[]>([]);
  const [catalogTotals, setCatalogTotals] = useState<CatalogTotals>({
    years: {},
    centuries: {},
    yearPointsPool: {}, // Initialized empty pool tracking state
  });

  useEffect(() => {
    loadAchievements();
  }, []);

  async function loadAchievements() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch ALL master coins - MUST select "id" to count unique items correctly
    const { data: masterCoins, error: masterError } = await supabase
      .from("coins")
      .select("id, year, rarity");

    if (masterError) {
      console.error("Error fetching master coins:", masterError);
      return;
    }

    const dynamicYears: Record<number, number> = {};
    const dynamicCenturies: Record<string, number> = {};
    const yearRawPointsTracker: Record<number, number> = {};

    const uniqueYearVariants: Record<number, Set<number>> = {};
    const uniqueCenturyVariants: Record<string, Set<number>> = {};

    masterCoins?.forEach((coin) => {
      const y = Number(coin.year);
      if (isNaN(y)) return;

      if (!uniqueYearVariants[y]) uniqueYearVariants[y] = new Set();
      // Use coin.id instead of coin.rarity to get the accurate target amount
      uniqueYearVariants[y].add(coin.id);

      // Track the total point calculations for this year grouping
      const coinScore = getScoreFromRarity(coin.rarity);
      yearRawPointsTracker[y] = (yearRawPointsTracker[y] || 0) + coinScore;

      if (y >= 1800 && y <= 1899) {
        if (!uniqueCenturyVariants["19th"]) uniqueCenturyVariants["19th"] = new Set();
        uniqueCenturyVariants["19th"].add(coin.id);
      }
    });

    // Halve the combined year point value pools (rounded down to nearest int)
    const dynamicYearPoints: Record<number, number> = {};
    Object.keys(uniqueYearVariants).forEach((y) => {
      const yearNum = Number(y);
      dynamicYears[yearNum] = uniqueYearVariants[yearNum].size;
      
      const totalCombinedPoints = yearRawPointsTracker[yearNum] || 0;
      dynamicYearPoints[yearNum] = Math.floor(totalCombinedPoints / 2);
    });

    if (uniqueCenturyVariants["19th"]) {
      dynamicCenturies["19th"] = uniqueCenturyVariants["19th"].size;
    }

    const currentTotals: CatalogTotals = { 
      years: dynamicYears, 
      centuries: dynamicCenturies, 
      yearPointsPool: dynamicYearPoints 
    };
    setCatalogTotals(currentTotals);

    // 2. Fetch the user's CURRENT coins
    const { data: userCoinsData, error: coinsError } = await supabase
      .from("user_coins")
      .select(`
        condition,
        coins (
          id,
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

    const loadedCoins: Coin[] = (userCoinsData || []).map((uc: any) => ({
      id: uc.coins?.id || 0, // Pass the item identification down to the checker
      year: uc.coins?.year || 0,
      rarity: uc.coins?.rarity || 0,
      metal: uc.coins?.metal || "",
      condition: uc.condition,
    }));

    setUserCoins(loadedCoins);

    // 3. Evaluate completed achievements
    const validCompletedNames = achievements
      .filter((achievement) => achievement.check(loadedCoins, currentTotals))
      .map((achievement) => achievement.name);

    setCompletedNames(validCompletedNames);

    // 4. Sync database states
    const { data: dbAchievements } = await supabase
      .from("user_achievements")
      .select("achievement_name")
      .eq("user_id", user.id);

    const dbNames: string[] = dbAchievements?.map(a => a.achievement_name) || [];
    const lostAchievements = dbNames.filter(name => !validCompletedNames.includes(name));

    if (lostAchievements.length > 0) {
      const pointsToDeduct = achievements
        .filter(a => lostAchievements.includes(a.name))
        .reduce((sum, a) => {
          const reward = a.getDynamicPoints ? a.getDynamicPoints(currentTotals) : a.points;
          return sum + reward;
        }, 0);

      await supabase
        .from("user_achievements")
        .delete()
        .eq("user_id", user.id)
        .in("achievement_name", lostAchievements);

      const { data: profile } = await supabase
        .from("profiles")
        .select("score")
        .eq("id", user.id)
        .single();

      if (profile) {
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
        {completedList.map((achievement) => {
          const progress = achievement.getProgress(userCoins, catalogTotals);
          const currentPoints = achievement.getDynamicPoints 
            ? achievement.getDynamicPoints(catalogTotals) 
            : achievement.points;
            
          return (
            <div
              key={achievement.id}
              className="border p-4 rounded shadow bg-green-100 border-green-500 text-green-800"
            >
              <h3 className="text-2xl font-bold">{achievement.name}</h3>
              <p className="mt-2">Category: {achievement.category}</p>
              <p className="mt-2 font-bold">Reward: {currentPoints} points</p>
              <p className="mt-2 text-sm bg-green-200 inline-block px-2 py-1 rounded font-mono">
                Progress: {progress.current} / {progress.target}
              </p>
              <p className="mt-4 font-bold">✅ Completed</p>
            </div>
          );
        })}
      </div>

      <div className="my-10 border-t border-gray-300"></div>

      <h2 className="text-2xl font-bold text-gray-600 mb-4">
        Not Completed Yet
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notCompletedList.map((achievement) => {
          const progress = achievement.getProgress(userCoins, catalogTotals);
          const currentPoints = achievement.getDynamicPoints 
            ? achievement.getDynamicPoints(catalogTotals) 
            : achievement.points;

          return (
            <div
              key={achievement.id}
              className="border p-4 rounded shadow bg-white"
            >
              <h3 className="text-2xl font-bold">{achievement.name}</h3>
              <p className="mt-2">Category: {achievement.category}</p>
              <p className="mt-2 font-bold">Reward: {currentPoints} points</p>
              <p className="mt-2 text-sm bg-gray-100 inline-block px-2 py-1 rounded font-mono text-gray-700 border">
                Progress: {progress.current} / {progress.target}
              </p>
              <p className="mt-4 font-bold text-gray-500">Not Completed</p>
            </div>
          );
        })}
      </div>
    </main>
  );
}