"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only — for showing a submitted rating (internal reviews page, past-review states). */
export function StarRatingDisplay({ rating, size = "size-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(size, n <= Math.round(rating) ? "fill-warning text-warning" : "text-border-strong")} />
      ))}
    </div>
  );
}

/** Interactive 1-5 picker for the public review form — a hidden `name="rating"` input carries the value into the surrounding <form>. */
export function StarRatingInput({ name = "rating", required }: { name?: string; required?: boolean }) {
  const [value, setValue] = useState(0);
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;

  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name={name} value={value || ""} required={required} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => setValue(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="rounded-sm p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star className={cn("size-8 transition-colors", n <= shown ? "fill-warning text-warning" : "text-border-strong hover:text-warning/60")} />
        </button>
      ))}
    </div>
  );
}
