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
            1. This database exists to help Greek coin collectors catalog, grade, and preserve their collections online and also to compete with others and find the best deals for your collection.
          </p>
          <p>
            2. Because we are a free site with no ads it is impossible for us to store large files so if you want to upload coin images you need to follow a few steps.
          </p>
          <p>
            3. Go to gmail.com and fill your name (doesn't have to be real) and the other info that doesn't have to be real either.
          </p>
          <p>
            4. Click create my own email address and use your dispay name like dispaynamecoinleveling@gmail.com if for some reason this isnt available use dispayname1coinleveling@gmail.com.
          </p>
          <p>
            5. Then create your password that can be the same as in our site or different and then complete your sign up.
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