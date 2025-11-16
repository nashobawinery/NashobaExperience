import type { Product } from "@shared/schema";

export type ProductWithMedia = Product & { 
  media?: Array<{ 
    id: string; 
    mediaId: string; 
    role: string; 
    media: { id: string; filename: string; objectPath: string } 
  }> 
};

export function getPrimaryImageUrl(product: ProductWithMedia): string | null {
  const primaryMedia = product.media?.find(m => m.role === 'primary');
  if (primaryMedia) {
    return `/api/media-library/${primaryMedia.media.id}/file`;
  }
  return product.imageUrl || null;
}

export function getLabelImageUrl(product: ProductWithMedia): string | null {
  const labelMedia = product.media?.find(m => m.role === 'label');
  if (labelMedia) {
    return `/api/media-library/${labelMedia.media.id}/file`;
  }
  return product.labelImageUrl || null;
}

export function getLifestyleImages(product: ProductWithMedia): string[] {
  const lifestyleMedia = product.media?.filter(m => m.role === 'lifestyle') || [];
  return lifestyleMedia.map(m => `/api/media-library/${m.media.id}/file`);
}

export function getGalleryImages(product: ProductWithMedia): string[] {
  const galleryMedia = product.media?.filter(m => m.role === 'gallery') || [];
  return galleryMedia.map(m => `/api/media-library/${m.media.id}/file`);
}

export function getAllProductImages(product: ProductWithMedia): { url: string; role: string }[] {
  const images: { url: string; role: string }[] = [];
  
  const primaryUrl = getPrimaryImageUrl(product);
  if (primaryUrl) images.push({ url: primaryUrl, role: 'primary' });
  
  const labelUrl = getLabelImageUrl(product);
  if (labelUrl) images.push({ url: labelUrl, role: 'label' });
  
  getLifestyleImages(product).forEach(url => images.push({ url, role: 'lifestyle' }));
  getGalleryImages(product).forEach(url => images.push({ url, role: 'gallery' }));
  
  return images;
}
