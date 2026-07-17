"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

export default function ListingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const coinId = params.coinId;
  const listingId = params.listingId;

  const [coin, setCoin] = useState<any>(null);
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  async function fetchListingDetails() {
    if (!listingId || !coinId) return;

    // 1. Get current logged in user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }

    // 2. Fetch listing details from public.coin_listings
    const { data: listingData, error: listingErr } = await supabase
      .from("coin_listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (listingErr) {
      console.error("Error fetching listing details:", listingErr.message);
    } else {
      setListing(listingData);
      const images = [listingData.image_1, listingData.image_2, listingData.image_3, listingData.image_4].filter(Boolean);
      if (images.length > 0) {
        setActiveImage(images[0]);
      }
    }

    // 3. Fetch parent coin meta
    const { data: coinData } = await supabase
      .from("coins")
      .select("name, year")
      .eq("id", coinId)
      .single();

    if (coinData) {
      setCoin(coinData);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchListingDetails();
  }, [listingId, coinId]);

  // Action: Mark Listing as Sold
  async function handleMarkAsSold() {
    if (!listing) return;
    
    const { error } = await supabase
      .from("coin_listings")
      .update({ status: "sold" })
      .eq("id", listing.id);

    if (error) {
      alert(`Error setting status: ${error.message}`);
    } else {
      setListing({ ...listing, status: "sold" });
    }
  }

  // Action: Delete Listing
  async function handleDeleteListing() {
    if (!listing) return;

    const confirmDelete = confirm("Are you sure you want to delete this listing permanently?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("coin_listings")
      .delete()
      .eq("id", listing.id);

    if (error) {
      alert(`Error deleting listing: ${error.message}`);
    } else {
      alert("Listing permanently deleted.");
      router.push(`/buy-sell/${coinId}`);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-blue-50 text-black">
        <p className="text-xl font-semibold">Loading listing details...</p>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="min-h-screen p-8 bg-blue-50 text-black text-center">
        <h1 className="text-2xl font-bold text-red-600">Listing Not Found</h1>
        <p className="mt-2 text-gray-600">The listing might have been removed or does not exist.</p>
        <Link href={`/buy-sell/${coinId}`} className="text-blue-600 underline mt-4 inline-block">
          ← Back to Coin Portal
        </Link>
      </main>
    );
  }

  const allImages = [listing.image_1, listing.image_2, listing.image_3, listing.image_4].filter(Boolean);
  const isOwner = currentUserId === listing.seller_id;
  const isSold = listing.status === "sold";

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {coin ? `${coin.name} (${coin.year})` : "Coin Detail View"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Listing Archive Record</p>
          </div>
          <Link
            href={`/buy-sell/${coinId}`}
            className="text-blue-600 font-semibold underline hover:text-blue-800 transition"
          >
            ← Back to Listings
          </Link>
        </div>

        {/* Display Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Image Showcase */}
          <div className="space-y-4">
            {activeImage ? (
              <div className="bg-white rounded-lg shadow border p-2">
                <div className="relative aspect-square w-full rounded overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeImage}
                    alt="Active Showcase View"
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/400?text=Failed+to+load+image";
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow border p-12 text-center text-gray-400">
                <div className="text-5xl mb-2">📷</div>
                <p className="text-sm">No images provided for this listing</p>
              </div>
            )}

            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`aspect-square rounded border overflow-hidden p-0.5 bg-white transition ${
                      activeImage === img ? "ring-2 ring-green-500 border-transparent" : "opacity-75 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`Thumbnail ${idx + 1}`} className="object-cover w-full h-full" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details Card */}
          <div className="bg-white rounded-lg shadow border p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Dynamic Price Display (Turns Red when Sold) */}
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Asking Price</span>
                <span className={`text-3xl font-black transition-colors duration-200 ${
                  isSold ? "text-red-600 line-through decoration-2" : "text-green-700"
                }`}>
                  €{parseFloat(listing.price).toFixed(2)} {isSold && "(SOLD)"}
                </span>
              </div>

              {/* Grading Details */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Grading Details</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Grading Status</p>
                    <p className="font-semibold text-gray-800 capitalize">{listing.graded}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Condition/Grade</p>
                    <p className="font-semibold text-gray-800">
                      {listing.graded !== "raw" && !listing.is_problem
                        ? `${listing.numeric_grade}${listing.grade_suffix !== "normal" ? ` ${listing.grade_suffix}` : ""}`
                        : listing.condition || "Details"}
                    </p>
                  </div>

                  {listing.is_problem ? (
                    <div className="col-span-2 bg-red-50 border border-red-100 rounded p-2.5">
                      <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Problem Characteristics</p>
                      <p className="text-sm font-semibold text-red-900 capitalize mt-1">
                        {Object.entries(listing.problems || {})
                          .filter(([_, value]) => value)
                          .map(([key]) => key)
                          .join(", ") || "No specific damage marked"}
                      </p>
                    </div>
                  ) : (
                    <>
                      {listing.color && listing.color !== "none" && (
                        <div>
                          <p className="text-gray-500">Color Designation</p>
                          <p className="font-semibold text-gray-800">{listing.color}</p>
                        </div>
                      )}
                      {listing.designation && listing.designation !== "none" && (
                        <div>
                          <p className="text-gray-500">Strike Character</p>
                          <p className="font-semibold text-gray-800 capitalize">{listing.designation}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Seller Notes */}
              {listing.notes && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Seller Notes</h3>
                  <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded border">
                    {listing.notes}
                  </p>
                </div>
              )}

              {/* Contact Information */}
              <div className="border-t pt-4 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">How to Buy</h3>
                  <p className="text-sm text-gray-800">
                    {listing.communication ? (
                      <span>Contact via: <strong className="text-blue-700">{listing.communication}</strong></span>
                    ) : (
                      <span className="italic text-gray-500">No contact method provided.</span>
                    )}
                  </p>
                </div>

                {listing.proxy_listing && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 font-semibold">
                    ⚠️ This listing is posted on behalf of another collector (Proxy Listing).
                  </div>
                )}
              </div>
            </div>

            {/* Seller Action Control Panel (Only if listing owner matches seller_id) */}
            {isOwner && (
              <div className="border-t pt-6 mt-auto space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Listing Management</p>
                <div className="grid grid-cols-2 gap-4">
                  {!isSold ? (
                    <button
                      onClick={handleMarkAsSold}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded text-sm shadow transition duration-150"
                    >
                      Mark as Sold
                    </button>
                  ) : (
                    <div className="bg-red-50 border border-red-200 text-red-700 font-bold py-2 px-4 rounded text-xs text-center flex items-center justify-center">
                      ✓ Marked as Sold
                    </div>
                  )}
                  <button
                    onClick={handleDeleteListing}
                    className="border border-red-500 text-red-500 hover:bg-red-50 font-bold py-2.5 px-4 rounded text-sm transition duration-150"
                  >
                    Delete Listing
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </main>
  );
}