"use client";
import { Clock3, ExternalLink, FileText, Globe, ListChecks, Tag } from "lucide-react";
import { safeSocialUrl } from "@/lib/place-social-links";
import {
  formatFact, formatHours, formatPrice, safeUrl,
} from "../../../places/public-place-format";

function Section({ title, icon: Icon, children }) {
  return <section className="local-detail-section">
    <h3><Icon size={16} /> {title}</h3>{children}
  </section>;
}

/** Shared public facts for the map rail and standalone place detail page.
    Every value comes from the approved /api/places/:slug/detail response. */
export function PlaceFactSections({ place }) {
  const opening = Array.isArray(place.opening_slots) ? formatHours(place.opening_slots) : [];
  const prices = Array.isArray(place.prices) ? place.prices : [];
  const details = Array.isArray(place.detail_fields)
    ? place.detail_fields.map(formatFact).filter(Boolean) : [];
  const tags = Array.isArray(place.tags) ? place.tags.filter(tag => typeof tag === "string") : [];
  const website = safeUrl(place.website_url);
  const facebook = safeSocialUrl(place.facebook_url, "facebook");
  const youtube = safeSocialUrl(place.youtube_url, "youtube");
  return <>
    {(opening.length > 0 || place.opening_hours) && <Section title="Giờ hoạt động" icon={Clock3}>
      {opening.length > 0
        ? <ul className="local-place-fact-list">{opening.map(line => <li key={line}>{line}</li>)}</ul>
        : <p>{place.opening_hours}</p>}
      <small>Giờ tham khảo, không phải trạng thái mở cửa trực tiếp.</small>
    </Section>}

    {(prices.length > 0 || place.price_note) && <Section title="Giá tham khảo" icon={Tag}>
      {prices.length > 0
        ? <ul className="local-place-fact-list">{prices.map((price, index) => <li key={index}>
          <strong>{price.label}</strong>{formatPrice(price) && <span>{formatPrice(price)}</span>}
        </li>)}</ul>
        : <p>{place.price_note}</p>}
      <small>Giá có thể thay đổi; nên xác nhận tại địa điểm.</small>
    </Section>}

    {place.description && <Section title="Giới thiệu" icon={FileText}>
      <p className="local-detail-description">{place.description}</p>
    </Section>}

    {details.length > 0 && <Section title="Thông tin tiện ích" icon={ListChecks}>
      <dl className="local-place-facts">
        {details.map((fact,index) => <div key={index}>
          <dt>{fact.label}</dt>
          <dd>{fact.url
            ? <a href={fact.url} target="_blank" rel="noopener noreferrer">Mở liên kết</a>
            : fact.text}</dd>
        </div>)}
      </dl>
    </Section>}

    {tags.length > 0 && <Section title="Đặc điểm" icon={Tag}>
      <div className="local-place-tags">{tags.map((tag,index) => <span key={index}>{tag}</span>)}</div>
    </Section>}

    {(website || facebook || youtube) && <Section title="Liên kết" icon={Globe}>
      <div className="local-place-social-links">
        {website && <a href={website} target="_blank" rel="noopener noreferrer">
          <Globe size={17}/> Website
        </a>}
        {facebook && <a href={facebook} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={17}/> Facebook
        </a>}
        {youtube && <a href={youtube} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={17}/> YouTube
        </a>}
      </div>
    </Section>}
  </>;
}
