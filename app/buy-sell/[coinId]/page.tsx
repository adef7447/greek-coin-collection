"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function CoinTradePortal() {
  const params = useParams();
  const router = useRouter();
  const coinId = params.coinId;

  const [coin, setCoin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userPerms, setUserPerms] = useState<number>(0);

  async function fetchPageData() {
    if (!coinId) return;

    // 1. Get user and permission level
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("perms")
        .eq("id", user.id)
        .single();
      setUserPerms(profile?.perms || 1);
    }

    // 2. Get Coin Details
    const { data, error } = await supabase
      .from("coins")
      .select("name, year, denomination")
      .eq("id", coinId)
      .single();

    if (error) {
      console.error("Error loading coin context:", error.message);
    } else {
      setCoin(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPageData();
  }, [coinId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-blue-50 text-black">
        <p className="text-xl font-semibold">Opening trade portal...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              {coin ? `${coin.name} (${coin.year})` : "Coin Marketplace"}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Active Trade and Sale Listings
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* SELL THIS COIN ACTION: ONLY Visible if perms >= 10 */}
            {userPerms >= 10 && (
              <div className="flex flex-col items-center">
                <button
                  onClick={() => router.push(`/buy-sell/${coinId}/sell`)}
                  className="bg-green-500 hover:bg-green-600 text-white rounded-full h-12 w-12 flex items-center justify-center text-2xl font-bold shadow-md hover:shadow-lg transition duration-200"
                  title="Sell your version of this coin"
                >
                  +
                </button>
                <span className="text-xs font-bold text-green-700 mt-1">
                  sell this coin
                </span>
              </div>
            )}

            <Link 
              href="/buy-sell" 
              className="text-blue-600 font-semibold underline hover:text-blue-800 transition"
            >
              ← Back to Marketplace
            </Link>
          </div>
        </div>

        {/* Main Content Card Placeholder */}
        <div className="bg-white rounded-lg shadow border p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="text-4xl mb-4">🤝</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Trade listings are empty
          </h2>
          <p className="text-gray-500 max-w-md text-sm">
            Nobody has listed a <span className="font-semibold">{coin?.name || "this coin type"}</span> for sale or trade yet. This space will eventually hold listing cards with grades, user-uploaded custom pictures, prices, and owner contacts.
          </p>
        </div>

      </div>
    </main>
  );
}