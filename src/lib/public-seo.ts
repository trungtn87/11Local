import type { Metadata } from "next";
import type { PublishedPlaceDetail } from "@/lib/public-place-detail";

const DEFAULT_ORIGIN = "https://one1local-web.onrender.com";

/** Fixed, deployment-configured origin, never derived from user Host headers. */
export function publicSiteOrigin(): string {
  const candidate = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_ORIGIN;
  try {
    const url = new URL(candidate);
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
      return DEFAULT_ORIGIN;
    }
    if (url.username || url.password) return DEFAULT_ORIGIN;
    return url.origin;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

export function absolutePublicUrl(path: string) {
  return new URL(path, publicSiteOrigin()).toString();
}

export function approvedPlaceImage(place: PublishedPlaceDetail): string | null {
  const id = place.photos?.[0]?.id;
  return id ? absolutePublicUrl("/api/place-photos/" + encodeURIComponent(id)) : null;
}

export function placeDescription(place: PublishedPlaceDetail): string {
  const text = (place.summary || place.description || 
    `Khám phá ${place.name} tại Cao Bằng cùng 11Local.`).replace(/\s+/g, " ").trim();
  return text.length > 160 ? text.slice(0, 157).trimEnd() + "…" : text;
}

export function placeMetadata(place: PublishedPlaceDetail): Metadata {
  const title = `${place.name} | 11Local Cao Bằng`;
  const description = placeDescription(place);
  const canonical = absolutePublicUrl("/dia-diem/" + encodeURIComponent(place.slug));
  const image = approvedPlaceImage(place);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      siteName: "11Local",
      title,
      description,
      url: canonical,
      ...(image ? { images: [{ url: image, alt: `Ảnh ${place.name}` }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title, description,
      ...(image ? { images: [image] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

export function placeStructuredData(place: PublishedPlaceDetail) {
  const count = Number(place.rating_count) || 0;
  const avg = Number(place.rating_avg);
  const lat = Number(place.latitude);
  const lng = Number(place.longitude);
  const image = approvedPlaceImage(place);
  const type = place.place_kind === "business" ? "LocalBusiness"
    : place.place_kind === "attraction" ? "TouristAttraction" : "Place";

  return {
    "@context": "https://schema.org",
    "@type": type,
    name: place.name,
    description: placeDescription(place),
    url: absolutePublicUrl("/dia-diem/" + encodeURIComponent(place.slug)),
    ...(image ? { image } : {}),
    address: {
      "@type": "PostalAddress",
      ...(place.address ? { streetAddress: place.address } : {}),
      ...(place.area ? { addressLocality: place.area } : {}),
      addressRegion: "Cao Bằng",
      addressCountry: "VN",
    },
    ...(Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
         Number.isFinite(lng) && lng >= -180 && lng <= 180
      ? { geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng } } : {}),
    ...(count > 0 && Number.isFinite(avg) && avg >= 1 && avg <= 5
      ? { aggregateRating: {
          "@type": "AggregateRating", ratingValue: avg, ratingCount: count,
          bestRating: 5, worstRating: 1,
        } } : {}),
    ...(place.phone ? { telephone: place.phone } : {}),
  };
}

/** Prevent contributor-controlled text from terminating a JSON-LD script. */
export function safeJsonLd(input: object): string {
  return JSON.stringify(input).replace(/</g, "\\u003c");
}
