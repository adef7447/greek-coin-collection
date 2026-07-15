"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

// Maps database condition IDs (1-13) to their standard professional grading symbols
const gradeMap: { [key: number]: string } = {
  1: "P",
  2: "FR",
  3: "AG",
  4: "G",
  5: "VG",
  6: "F",
  7: "VF",
  8: "XF",
  9: "AU",
  10: "UNC",
  11: "MU",
  12: "BU",
  13: "HU",
};

// Helper function to format the active damage states into clean, readable words
function formatDamage(uc: any): string {
  const activeDamages: string[] = [];

  // 1. General Damage
  if (uc.damaged === 1) activeDamages.push("Damaged");
  if (uc.damaged === 2) activeDamages.push("Heavily Damaged");

  // 2. Bent
  if (uc.bent === 1) activeDamages.push("Bent");
  if (uc.bent === 2) activeDamages.push("Heavily Bent");

  // 3. Cleaned
  if (uc.cleaned === 1) activeDamages.push("Cleaned");
  if (uc.cleaned === 2) activeDamages.push("Harshly Cleaned");

  // 4. Environmental Damage
  if (uc.environmental === 1) activeDamages.push("Environmental Damage");
  if (uc.environmental === 2) activeDamages.push("Heavy Environmental Damage");

  // 5. Holed
  if (uc.holed === 1) activeDamages.push("Holed");
  if (uc.holed === 2) activeDamages.push("Heavily Holed");

  return activeDamages.length > 0 ? activeDamages.join(", ") : "None";
}

