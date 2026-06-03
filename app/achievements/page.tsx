"use client";

import Link from "next/link";
import { achievements } from "../../lib/achievements";

export default function AchievementsPage() {
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
        {achievements.map((achievement) => (
          <div
            key={achievement.name}
            className="border p-4 rounded bg-white shadow"
          >
            <h2 className="text-2xl font-bold">
              {achievement.name}
            </h2>

            <p className="mt-2">
              Category: {achievement.category}
            </p>

            <p className="mt-2 font-bold">
              Reward: {achievement.points} points
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}