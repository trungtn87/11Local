import test from "node:test";
import assert from "node:assert/strict";
import {
  absolutePublicUrl, placeDescription, placeMetadata,
  placeStructuredData, publicSiteOrigin, safeJsonLd,
} from "./public-seo.ts";
import type { PublishedPlaceDetail } from "./public-place-detail.ts";

const place = {
  id: "cc000000-0000-4000-8000-000000000001",
  slug: "pac-bo",
  name: "Pác Bó",
  summary: "Di tích lịch sử ở Cao Bằng",
  description: "Miêu tả công khai",
  area: "Hà Quảng",
  address: "Trường Hà, Hà Quảng",
  category_name: "Danh lam",
  place_kind: "attraction",
  latitude: 22.973,
  longitude: 106.0,
  rating_avg: 4.5,
  rating_count: 2,
  photos: [{ id: "cc000000-0000-4000-8000-000000000002", alt: null, caption: null }],
} as PublishedPlaceDetail;

test("canonical and OG use same URL with approved photo", () => {
  const prev = process.env.SITE_URL;
  process.env.SITE_URL = "https://11local.vn/some-extra-path";
  try {
    const meta = placeMetadata(place);
    assert.equal(meta.alternates?.canonical, "https://11local.vn/dia-diem/pac-bo");
    assert.equal(meta.openGraph?.url, "https://11local.vn/dia-diem/pac-bo");
    assert.ok(JSON.stringify(meta.openGraph).includes("/api/place-photos/"));
    assert.equal(publicSiteOrigin(), "https://11local.vn");
  } finally {
    if (prev === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = prev;
  }
});

test("metadata and structured rating never invent unapproved imagery or reviews", () => {
  const unpublishedReviewCount = { ...place, rating_count: 0, photos: [] };
  const metadata = placeMetadata(unpublishedReviewCount);
  assert.equal(metadata.twitter?.card, "summary");
  assert.equal(placeStructuredData(unpublishedReviewCount).aggregateRating, undefined);
  assert.equal(placeStructuredData(unpublishedReviewCount).image, undefined);
  assert.match(placeDescription(unpublishedReviewCount), /Di tích lịch sử/);
});

test("JSON-LD escapes contributor-controlled HTML and canonical rejects unsafe origin", () => {
  const previous = process.env.SITE_URL;
  process.env.SITE_URL = "javascript:evil";
  try {
    assert.equal(absolutePublicUrl("/dia-diem/pac-bo"), "https://11local.vn/dia-diem/pac-bo");
  } finally {
    if (previous === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previous;
  }
  const serialized = safeJsonLd({ description: "</script><script>alert(1)</script>" });
  assert.equal(serialized.includes("</script>"), false);
  assert.ok(serialized.includes(String.raw`\u003c`));
});

test("missing or invalid SITE_URL falls back to canonical 11local.vn, not the old Render domain", () => {
  const previousSite = process.env.SITE_URL;
  const previousPublic = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    for (const candidate of [undefined, "", "not-a-url", "http://example.com", "https://user:pass@example.com"]) {
      if (candidate === undefined) delete process.env.SITE_URL;
      else process.env.SITE_URL = candidate;
      assert.equal(publicSiteOrigin(), "https://11local.vn");
      assert.equal(absolutePublicUrl("/sitemap.xml"), "https://11local.vn/sitemap.xml");
      const meta = placeMetadata(place);
      assert.equal(meta.alternates?.canonical, "https://11local.vn/dia-diem/pac-bo");
      assert.equal(meta.openGraph?.url, "https://11local.vn/dia-diem/pac-bo");
      assert.equal(placeStructuredData(place).url, "https://11local.vn/dia-diem/pac-bo");
      assert.ok(!JSON.stringify(meta).includes("one1local-web.onrender.com"));
    }
    delete process.env.SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://11local.vn/any-path";
    assert.equal(publicSiteOrigin(), "https://11local.vn");
    process.env.SITE_URL = "https://11local.vn/path";
    assert.equal(publicSiteOrigin(), "https://11local.vn");
  } finally {
    if (previousSite === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previousSite;
    if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousPublic;
  }
});