export default function MyCoinsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userCoins, setUserCoins] = useState<any[]>([]);
  
  // Track save status per card to show user when it actually saves
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

    const { data, error } = await supabase
      .from("user_coins")
      .select(`
        id,
        condition,
        damaged,
        bent,
        cleaned,
        environmental,
        holed,
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
          reverse_url
        )
      `)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching user coins:", error);
    } else if (data) {
      // Clean and unpack relational objects immediately so components downstream remain clean
      const normalizedData = data.map((item: any) => ({
        ...item,
        coin: Array.isArray(item.coins) ? item.coins[0] : item.coins,
      }));

      // Client-side sorting guarantees exact matching order
      normalizedData.sort((a, b) => {
        const coinA = a.coin;
        const coinB = b.coin;

        if (!coinA || !coinB) return 0;

        // Rule 1: Year (Newest to Oldest)
        if (coinB.year !== coinA.year) {
          return coinB.year - coinA.year;
        }

        // Rule 2: Denomination (Smallest to Largest)
        if (coinA.denomination !== coinB.denomination) {
          return coinA.denomination - coinB.denomination;
        }

        // Rule 3: Coin ID (Smallest to Largest)
        return coinA.id - coinB.id;
      });

      setUserCoins(normalizedData);
      
      // Initialize editing states from DB values
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

  // Auto-save logic that gets called when typing stops
  const triggerAutoSave = (userCoinId: number, field: string, value: string) => {
    const key = `${userCoinId}-${field}`;
    
    // Clear any pending save for this specific field
    if (timeoutRefs.current[key]) {
      clearTimeout(timeoutRefs.current[key]);
    }

    setSaveStatus(prev => ({ ...prev, [userCoinId]: "Saving..." }));

    // Set a new timeout to save 1 second after the user stops typing
    timeoutRefs.current[key] = setTimeout(async () => {
      const { error } = await supabase
        .from("user_coins")
        .update({ [field]: value.trim() })
        .eq("id", userCoinId);

      if (error) {
        console.error(`Auto-save failed for ${field}:`, error.message);
        setSaveStatus(prev => ({ ...prev, [userCoinId]: "Idle" }));
      } else {
        setSaveStatus(prev => ({ ...prev, [userCoinId]: "Saved!" }));
        
        // Clear status timeout reference if any exists to prevent buggy overlap overwrites
        const clearStatusKey = `status-clear-${userCoinId}`;
        if (timeoutRefs.current[clearStatusKey]) {
          clearTimeout(timeoutRefs.current[clearStatusKey]);
        }

        // Reset "Saved!" text to idle after 2 seconds safely
        timeoutRefs.current[clearStatusKey] = setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, [userCoinId]: "Idle" }));
        }, 2000);
      }
    }, 1000); 
  };

  // Updates local input state and schedules the auto-save
  const handleInputChange = (userCoinId: number, field: "image1" | "image2" | "notes", value: string) => {
    setEditStates((prev) => ({
      ...prev,
      [userCoinId]: {
        ...prev[userCoinId],
        [field]: value,
      },
    }));

    triggerAutoSave(userCoinId, field, value);
  };

  // Remove a coin from the collection
  async function removeCoin(userCoinId: number) {
    const confirmDelete = confirm("Are you sure you want to remove this coin from your collection?");
    if (!confirmDelete) return;

    // Instantly cancel any pending network save tasks on this card to prevent post-delete errors
    ["image1", "image2", "notes", "status-clear"].forEach((fieldOrStatus) => {
      const key = fieldOrStatus === "status-clear" ? `status-clear-${userCoinId}` : `${userCoinId}-${fieldOrStatus}`;
      if (timeoutRefs.current[key]) {
        clearTimeout(timeoutRefs.current[key]);
        delete timeoutRefs.current[key];
      }
    });

    const { error } = await supabase
      .from("user_coins")
      .delete()
      .eq("id", userCoinId);

    if (error) {
      alert("Failed to remove coin: " + error.message);
    } else {
      alert("Coin successfully removed.");
      // Instantly filter out deleted coin from the UI
      setUserCoins(prev => prev.filter(item => item.id !== userCoinId));
    }
  }

  // Clean up all pending save timeouts when the component unmounts
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    fetchMyCollection();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-blue-50 text-black">
        <p className="text-xl font-semibold">Loading your binder...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">My Personal Binder</h1>
          <Link href="/" className="text-blue-600 font-semibold underline hover:text-blue-800">
            ← Main Collection
          </Link>
        </div>

        {userCoins.length === 0 ? (
          <div className="bg-white p-8 rounded shadow text-center text-gray-500">
            You don't own any coins yet! Head back to the main catalog to add some.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userCoins.map((uc) => {
              const coin = uc.coin;
              const hasCustomImage = editStates[uc.id]?.image1 || editStates[uc.id]?.image2;

              // Convert dynamic DB states to actual formatted letters and words
              const readableCondition = gradeMap[uc.condition] || "Unknown";
              const readableDamage = formatDamage(uc);

              if (!coin) return null;

              return (
                <div key={uc.id} className="border p-4 rounded bg-white shadow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h2 className="text-2xl font-bold mb-2">{coin.name}</h2>
                      
                      {/* Live Auto-save status feedback */}
                      {saveStatus[uc.id] !== "Idle" && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          saveStatus[uc.id] === "Saving..." ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                        }`}>
                          {saveStatus[uc.id]}
                        </span>
                      )}
                    </div>
                    
                    {/* --- Dynamic Image Render Box --- */}
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
                      <p><strong>Condition:</strong> {readableCondition}</p>
                      <p><strong>Damage:</strong> {readableDamage}</p>
                    </div>
                  </div>

                  <div>
                    {/* --- Seamless Auto-saving Micro Inputs --- */}
                    <div className="mt-6 pt-4 border-t border-gray-100 mb-4">
                      <div className="flex flex-wrap gap-2 items-center justify-between">
                        
                        {/* Custom Image 1 */}
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

                        {/* Custom Image 2 */}
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

                        {/* Notes Section */}
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

                    {/* --- Remove Button --- */}
                    <button
                      onClick={() => removeCoin(uc.id)}
                      className="w-full bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800 text-xs font-bold py-2 rounded transition"
                    >
                      Remove from Binder
                    </button>
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