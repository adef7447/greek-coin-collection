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
            3. Go to gmail.com and create a new email then fill your name (doesn't have to be real) and the other info that doesn't have to be real either.
          </p>
          <p>
            4. Click create my own email address and use your dispay name like dispaynamecoinleveling@gmail.com if for some reason this isnt available use dispayname1coinleveling@gmail.com.
          </p>
          <p>
            5. Then create your password that can be the same as in our site or different and then complete your sign up.
          </p>
          <p>
            6. Then when you have created the email upload your images in the email's drive, click share, then click everyone with the link and copy the link.
          </p>
          <p>
            7. Go to https://sheetany.com/google-drive-image-direct-link-generator paste your link and get the generated link.
          </p>
          <p>
            8. You can upload that as your image.
          </p>
          <p>
            9. For more info and a fun coin community join our discord https://discord.gg/GxA8eyWkuF
          </p>
          <p>
            10. Have fun collecting
          </p>
        </div>
      </div>
    </main>
  );
}