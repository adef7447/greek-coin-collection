"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { checkAchievements } from "@/lib/checkAchievements";

interface CatalogCoin {
  id: number;
  coin_id: number;
  name: string;
  year: number;
  denomination: number;
  rarity: number;
  metal: string;
  obverse_url: string;
  reverse_url: string;
  ruling_authority?: string;
  fineness?: number;
  mintage?: number;
}

export default function Recommendations() {
  function getScoreFromRarity(rarity: number) {
    if (rarity >= 70) return 100000; // Unique
    if (rarity >= 60) return 5000;   // Mythic
    if (rarity >= 50) return 500;    // Legendary
    if (rarity >= 40) return 100;    // Epic
    if (rarity >= 30) return 30;     // Rare
    if (rarity >= 20) return 10;     // Uncommon
    if (rarity >= 10) return 3;      // Common
    return 1;                        // Basic
  }

  const [userDisplayName, setUserDisplayName] = useState("");
  const [userScore, setUserScore] = useState(0);
  const [coins, setCoins] = useState<CatalogCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // States handling conditions and coin defaults per card structure
  const [condition, setCondition] = useState<Record<number, number>>({});
  const [damaged, setDamaged] = useState<Record<number, number>>({});
  const [bent, setBent] = useState<Record<number, number>>({});
  const [cleaned, setCleaned] = useState<Record<number, number>>({});
  const [environmental, setEnvironmental] = useState<Record<number, number>>({});
  const [holed, setHoled] = useState<Record<number, number>>({});

  const coinsPerPage = 42;
  const totalPages = 11; // Explicit hard limit cap requested

  // Fetch only unowned recommendations matching your custom sorting algorithm specifications
  async function getRecommendations() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Find all coins currently owned by the authenticated collector
      const { data: ownedData } = await supabase
        .from("user_coins")
        .select("coin_id")
        .eq("user_id", user.id);

      const ownedIds = ownedData ? ownedData.map((c) => c.coin_id) : [];

      // 2. Query available items sorting exactly by: rarity ASC -> year DESC -> denomination ASC -> coin_id ASC
      let query = supabase.from("coins").select("*");

      if (ownedIds.length > 0) {
        query = query.not("coin_id", "in", `(${ownedIds.join(",")})`);
      }

      const { data: unownedCoins, error } = await query
        .order("rarity", { ascending: true })
        .order("year", { ascending: false })
        .order("denomination", { ascending: true })
        .order("coin_id", { ascending: true });

      if (error) throw error;

      setCoins(unownedCoins || []);
    } catch (err) {
      console.error("Error loading coin recommendations: ", err);
    } finally {
      setLoading(false);
    }
  }

  // Handle local card select option arrays efficiently
  const getCardValue = (stateMap: Record<number, number>, coinId: number, fallback: number) => {
    return stateMap[coinId] !== undefined ? stateMap[coinId] : fallback;
  };

  const setCardValue = (setter: React.Dispatch<React.SetStateAction<Record<number, number>>>, coinId: number, val: number) => {
    setter(prev => ({ ...prev, [coinId]: val }));
  };

  async function addToCollection(coinId: number, rarity: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Login first");
      return;
    }

    // Capture precise values local to the unique database instance card being saved
    const cCondition = getCardValue(condition, coinId, 7);
    const cDamaged = getCardValue(damaged, coinId, 0);
    const cBent = getCardValue(bent, coinId, 0);
    const cCleaned = getCardValue(cleaned, coinId, 0);
    const cEnv = getCardValue(environmental, coinId, 0);
    const cHoled = getCardValue(holed, coinId, 0);

    const damage = Number(`${cDamaged}${cBent}${cCleaned}${cEnv}${cHoled}`);
    const scoreToAdd = getScoreFromRarity(rarity);

    // 1. Insert into inventory tracking list
    const { error } = await supabase.from("user_coins").insert([
      {
        user_id: user.id,
        coin_id: coinId,
        condition: cCondition,
        damage: damage,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    // 2. Execute secure scoring aggregation updates
    const { error: scoreError } = await supabase.rpc("increment_score", {
      user_id_input: user.id,
      amount: scoreToAdd,
    });

    if (scoreError) console.log(scoreError);

    // 3. Process achievements metrics
    await checkAchievements(user.id);

    // 4. Retrieve refreshed profile score state properties
    const { data: updatedProfile } = await supabase
      .from("profiles")
      .select("score")
      .eq("id", user.id)
      .single();

    setUserScore(updatedProfile?.score || 0);
    alert("Coin added + score updated! Refresh or change page to update the recommendations list.");
  }

  useEffect(() => {
    getRecommendations();

    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, score")
          .eq("id", user.id)
          .single();

        setUserDisplayName(profile?.display_name || "");
        setUserScore(profile?.score || 0);
      }
    }
    checkUser();
  }, [page]);

  // Compute specific layout boundaries for our current subset of recommendations
  const displayedCoins = coins.slice((page - 1) * coinsPerPage, page * coinsPerPage);

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-4xl font-bold">Recommended Additions</h1>
        <Link href="/" className="bg-black text-white px-4 py-2 rounded text-sm font-medium">
          ← Back to Main Collection
        </Link>
      </div>

      {userDisplayName && (
        <div className="mb-8">
          <p className="text-lg text-gray-700 font-semibold">User: {userDisplayName} | Current Score: {userScore}</p>
          <div className="flex gap-4 mt-2">
            <Link href="/my-coins" className="text-blue-600 underline text-sm">My Coins</Link>
            <Link href="/leaderboard" className="text-blue-600 underline text-sm">Leaderboard</Link>
            <Link href="/achievements" className="text-blue-600 underline text-sm">Achievements</Link>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-lg font-semibold">Analyzing missing collection steps...</div>
      ) : displayedCoins.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white border rounded-xl shadow-sm">
          No missing coins found on this page selection tab!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedCoins.map((coin) => (
            <div key={coin.id} className="border p-4 rounded bg-white shadow flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold truncate">{coin.name}</h2>
                <div className="flex gap-2 mt-2">
                  <img src={coin.obverse_url} alt="Obverse View" className="w-1/2 h-36 object-contain border rounded p-1" />
                  <img src={coin.reverse_url} alt="Reverse View" className="w-1/2 h-36 object-contain border rounded p-1" />
                </div>

                <div className="mt-4 space-y-1 text-sm text-gray-700">
                  <p><span className="font-semibold">Year:</span> {coin.year}</p>
                  <p><span className="font-semibold">Denomination:</span> {coin.denomination}</p>
                  <p><span className="font-semibold">Metal:</span> {coin.metal}</p>
                  {coin.ruling_authority && <p><span className="font-semibold">Authority:</span> {coin.ruling_authority}</p>}
                  {coin.fineness && coin.fineness > 0 ? <p><span className="font-semibold">Fineness:</span> {coin.fineness}</p> : null}
                  <p><span className="font-semibold">Mintage:</span> {coin.mintage ?? "Unknown"}</p>
                  <p>
                    <span className="font-semibold">Rarity Tier:</span>
                    <span className={`font-bold ml-2 ${
                      coin.rarity >= 70 ? "text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500"
                      : coin.rarity >= 60 ? "text-red-600"
                      : coin.rarity >= 50 ? "text-purple-600"
                      : coin.rarity >= 40 ? "text-blue-900"
                      : coin.rarity >= 30 ? "text-yellow-500"
                      : coin.rarity >= 20 ? "text-green-500"
                      : coin.rarity >= 10 ? "text-blue-300" : "text-gray-500"
                    }`}>
                      {coin.rarity >= 70 ? "Unique" : coin.rarity >= 60 ? "Mythic" : coin.rarity >= 50 ? "Legendary" : coin.rarity >= 40 ? "Epic" : coin.rarity >= 30 ? "Rare" : coin.rarity >= 20 ? "Uncommon" : coin.rarity >= 10 ? "Common" : "Basic"}
                    </span>
                  </p>
                </div>

                {/* Condition Modification Matrix */}
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div>
                    <label className="block font-bold text-xs mb-1">Condition Grade</label>
                    <select
                      className="border p-2 w-full text-sm bg-gray-50 rounded"
                      value={getCardValue(condition, coin.coin_id, 7)}
                      onChange={(e) => setCardValue(setCondition, coin.coin_id, Number(e.target.value))}
                    >
                      <option value={1}>P</option><option value={2}>FR</option><option value={3}>AG</option>
                      <option value={4}>G</option><option value={5}>VG</option><option value={6}>F</option>
                      <option value={7}>VF</option><option value={8}>XF</option><option value={9}>AU</option>
                      <option value={10}>LU</option><option value={11}>MU</option><option value={12}>BU</option>
                      <option value={13}>HU</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-gray-600 mb-0.5">Damaged</label>
                      <select
                        className="border p-1 w-full bg-gray-50 rounded"
                        value={getCardValue(damaged, coin.coin_id, 0)}
                        onChange={(e) => setCardValue(setDamaged, coin.coin_id, Number(e.target.value))}
                      >
                        <option value={0}>None</option><option value={1}>Damaged</option><option value={2}>Heavy</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-600 mb-0.5">Bent</label>
                      <select
                        className="border p-1 w-full bg-gray-50 rounded"
                        value={getCardValue(bent, coin.coin_id, 0)}
                        onChange={(e) => setCardValue(setBent, coin.coin_id, Number(e.target.value))}
                      >
                        <option value={0}>None</option><option value={1}>Bent</option><option value={2}>Heavily Bent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-600 mb-0.5">Cleaned</label>
                      <select
                        className="border p-1 w-full bg-gray-50 rounded"
                        value={getCardValue(cleaned, coin.coin_id, 0)}
                        onChange={(e) => setCardValue(setCleaned, coin.coin_id, Number(e.target.value))}
                      >
                        <option value={0}>None</option><option value={1}>Cleaned</option><option value={2}>Harshly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-600 mb-0.5">Env Damage</label>
                      <select
                        className="border p-1 w-full bg-gray-50 rounded"
                        value={getCardValue(environmental, coin.coin_id, 0)}
                        onChange={(e) => setCardValue(setEnvironmental, coin.coin_id, Number(e.target.value))}
                      >
                        <option value={0}>None</option><option value={1}>Standard</option><option value={2}>Heavy</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">Holed</label>
                    <select
                      className="border p-1 w-full text-xs bg-gray-50 rounded"
                      value={getCardValue(holed, coin.coin_id, 0)}
                      onChange={(e) => setCardValue(setHoled, coin.coin_id, Number(e.target.value))}
                    >
                      <option value={0}>None</option><option value={1}>Holed</option><option value={2}>Heavily Holed</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                className="bg-green-600 hover:bg-green-700 transition-colors text-white font-semibold px-4 py-2 mt-4 w-full rounded shadow-sm"
                onClick={() => addToCollection(coin.coin_id, coin.rarity)}
              >
                I Own This Piece
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination component hardcoded cleanly to exactly 11 page frames */}
      <div className="flex flex-wrap justify-center gap-2 mt-8">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => setPage(i + 1)}
            className={`px-4 py-2 rounded border font-medium text-sm transition-all ${
              page === i + 1 ? "bg-blue-600 text-white shadow-sm border-blue-600" : "bg-white text-black hover:bg-gray-50"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </main>
  );
}