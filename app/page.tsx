"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { checkAchievements } from "../lib/checkAchievements";

export default function Home() {
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
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [coins, setCoins] = useState<any[]>([]);
const [userDisplayName, setUserDisplayName] = useState("");
const [userScore, setUserScore] = useState(0);
  const [page, setPage] = useState(1);
const [condition, setCondition] = useState(7);

const [damaged, setDamaged] = useState(0);
const [bent, setBent] = useState(0);
const [cleaned, setCleaned] = useState(0);
const [environmental, setEnvironmental] = useState(0);
const [holed, setHoled] = useState(0);
const coinsPerPage = 42;

const totalPages = Math.ceil(coins.length / coinsPerPage);

const displayedCoins = coins.slice(
  (page - 1) * coinsPerPage,
  page * coinsPerPage
);
 async function signUp() {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    alert(error.message);
    return;
  }

  // get logged in user safely
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("User created but not logged in yet. Please log in.");
    return;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .insert([
      {
        id: user.id,
        display_name: displayName,
        score: 0,
      },
    ]);

  if (profileError) {
    console.log(profileError);
    alert(profileError.message);
  } else {
    alert("Account created!");
  }
}

  async function login() {

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {

const { data: profile } = await supabase
  .from("profiles")
  .select("display_name, score")
  .eq("id", data.user.id)
  .single();

setUserDisplayName(profile?.display_name || "");
setUserScore(profile?.score || 0);

await checkAchievements(data.user.id);

const { data: updatedProfile } = await supabase
  .from("profiles")
  .select("score")
  .eq("id", data.user.id)
  .single();

setUserScore(updatedProfile?.score || 0);

alert("Logged in!");
    }
  }

  async function logout() {

    await supabase.auth.signOut();

setUserDisplayName("");
    alert("Logged out!");
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("Login first");
    return;
  }

  const damage = Number(
    `${damaged}${bent}${cleaned}${environmental}${holed}`
  );

  const scoreToAdd = getScoreFromRarity(rarity);

  // 1. Insert coin
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

  // 2. Add score
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

  // 3. Update achievements
  await checkAchievements(user.id);

  // 4. ALWAYS refresh score from DB (important fix)
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

    async function checkUser() {

      const {
        data: { user },
      } = await supabase.auth.getUser();

if (user) {
  await checkAchievements(user.id);

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

  }, []);

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">

      <h1 className="text-4xl font-bold mb-2">
Greek Coin Collection
      </h1>

{userDisplayName && (
        <div className="mb-8">

         <p className="text-lg text-gray-700">
  Score: {userScore}
</p>

          <div className="flex gap-4">

  <Link
    href="/my-coins"
    className="text-blue-600 underline"
  >
    My Coins
  </Link>

  <Link
    href="/leaderboard"
    className="text-blue-600 underline"
  >
    Leaderboard
  </Link>
  <Link
  href="/achievements"
  className="text-blue-600 underline"
>
  Achievements
</Link>

</div>

        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-8">
      <input
  className="border p-2 bg-white rounded"
  type="text"
  placeholder="Display Name"
  value={displayName}
  onChange={(e) => setDisplayName(e.target.value)}
/>

        <input
          className="border p-2 bg-white rounded"
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-2 bg-white rounded"
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="bg-black text-white px-4 py-2 rounded"
          onClick={signUp}
        >
          Sign Up
        </button>

        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={login}
        >
          Login
        </button>

        <button
          className="bg-red-500 text-white px-4 py-2 rounded"
          onClick={logout}
        >
          Logout
        </button>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

       {displayedCoins.map((coin) => (
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

  <label className="block font-bold mb-1">
    Condition
  </label>

  <select
    className="border p-2 w-full"
    value={condition}
    onChange={(e) =>
      setCondition(Number(e.target.value))
    }
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

  <label className="block">
    Damaged
  </label>

  <select
    className="border p-1 w-full"
    value={damaged}
    onChange={(e) =>
      setDamaged(Number(e.target.value))
    }
  >
    <option value={0}>None</option>
    <option value={1}>Damaged</option>
    <option value={2}>Heavy Damage</option>
  </select>

  <label className="block mt-2">
    Bent
  </label>

  <select
    className="border p-1 w-full"
    value={bent}
    onChange={(e) =>
      setBent(Number(e.target.value))
    }
  >
    <option value={0}>None</option>
    <option value={1}>Bent</option>
    <option value={2}>Heavily Bent</option>
  </select>

  <label className="block mt-2">
    Cleaned
  </label>

  <select
    className="border p-1 w-full"
    value={cleaned}
    onChange={(e) =>
      setCleaned(Number(e.target.value))
    }
  >
    <option value={0}>None</option>
    <option value={1}>Cleaned</option>
    <option value={2}>Harshly Cleaned</option>
  </select>

  <label className="block mt-2">
    Environmental Damage
  </label>

  <select
    className="border p-1 w-full"
    value={environmental}
    onChange={(e) =>
      setEnvironmental(Number(e.target.value))
    }
  >
    <option value={0}>None</option>
    <option value={1}>Environmental Damage</option>
    <option value={2}>Heavy Environmental Damage</option>
  </select>

  <label className="block mt-2">
    Holed
  </label>

  <select
    className="border p-1 w-full"
    value={holed}
    onChange={(e) =>
      setHoled(Number(e.target.value))
    }
  >
    <option value={0}>None</option>
    <option value={1}>Holed</option>
    <option value={2}>Heavily Holed</option>
  </select>

</div>
            <button
              className="bg-green-600 text-white px-4 py-2 mt-4 rounded"
onClick={() => addToCollection(coin.id, coin.rarity)}            >
              I Own This
            </button>

          </div>

        ))}

      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-8">

  {Array.from({ length: totalPages }, (_, i) => (

    <button
      key={i + 1}
      onClick={() => setPage(i + 1)}
      className={`px-4 py-2 rounded border ${
        page === i + 1
          ? "bg-blue-600 text-white"
          : "bg-white text-black"
      }`}
    >
      {i + 1}
    </button>

  ))}

</div>

    </main>
  );
}