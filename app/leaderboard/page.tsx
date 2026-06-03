"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Leaderboard() {
  const [players, setPlayers] = useState<any[]>([]);

  async function getLeaderboard() {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, score")
      .order("score", { ascending: false });

    if (error) {
      console.log(error);
    } else {
      setPlayers(data || []);
    }
  }

  useEffect(() => {
    getLeaderboard();
  }, []);

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">
          Leaderboard
        </h1>

        <Link
          href="/"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Back Home
        </Link>
      </div>

      <div className="bg-white rounded shadow p-4">

        {players.map((player, index) => (

          <div
            key={index}
            className="flex justify-between border-b py-3"
          >
            <div>
              {index === 0
  ? "🥇"
  : index === 1
  ? "🥈"
  : index === 2
  ? "🥉"
  : `#${index + 1}`}
            </div>

            <div>
              {player.display_name}
            </div>

            <div>
              {player.score.toLocaleString()}
            </div>
          </div>

        ))}

      </div>
    </main>
  );
}