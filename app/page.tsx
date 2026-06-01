"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [coins, setCoins] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [page, setPage] = useState(1);

const coinsPerPage = 42;

const totalPages = Math.ceil(coins.length / coinsPerPage);

const displayedCoins = coins.slice(
  (page - 1) * coinsPerPage,
  page * coinsPerPage
);

  async function signUp() {

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
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

      setUserEmail(data.user.email || "");

      alert("Logged in!");
    }
  }

  async function logout() {

    await supabase.auth.signOut();

    setUserEmail("");

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

  async function addToCollection(coinId: number) {

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Login first");
      return;
    }

    const { error } = await supabase
      .from("user_coins")
      .insert([
        {
          user_id: user.id,
          coin_id: coinId,
          condition: "VF",
          problem: "None",
        },
      ]);

    if (error) {
      alert(error.message);
    } else {
      alert("Coin added!");
    }
  }

  useEffect(() => {

    getCoins();

    async function checkUser() {

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserEmail(user.email || "");
      }
    }

    checkUser();

  }, []);

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">

      <h1 className="text-4xl font-bold mb-2">
        Greek Coin Collection
      </h1>

      {userEmail && (
        <div className="mb-8">

          <p className="text-lg text-gray-700">
            Logged in as: {userEmail}
          </p>

          <Link
            href="/my-coins"
            className="text-blue-600 underline"
          >
            My Coins
          </Link>

        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-8">

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

            <button
              className="bg-green-600 text-white px-4 py-2 mt-4 rounded"
              onClick={() => addToCollection(coin.id)}
            >
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