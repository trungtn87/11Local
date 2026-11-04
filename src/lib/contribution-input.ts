export type NewPlaceContribution = {
  name: string;
  categoryId: string;
  address: string;
  area: string;
  latitude: number;
  longitude: number;
  description: string;
  phone: string;
  openingHours: string;
  contactPhone: string;
  acknowledgeDuplicate: boolean;
};

export function normalizeContributionName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseNewPlaceContribution(raw: unknown): NewPlaceContribution {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("INVALID_INPUT");
  const value = raw as Record<string, unknown>;
  function field(key: string, max: number, required = false) {
    const text = typeof value[key] === "string" ? (value[key] as string).trim() : "";
    if (required && !text) throw new Error(key.toUpperCase() + "_REQUIRED");
    if (text.length > max) throw new Error(key.toUpperCase() + "_TOO_LONG");
    return text;
  }
  const name = field("name", 160, true);
  const categoryId = field("categoryId", 64, true);
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(categoryId)) throw new Error("INVALID_CATEGORY");
  const address = field("address", 500, true);
  const area = field("area", 120, true);
  const latitude = value.latitude;
  const longitude = value.longitude;
  if (typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90)
    throw new Error("INVALID_LATITUDE");
  if (typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180)
    throw new Error("INVALID_LONGITUDE");
  const phone = field("phone", 40);
  const contactPhone = field("contactPhone", 40);
  if (phone && !/^[+\d().\s-]{6,40}$/.test(phone)) throw new Error("INVALID_PHONE");
  if (contactPhone && !/^[+\d().\s-]{6,40}$/.test(contactPhone)) throw new Error("INVALID_CONTACT_PHONE");
  return {
    name, categoryId, address, area,
    latitude, longitude, phone, contactPhone,
    description: field("description", 3000),
    openingHours: field("openingHours", 300),
    acknowledgeDuplicate: value.acknowledgeDuplicate === true,
  };
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = (n: number) => n * Math.PI / 180;
  const deltaLat = rad(lat2 - lat1);
  const deltaLng = rad(lng2 - lng1);
  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isPossibleDuplicate(
  name: string, lat: number, lng: number,
  candidateName: string, candidateLat: number, candidateLng: number,
) {
  const a = normalizeContributionName(name), b = normalizeContributionName(candidateName);
  if (!a || !b) return false;
  const distance = distanceMeters(lat, lng, candidateLat, candidateLng);
  return (a === b && distance < 500) ||
    (a.length >= 6 && b.length >= 6 && (a.includes(b) || b.includes(a)) && distance < 100);
}
