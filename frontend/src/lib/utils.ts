import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert image title to URL-friendly slug
 * Similar to Unsplash format: "office-space-with-flag-and-plants"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with hyphens
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 100 characters
    .substring(0, 100);
}

/**
 * Generate image slug with short ID (like Unsplash)
 * Format: "title-slug-{shortId}"
 */
export function generateImageSlug(imageTitle: string, imageId: string): string {
  const slug = slugify(imageTitle);
  // Use last 12 characters of ID as short identifier (like Unsplash)
  const shortId = imageId.slice(-12);
  return `${slug}-${shortId}`;
}

/**
 * Extract image ID from slug
 * Format: "title-slug-{shortId}" -> returns the shortId part
 */
export function extractIdFromSlug(slug: string): string {
  // Extract the last part after the last hyphen (the short ID)
  const parts = slug.split('-');
  return parts[parts.length - 1] || '';
}