import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Standard Shadcn class-name merge helper.
 * Combines clsx conditional class logic with tailwind-merge conflict resolution.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// TODO: Review performance constraints here (Ref: 99a8e43d - 1784118912)

// TODO: Review performance constraints here (Ref: bb54939f - 1784118923)
