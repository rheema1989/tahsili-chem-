"use client";

import React from "react";
import type { BadgeDef } from "@/lib/chem-utils";

export function BadgeIcon({
  type,
  className = "w-12 h-12",
}: {
  type: BadgeDef["icon"];
  className?: string;
}) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      {type === "star" && (
        <path
          d="M32 6l7.6 16.4 17.9 2.1-13.2 12.3 3.5 17.7L32 45.6 16.2 54.5l3.5-17.7L6.5 24.5l17.9-2.1z"
          fill="#F5B83D"
        />
      )}
      {type === "flame" && (
        <>
          <path
            d="M33 6c4 10 15 15 15 30a16 16 0 0 1-32 0c0-8 4-13 8-17 0 6 3 9 6 9-3-9 0-16 3-22z"
            fill="#F4845F"
          />
          <path
            d="M32 34c3 4 7 6 7 11a7 7 0 0 1-14 0c0-4 3-7 7-11z"
            fill="#F5B83D"
          />
        </>
      )}
      {type === "bolt" && (
        <path d="M36 4L12 36h16l-4 24 26-34H34z" fill="#3AAFA9" />
      )}
      {type === "book" && (
        <>
          <path
            d="M8 12h20a6 6 0 0 1 4 2 6 6 0 0 1 4-2h20v40H36a6 6 0 0 0-4 2 6 6 0 0 0-4-2H8z"
            fill="#0B4F6C"
          />
          <path d="M32 16v36" stroke="#fff" strokeWidth="2" />
        </>
      )}
      {type === "flask" && (
        <>
          <path
            d="M24 6h16v4h-3v14l15 26a5 5 0 0 1-4 8H16a5 5 0 0 1-4-8l15-26V10h-3z"
            fill="#3AAFA9"
          />
          <path d="M17 44h30l4 8H13z" fill="#F4845F" />
        </>
      )}
      {type === "crown" && (
        <>
          <path
            d="M8 46l4-28 12 12 8-18 8 18 12-12 4 28z"
            fill="#F5B83D"
          />
          <rect x="8" y="48" width="48" height="7" rx="2" fill="#C9623F" />
        </>
      )}
      {type === "cal" && (
        <>
          <rect x="8" y="12" width="48" height="44" rx="6" fill="#0B4F6C" />
          <rect x="8" y="12" width="48" height="12" rx="6" fill="#F4845F" />
          <path
            d="M20 38l8 8 16-16"
            stroke="#fff"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
      {type === "medal" && (
        <>
          <path
            d="M20 4h10l4 16h-10zM44 4H34l-4 16h10z"
            fill="#F4845F"
          />
          <circle cx="32" cy="40" r="18" fill="#F5B83D" />
          <circle cx="32" cy="40" r="11" fill="#FFE29A" />
        </>
      )}
    </svg>
  );
}
