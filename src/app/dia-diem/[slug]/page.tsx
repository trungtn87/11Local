import { MenuView } from "@/components/menu/menu-view";
import { getPublicMenu } from "@/lib/menu-server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Camera, Compass, Edit3, Flag, Info, MapPin, Navigation, Phone, PlusCircle, Star, Store, User } from "lucide-react";

import { PlaceFactSections } from "@/features/demo-ui/legacy/components/PlaceFactSections.jsx";
import { ownershipMessage } from "@/features/places/public-place-format";
import { getGoogleMapsDirectionsUrl } from "@/features/places/google-maps";
import { getPublishedPlaceDetail } from "@/lib/public-place-detail";
import { placeMetadata, placeStructuredData, safeJsonLd } from "@/lib/public-seo";
import { PlaceGallery } from "./place-gallery";
import { PlaceMap } from "./place-map";
import { ReviewIsland } from "./review-island";
import "@/features/demo-ui/legacy/styles/place-detail-panel.css";
import "./public-detail.css";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPublishedPlaceDetail(slug);
  if (!place) {
    return {
      title: "Địa điểm không tồn tại | 11Local",
      robots: { index: false, follow: false },
    };
  }
  return placeMetadata(place);
}

function PublicNavigation() {
  return <>
    <header className="app-header local-seo-header">
      <div className="container">
        <Link className="logo" href="/" aria-label="11Local — Trang chủ">
          <svg className="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="9" fill="#0f5f52" />
            <path d="M3 24 L11 12 L16 19 L21 10 L29 24 Z" fill="#1d9684" />
            <path d="M3 24 L11 12 L16 19 L10 24Z" fill="#14796a" />
            <circle cx="24" cy="9" r="3" fill="#d9822b"/>
          </svg>
          <span>11<em>Local</em></span>
        </Link>
        <Link className="local-seo-search" href="/tim-kiem">Tìm địa điểm tại Cao Bằng…</Link>
        <nav className="header-nav" aria-label="Điều hướng chính">
          <Link href="/">Khám phá</Link>
          <Link href="/tim-kiem">Danh mục</Link>
          <Link href="/ban-do">Bản đồ</Link>
          <Link href="/dong-gop">Đóng góp</Link>
          <Link href="/dang-nhap">Đăng nhập</Link>
        </nav>
      </div>
    </header>
    <nav className="bottom-nav local-seo-bottom" aria-label="Điều hướng điện thoại">
      <Link href="/"><Compass size={22}/>Khám phá</Link>
      <Link href="/ban-do"><MapPin size={22}/>Bản đồ</Link>
      <Link href="/dong-gop" className="fab-slot"><PlusCircle size={22}/>Đóng góp</Link>
      <Link href="/tai-khoan"><User size={22}/>Tài khoản</Link>
    </nav>
  </>;
}

export default async function PublicPlacePage({ params }: PageProps) {
  const { slug } = await params;
  const place = await getPublishedPlaceDetail(slug);
  if (!place) notFound();
  const menu = await getPublicMenu(place.id).catch(error => { console.error("Public menu read failed", error); return undefined; });

  const mapUrl = "/ban-do?place=" + encodeURIComponent(place.slug) + "&detail=1";
  const directions = getGoogleMapsDirectionsUrl(place);
  const reviews = Number(place.rating_count) || 0;
  const avg = Number(place.rating_avg);
  const hasRating = reviews > 0 && Number.isFinite(avg);
  const ownership = ownershipMessage(place.place_kind, place.ownership_status);
  const structured = safeJsonLd(placeStructuredData(place));

  return <>
    <PublicNavigation />
    <main className="app-main local-seo-page">
      <div className="local-seo-breadcrumb">
        <Link href="/">Khám phá</Link>
        <span aria-hidden="true">/</span>
        <Link href="/tim-kiem">{place.category_name || "Địa điểm"}</Link>
        <span aria-hidden="true">/</span>
        <span>{place.name}</span>
      </div>
      <div className="local-seo-detail-grid">
        <div className="local-seo-map-pane">
          <PlaceMap latitude={place.latitude} longitude={place.longitude} name={place.name}
            slug={place.slug} categoryId={place.category_id} categoryName={place.category_name}/>
          <div className="local-seo-map-overlay">
            <span><MapPin size={15}/> {place.address || place.area || "Cao Bằng"}</span>
            <a href={directions} target="_blank" rel="noopener noreferrer"><Navigation size={16}/> Chỉ đường</a>
          </div>
        </div>
        <article className="local-seo-rail" aria-labelledby="place-heading">
          <div className="local-detail-topbar">
            <span><Info size={16}/> Thông tin địa điểm</span>
            <Link href={mapUrl} className="local-detail-close">Xem trên bản đồ</Link>
          </div>
          <PlaceGallery name={place.name} photos={place.photos}/>
          <div className="local-detail-content">
            <div className="local-detail-name">
              <span className="local-detail-category">{place.category_name || "Địa điểm"}</span>
              <h1 id="place-heading">{place.name}</h1>
              {place.summary && <p className="local-detail-tagline">{place.summary}</p>}
              <p className="local-detail-address"><MapPin size={16}/>{place.address || place.area || "Cao Bằng"}</p>
              <div className="local-detail-badges">
                {hasRating
                  ? <span className="local-detail-rating"><Star size={16}/> {avg.toFixed(1)} <small>({reviews} đánh giá)</small></span>
                  : <span className="local-detail-muted">Chưa có đánh giá</span>}
                {ownership && <span className="local-detail-ownership"><BadgeCheck size={15}/>{ownership}</span>}
              </div>
            </div>
            <div className="local-detail-quick-actions">
              <a href={directions} target="_blank" rel="noopener noreferrer" className="primary">
                <Navigation size={17}/> Chỉ đường
              </a>
              {place.phone && <a href={"tel:" + place.phone} className="secondary"><Phone size={17}/> Gọi điện</a>}
            </div>
            <PlaceFactSections place={place}/>
            {menu ? <MenuView content={menu.content} publishedAt={String(menu.publishedAt)}/> : menu === undefined ? <p>Chưa tải được menu / bảng giá.</p> : null}
            <ReviewIsland placeId={place.id} slug={place.slug}/>
            <div className="local-detail-community-actions">
              <Link href={"/bao-sai/" + encodeURIComponent(place.slug) + "?loai=report"}><Flag size={15}/> Báo sai</Link>
              <Link href={"/bao-sai/" + encodeURIComponent(place.slug) + "?loai=edit_place"}><Edit3 size={15}/> Đề xuất sửa</Link>
              <Link href={"/bao-sai/" + encodeURIComponent(place.slug) + "?loai=photo"}><Camera size={15}/> Gửi ảnh</Link>
            </div>
            {place.place_kind === "business" && <div className="local-detail-owner-callout">
              <div><Store size={20}/><span><strong>Bạn là chủ địa điểm này?</strong>
                <small>Đăng nhập Google và gửi yêu cầu để Admin xác minh.</small></span></div>
              <Link href={"/nhan-quyen/" + encodeURIComponent(place.slug)}>Yêu cầu nhận quyền quản lý</Link>
            </div>}
            <p className="local-detail-note">Thông tin và hình ảnh công khai đã qua kiểm duyệt 11Local.</p>
          </div>
        </article>
      </div>
    </main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structured }} />
  </>;
}
