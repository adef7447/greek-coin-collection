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
  const [listings, setListings] = useState<any[]>([]);
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
    const { data: coinData, error: coinError } = await supabase
      .from("coins")
      .select("name, year, denomination")
      .eq("id", coinId)
      .single();

    if (coinError) {
      console.error("Error loading coin context:", coinError.message);
    } else {
      setCoin(coinData);
    }

    // 3. Get All Listings for this Coin (both active and sold)
    const { data: listingsData, error: listingsError } = await supabase
      .from("coin_listings")
      .select("*")
      .eq("coin_id", coinId)
      .order("created_at", { ascending: false });

    if (listingsError) {
      console.error("Error loading listings:", listingsError.message);
    } else {
      setListings(listingsData || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchPageData();
  }, [coinId]);

  // Formats the custom coin title sentence strictly according to specifications
  function generateListingSentence(listing: any) {
    const parts: string[] = [];

    // 1. Grading Authority Classification
    if (listing.graded === "ngc/pcgs graded") {
      parts.push("NGC/PCGS Graded");
    } else if (listing.graded === "other graded") {
      parts.push("Other Graded");
    } else {
      parts.push("Raw");
    }

    // 2. Grade or Condition
    const isCleanGraded = listing.graded !== "raw" && !listing.is_problem;
    if (isCleanGraded) {
      parts.push(listing.numeric_grade ? `${listing.numeric_grade}` : "");
    } else {
      parts.push(listing.condition || "");
    }

    // 3. Grade Designation Suffix
    if (isCleanGraded && listing.grade_suffix && listing.grade_suffix !== "normal") {
      parts.push(listing.grade_suffix);
    }

    // 4. Damage / Problems (if any are active)
    if (listing.is_problem && listing.problems) {
      const activeProblems = Object.entries(listing.problems)
        .filter(([_, isActive]) => isActive)
        .map(([probName]) => probName);
      
      if (activeProblems.length > 0) {
        parts.push(`(${activeProblems.join(", ")})`);
      }
    }

    // 5. Color (skip if "none" or empty)
    if (isCleanGraded && listing.color && listing.color !== "none") {
      parts.push(listing.color);
    }

    // 6. Strike Characteristics (skip if "none" or empty)
    if (isCleanGraded && listing.designation && listing.designation !== "none") {
      parts.push(listing.designation);
    }

    // Assemble the parts, filtering out empty strings, then append price
    const descriptiveString = parts.filter(Boolean).join(" ");
    const formattedPrice = `€${parseFloat(listing.price).toFixed(2)}`;

    return `${descriptiveString} - ${formattedPrice}`;
  }

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

        {/* Listings Output */}
        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-xl font-bold border-b pb-3 mb-4 text-gray-800">
            Available Listings
          </h2>

          {listings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">🤝</div>
              <p className="font-semibold text-gray-800">No active listings for this coin.</p>
              <p className="text-sm text-gray-400 mt-1">Check back later or list yours if you have permission!</p>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              {listings.map((listing) => {
                const isSold = listing.status === "sold";
                return (
                  <Link
                    key={listing.id}
                    href={`/buy-sell/${coinId}/listing/${listing.id}`}
                    className={`font-bold text-lg hover:underline transition truncate block ${
                      isSold 
                        ? "text-red-600 hover:text-red-800" 
                        : "text-green-600 hover:text-green-800"
                    }`}
                  >
                    {generateListingSentence(listing)} {isSold && "• [SOLD]"}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}