"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function BuySellPage() {
  const [coins, setCoins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAllCoins() {
    // Select all coins where name is not null, ordering by ID
    const { data, error } = await supabase
      .from("coins")
      .select("id, name")
      .not("name", "is", null)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching coins for marketplace:", error.message);
    } else {
      setCoins(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchAllCoins();
  }, []);

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Coin Marketplace</h1>
            <p className="text-sm text-gray-600 mt-1">
              Select a coin denomination/type below to browse available trades or create a listing.
            </p>
          </div>
          
          <Link 
            href="/" 
            className="text-blue-600 font-semibold underline hover:text-blue-800 transition"
          >
            ← Main Collection
          </Link>
        </div>

        {/* Coins List Container */}
        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-xl font-bold border-b pb-3 mb-4 text-gray-800">
            Select a Coin Type
          </h2>

          {loading ? (
            <div className="text-center py-8 text-gray-500 font-medium">
              Loading marketplace catalog...
            </div>
          ) : coins.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No coins found in catalog.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {coins.map((coin) => (
                <Link
                  key={coin.id}
                  href={`/buy-sell/${coin.id}`}
                  className="p-3 border rounded-lg bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition text-left font-medium text-gray-700 flex justify-between items-center group"
                >
                  <span className="group-hover:text-blue-700 transition">
                    {coin.name}
                  </span>
                  <span className="text-xs text-gray-400 group-hover:text-blue-400 transition">
                    Trade →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}