"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { checkAchievements } from "../lib/checkAchievements";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect to home if they are already logged in
  useEffect(() => {
    async function checkCurrentSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push("/");
      }
    }
    checkCurrentSession();
  }, [router]);

  // Helper to generate a hidden dummy email from the display name
  const generateEmail = (name: string) => {
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    return `${cleanName}@coinapp.internal`;
  };

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!displayName.trim() || !password) {
      setError("Please fill out both fields.");
      setLoading(false);
      return;
    }

    const email = generateEmail(displayName);

    if (isSignUp) {
      // --- SIGN UP ---
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("Account created, please try logging in now.");
        setLoading(false);
        return;
      }

      // Insert profile with default 1 permission level
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: user.id,
            display_name: displayName,
            score: 0,
            perms: 1, // Default user level
          },
        ]);

      if (profileError) {
        setError(profileError.message);
      } else {
        alert("Account created successfully!");
        router.push("/");
      }
    } else {
      // --- LOGIN ---
      const { error: loginError, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError("Invalid display name or password.");
        setLoading(false);
        return;
      }

      if (data?.user) {
        await checkAchievements(data.user.id);
        router.push("/");
      }
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-blue-50 text-black">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md border">
        <h1 className="text-3xl font-bold text-center mb-2">Greek Coin Collection</h1>
        <p className="text-gray-500 text-center mb-6 text-sm">
          {isSignUp ? "Create your account to start collecting" : "Sign in to access your virtual binder"}
        </p>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Display Name</label>
            <input
              className="border p-2.5 w-full bg-white rounded focus:ring-2 focus:ring-blue-500 outline-none"
              type="text"
              placeholder="e.g., Alexander32"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Password</label>
            <input
              className="border p-2.5 w-full bg-white rounded focus:ring-2 focus:ring-blue-500 outline-none"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded transition"
            disabled={loading}
          >
            {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">
            {isSignUp ? "Already have an account?" : "Don't have an account yet?"}{" "}
          </span>
          <button
            onClick={() => {
              setError("");
              setIsSignUp(!isSignUp);
            }}
            className="text-blue-600 font-semibold underline"
          >
            {isSignUp ? "Sign In instead" : "Register now"}
          </button>
        </div>
      </div>
    </main>
  );
}