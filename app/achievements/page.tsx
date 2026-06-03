"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    loadAchievements();
  }, []);

  async function loadAchievements() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: achievementData } = await supabase
      .from("achievements")
      .select("*")
      .order("score_reward", { ascending: true });

    setAchievements(achievementData || []);

    if (!user) return;

    const { data: userAchievements } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", user.id);

    setCompleted(
      userAchievements?.map((a) => a.achievement_id) || []
    );
  }

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">
          Achievements
        </h1>

        <Link
          href="/"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Back Home
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => {
          const unlocked = completed.includes(
            achievement.id
          );

          return (
            <div
              key={achievement.id}
              className={`border p-4 rounded shadow ${
                unlocked
                  ? "bg-green-100 border-green-500"
                  : "bg-white"
              }`}
            >
              <h2 className="text-2xl font-bold">
                {achievement.name}
              </h2>

              <p className="mt-2">
                {achievement.description}
              </p>

              <p className="mt-2 font-bold">
                Reward: {achievement.score_reward} points
              </p>

              <p
                className={`mt-4 font-bold ${
                  unlocked
                    ? "text-green-700"
                    : "text-gray-500"
                }`}
              >
                {unlocked
                  ? "Completed"
                  : "Not Completed"}
              </p>
            </div>
          );
        })}
      </div>
    </main>
  );
}