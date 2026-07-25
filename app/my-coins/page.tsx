"use client";

import Link from "next/link";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

// Helper map for numeric conditions to friendly grade labels
const CONDITION_MAP: { [key: number]: string } = {
  1: "P (Poor)",
  2: "FR (Fair)",
  3: "AG (About Good)",
  4: "G (Good)",
  5: "VG (Very Good)",
  6: "F (Fine)",
  7: "VF (Very Fine)",
  8: "XF (Extremely Fine)",
  9: "AU (About Uncirculated)",
  10: "LU (Low Uncirculated)",
  11: "MU (Middle Uncirculated)",
  12: "BU (Brilliant Uncirculated)",
  13: "HU (High Uncirculated)",
};

// Helper function to decode the 5-digit damage signature (e.g., 10201)
function decodeDamageSignature(signature: number | string | null): string {
  if (signature === null || signature === undefined) return "None";

  const sigStr = String(signature).padStart(5, "0");

  const damagedVal = Number(sigStr[0]);
  const bentVal = Number(sigStr[1]);
  const cleanedVal = Number(sigStr[2]);
  const envVal = Number(sigStr[3]);
  const holedVal = Number(sigStr[4]);

  const activeDamages: string[] = [];

  if (damagedVal === 1) activeDamages.push("Damaged");
  if (damagedVal === 2) activeDamages.push("Heavy Damage");

  if (bentVal === 1) activeDamages.push("Bent");
  if (bentVal === 2) activeDamages.push("Heavily Bent");

  if (cleanedVal === 1) activeDamages.push("Cleaned");
  if (cleanedVal === 2) activeDamages.push("Harshly Cleaned");

  if (envVal === 1) activeDamages.push("Environmental Damage");
  if (envVal === 2) activeDamages.push("Heavy Environmental Damage");

  if (holedVal === 1) activeDamages.push("Holed");
  if (holedVal === 2) activeDamages.push("Heavily Holed");

  return activeDamages.length > 0 ? activeDamages.join(", ") : "None";
}

// Calculate score based on coin rarity
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

