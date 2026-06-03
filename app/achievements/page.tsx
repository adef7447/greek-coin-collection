"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { achievements } from "../../lib/achievements";

export default function AchievementsPage() {
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", user.id);

    setCompleted(data?.map((a) => a.achievement_id) || []);
  }

  const completedList = achievements.filter((a) =>
    completed.includes(a.id)
  );

  const notCompletedList = achievements.filter(
    (a) => !completed.includes(a.id)
  );

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Achievements</h1>

        <Link
          href="/"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Back Home
        </Link>
      </div>

      {/* COMPLETED */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {completedList.map((achievement) => (
          <div
            key={achievement.id}
            className="border p-4 rounded shadow bg-green-100 border-green-500 text-green-800"
          >
            <h2 className="text-2xl font-bold">{achievement.name}</h2>

            <p className="mt-2">{achievement.description}</p>

            <p className="mt-2 font-bold">
              Reward: {achievement.points} points
            </p>

            <p className="mt-4 font-bold text-green-700">
              Completed
            </p>
          </div>
        ))}
      </div>

      {/* GAP */}
      <div className="my-10 border-t border-gray-300"></div>

      {/* NOT COMPLETED */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notCompletedList.map((achievement) => (
          <div
            key={achievement.id}
            className="border p-4 rounded shadow bg-white"
          >
            <h2 className="text-2xl font-bold">{achievement.name}</h2>

            <p className="mt-2">{achievement.description}</p>

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