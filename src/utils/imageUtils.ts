/**
 * Image size types for tool images
 */
export type ImageSize = 'thumbnail' | 'medium' | 'original';

/**
 * Get the URL for a specific image size based on the original URL
 * 
 * @param originalUrl - The original image URL
 * @param size - The desired size ('thumbnail', 'medium', 'original')
 * @returns The URL for the requested size, or the original if size variant doesn't exist
 */
export function getImageUrl(originalUrl: string | null | undefined, size: ImageSize = 'original'): string | null {
  if (!originalUrl) return null;
  
  // If requesting original, return as-is
  if (size === 'original') return originalUrl;
  
  // Parse the URL to construct the thumbnail version
  try {
    const url = new URL(originalUrl);
    const pathname = url.pathname;
    
    // Find the last dot for the extension
    const lastDotIndex = pathname.lastIndexOf('.');
    if (lastDotIndex === -1) return originalUrl;
    
    const pathWithoutExt = pathname.substring(0, lastDotIndex);
    const ext = pathname.substring(lastDotIndex);
    
    // Construct the thumbnail path
    const sizedPath = `${pathWithoutExt}_${size}${ext}`;
    url.pathname = sizedPath;
    
    return url.toString();
  } catch {
    return originalUrl;
  }
}

/**
 * Get thumbnail URL for grid/tile display
 */
export function getThumbnailUrl(originalUrl: string | null | undefined): string | null {
  return getImageUrl(originalUrl, 'thumbnail');
}

/**
 * Get medium-sized URL for detail views
 */
export function getMediumUrl(originalUrl: string | null | undefined): string | null {
  return getImageUrl(originalUrl, 'medium');
}
