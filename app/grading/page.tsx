"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const NUMERIC_GRADES = [
  1, 2, 3, 4, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 53, 55, 58, 60,
  61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
];

const DETAILS_GRADE_MAP: Record<string, number> = {
  P: 1,
  FR: 2,
  AG: 3,
  G: 4,
  VG: 8,
  F: 12,
  VF: 20,
  XF: 40,
  AU: 50,
  UNC: 60,
};

const STRIKE_MAP: Record<string, number> = {
  Normal: 10,
  "Proof-like": 20,
  "Deep Mirror Proof-like": 30,
  Proof: 50,
  "Proof Cameo": 60,
  "Deep Mirror Proof Cameo": 80,
};

const STRIKE_OPTIONS = Object.keys(STRIKE_MAP);
const COLOR_OPTIONS = ["Normal/BN", "RB", "RD"];
const DESIGNATION_OPTIONS = ["None", "+", "*", "+*"];
const DETAILS_GRADES = Object.keys(DETAILS_GRADE_MAP);
const CLEANING_OPTIONS = ["None", "Cleaned", "Harshly Cleaned"];
const POLISHING_OPTIONS = ["None", "Polished", "Harshly Polished"];
const ENVIRONMENTAL_OPTIONS = [
  "None",
  "Environmental Damage",
  "Heavy Environmental Damage",
];

interface CoinPhoto {
  id: number;
  coin_id: number;
  obverse_url: string;
  reverse_url: string | null;
  condition_score: number;
  total_grader_weight: number;
  beauty_score: number;
  color_score: number;
  proof_score: number;
  cleaning: number;
  polishing: number;
  environmental_damage: number;
  holed: number;
  bent: number;
  damaged: number;
  altered: number;
}

