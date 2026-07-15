"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
export default function MyCoinsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userCoins, setUserCoins] = useState<any[]>([]);

  // Local state to manage live editing changes for inputs on each card
  const [editStates, setEditStates] = useState<{
    [userCoinId: number]: { image1: string; image2: string; notes: string };
  }>({});

  async function fetchMyCollection() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Joins the user_coins table to the primary coins table
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
    } else {
      setUserCoins(data || []);
      
      // Initialize editing states from DB values
      const initialStates: typeof editStates = {};
      data?.forEach((item) => {
        initialStates[item.id] = {
          image1: item.image1 || "",
          image2: item.image2 || "",
          notes: item.notes || "",
        };
      });
      setEditStates(initialStates);
    }
    setLoading(false);
  }

  // Updates local input state dynamically as user types
  const handleInputChange = (userCoinId: number, field: "image1" | "image2" | "notes", value: string) => {
    setEditStates((prev) => ({
      ...prev,
      [userCoinId]: {
        ...prev[userCoinId],
        [field]: value,
      },
    }));
  };

  // Push updates to Supabase
  async function saveDetails(userCoinId: number) {
    const { image1, image2, notes } = editStates[userCoinId];

    const { error } = await supabase
      .from("user_coins")
      .update({
        image1: image1.trim(),
        image2: image2.trim(),
        notes: notes.trim(),
      })
      .eq("id", userCoinId);

    if (error) {
      alert("Failed to save changes: " + error.message);
    } else {
      alert("Coin details updated successfully!");
      fetchMyCollection(); // Refresh data
    }
  }

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
              const coin = uc.coins;
              const hasCustomImage = editStates[uc.id]?.image1 || editStates[uc.id]?.image2;

              return (
                <div key={uc.id} className="border p-4 rounded bg-white shadow flex flex-col justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{coin.name}</h2>
                    
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
                      <p><strong>Logged Condition Value:</strong> {uc.condition}</p>
                      <p><strong>Logged Fault Signature:</strong> {uc.damage}</p>
                    </div>
                  </div>

                  {/* --- Micro Input Form Block --- */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
                      
                      {/* Custom Image 1 */}
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-bold mb-0.5">IMG 1 URL</span>
                        <input
                          type="text"
                          placeholder="Link 1"
                          value={editStates[uc.id]?.image1 || ""}
                          onChange={(e) => handleInputChange(uc.id, "image1", e.target.value)}
                          className="border text-xs p-1 rounded bg-gray-50 w-16 focus:w-48 transition-all duration-300 ease-in-out outline-none focus:ring-1 focus:ring-blue-500"
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
                          className="border text-xs p-1 rounded bg-gray-50 w-16 focus:w-48 transition-all duration-300 ease-in-out outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      {/* Notes Section */}
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-bold mb-0.5">Notes</span>
                        <input
                          type="text"
                          placeholder="Your notes..."
                          value={editStates[uc.id]?.notes || ""}
                          onChange={(e) => handleInputChange(uc.id, "notes", e.target.value)}
                          className="border text-xs p-1 rounded bg-gray-50 w-16 focus:w-48 transition-all duration-300 ease-in-out outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                    </div>

                    <button
                      onClick={() => saveDetails(uc.id)}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1.5 rounded transition"
                    >
                      Save Details
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