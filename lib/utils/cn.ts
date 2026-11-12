import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our own @utility classes in globals.css whose names look like Tailwind colour
// classes. Without their own groups, tailwind-merge treats `text-glow` as a text
// colour and `ring-gradient` as a ring colour, so cn('text-bearish', 'text-glow')
// silently dropped the colour.
const twMerge = extendTailwindMerge<"text-glow" | "ring-gradient">({
  extend: {
    classGroups: {
      "text-glow": ["text-glow"],
      "ring-gradient": ["ring-gradient"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