export default function GradingPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [currentPhoto, setCurrentPhoto] = useState<CoinPhoto | null>(null);
  const [userGraderWeight, setUserGraderWeight] = useState<number>(1);

  // Grade mode state
  const [isDetailsGrade, setIsDetailsGrade] = useState(false);

  // Standard Numeric Grade States
  const [numericGrade, setNumericGrade] = useState<number>(60);
  const [strikeType, setStrikeType] = useState("Normal");
  const [colorType, setColorType] = useState("Normal/BN");
  const [designation, setDesignation] = useState("None");

  // Details Grade States
  const [detailsGrade, setDetailsGrade] = useState("VF");
  const [cleaning, setCleaning] = useState("None");
  const [polishing, setPolishing] = useState("None");
  const [environmental, setEnvironmental] = useState("None");

  // Physical Damage Checkboxes
  const [holed, setHoled] = useState(false);
  const [bent, setBent] = useState(false);
  const [exJewelry, setExJewelry] = useState(false);
  const [damaged, setDamaged] = useState(false);
  const [altered, setAltered] = useState(false);

  // Fetch logged-in user profile & grader_weight
  useEffect(() => {
    async function fetchUserProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("grader_weight")
          .eq("id", user.id)
          .single();

        if (profile?.grader_weight) {
          setUserGraderWeight(profile.grader_weight);
        }
      }
    }
    fetchUserProfile();
  }, []);

  // Fetch a random photo entry from coin_photos
  async function fetchRandomPhoto() {
    setLoading(true);
    setSubmitSuccess(null);

    const { count, error: countError } = await supabase
      .from("coin_photos")
      .select("*", { count: "exact", head: true });

    if (countError || count === null || count === 0) {
      console.error("No coin photos found or query failed:", countError);
      setCurrentPhoto(null);
      setLoading(false);
      return;
    }

    const randomIndex = Math.floor(Math.random() * count);

    const { data, error } = await supabase
      .from("coin_photos")
      .select("*")
      .range(randomIndex, randomIndex)
      .single();

    if (error) {
      console.error("Error fetching random coin photo:", error);
    } else {
      setCurrentPhoto(data as CoinPhoto);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchRandomPhoto();
  }, []);

  // Recalculate scores and submit
  async function handleSubmitGrade() {
    if (!currentPhoto) return;

    setSubmitting(true);
    setSubmitSuccess(null);

    const oldTotalWeight = currentPhoto.total_grader_weight || 0;
    const newTotalWeight = oldTotalWeight + userGraderWeight;

    // 1. Calculate Score Given by User for Condition
    let userConditionScore = 0;

    if (isDetailsGrade) {
      userConditionScore = DETAILS_GRADE_MAP[detailsGrade] || 20;
    } else {
      let effectiveGrade = numericGrade;
      const hasPlus = designation === "+" || designation === "+*";

      if (hasPlus && numericGrade < 70) {
        const currentIndex = NUMERIC_GRADES.indexOf(numericGrade);
        if (currentIndex !== -1 && currentIndex < NUMERIC_GRADES.length - 1) {
          const nextGrade = NUMERIC_GRADES[currentIndex + 1];
          effectiveGrade = numericGrade + (nextGrade - numericGrade) * 0.5;
        }
      }
      userConditionScore = effectiveGrade;
    }

    // Weighted Recalculation for Condition Score
    const newConditionScore =
      (currentPhoto.condition_score * oldTotalWeight +
        userConditionScore * userGraderWeight) /
      newTotalWeight;

    // Object to accumulate updates
    const updates: Partial<CoinPhoto> = {
      condition_score: newConditionScore,
      total_grader_weight: newTotalWeight,
    };

    if (!isDetailsGrade) {
      // 2. Strike / Proof Score
      const userProofScore = STRIKE_MAP[strikeType] || 10;
      updates.proof_score =
        (currentPhoto.proof_score * oldTotalWeight +
          userProofScore * userGraderWeight) /
        newTotalWeight;

      // 3. Beauty Score (* or +*)
      const hasStar = designation === "*" || designation === "+*";
      updates.beauty_score =
        currentPhoto.beauty_score +
        (hasStar ? userGraderWeight : -userGraderWeight);

      // 4. Color Score
      if (colorType === "RB") {
        updates.color_score = currentPhoto.color_score + userGraderWeight;
      } else if (colorType === "RD") {
        updates.color_score = currentPhoto.color_score + 2 * userGraderWeight;
      } else {
        // Normal/BN
        updates.color_score = currentPhoto.color_score - userGraderWeight;
      }
    } else {
      // 5. Details Grade Damages
      // Cleaning
      if (cleaning === "None") {
        updates.cleaning = currentPhoto.cleaning - userGraderWeight;
      } else if (cleaning === "Cleaned") {
        updates.cleaning = currentPhoto.cleaning + userGraderWeight;
      } else if (cleaning === "Harshly Cleaned") {
        updates.cleaning = currentPhoto.cleaning + 2 * userGraderWeight;
      }

      // Polishing
      if (polishing === "None") {
        updates.polishing = currentPhoto.polishing - userGraderWeight;
      } else if (polishing === "Polished") {
        updates.polishing = currentPhoto.polishing + userGraderWeight;
      } else if (polishing === "Harshly Polished") {
        updates.polishing = currentPhoto.polishing + 2 * userGraderWeight;
      }

      // Environmental Damage
      if (environmental === "None") {
        updates.environmental_damage =
          currentPhoto.environmental_damage - userGraderWeight;
      } else if (environmental === "Environmental Damage") {
        updates.environmental_damage =
          currentPhoto.environmental_damage + userGraderWeight;
      } else if (environmental === "Heavy Environmental Damage") {
        updates.environmental_damage =
          currentPhoto.environmental_damage + 2 * userGraderWeight;
      }

      // Checkboxes (holed, bent, damaged, altered)
      updates.holed =
        currentPhoto.holed + (holed ? userGraderWeight : -userGraderWeight);
      updates.bent =
        currentPhoto.bent + (bent ? userGraderWeight : -userGraderWeight);
      updates.damaged =
        currentPhoto.damaged +
        (damaged || exJewelry ? userGraderWeight : -userGraderWeight);
      updates.altered =
        currentPhoto.altered + (altered ? userGraderWeight : -userGraderWeight);
    }

    // Save to Supabase
    const { error } = await supabase
      .from("coin_photos")
      .update(updates)
      .eq("id", currentPhoto.id);

    setSubmitting(false);

    if (error) {
      console.error("Error submitting grade:", error);
      alert("Failed to submit grade. Please try again.");
    } else {
      setSubmitSuccess("Grade submitted and scores recalculated successfully!");
      setTimeout(() => {
        fetchRandomPhoto();
      }, 1500);
    }
  }

  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Coin Grading Assistant</h1>
            <p className="text-gray-600 mt-1">
              Evaluating photo #{currentPhoto ? currentPhoto.id : "..."} | Your
              Grader Weight:{" "}
              <span className="font-semibold text-blue-700">
                {userGraderWeight}
              </span>
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={fetchRandomPhoto}
              disabled={loading || submitting}
              className="bg-blue-600 text-white font-semibold px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Loading..." : "🔀 Skip / Random"}
            </button>
            <Link
              href="/"
              className="text-blue-600 font-semibold underline hover:text-blue-800"
            >
              ← Main Collection
            </Link>
          </div>
        </div>

        {submitSuccess && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-800 rounded-lg font-semibold text-center">
            {submitSuccess}
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow border space-y-8">
          {/* TWO BIG SQUARE IMAGE DISPLAY SLOTS */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Coin Image References
            </h2>

            {loading ? (
              <div className="text-center py-12 text-gray-500 font-semibold">
                Fetching random coin photo...
              </div>
            ) : !currentPhoto ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded border">
                No coin photos found in the catalog.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Obverse Image Slot */}
                <div className="flex flex-col items-center">
                  <span className="font-bold text-sm text-gray-700 mb-2">
                    Obverse (Front)
                  </span>
                  <div className="w-full aspect-square border-2 border-gray-200 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 relative">
                    <img
                      src={currentPhoto.obverse_url}
                      alt="Obverse View"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://placehold.co/400?text=Invalid+Obverse+URL";
                      }}
                    />
                  </div>
                </div>

                {/* Reverse Image Slot */}
                <div className="flex flex-col items-center">
                  <span className="font-bold text-sm text-gray-700 mb-2">
                    Reverse (Back)
                  </span>
                  <div className="w-full aspect-square border-2 border-gray-200 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 relative">
                    {currentPhoto.reverse_url ? (
                      <img
                        src={currentPhoto.reverse_url}
                        alt="Reverse View"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/400?text=Invalid+Reverse+URL";
                        }}
                      />
                    ) : (
                      <div className="text-center p-4 text-gray-400">
                        <p className="text-sm font-semibold">
                          No Reverse Image
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <hr className="border-gray-200" />

          {/* DETAILS GRADE CHECKBOX */}
          <div className="flex items-center gap-3 bg-blue-50 p-4 rounded border border-blue-200">
            <input
              type="checkbox"
              id="detailsGrade"
              checked={isDetailsGrade}
              onChange={(e) => setIsDetailsGrade(e.target.checked)}
              className="w-5 h-5 cursor-pointer accent-blue-600"
            />
            <label
              htmlFor="detailsGrade"
              className="font-bold text-lg cursor-pointer text-gray-800"
            >
              Details Grade
            </label>
          </div>

          {/* CONDITIONAL FORM RENDERING */}
          {!isDetailsGrade ? (
            /* STANDARD NUMERIC GRADE OPTIONS */
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800 border-b pb-2">
                Standard Numeric Grading
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Numeric Grade (1-70)
                  </label>
                  <select
                    value={numericGrade}
                    onChange={(e) => setNumericGrade(Number(e.target.value))}
                    className="border p-2.5 w-full rounded bg-white text-gray-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {NUMERIC_GRADES.map((val) => (
                      <option key={val} value={val}>
                        MS/PR-{val} (Grade {val})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Strike Quality
                  </label>
                  <select
                    value={strikeType}
                    onChange={(e) => setStrikeType(e.target.value)}
                    className="border p-2.5 w-full rounded bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {STRIKE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Color / Toning
                  </label>
                  <select
                    value={colorType}
                    onChange={(e) => setColorType(e.target.value)}
                    className="border p-2.5 w-full rounded bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {COLOR_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Designation (+ / *)
                  </label>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="border p-2.5 w-full rounded bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {DESIGNATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            /* DETAILS GRADE OPTIONS */
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-amber-800 border-b pb-2">
                Details Grade Specifications
              </h3>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Details Base Grade
                </label>
                <select
                  value={detailsGrade}
                  onChange={(e) => setDetailsGrade(e.target.value)}
                  className="border p-2.5 w-full rounded bg-white text-gray-800 font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {DETAILS_GRADES.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} Details
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Cleaning
                  </label>
                  <select
                    value={cleaning}
                    onChange={(e) => setCleaning(e.target.value)}
                    className="border p-2.5 w-full rounded bg-white text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {CLEANING_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Polishing
                  </label>
                  <select
                    value={polishing}
                    onChange={(e) => setPolishing(e.target.value)}
                    className="border p-2.5 w-full rounded bg-white text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {POLISHING_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Environmental Damage
                  </label>
                  <select
                    value={environmental}
                    onChange={(e) => setEnvironmental(e.target.value)}
                    className="border p-2.5 w-full rounded bg-white text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {ENVIRONMENTAL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Physical Damage & Defects
                </label>
                <div className="flex flex-wrap gap-6 p-4 bg-gray-50 rounded border">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm">
                    <input
                      type="checkbox"
                      checked={holed}
                      onChange={(e) => setHoled(e.target.checked)}
                      className="w-4 h-4 accent-red-600"
                    />
                    Holed
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm">
                    <input
                      type="checkbox"
                      checked={bent}
                      onChange={(e) => setBent(e.target.checked)}
                      className="w-4 h-4 accent-red-600"
                    />
                    Bent
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm">
                    <input
                      type="checkbox"
                      checked={exJewelry}
                      onChange={(e) => setExJewelry(e.target.checked)}
                      className="w-4 h-4 accent-red-600"
                    />
                    Ex Jewelry
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm">
                    <input
                      type="checkbox"
                      checked={damaged}
                      onChange={(e) => setDamaged(e.target.checked)}
                      className="w-4 h-4 accent-red-600"
                    />
                    Damaged
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm">
                    <input
                      type="checkbox"
                      checked={altered}
                      onChange={(e) => setAltered(e.target.checked)}
                      className="w-4 h-4 accent-red-600"
                    />
                    Altered
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON SECTION */}
          <div className="pt-4 border-t flex justify-end">
            <button
              onClick={handleSubmitGrade}
              disabled={submitting || loading || !currentPhoto}
              className="bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-3 rounded-lg shadow transition disabled:opacity-50"
            >
              {submitting ? "Submitting & Recalculating..." : "Submit Grade"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}