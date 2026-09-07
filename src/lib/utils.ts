import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind classes and handles conditional classnames cleanly.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number with commas and compact notation if requested.
 */
export function formatNumber(
  value: number,
  options?: { compact?: boolean; currency?: boolean; decimals?: number }
): string {
  if (options?.compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: options.decimals ?? 1,
    }).format(value);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: options?.decimals ?? 2,
    minimumFractionDigits: options?.decimals ?? 0,
  }).format(value);
}

/**
 * Format token amounts (integers with nice comma separation).
 */
export function formatTokens(amount: number): string {
  return new Intl.NumberFormat("en-US").format(Math.floor(amount));
}
