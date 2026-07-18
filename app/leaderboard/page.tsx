"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import UserBadge from "@/app/src/components/UserBadge";

export default function Leaderboard() {
  const [players, setPlayers] = useState<any[]>([]);
  const [currentUserPerms, setCurrentUserPerms] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  async function getLeaderboardAndUser() {
    try {
      setLoading(true);
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

      // 2. Fetch players including perms to construct badges and filtering
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, score, perms")
        .order("score", { ascending: false });

      if (error) {
        console.error("Error fetching leaderboard profiles:", error);
      } else {
        setPlayers(data || []);
      }
    } catch (err) {
      console.error("Unexpected error building leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getLeaderboardAndUser();
  }, []);

  const canViewOtherBinders = currentUserPerms >= 20;

  // Filter out the verified members list (Perm 30 and above)
  const verifiedPlayers = players.filter((player) => (player.perms || 0) >= 30);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-blue-50 text-black">
        <p className="text-xl font-semibold">Loading ranks and standings...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black space-y-8">
      {/* Page Header */}
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Leaderboard</h1>
          <p className="text-sm text-gray-500 mt-1">Collector tier ranks and performance metrics</p>
        </div>

        <Link
          href="/"
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 shadow-sm transition duration-150"
        >
          Back Home
        </Link>
      </div>

      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* 1. Verified Members Leaderboard (Perm >= 30) */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-gray-800 tracking-wide uppercase text-sm">
              🛡️ Verified Members Leaderboard
            </h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
              Perm 30+
            </span>
          </div>
          
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            {verifiedPlayers.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center italic">
                No verified members recorded yet.
              </p>
            ) : (
              verifiedPlayers.map((player, index) => (
                <div
                  key={`verified-${player.id || index}`}
                  className="flex justify-between items-center border-b last:border-b-0 py-3.5 text-lg"
                >
                  {/* Position Medal / Number */}
                  <div className="w-12 font-bold text-gray-700 text-center md:text-left">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                  </div>

                  {/* Identity Column + Badges */}
                  <div className="flex-1 flex items-center gap-2.5 text-left px-4 font-medium">
                    {canViewOtherBinders ? (
                      <Link
                        href={`/my-coins?userId=${player.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline transition"
                      >
                        {player.display_name || "Anonymous Collector"}
                      </Link>
                    ) : (
                      <span className="text-gray-900">{player.display_name || "Anonymous Collector"}</span>
                    )}
                    <UserBadge perms={player.perms || 1} />
                  </div>

                  {/* Score */}
                  <div className="font-black text-gray-900 tabular-nums">
                    {player.score ? player.score.toLocaleString() : "0"}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 2. Global Leaderboard (All Permissions) */}
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold text-gray-800 tracking-wide uppercase text-sm">
            🌍 Global Standings (All Members)
          </h2>
          
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            {players.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center italic">
                No registered collectors found.
              </p>
            ) : (
              players.map((player, index) => (
                <div
                  key={`global-${player.id || index}`}
                  className="flex justify-between items-center border-b last:border-b-0 py-3.5 text-lg"
                >
                  {/* Position Medal / Number */}
                  <div className="w-12 font-bold text-gray-700 text-center md:text-left">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                  </div>

                  {/* Identity Column + Badges */}
                  <div className="flex-1 flex items-center gap-2.5 text-left px-4 font-medium">
                    {canViewOtherBinders ? (
                      <Link
                        href={`/my-coins?userId=${player.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline transition"
                      >
                        {player.display_name || "Anonymous Collector"}
                      </Link>
                    ) : (
                      <span className="text-gray-900">{player.display_name || "Anonymous Collector"}</span>
                    )}
                    <UserBadge perms={player.perms || 1} />
                  </div>

                  {/* Score */}
                  <div className="font-black text-gray-900 tabular-nums">
                    {player.score ? player.score.toLocaleString() : "0"}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </main>
  );
}