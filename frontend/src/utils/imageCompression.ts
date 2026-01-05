import imageCompression from "browser-image-compression";

/**
 * Compression options for different use cases.
 * These settings prioritize visual quality while reducing file size.
 */
const COMPRESSION_OPTIONS = {
  // For uploads: Max 1.5MB, maintains high quality
  upload: {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 2400, // Preserves detail for full-size viewing
    useWebWorker: true,
    initialQuality: 0.9, // 90% quality - visually lossless
  },
} as const;

/**
 * Compresses an image file before upload.
 * 
 * - Reduces file size significantly (typically 60-80% smaller)
 * - Maintains visual quality (90% quality setting)
 * - Preserves reasonable resolution (max 2400px)
 * - Uses Web Worker to avoid blocking UI
 * 
 * @param file - The original image file
 * @returns Compressed image file
 */
export async function compressImageForUpload(file: File): Promise<File> {
  // Skip compression for small files (< 500KB) or non-images
  if (file.size < 500 * 1024 || !file.type.startsWith("image/")) {
    return file;
  }

  try {
    const compressedBlob = await imageCompression(file, COMPRESSION_OPTIONS.upload);
    
    // Convert blob back to File with original name
    const compressedFile = new File([compressedBlob], file.name, {
      type: compressedBlob.type,
      lastModified: Date.now(),
    });

    // Log compression results in development
    if (import.meta.env.DEV) {
      const originalMB = (file.size / (1024 * 1024)).toFixed(2);
      const compressedMB = (compressedFile.size / (1024 * 1024)).toFixed(2);
      const savings = (((file.size - compressedFile.size) / file.size) * 100).toFixed(0);
      console.log(
        `🗜️ Compressed: ${originalMB}MB → ${compressedMB}MB (${savings}% smaller)`
      );
    }

    return compressedFile;
  } catch (error) {
    // If compression fails, return original file
    console.warn("Image compression failed, using original:", error);
    return file;
  }
}

/**
 * Compresses multiple images in parallel.
 * 
 * @param files - Array of image files
 * @returns Array of compressed files
 */
export async function compressImagesForUpload(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImageForUpload));
}

