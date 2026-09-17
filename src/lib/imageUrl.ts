import images from "../data/cloudinary-images.json";

/** Maps historical local image paths to their versioned Cloudinary asset. */
export function imageUrl(path: string): string {
  return (images as Record<string, string>)[path] ?? path;
}
