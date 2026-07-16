"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Leaderboard() {
  const [players, setPlayers] = useState<any[]>([]);
  const [currentUserPerms, setCurrentUserPerms] = useState<number>(0);

  async function getLeaderboardAndUser() {
    // 1. Fetch current logged-in user's permission level
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("perms")
        .eq("id", user.id)
        .single();
      
      setCurrentUserPerms(profile?.perms || 1);
    }

    // 2. Fetch players including their user ID (id) to construct links
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, score")
      .order("score", { ascending: false });

    if (error) {
      console.log(error);
    } else {
      setPlayers(data || []);
    }
  }

  useEffect(() => {
    getLeaderboardAndUser();
  }, []);

  const canViewOtherBinders = currentUserPerms >= 20;

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Leaderboard</h1>

        <Link
          href="/"
          className="bg-blue-500 text-white px-4 py-2 rounded font-semibold hover:bg-blue-600 transition"
        >
          Back Home
        </Link>
      </div>

      <div className="bg-white rounded shadow p-4">
        {players.map((player, index) => (
          <div
            key={player.id || index}
            className="flex justify-between items-center border-b py-3 text-lg"
          >
            <div className="w-12">
              {index === 0
                ? "🥇"
                : index === 1
                ? "🥈"
                : index === 2
                ? "🥉"
                : `#${index + 1}`}
            </div>

            <div className="flex-1 text-left px-4 font-medium">
              {canViewOtherBinders ? (
                <Link
                  href={`/my-coins?userId=${player.id}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline transition"
                >
                  {player.display_name || "Anonymous Collector"}
                </Link>
              ) : (
                <span>{player.display_name || "Anonymous Collector"}</span>
              )}
            </div>

            <div className="font-bold">
              {player.score.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}