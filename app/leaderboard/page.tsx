"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import UserBadge from "@/app/src/components/UserBadge";

// Linear permission rank mapping
const PERM_RANKS = [0, 1, 10, 20, 30, 40, 50, 100, 110, 150, 200, 1000];

export default function Leaderboard() {
  const [players, setPlayers] = useState<any[]>([]);
  const [currentUserPerms, setCurrentUserPerms] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

  // Helper calculation definitions for promotion/demotion steps
  function getPromoteTarget(currentPerms: number) {
    const idx = PERM_RANKS.indexOf(currentPerms);
    if (idx !== -1 && idx < PERM_RANKS.length - 1) {
      return PERM_RANKS[idx + 1];
    }
    return null;
  }

  function getDemoteTarget(currentPerms: number) {
    const idx = PERM_RANKS.indexOf(currentPerms);
    if (idx !== -1 && idx > 0) {
      return PERM_RANKS[idx - 1];
    }
    return null;
  }

  // Hierarchy validation logic rules mapping
  function checkCanPromote(modPerms: number, playerPerms: number): boolean {
    const target = getPromoteTarget(playerPerms);
    if (target === null) return false;

    if (modPerms >= 1000) return playerPerms < 200; // Owner promotes up to Admin
    if (modPerms >= 200) return playerPerms < 100;  // Admin promotes up to Assistant Mod
    if (modPerms >= 150) return playerPerms < 50;   // Senior Mod promotes up to Verified Seller
    if (modPerms >= 110) return playerPerms < 40;   // Mod promotes up to Official Seller
    if (modPerms >= 100) return playerPerms < 30;   // Assistant Mod promotes up to Verified Member
    return false;
  }

  function checkCanDemote(modPerms: number, playerPerms: number): boolean {
    const target = getDemoteTarget(playerPerms);
    if (target === null) return false;

    if (modPerms >= 1000) return playerPerms < 1000;
    if (modPerms >= 200) return playerPerms < 200;
    if (modPerms >= 150) return playerPerms < 150;
    if (modPerms >= 110) return playerPerms < 110;
    if (modPerms >= 100) return playerPerms <= 30;  // Assistant Mod demotes Verified Member and below
    return false;
  }

  // Mutation handler action
  async function handleRankChange(targetUserId: string, targetPermValue: number, actionType: "promote" | "demote") {
    try {
      setActionLoadingId(targetUserId);

      // Secure Runtime Check: Re-fetch authenticated user profile status directly from source
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Session unauthenticated or expired.");
        return;
      }

      const { data: verifiedProfile } = await supabase
        .from("profiles")
        .select("perms")
        .eq("id", user.id)
        .single();

      const freshModPerms = verifiedProfile?.perms || 1;

      // Find target baseline
      const targetPlayer = players.find(p => p.id === targetUserId);
      if (!targetPlayer) return;

      // Verify clearance against fresh, authoritative database value
      const isAllowed = actionType === "promote"
        ? checkCanPromote(freshModPerms, targetPlayer.perms || 0)
        : checkCanDemote(freshModPerms, targetPlayer.perms || 0);

      if (!isAllowed) {
        alert("Security Error: Action denied. Your current rank does not possess clearance for this operation.");
        return;
      }

      // Execute update securely
      const { error } = await supabase
        .from("profiles")
        .update({ perms: targetPermValue })
        .eq("id", targetUserId);

      if (error) {
        alert(`Database execution rejection: ${error.message}`);
      } else {
        // Synchronize local component view state
        await getLeaderboardAndUser();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  }

  // Common rendering template helper for matching rows cleanly
  const renderRow = (player: any, index: number, scopeKey: string) => {
    const pPerms = player.perms || 0;
    const nextRank = getPromoteTarget(pPerms);
    const prevRank = getDemoteTarget(pPerms);

    const showPromote = checkCanPromote(currentUserPerms, pPerms) && nextRank !== null;
    const showDemote = checkCanDemote(currentUserPerms, pPerms) && prevRank !== null;

    return (
      <div
        key={`${scopeKey}-${player.id || index}`}
        className="flex flex-col md:flex-row md:items-center justify-between border-b last:border-b-0 py-3.5 gap-3 text-lg"
      >
        {/* Left Side: Standing and Username */}
        <div className="flex items-center flex-1 min-w-0">
          <div className="w-12 font-bold text-gray-700 text-center md:text-left shrink-0">
            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
          </div>

          <div className="flex items-center gap-2.5 text-left px-2 font-medium truncate">
            {canViewOtherBinders ? (
              <Link
                href={`/my-coins?userId=${player.id}`}
                className="text-blue-600 hover:text-blue-800 hover:underline transition truncate"
              >
                {player.display_name || "Anonymous Collector"}
              </Link>
            ) : (
              <span className="text-gray-900 truncate">{player.display_name || "Anonymous Collector"}</span>
            )}
            <UserBadge perms={pPerms} />
          </div>
        </div>

        {/* Right Side: Mod Controls & Score */}
        <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 pl-12 md:pl-0">
          {/* Rank Modification Action Buttons */}
          {(showPromote || showDemote) && (
            <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-lg border border-gray-100">
              {showPromote && (
                <button
                  disabled={actionLoadingId !== null}
                  onClick={() => handleRankChange(player.id, nextRank!, "promote")}
                  className="px-2.5 py-1 text-xs font-bold rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-50 transition"
                >
                  Promote
                </button>
              )}
              {showDemote && (
                <button
                  disabled={actionLoadingId !== null}
                  onClick={() => handleRankChange(player.id, prevRank!, "demote")}
                  className="px-2.5 py-1 text-xs font-bold rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition"
                >
                  Demote
                </button>
              )}
            </div>
          )}

          {/* User Score Standings */}
          <div className="font-black text-gray-900 tabular-nums text-right min-w-[70px]">
            {player.score ? player.score.toLocaleString() : "0"}
          </div>
        </div>
      </div>
    );
  };

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
          <p className="text-sm text-gray-500 mt-1">Collector tier ranks and administrative moderation logs</p>
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
              verifiedPlayers.map((player, index) => renderRow(player, index, "verified"))
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
              players.map((player, index) => renderRow(player, index, "global"))
            )}
          </div>
        </section>

      </div>
    </main>
  );
}