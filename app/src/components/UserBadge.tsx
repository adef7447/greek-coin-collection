"use client";

import React from "react";

// Types matching your exact permission levels
export const PERM_MAP: Record<number, { title: string; color: string }> = {
  0: { title: "Punished", color: "text-red-500 bg-red-50 border-red-200" },
  1: { title: "Member", color: "text-gray-500 bg-gray-50 border-gray-200" },
  10: { title: "Unofficial Seller", color: "text-green-600 bg-green-50 border-green-200" },
  20: { title: "Official Member", color: "text-blue-600 bg-blue-50 border-blue-200" },
  30: { title: "Verified Member", color: "text-slate-700 bg-slate-100 border-slate-300" },
  40: { title: "Official Seller", color: "text-emerald-700 bg-emerald-50 border-emerald-300" },
  50: { title: "Verified Seller", color: "text-cyan-700 bg-cyan-50 border-cyan-300" },
  100: { title: "Assistant Mod", color: "text-amber-700 bg-amber-50 border-amber-300" },
  110: { title: "Mod", color: "text-orange-700 bg-orange-50 border-orange-300" },
  150: { title: "Senior Mod", color: "text-purple-700 bg-purple-50 border-purple-300" },
  200: { title: "Admin", color: "text-indigo-700 bg-indigo-50 border-indigo-300" },
  1000: { title: "Owner", color: "text-rose-700 bg-rose-50 border-rose-300" },
};

// Helper function to get closest matching role fallback in case of custom intermediate numbers
export function getRoleDetails(perms: number) {
  const levels = Object.keys(PERM_MAP)
    .map(Number)
    .sort((a, b) => b - a); // sort descending
  
  for (const level of levels) {
    if (perms >= level) {
      return { level, ...PERM_MAP[level] };
    }
  }
  return { level: 1, title: "Member", color: "text-gray-500 bg-gray-50 border-gray-200" };
}

interface UserBadgeProps {
  perms: number;
  showTitle?: boolean;
}

export default function UserBadge({ perms, showTitle = true }: UserBadgeProps) {
  const role = getRoleDetails(perms);

  // SVG for the Grey Checkmark (Level 30 - Verified Member)
  const GreyCheck = () => (
    <svg
      className="w-4.5 h-4.5 inline text-slate-400 fill-current ml-1 flex-shrink-0"
      viewBox="0 0 24 24"
    >
      <title>Verified Member</title>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );

  // SVG for the Blue Checkmark (Level 50+ - Verified Seller and Staff)
  const BlueCheck = () => (
    <svg
      className="w-4.5 h-4.5 inline text-blue-500 fill-current ml-1 flex-shrink-0"
      viewBox="0 0 24 24"
    >
      <title>Verified Seller</title>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );

  return (
    <span className="inline-flex items-center gap-1">
      {/* 1. Title Badge wrapper */}
      {showTitle && (
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${role.color}`}>
          {role.title}
        </span>
      )}

      {/* 2. Checkmark Logic */}
      {role.level === 30 && <GreyCheck />}
      {role.level >= 50 && <BlueCheck />}
    </span>
  );
}