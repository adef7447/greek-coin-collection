"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function MyCoins() {
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
  const [coins, setCoins] = useState<any[]>([]);
  const [userDisplayName, setUserDisplayName] = useState("");
  async function removeCoin(coinId: number, rarity: number) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const scoreToRemove = getScoreFromRarity(rarity);

  const { error } = await supabase
    .from("user_coins")
    .delete()
    .eq("user_id", user.id)
    .eq("coin_id", coinId);

  if (error) {
    alert(error.message);
    return;
  }

  await supabase.rpc("decrement_score", {
    user_id_input: user.id,
    amount: scoreToRemove,
  });

  alert("Coin removed + score updated!");
}

  async function getMyCoins() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: userCoins, error: userCoinsError } = await supabase
      .from("user_coins")
      .select("*")
      .eq("user_id", user.id);

    if (userCoinsError) {
      console.log(userCoinsError);
      return;
    }

    const coinIds = userCoins.map((c) => c.coin_id);

    if (coinIds.length === 0) {
      setCoins([]);
      return;
    }

    const { data: coinsData, error: coinsError } = await supabase
      .from("coins")
      .select("*")
      .in("id", coinIds)
      .order("id", { ascending: true });

    if (coinsError) {
      console.log(coinsError);
      return;
    }

    const mergedCoins = (coinsData || []).map((coin) => {
      const userCoin = userCoins.find(
        (u) => u.coin_id === coin.id
      );

      return {
        ...coin,
        userCondition: userCoin?.condition ?? null,
        userDamage: userCoin?.damage ?? 0,
      };
    });

    setCoins(mergedCoins);
  }

  useEffect(() => {
    getMyCoins();

    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserDisplayName(user.email || "");
      }
    }

    checkUser();
  }, []);

  function getConditionName(condition: number) {
    const conditions = [
      "",
      "P",
      "FR",
      "AG",
      "G",
      "VG",
      "F",
      "VF",
      "XF",
      "AU",
      "LU",
      "MU",
      "BU",
      "HU",
    ];

    return conditions[condition] || "Unknown";
  }

  function getProblems(damageNumber: number) {
    const damage = String(damageNumber)
      .padStart(5, "0");

    const problems: string[] = [];

    if (damage[0] === "1") problems.push("Damaged");
    if (damage[0] === "2") problems.push("Heavy Damage");

    if (damage[1] === "1") problems.push("Bent");
    if (damage[1] === "2") problems.push("Heavily Bent");

    if (damage[2] === "1") problems.push("Cleaned");
    if (damage[2] === "2") problems.push("Harshly Cleaned");

    if (damage[3] === "1")
      problems.push("Environmental Damage");
    if (damage[3] === "2")
      problems.push("Heavy Environmental Damage");

    if (damage[4] === "1") problems.push("Holed");
    if (damage[4] === "2") problems.push("Heavily Holed");

    return problems.join(", ");
  }

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">

      <div className="flex justify-between items-center mb-8">
        <div>

          <h1 className="text-4xl font-bold">
            My Coins
          </h1>

          {userDisplayName && (
            <p className="text-gray-700 mt-2">
              Logged in as: {userDisplayName}
            </p>
          )}

        </div>

        <Link
          href="/"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Back Home
        </Link>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {coins.map((coin) => (

          <div
            key={coin.id}
            className="border p-4 rounded bg-white shadow"
          >

            <h2 className="text-2xl font-bold">
              {coin.name}
            </h2>

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

            <p>Year: {coin.year}</p>

            <p>
              Denomination: {coin.denomination}
            </p>

            <p>
              Metal: {coin.metal}
            </p>

            {coin.ruling_authority && (
              <p>
                Ruling Authority: {coin.ruling_authority}
              </p>
            )}

            {coin.fineness > 0 && (
              <p>
                Fineness: {coin.fineness}
              </p>
            )}

            <p>
              Mintage: {coin.mintage}
            </p>

            <p>
              Condition:{" "}
              {getConditionName(
                coin.userCondition
              )}
            </p>

            {coin.userDamage > 0 && (
              <p>
                Problems:{" "}
                {getProblems(
                  coin.userDamage
                )}
              </p>
            )}

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
            <button
  className="bg-red-600 text-white px-4 py-2 mt-4 rounded"
  onClick={() => {
    if (confirm("Remove this coin from your collection?")) {
      removeCoin(coin.id, coin.rarity);
    }
  }}
>
  Remove Coin
</button>

          </div>

        ))}

      </div>

    </main>
  );
}