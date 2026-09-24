export function reservationHref(experience: { id: string; bookingSlug?: string | null }): string {
  const slug = experience.bookingSlug?.trim();
  return slug ? `/${slug}` : `/book/${experience.id}`;
}
