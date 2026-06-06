"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { achievements, Coin, CatalogTotals, getScoreFromRarity } from "../../lib/achievements";

export default function AchievementsPage() {
  const [completedNames, setCompletedNames] = useState<string[]>([]);
  const [userCoins, setUserCoins] = useState<Coin[]>([]);
  const [catalogTotals, setCatalogTotals] = useState<CatalogTotals>({
    years: {},
    centuries: {},
    yearPointsPool: {},
    decades: {},
    decadePointsPool: {},
  });

  useEffect(() => {
    loadAchievements();
  }, []);

  async function loadAchievements() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch ALL master coins to compute structural track values
    const { data: masterCoins, error: masterError } = await supabase
      .from("coins")
      .select("id, year, rarity");

    if (masterError) {
      console.error("Error fetching master coins:", masterError);
      return;
    }

    const dynamicYears: Record<number, number> = {};
    const dynamicCenturies: Record<string, number> = {};
    const dynamicDecades: Record<string, number> = {};

    const yearRawPointsTracker: Record<number, number> = {};
    const decadeRawPointsTracker: Record<string, number> = {};

    const uniqueYearVariants: Record<number, Set<number>> = {};
    const uniqueCenturyVariants: Record<string, Set<number>> = {};
    const uniqueDecadeVariants: Record<string, Set<number>> = {};

    // Definition boundaries matching achievements.ts
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

      // Map Years
      if (!uniqueYearVariants[y]) uniqueYearVariants[y] = new Set();
      uniqueYearVariants[y].add(coin.id);
      yearRawPointsTracker[y] = (yearRawPointsTracker[y] || 0) + coinScore;

      // Map Centuries
      if (y >= 1800 && y <= 1899) {
        if (!uniqueCenturyVariants["19th"]) uniqueCenturyVariants["19th"] = new Set();
        uniqueCenturyVariants["19th"].add(coin.id);
      }

      // Map Decades
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
      dynamicYearPoints[yearNum] = Math.floor((yearRawPointsTracker[yearNum] || 0) / 2);
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

    const currentTotals: CatalogTotals = { 
      years: dynamicYears, 
      centuries: dynamicCenturies, 
      yearPointsPool: dynamicYearPoints,
      decades: dynamicDecades,
      decadePointsPool: dynamicDecadePoints
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
      id: uc.coins?.id || 0,
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

    // 4. Sync database states cleanly
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
              <h3 className="text-2xl font-bold capitalize">{achievement.name}</h3>
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
              <h3 className="text-2xl font-bold capitalize">{achievement.name}</h3>
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