"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { achievements } from "../../lib/achievements";

export default function AchievementsPage() {
  const [completedNames, setCompletedNames] = useState<string[]>([]);

  useEffect(() => {
    loadAchievements();
  }, []);

  async function loadAchievements() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("user_achievements")
      .select("achievement_name")
      .eq("user_id", user.id);

    if (error) {
      console.log(error);
      return;
    }

    setCompletedNames(
      data?.map((a: any) => a.achievement_name) || []
    );
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
            <h3 className="text-2xl font-bold">
              {achievement.name}
            </h3>

            <p className="mt-2">
              Category: {achievement.category}
            </p>

            <p className="mt-2 font-bold">
              Reward: {achievement.points} points
            </p>

            <p className="mt-4 font-bold">
              ✅ Completed
            </p>
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
            <h3 className="text-2xl font-bold">
              {achievement.name}
            </h3>

            <p className="mt-2">
              Category: {achievement.category}
            </p>

            <p className="mt-2 font-bold">
              Reward: {achievement.points} points
            </p>

            <p className="mt-4 font-bold text-gray-500">
              Not Completed
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}