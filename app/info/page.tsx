"use client";

import Link from "next/link";

export default function InfoPage() {
  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">
      {/* Page Header */}
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">
          Information & Guidelines
        </h1>
        
        {/* Navigation back home */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 underline hover:text-blue-800">
            ← Back to Greek Coin Collection
          </Link>
        </div>

        {/* Info Text Area */}
        <div className="bg-white p-6 rounded shadow space-y-4 text-gray-800 leading-relaxed">
          <p>
            1. This database exists to help Greek coin collectors catalog, grade, and preserve their historical collections online.
          </p>
          <p>
            2. The grading system uses standard numismatic classifications ranging from Poor (P) to Prooflike and Mint State variants.
          </p>
          <p>
            3. Each coin registered inside your personal inventory contributes directly to your profile score based on its rarity value.
          </p>
          <p>
            4. Make sure to accurately report physical damages like bends, holes, or harsh cleaning as it affects your collection logs.
          </p>
          <p>
            5. Unique tier coins require a rarity rating of 70 or higher and will instantly reward you with 100,000 points.
          </p>
          <p>
            6. You can easily view how your collection stacks up against other global collectors by visiting our live leaderboard page.
          </p>
          <p>
            7. The automated achievements engine calculates your unlocked medals and milestones every single time you add a new coin.
          </p>
          <p>
            8. Our smart recommendations algorithm analyzes your existing binder to suggest matching pieces missing from your current sets.
          </p>
          <p>
            9. If you run into issues deleting test accounts from your screen, check that you have enabled cascading foreign key deletes.
          </p>
          <p>
            10. Always double-check historical metadata like ruling authorities and silver fineness ratios before confirming your inventory logs.
          </p>
        </div>
      </div>
    </main>
  );
}