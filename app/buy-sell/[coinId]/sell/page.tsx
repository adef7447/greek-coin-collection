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

  // Form states
  const [image1, setImage1] = useState("");
  const [image2, setImage2] = useState("");
  const [image3, setImage3] = useState("");
  const [image4, setImage4] = useState("");

  const [graded, setGraded] = useState("raw"); // "ngc/pcgs graded", "raw", "other graded"
  const [isProblem, setIsProblem] = useState(false);

  // Problem Checkboxes state
  const [problems, setProblems] = useState({
    damaged: false,
    bent: false,
    cleaned: false,
    environmental: false,
    holed: false,
  });

  // Condition dropdown (Shown if 'raw' is selected OR any 'problem' is active)
  const [condition, setCondition] = useState("VF");

  // Numeric Grade state (1-70, shown if NOT raw AND NOT a problem)
  const [numericGrade, setNumericGrade] = useState<number>(60);

  // Specific numeric coin attributes
  const [color, setColor] = useState("none"); // none, Brown, Red-Brown, Red
  const [designation, setDesignation] = useState("none"); // none, proof like, deep mirror proof like, proof, cameo, deep cameo
  const [gradeSuffix, setGradeSuffix] = useState("normal"); // normal, +, *, +*

  // Check if current setup requires the simplified Condition drop-down
  // Condition Dropdown is active if:
  // - Graded equals "raw"
  // - OR "Problem" checkbox is checked (as problem coins typically receive details grades)
  const showConditionDropdown = graded === "raw" || isProblem;

  async function fetchCoinData() {
    if (!coinId) return;

    // Direct auth protection: force user to have perm >= 10
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

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
      console.error(error);
    } else {
      setCoin(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchCoinData();
  }, [coinId]);

  const handleProblemCheckboxChange = (key: keyof typeof problems) => {
    setProblems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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
        <div className="flex justify-between items-center mb-8">
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
            ← Back
          </Link>
        </div>

        {/* Dynamic Listing Form Container */}
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

            {/* Rendered Problems Checkbox List */}
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

          {/* 4. Grade Metrics Logic Selection */}
          <div className="p-4 bg-blue-50/30 rounded-lg border border-blue-100">
            {showConditionDropdown ? (
              /* If coin is RAW or has a PROBLEM: Render raw grade dropdown */
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
              /* If coin is slabbed/graded and clean: Render strict numerical input parameters */
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

          {/* 5. Save Button (Functional placeholder) */}
          <button
            type="button"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg shadow transition duration-200 mt-4 text-center cursor-not-allowed opacity-80"
            onClick={() => {
              alert("Awesome setup! This listing configuration is validated. Saving logic database integration is coming next!");
            }}
          >
            Save Coin Listing
          </button>

        </div>
      </div>
    </main>
  );
}