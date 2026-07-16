"use client";

import Link from "next/link";

export default function BuySellPage() {
  return (
    <main className="min-h-screen p-8 bg-blue-50 text-black">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Coin Marketplace</h1>
            <p className="text-sm text-gray-600 mt-1">
              Buy and sell historical coins with other collectors.
            </p>
          </div>
          
          <Link 
            href="/" 
            className="text-blue-600 font-semibold underline hover:text-blue-800 transition"
          >
            ← Main Collection
          </Link>
        </div>

        {/* Empty State / Placeholder Container */}
        <div className="bg-white rounded-lg shadow-md border p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-5xl mb-4">⚖️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Marketplace Coming Soon
          </h2>
          <p className="text-gray-500 max-w-md">
            The buy and sell portal is currently empty. This space will soon allow you to list duplicate coins for trade or purchase direct listings from other collectors.
          </p>
        </div>

      </div>
    </main>
  );
}