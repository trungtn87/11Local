import { MenuView } from "@/components/menu/menu-view";
import { PlacePopularity } from "@/components/place-popularity";
import { GauLogoMark } from "@/components/gau-mascot";
import { getPublicMenu } from "@/lib/menu-server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck, BookHeart, Camera, Clock, Edit3, Flag, Home, Info,
  MapPin, Navigation, Phone, Star, Store, User,
} from "lucide-react";

import { PlaceFactSections } from "@/features/demo-ui/legacy/components/PlaceFactSections.jsx";
import { ownershipMessage } from "@/features/places/public-place-format";
import { getGoogleMapsDirectionsUrl } from "@/features/places/google-maps";
import { getPublishedPlaceDetail } from "@/lib/public-place-detail";
import { placeMetadata, placeStructuredData, safeJsonLd } from "@/lib/public-seo";
import { AlbumContributeCallout, PlaceGallery } from "./place-gallery";
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
      title: "Album không tồn tại | Nhà của Gấu",
      robots: { index: false, follow: false },
    };
  }
  return placeMetadata(place);
}

function PublicNavigation() {
  return <>
    <header className="app-header local-seo-header">
      <div className="container">
        <Link className="logo" href="/" aria-label="Nhà của Gấu — Trang chủ">
          <GauLogoMark className="logo-mark" width={38} height={38} />
          <span className="logo-text"><strong>Nhà của <em>Gấu</em></strong></span>
        </Link>
        <Link className="local-seo-search" href="/tim-kiem">Tìm album, chuyến đi của Gấu…</Link>
        <nav className="header-nav" aria-label="Điều hướng chính">
          <Link href="/">Trang chủ</Link>
          <Link href="/tim-kiem" className="active">Album</Link>
          <Link href="/ban-do">Bản đồ</Link>
          <Link href="/dong-thoi-gian">Dòng thời gian</Link>
          <Link href="/dang-nhap" className="btn btn-accent btn-sm">Đăng nhập Google</Link>
        </nav>
      </div>
    </header>
    <nav className="bottom-nav local-seo-bottom" aria-label="Điều hướng điện thoại">
      <Link href="/"><Home size={21}/><span>Trang chủ</span></Link>
      <Link href="/tim-kiem" className="active"><BookHeart size={21}/><span>Album</span></Link>
      <Link href="/ban-do"><MapPin size={21}/><span>Bản đồ</span></Link>
      <Link href="/dong-thoi-gian"><Clock size={21}/><span>Thời gian</span></Link>
      <Link href="/tai-khoan"><User size={21}/><span>Tài khoản</span></Link>
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
        <Link href="/">Trang chủ</Link>
        <span aria-hidden="true">/</span>
        <Link href="/tim-kiem">{place.category_name || "Album của Gấu"}</Link>
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
            <span><Info size={16}/> Chi tiết Album & Kỷ niệm</span>
            <Link href={mapUrl} className="local-detail-close">Xem trên bản đồ</Link>
          </div>
          <PlaceGallery name={place.name} photos={place.photos} showGrid />
          <div className="local-detail-content">
            <div className="local-detail-name">
              <span className="local-detail-category">{place.category_name || "Album kỷ niệm"}</span>
              <h1 id="place-heading">{place.name}</h1>
              {place.summary && <p className="local-detail-tagline">{place.summary}</p>}
              <p className="local-detail-address"><MapPin size={16}/>{place.address || place.area || "Cao Bằng"}</p>
              <div className="local-detail-badges">
                {hasRating
                  ? <span className="local-detail-rating"><Star size={16}/> {avg.toFixed(1)} <small>({reviews} cảm nhận)</small></span>
                  : <span className="local-detail-muted">Chưa có cảm nhận</span>}
                {ownership && <span className="local-detail-ownership"><BadgeCheck size={15}/>{ownership}</span>}
              </div>
            </div>

            <AlbumContributeCallout slug={place.slug} name={place.name} />

            <PlacePopularity place={place}/>
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
              <Link href={"/bao-sai/" + encodeURIComponent(place.slug) + "?loai=photo"}><Camera size={15}/> Góp thêm ảnh</Link>
              <Link href={"/bao-sai/" + encodeURIComponent(place.slug) + "?loai=edit_place"}><Edit3 size={15}/> Đề xuất cập nhật</Link>
              <Link href={"/bao-sai/" + encodeURIComponent(place.slug) + "?loai=report"}><Flag size={15}/> Báo thông tin sai</Link>
            </div>
            {place.place_kind === "business" && <div className="local-detail-owner-callout">
              <div><Store size={20}/><span><strong>Bạn quản lý địa điểm này?</strong>
                <small>Đăng nhập Google và gửi yêu cầu để Admin xác minh.</small></span></div>
              <Link href={"/nhan-quyen/" + encodeURIComponent(place.slug)}>Yêu cầu nhận quyền quản lý</Link>
            </div>}
            <p className="local-detail-note">Hình ảnh và kỷ niệm công khai được kiểm duyệt cẩn thận bởi Admin Nhà của Gấu.</p>
          </div>
        </article>
      </div>
    </main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structured }} />
  </>;
}
