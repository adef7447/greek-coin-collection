"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function SellSpecificCoinPage() {
  const params = useParams();
  const router = useRouter();
  const coinId = params.coinId;

  const [coin, setCoin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form states - Images
  const [image1, setImage1] = useState("");
  const [image2, setImage2] = useState("");
  const [image3, setImage3] = useState("");
  const [image4, setImage4] = useState("");

  // Form states - Coin attributes
  const [graded, setGraded] = useState("raw"); // "ngc/pcgs graded", "raw", "other graded"
  const [isProblem, setIsProblem] = useState(false);

  const [problems, setProblems] = useState({
    damaged: false,
    bent: false,
    cleaned: false,
    environmental: false,
    holed: false,
  });

  const [condition, setCondition] = useState("VF");
  const [numericGrade, setNumericGrade] = useState<number>(60);
  const [color, setColor] = useState("none"); 
  const [designation, setDesignation] = useState("none"); 
  const [gradeSuffix, setGradeSuffix] = useState("normal"); 

  // NEW form fields
  const [notes, setNotes] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [communication, setCommunication] = useState("");
  const [proxyListing, setProxyListing] = useState(false);

  const showConditionDropdown = graded === "raw" || isProblem;

  // Render Image Preview grid
  const imageUrls = [image1, image2, image3, image4].filter((url) => url.trim() !== "");

  async function fetchCoinData() {
    if (!coinId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("perms")
      .eq("id", user.id)
      .single();

    if (!profile || profile.perms < 10) {
      alert("Unauthorized: You need Permission Level 10 or higher to list coins.");
      router.push(`/buy-sell/${coinId}`);
      return;
    }

    const { data, error } = await supabase
      .from("coins")
      .select("name, year")
      .eq("id", coinId)
      .single();

    if (error) {
      console.error("Error retrieving coin parameters:", error);
    } else {
      setCoin(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchCoinData();
  }, [coinId]);

  const handleProblemCheckboxChange = (key: keyof typeof problems) => {
    setProblems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  async function handleSaveListing() {
    if (!userId || !coinId) return;
    
    // Parse and validate price
    const rawPrice = parseFloat(priceInput);
    if (isNaN(rawPrice) || rawPrice < 0 || rawPrice > 100000000) {
      alert("Please enter a valid price between €0.00 and €100,000,000.00");
      return;
    }

    // Round price to nearest 0.01 cent before storing
    const roundedPrice = Math.round(rawPrice * 100) / 100;

    setSubmitting(true);

    // Swap input option UNC to save internally as LU
    const databaseCondition = showConditionDropdown 
      ? (condition === "UNC" ? "LU" : condition) 
      : null;

    const payload = {
      coin_id: parseInt(coinId as string),
      seller_id: userId,
      image_1: image1.trim() || null,
      image_2: image2.trim() || null,
      image_3: image3.trim() || null,
      image_4: image4.trim() || null,
      graded,
      is_problem: isProblem,
      problems: isProblem ? problems : null,
      condition: databaseCondition,
      numeric_grade: showConditionDropdown ? null : numericGrade,
      grade_suffix: showConditionDropdown ? null : gradeSuffix,
      color: showConditionDropdown ? null : color,
      designation: showConditionDropdown ? null : designation,
      notes: notes.trim() || null,
      price: roundedPrice,
      communication: communication.trim() || null,
      proxy_listing: proxyListing
    };

    const { error } = await supabase
      .from("coin_listings")
      .insert([payload]);

    setSubmitting(false);

    if (error) {
      alert(`Error saving listing: ${error.message}`);
      console.error(error);
    } else {
      alert("Listing successfully saved!");
      router.push(`/buy-sell/${coinId}`);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-blue-50 text-black">
        <p className="text-xl font-semibold">Loading listing engine...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">List Coin for Sale</h1>
            <p className="text-sm text-gray-600 mt-1">
              Listing item: <span className="font-semibold text-blue-900">{coin?.name} ({coin?.year})</span>
            </p>
          </div>
          <Link
            href={`/buy-sell/${coinId}`}
            className="text-blue-600 font-semibold underline hover:text-blue-800 transition"
          >
            ← Cancel
          </Link>
        </div>

        {/* Dynamic Photo Preview Strip */}
        {imageUrls.length > 0 && (
          <div className="bg-white rounded-lg shadow border p-4 mb-6">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Live Image Previews</h4>
            <div className="grid grid-cols-4 gap-2">
              {imageUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-square bg-gray-100 rounded border overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Preview ${idx + 1}`}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/150?text=Invalid+Image+URL";
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Listing Form */}
        <div className="bg-white shadow rounded-lg border p-6 space-y-6">
          
          {/* 1. Image URL Inputs */}
          <div>
            <h3 className="text-md font-bold text-gray-800 mb-3 border-b pb-1">1. Photo Links</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">IMAGE 1 URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={image1}
                  onChange={(e) => setImage1(e.target.value)}
                  className="w-full border p-2 rounded text-sm bg-gray-50 focus:ring-1 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">IMAGE 2 URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={image2}
                  onChange={(e) => setImage2(e.target.value)}
                  className="w-full border p-2 rounded text-sm bg-gray-50 focus:ring-1 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">IMAGE 3 URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={image3}
                  onChange={(e) => setImage3(e.target.value)}
                  className="w-full border p-2 rounded text-sm bg-gray-50 focus:ring-1 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">IMAGE 4 URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={image4}
                  onChange={(e) => setImage4(e.target.value)}
                  className="w-full border p-2 rounded text-sm bg-gray-50 focus:ring-1 focus:ring-green-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. Graded Classification */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">2. Grading Authority</label>
            <select
              value={graded}
              onChange={(e) => setGraded(e.target.value)}
              className="w-full border p-2.5 rounded bg-gray-50 text-sm focus:ring-1 focus:ring-green-500 outline-none"
            >
              <option value="ngc/pcgs graded">NGC / PCGS Graded</option>
              <option value="raw">Raw (Ungraded)</option>
              <option value="other graded">Other Graded</option>
            </select>
          </div>

          {/* 3. Problems System */}
          <div className="p-4 bg-red-50/50 rounded-lg border border-red-100">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="problem-coin"
                checked={isProblem}
                onChange={(e) => setIsProblem(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="problem-coin" className="ml-2 text-sm font-bold text-red-900 cursor-pointer select-none">
                This is a problem coin (has cleaning, damage, holes, etc.)
              </label>
            </div>

            <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 transition-opacity duration-200 ${
              isProblem ? "opacity-100" : "opacity-40 pointer-events-none"
            }`}>
              {Object.keys(problems).map((key) => {
                const problemKey = key as keyof typeof problems;
                return (
                  <label key={problemKey} className="flex items-center text-xs text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      disabled={!isProblem}
                      checked={problems[problemKey]}
                      onChange={() => handleProblemCheckboxChange(problemKey)}
                      className="w-3.5 h-3.5 text-red-600 border-gray-300 rounded mr-1.5"
                    />
                    <span className="capitalize">{problemKey}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 4. Grade Metrics */}
          <div className="p-4 bg-blue-50/30 rounded-lg border border-blue-100">
            {showConditionDropdown ? (
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Market Condition (Adjectival Grade)
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full border p-2.5 rounded bg-white text-sm focus:ring-1 focus:ring-green-500 outline-none"
                >
                  <option value="P">P (Poor)</option>
                  <option value="FR">FR (Fair)</option>
                  <option value="AG">AG (About Good)</option>
                  <option value="G">G (Good)</option>
                  <option value="VG">VG (Very Good)</option>
                  <option value="F">F (Fine)</option>
                  <option value="VF">VF (Very Fine)</option>
                  <option value="XF">XF (Extremely Fine)</option>
                  <option value="AU">AU (About Uncirculated)</option>
                  <option value="UNC">UNC (Uncirculated - Saved as LU)</option>
                  <option value="LU">LU (Lustrous Uncirculated)</option>
                  <option value="MU">MU (Mint Uncirculated)</option>
                  <option value="BU">BU (Brilliant Uncirculated)</option>
                  <option value="HU">HU (Highly Uncirculated)</option>
                </select>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      NUMERIC GRADE (1-70)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={70}
                      value={numericGrade}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val >= 1 && val <= 70) {
                          setNumericGrade(val);
                        }
                      }}
                      className="w-full border p-2 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 outline-none font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      GRADE DESIGNATION SUFFIX
                    </label>
                    <select
                      value={gradeSuffix}
                      onChange={(e) => setGradeSuffix(e.target.value)}
                      className="w-full border p-2 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 outline-none"
                    >
                      <option value="normal">Normal</option>
                      <option value="+">+</option>
                      <option value="*">*</option>
                      <option value="+*">+*</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      COLOR DESIGNATION (Copper Coins)
                    </label>
                    <select
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full border p-2 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 outline-none"
                    >
                      <option value="none">None</option>
                      <option value="Brown">Brown</option>
                      <option value="Red-Brown">Red-Brown</option>
                      <option value="Red">Red</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      STRIKE CHARACTERISTICS
                    </label>
                    <select
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full border p-2 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 outline-none"
                    >
                      <option value="none">None</option>
                      <option value="proof like">Proof Like (PL)</option>
                      <option value="deep mirror proof like">Deep Mirror Proof Like (DMPL)</option>
                      <option value="proof">Proof (PR/PF)</option>
                      <option value="cameo">Cameo (CAM)</option>
                      <option value="deep cameo">Deep Cameo (DCAM)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. Additional Information & Pricing Fields */}
          <div className="space-y-4 border-t pt-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Notes</label>
              <textarea
                placeholder="Describe eye appeal, defects, strike characteristics, history..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border p-2.5 rounded bg-gray-50 text-sm focus:ring-1 focus:ring-green-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Price (€)</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">€</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100000000"
                    placeholder="0.00"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="w-full border pl-8 p-2.5 rounded bg-gray-50 text-sm focus:ring-1 focus:ring-green-500 outline-none font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Preferred Communication</label>
                <input
                  type="text"
                  placeholder="Discord, Email, PM, Telegram..."
                  value={communication}
                  onChange={(e) => setCommunication(e.target.value)}
                  className="w-full border p-2.5 rounded bg-gray-50 text-sm focus:ring-1 focus:ring-green-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center p-3 bg-gray-50 rounded-lg border">
              <input
                type="checkbox"
                id="proxy-checkbox"
                checked={proxyListing}
                onChange={(e) => setProxyListing(e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="proxy-checkbox" className="ml-2 text-sm text-gray-700 cursor-pointer select-none font-semibold">
                I am making this listing for someone else
              </label>
            </div>
          </div>

          {/* 6. Save Button */}
          <button
            type="button"
            disabled={submitting}
            onClick={handleSaveListing}
            className={`w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg shadow-md transition duration-200 mt-4 text-center ${
              submitting ? "opacity-50 cursor-wait" : ""
            }`}
          >
            {submitting ? "Saving Listing..." : "Save Coin Listing"}
          </button>

        </div>
      </div>
    </main>
  );
}