// Inner component that handles user interaction and uses search params safely
function MyCoinsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract target userId from URL query parameter if present
  const targetUserId = searchParams.get("userId");

  const [loading, setLoading] = useState(true);
  const [userCoins, setUserCoins] = useState<any[]>([]);
  const [binderOwnerName, setBinderOwnerName] = useState("");
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Track save status per card
  const [saveStatus, setSaveStatus] = useState<{ [userCoinId: number]: "Idle" | "Saving..." | "Saved!" }>({});

  // Local state to manage live editing changes for inputs on each card
  const [editStates, setEditStates] = useState<{
    [userCoinId: number]: { image1: string; image2: string; notes: string };
  }>({});

  // Refs to store timeouts for debounced auto-saving on each specific input field
  const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout }>({});

  async function fetchMyCollection() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const activeUserId = targetUserId && targetUserId !== user.id ? targetUserId : user.id;
    const readOnlyMode = activeUserId !== user.id;
    setIsReadOnly(readOnlyMode);

    // Fetch the target profile's display name
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", activeUserId)
      .single();

    setBinderOwnerName(profile?.display_name || "Collector");

    // Included 'rarity' in the query so score deduction can be calculated
    const { data, error } = await supabase
      .from("user_coins")
      .select(`
        id,
        condition,
        damage,
        image1,
        image2,
        notes,
        coins (
          id,
          name,
          year,
          denomination,
          metal,
          obverse_url,
          reverse_url,
          rarity
        )
      `)
      .eq("user_id", activeUserId);

    if (error) {
      console.error("Error fetching user coins:", error);
    } else if (data) {
      const normalizedData = data.map((item: any) => ({
        ...item,
        coins: Array.isArray(item.coins) ? item.coins[0] : item.coins,
      }));

      normalizedData.sort((a, b) => {
        const coinA = a.coins;
        const coinB = b.coins;

        if (!coinA || !coinB) return 0;

        if (coinB.year !== coinA.year) {
          return coinB.year - coinA.year;
        }

        if (coinA.denomination !== coinB.denomination) {
          return coinA.denomination - coinB.denomination;
        }

        return coinA.id - coinB.id;
      });

      setUserCoins(normalizedData);

      const initialStates: typeof editStates = {};
      const initialStatus: typeof saveStatus = {};
      normalizedData.forEach((item) => {
        initialStates[item.id] = {
          image1: item.image1 || "",
          image2: item.image2 || "",
          notes: item.notes || "",
        };
        initialStatus[item.id] = "Idle";
      });
      setEditStates(initialStates);
      setSaveStatus(initialStatus);
    }
    setLoading(false);
  }

  // Auto-save logic
  const triggerAutoSave = (userCoinId: number, field: string, value: string) => {
    if (isReadOnly) return;

    const key = `${userCoinId}-${field}`;

    if (timeoutRefs.current[key]) {
      clearTimeout(timeoutRefs.current[key]);
    }

    setSaveStatus((prev) => ({ ...prev, [userCoinId]: "Saving..." }));

    timeoutRefs.current[key] = setTimeout(async () => {
      const { error } = await supabase
        .from("user_coins")
        .update({ [field]: value.trim() })
        .eq("id", userCoinId);

      if (error) {
        console.error(`Auto-save failed for ${field}:`, error.message);
        setSaveStatus((prev) => ({ ...prev, [userCoinId]: "Idle" }));
      } else {
        setSaveStatus((prev) => ({ ...prev, [userCoinId]: "Saved!" }));
        setTimeout(() => {
          setSaveStatus((prev) => ({ ...prev, [userCoinId]: "Idle" }));
        }, 2000);
      }
    }, 1000);
  };

  const handleInputChange = (userCoinId: number, field: "image1" | "image2" | "notes", value: string) => {
    if (isReadOnly) return;

    setEditStates((prev) => ({
      ...prev,
      [userCoinId]: {
        ...prev[userCoinId],
        [field]: value,
      },
    }));

    triggerAutoSave(userCoinId, field, value);
  };

  async function removeCoin(userCoinId: number) {
    if (isReadOnly) return;

    const confirmDelete = confirm("Are you sure you want to remove this coin from your collection?");
    if (!confirmDelete) return;

    // 1. Locate coin details to determine its score value before deleting
    const targetItem = userCoins.find((uc) => uc.id === userCoinId);
    const coinRarity = targetItem?.coins?.rarity ?? 0;
    const scoreToDeduct = getScoreFromRarity(coinRarity);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 2. Delete the user coin entry from the database
    const { error } = await supabase
      .from("user_coins")
      .delete()
      .eq("id", userCoinId);

    if (error) {
      alert("Failed to remove coin: " + error.message);
      return;
    }

    // 3. Deduct score by passing a negative integer to increment_score
    const { error: scoreError } = await supabase.rpc("increment_score", {
      user_id_input: user.id,
      amount: -scoreToDeduct,
    });

    if (scoreError) {
      console.error("Failed to deduct score:", scoreError);
    }

    alert("Coin successfully removed.");
    setUserCoins((prev) => prev.filter((item) => item.id !== userCoinId));
  }

  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    fetchMyCollection();
  }, [router, targetUserId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-blue-50 text-black">
        <p className="text-xl font-semibold">Loading collection binder...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">
              {isReadOnly ? `${binderOwnerName}'s Binder` : "My Personal Binder"}
            </h1>
            {isReadOnly && (
              <p className="text-sm font-semibold text-amber-600 mt-1">
                🔒 Viewing in Read-Only Mode
              </p>
            )}
          </div>
          <Link href="/" className="text-blue-600 font-semibold underline hover:text-blue-800">
            ← Main Collection
          </Link>
        </div>

        {userCoins.length === 0 ? (
          <div className="bg-white p-8 rounded shadow text-center text-gray-500">
            {isReadOnly ? "This collector has no coins in their binder." : "You don't own any coins yet! Head back to the main catalog to add some."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userCoins.map((uc) => {
              const coin = uc.coins;
              const hasCustomImage = editStates[uc.id]?.image1 || editStates[uc.id]?.image2;

              if (!coin) return null;

              const conditionLabel = CONDITION_MAP[uc.condition] || `Unknown (${uc.condition})`;
              const damageLabel = decodeDamageSignature(uc.damage);

              return (
                <div key={uc.id} className="border p-4 rounded bg-white shadow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h2 className="text-2xl font-bold mb-2">{coin.name}</h2>

                      {!isReadOnly && saveStatus[uc.id] !== "Idle" && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          saveStatus[uc.id] === "Saving..." ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                        }`}>
                          {saveStatus[uc.id]}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mt-4 mb-4">
                      {hasCustomImage ? (
                        <>
                          {editStates[uc.id]?.image1 && (
                            <img
                              src={editStates[uc.id].image1}
                              alt="Custom obverse view"
                              className="w-full h-48 object-contain rounded border bg-gray-50"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://placehold.co/400?text=Invalid+Image+1+URL";
                              }}
                            />
                          )}
                          {editStates[uc.id]?.image2 && (
                            <img
                              src={editStates[uc.id].image2}
                              alt="Custom reverse view"
                              className="w-full h-48 object-contain rounded border bg-gray-50"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://placehold.co/400?text=Invalid+Image+2+URL";
                              }}
                            />
                          )}
                        </>
                      ) : (
                        <>
                          <img
                            src={coin.obverse_url}
                            alt={`${coin.name} Default Obverse`}
                            className="w-full h-48 object-contain rounded border"
                          />
                          <img
                            src={coin.reverse_url}
                            alt={`${coin.name} Default Reverse`}
                            className="w-full h-48 object-contain rounded border mt-2"
                          />
                        </>
                      )}
                    </div>

                    <div className="text-sm space-y-1 text-gray-700">
                      <p><strong>Year:</strong> {coin.year}</p>
                      <p><strong>Denomination:</strong> {coin.denomination}</p>
                      <p><strong>Metal:</strong> {coin.metal}</p>
                      <p><strong>Grade:</strong> <span className="font-semibold text-blue-900">{conditionLabel}</span></p>
                      <p><strong>Damage Details:</strong> <span className={damageLabel !== "None" ? "text-red-600 font-semibold" : "text-gray-500"}>{damageLabel}</span></p>
                    </div>
                  </div>

                  <div>
                    {isReadOnly ? (
                      editStates[uc.id]?.notes && (
                        <div className="mt-4 p-2.5 bg-gray-50 rounded border text-xs text-gray-600">
                          <strong>Collector Notes:</strong> {editStates[uc.id].notes}
                        </div>
                      )
                    ) : (
                      <div className="mt-6 pt-4 border-t border-gray-100 mb-4">
                        <div className="flex flex-wrap gap-2 items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 font-bold mb-0.5">IMG 1 URL</span>
                            <input
                              type="text"
                              placeholder="Link 1"
                              value={editStates[uc.id]?.image1 || ""}
                              onChange={(e) => handleInputChange(uc.id, "image1", e.target.value)}
                              className="border text-xs p-1.5 rounded bg-gray-50 w-16 focus:w-48 transition-all duration-300 ease-in-out outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 font-bold mb-0.5">IMG 2 URL</span>
                            <input
                              type="text"
                              placeholder="Link 2"
                              value={editStates[uc.id]?.image2 || ""}
                              onChange={(e) => handleInputChange(uc.id, "image2", e.target.value)}
                              className="border text-xs p-1.5 rounded bg-gray-50 w-16 focus:w-48 transition-all duration-300 ease-in-out outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 font-bold mb-0.5">Notes</span>
                            <input
                              type="text"
                              placeholder="Write..."
                              value={editStates[uc.id]?.notes || ""}
                              onChange={(e) => handleInputChange(uc.id, "notes", e.target.value)}
                              className="border text-xs p-1.5 rounded bg-gray-50 w-16 focus:w-48 transition-all duration-300 ease-in-out outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {!isReadOnly && (
                      <button
                        onClick={() => removeCoin(uc.id)}
                        className="w-full bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800 text-xs font-bold py-2 rounded transition"
                      >
                        Remove from Binder
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default function MyCoinsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-blue-50 text-black">
          <p className="text-xl font-semibold">Loading...</p>
        </main>
      }
    >
      <MyCoinsContent />
    </Suspense>
  );
}