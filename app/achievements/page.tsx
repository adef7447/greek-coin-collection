"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { achievements, Coin, CatalogTotals, getScoreFromRarity } from "../../lib/achievements";

export default function AchievementsPage() {
  const [completedNames, setCompletedNames] = useState<string[]>([]);
  const [userCoins, setUserCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [catalogTotals, setCatalogTotals] = useState<CatalogTotals>({
    years: {},
    centuries: {},
    yearPointsPool: {},
    decades: {},
    decadePointsPool: {},
    eras: {},
    eraPointsPool: {},
    // Synchronized easier types tracking fields
    yearsEasier: {},
    yearEasierPointsPool: {},
    decadesEasier: {},
    decadeEasierPointsPool: {},
    erasEasier: {},
    eraEasierPointsPool: {},
  });

  useEffect(() => {
    loadAchievements();
  }, []);

  async function loadAchievements() {
    try {
      setLoading(true);
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
      const dynamicEras: Record<string, number> = {};

      const dynamicYearsEasier: Record<number, number> = {};
      const dynamicDecadesEasier: Record<string, number> = {};
      const dynamicErasEasier: Record<string, number> = {};

      const yearRawPointsTracker: Record<number, number> = {};
      const decadeRawPointsTracker: Record<string, number> = {};
      const eraRawPointsTracker: Record<string, number> = {};

      const yearEasierRawPointsTracker: Record<number, number> = {};
      const decadeEasierRawPointsTracker: Record<string, number> = {};
      const eraEasierRawPointsTracker: Record<string, number> = {};

      const uniqueYearVariants: Record<number, Set<number>> = {};
      const uniqueCenturyVariants: Record<string, Set<number>> = {};
      const uniqueDecadeVariants: Record<string, Set<number>> = {};
      const uniqueEraVariants: Record<string, Set<number>> = {};

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

        // Master Years
        if (!uniqueYearVariants[y]) uniqueYearVariants[y] = new Set();
        uniqueYearVariants[y].add(coin.id);
        yearRawPointsTracker[y] = (yearRawPointsTracker[y] || 0) + coinScore;

        // Easier Years
        if (isEasier) {
          if (!uniqueYearEasierVariants[y]) uniqueYearEasierVariants[y] = new Set();
          uniqueYearEasierVariants[y].add(coin.id);
          yearEasierRawPointsTracker[y] = (yearEasierRawPointsTracker[y] || 0) + coinScore;
        }

        // Centuries
        if (y >= 1800 && y <= 1899) {
          if (!uniqueCenturyVariants["19th"]) uniqueCenturyVariants["19th"] = new Set();
          uniqueCenturyVariants["19th"].add(coin.id);
        }

        // Decades
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

        // Eras
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

      // Pools Finalization
      const dynamicYearPoints: Record<number, number> = {};
      const dynamicYearEasierPoints: Record<number, number> = {};
      Object.keys(uniqueYearVariants).forEach((y) => {
        const yearNum = Number(y);
        dynamicYears[yearNum] = uniqueYearVariants[yearNum].size;
        dynamicYearPoints[yearNum] = Math.floor((yearRawPointsTracker[yearNum] || 0) / 2);

        dynamicYearsEasier[yearNum] = uniqueYearEasierVariants[yearNum]?.size || 0;
        dynamicYearEasierPoints[yearNum] = Math.floor((yearEasierRawPointsTracker[yearNum] || 0) / 2);
      });

      const dynamicDecadePoints: Record<string, number> = {};
      const dynamicDecadeEasierPoints: Record<string, number> = {};
      Object.keys(uniqueDecadeVariants).forEach((name) => {
        dynamicDecades[name] = uniqueDecadeVariants[name].size;
        dynamicDecadePoints[name] = Math.ceil(((decadeRawPointsTracker[name] || 0) * 0.25) / 100) * 100;

        dynamicDecadesEasier[name] = uniqueDecadeEasierVariants[name]?.size || 0;
        dynamicDecadeEasierPoints[name] = Math.ceil(((decadeEasierRawPointsTracker[name] || 0) * 0.25) / 100) * 100;
      });

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

      const currentTotals: CatalogTotals = { 
        years: dynamicYears, 
        centuries: dynamicCenturies, 
        yearPointsPool: dynamicYearPoints,
        decades: dynamicDecades,
        decadePointsPool: dynamicDecadePoints,
        eras: dynamicEras,
        eraPointsPool: dynamicEraPoints,
        yearsEasier: dynamicYearsEasier,
        yearEasierPointsPool: dynamicYearEasierPoints,
        decadesEasier: dynamicDecadesEasier,
        decadeEasierPointsPool: dynamicDecadeEasierPoints,
        erasEasier: dynamicErasEasier,
        eraEasierPointsPool: dynamicEraEasierPoints,
      };
      setCatalogTotals(currentTotals);

      // 2. Fetch the user's CURRENT inventory
      const { data: userCoinsData, error: coinsError } = await supabase
        .from("user_coins")
        .select(`condition, coins (id, year, rarity, metal)`)
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
    } catch (err) {
      console.error("An error occurred during verification initialization:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter lists while ignoring internal layout entities returning empty limits (target === 0)
  const completedList = achievements.filter((a) => {
    const progress = a.getProgress(userCoins, catalogTotals);
    return progress.target > 0 && completedNames.includes(a.name);
  });

  const notCompletedList = achievements.filter((a) => {
    const progress = a.getProgress(userCoins, catalogTotals);
    return progress.target > 0 && !completedNames.includes(a.name);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen font-mono text-gray-500">
        Syncing collection data metrics...
      </div>
    );
  }

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
        Completed Achievements ({completedList.length})
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
              className="border p-4 rounded shadow bg-green-50 border-green-400 text-green-900"
            >
              <h3 className="text-xl font-bold capitalize">{achievement.name}</h3>
              <p className="mt-1 text-sm opacity-80">Category: {achievement.category}</p>
              <p className="mt-2 font-bold text-sm">Reward: +{currentPoints} pts</p>
              <div className="mt-4 flex justify-between items-center bg-green-200/50 px-2 py-1 rounded font-mono text-xs">
                <span>Progress:</span>
                <span>{progress.current} / {progress.target}</span>
              </div>
              <p className="mt-4 font-bold text-xs flex items-center gap-1 text-green-700">
                <span>✅ Unlocked</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="my-10 border-t border-gray-200"></div>

      <h2 className="text-2xl font-bold text-gray-600 mb-4">
        Locked Milestones ({notCompletedList.length})
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
              className="border border-gray-200 p-4 rounded shadow bg-white text-gray-800"
            >
              <h3 className="text-xl font-bold capitalize text-gray-700">{achievement.name}</h3>
              <p className="mt-1 text-sm text-gray-400">Category: {achievement.category}</p>
              <p className="mt-2 font-bold text-sm text-gray-600">Reward: {currentPoints} pts</p>
              <div className="mt-4 flex justify-between items-center bg-gray-100 px-2 py-1 rounded font-mono text-xs text-gray-600">
                <span>Progress:</span>
                <span>{progress.current} / {progress.target}</span>
              </div>
              <p className="mt-4 font-bold text-xs text-gray-400">Locked</p>
            </div>
          );
        })}
      </div>
    </main>
  );
}