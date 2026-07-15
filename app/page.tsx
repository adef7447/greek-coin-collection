"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { checkAchievements } from "../lib/checkAchievements";

// Define the historical era ranges
const ERA_RANGES = [
  { label: "1828-1831", min: 1828, max: 1831 },
  { label: "1832-1845", min: 1832, max: 1845 },
  { label: "1845-1857", min: 1845, max: 1857 },
  { label: "1868-1884", min: 1868, max: 1884 },
  { label: "1893-1922", min: 1893, max: 1922 },
  { label: "1926-1940", min: 1926, max: 1940 },
  { label: "1954-1965", min: 1954, max: 1965 },
  { label: "1966-1973", min: 1966, max: 1973 },
  { label: "1974-1979", min: 1974, max: 1979 },
  { label: "1980-1989", min: 1980, max: 1989 },
  { label: "1990-2000", min: 1990, max: 2000 },
];

export default function Home() {
  const router = useRouter();
  const [coins, setCoins] = useState<any[]>([]);
  const [userDisplayName, setUserDisplayName] = useState("");
  const [userScore, setUserScore] = useState(0);
  const [userPerms, setUserPerms] = useState(1); // 1-1000 Permissions level
  const [loading, setLoading] = useState(true);

  // Era filter state. Default is "All" to show everything initially
  const [selectedRange, setSelectedRange] = useState<string>("All");

  const [page, setPage] = useState(1);
  const [condition, setCondition] = useState(7);

  const [damaged, setDamaged] = useState(0);
  const [bent, setBent] = useState(0);
  const [cleaned, setCleaned] = useState(0);
  const [environmental, setEnvironmental] = useState(0);
  const [holed, setHoled] = useState(0);
  const coinsPerPage = 42;

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

  // Filter raw coins locally based on selected year range
  const filteredCoins = coins.filter((coin) => {
    if (selectedRange === "All") return true;
    const targetRange = ERA_RANGES.find((r) => r.label === selectedRange);
    if (!targetRange) return true;
    return coin.year >= targetRange.min && coin.year <= targetRange.max;
  });

  // Calculate pages and displayed item slices based on the filtered dataset
  const totalPages = Math.ceil(filteredCoins.length / coinsPerPage);
  const displayedCoins = filteredCoins.slice(
    (page - 1) * coinsPerPage,
    page * coinsPerPage
  );

  // Helper handler when switching filters
  function handleRangeSelect(rangeLabel: string) {
    setSelectedRange(rangeLabel);
    setPage(1); // Always reset back to page 1 on filter changes
  }

  async function logout() {
    await supabase.auth.signOut();
    setUserDisplayName("");
    router.push("/login");
  }

  async function getCoins() {
    const { data, error } = await supabase
      .from("coins")
      .select("*")
      .order("year", { ascending: true })
      .order("denomination", { ascending: true })
      .order("coin_id", { ascending: true });

    if (error) {
      console.log(error);
    } else {
      setCoins(data || []);
    }
  }

  async function addToCollection(coinId: number, rarity: number) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const damage = Number(
      `${damaged}${bent}${cleaned}${environmental}${holed}`
    );
    const scoreToAdd = getScoreFromRarity(rarity);

    const { error } = await supabase
      .from("user_coins")
      .insert([
        {
          user_id: user.id,
          coin_id: coinId,
          condition: condition,
          damage: damage,
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    const { error: scoreError } = await supabase.rpc(
      "increment_score",
      {
        user_id_input: user.id,
        amount: scoreToAdd,
      }
    );

    if (scoreError) {
      console.log(scoreError);
    }

    await checkAchievements(user.id);

    const { data: updatedProfile } = await supabase
      .from("profiles")
      .select("score")
      .eq("id", user.id)
      .single();

    setUserScore(updatedProfile?.score || 0);
    alert("Coin added + score updated!");
  }

  useEffect(() => {
    getCoins();

    async function checkUserAndRedirect() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      await checkAchievements(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, score, perms")
        .eq("id", user.id)
        .single();

      setUserDisplayName(profile?.display_name || "");
      setUserScore(profile?.score || 0);
      setUserPerms(profile?.perms || 1);
      setLoading(false);
    }

    checkUserAndRedirect();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-blue-50 text-black">
        <p className="text-xl font-semibold">Loading collection data...</p>
      </main>
    );
  }

  // Reusable component UI for rendering category links
  const CategoryFilters = () => (
    <div className="flex flex-wrap gap-2 mb-6 p-4 bg-white rounded shadow border">
      <span className="font-bold text-gray-700 self-center mr-2">Filter Eras:</span>
      <button
        onClick={() => handleRangeSelect("All")}
        className={`px-3 py-1.5 rounded text-sm font-semibold transition border ${
          selectedRange === "All"
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300"
        }`}
      >
        All Coins ({coins.length})
      </button>
      {ERA_RANGES.map((range) => {
        // Count how many coins fit this range dynamically
        const count = coins.filter(c => c.year >= range.min && c.year <= range.max).length;
        
        return (
          <button
            key={range.label}
            onClick={() => handleRangeSelect(range.label)}
            className={`px-3 py-1.5 rounded text-sm font-semibold transition border ${
              selectedRange === range.label
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300"
            }`}
          >
            {range.label} ({count})
          </button>
        );
      })}
    </div>
  );

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Greek Coin Collection</h1>
          <p className="text-lg text-gray-700">
            Collector: <span className="font-bold">{userDisplayName}</span> | Score: <span className="font-bold">{userScore}</span>
          </p>
          {userPerms >= 500 && (
            <p className="text-sm text-purple-700 font-semibold mt-1">
              ⭐ Premium Permissions Level: {userPerms}
            </p>
          )}
        </div>

        <button
          className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded shadow font-semibold transition"
          onClick={logout}
        >
          Logout
        </button>
      </div>

      {/* Navigation Matrix Links */}
      <div className="flex gap-4 mb-8 bg-white p-4 rounded shadow border">
        <Link href="/my-coins" className="text-blue-600 font-semibold underline hover:text-blue-800">
          My Coins
        </Link>
        <Link href="/leaderboard" className="text-blue-600 font-semibold underline hover:text-blue-800">
          Leaderboard
        </Link>
        <Link href="/achievements" className="text-blue-600 font-semibold underline hover:text-blue-800">
          Achievements
        </Link>
        <Link href="/recommendations" className="text-green-600 font-semibold underline hover:text-green-800">
          Recommendations ★
        </Link>
        <Link href="/info" className="text-blue-600 font-semibold underline hover:text-blue-800">
          Info Page
        </Link>
      </div>

      {/* TOP CATEGORY FILTERS */}
      <CategoryFilters />

      {displayedCoins.length === 0 ? (
        <div className="bg-white p-12 text-center rounded shadow border text-gray-500">
          No coins found in the database for the year range: <strong>{selectedRange}</strong>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedCoins.map((coin) => (
            <div key={coin.id} className="border p-4 rounded bg-white shadow">
              <h2 className="text-2xl font-bold">{coin.name}</h2>

              <img
                src={coin.obverse_url}
                alt={coin.name}
                className="w-full h-48 object-contain mt-4"
              />

              <img
                src={coin.reverse_url}
                alt={coin.name}
                className="w-full h-48 object-contain mt-2"
              />

              <p className="mt-2">Year: {coin.year}</p>
              <p>Denomination: {coin.denomination}</p>
              <p>Metal: {coin.metal}</p>

              {coin.ruling_authority && <p>Ruling Authority: {coin.ruling_authority}</p>}
              {coin.fineness > 0 && <p>Fineness: {coin.fineness}</p>}
              <p>Mintage: {coin.mintage}</p>

              <p>
                Rarity:
                <span
                  className={
                    coin.rarity >= 70
                      ? "text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 font-bold ml-2"
                      : coin.rarity >= 60
                      ? "text-red-600 font-bold ml-2"
                      : coin.rarity >= 50
                      ? "text-purple-600 font-bold ml-2"
                      : coin.rarity >= 40
                      ? "text-blue-900 font-bold ml-2"
                      : coin.rarity >= 30
                      ? "text-yellow-500 font-bold ml-2"
                      : coin.rarity >= 20
                      ? "text-green-500 font-bold ml-2"
                      : coin.rarity >= 10
                      ? "text-blue-300 font-bold ml-2"
                      : "text-gray-500 font-bold ml-2"
                  }
                >
                  {coin.rarity >= 70
                    ? "Unique"
                    : coin.rarity >= 60
                    ? "Mythic"
                    : coin.rarity >= 50
                    ? "Legendary"
                    : coin.rarity >= 40
                    ? "Epic"
                    : coin.rarity >= 30
                    ? "Rare"
                    : coin.rarity >= 20
                    ? "Uncommon"
                    : coin.rarity >= 10
                    ? "Common"
                    : "Basic"}
                </span>
              </p>

              <div className="mt-4">
                <label className="block font-bold mb-1">Condition</label>
                <select
                  className="border p-2 w-full"
                  value={condition}
                  onChange={(e) => setCondition(Number(e.target.value))}
                >
                  <option value={1}>P</option>
                  <option value={2}>FR</option>
                  <option value={3}>AG</option>
                  <option value={4}>G</option>
                  <option value={5}>VG</option>
                  <option value={6}>F</option>
                  <option value={7}>VF</option>
                  <option value={8}>XF</option>
                  <option value={9}>AU</option>
                  <option value={10}>LU</option>
                  <option value={11}>MU</option>
                  <option value={12}>BU</option>
                  <option value={13}>HU</option>
                </select>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold">Damaged</label>
                <select
                  className="border p-1 w-full"
                  value={damaged}
                  onChange={(e) => setDamaged(Number(e.target.value))}
                >
                  <option value={0}>None</option>
                  <option value={1}>Damaged</option>
                  <option value={2}>Heavy Damage</option>
                </select>

                <label className="block mt-2 text-sm font-semibold">Bent</label>
                <select
                  className="border p-1 w-full"
                  value={bent}
                  onChange={(e) => setBent(Number(e.target.value))}
                >
                  <option value={0}>None</option>
                  <option value={1}>Bent</option>
                  <option value={2}>Heavily Bent</option>
                </select>

                <label className="block mt-2 text-sm font-semibold">Cleaned</label>
                <select
                  className="border p-1 w-full"
                  value={cleaned}
                  onChange={(e) => setCleaned(Number(e.target.value))}
                >
                  <option value={0}>None</option>
                  <option value={1}>Cleaned</option>
                  <option value={2}>Harshly Cleaned</option>
                </select>

                <label className="block mt-2 text-sm font-semibold">Environmental Damage</label>
                <select
                  className="border p-1 w-full"
                  value={environmental}
                  onChange={(e) => setEnvironmental(Number(e.target.value))}
                >
                  <option value={0}>None</option>
                  <option value={1}>Environmental Damage</option>
                  <option value={2}>Heavy Environmental Damage</option>
                </select>

                <label className="block mt-2 text-sm font-semibold">Holed</label>
                <select
                  className="border p-1 w-full"
                  value={holed}
                  onChange={(e) => setHoled(Number(e.target.value))}
                >
                  <option value={0}>None</option>
                  <option value={1}>Holed</option>
                  <option value={2}>Heavily Holed</option>
                </select>
              </div>

              <button
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 mt-4 rounded w-full font-semibold transition"
                onClick={() => addToCollection(coin.id, coin.rarity)}
              >
                I Own This
              </button>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION BUTTONS */}
      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`px-4 py-2 rounded border ${
                page === i + 1 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-black"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* BOTTOM CATEGORY FILTERS */}
      <div className="mt-8 border-t pt-8">
        <CategoryFilters />
      </div>
    </main>
  );
}