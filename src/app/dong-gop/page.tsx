import Link from "next/link";
import { getCurrentUser } from "@/lib/user-auth";
import { albums } from "@/lib/family";
import { UploadForm } from "@/components/upload-form";
import { GauEmptyMascot } from "@/components/gau-mascot";

export const dynamic = "force-dynamic";
export const metadata = { title: "Góp kỷ niệm | Gia đình Gấu" };

export default async function Contribute({
  searchParams,
}: {
  searchParams: Promise<{ album?: string }>;
}) {
  const [user, items, query] = await Promise.all([
    getCurrentUser(),
    albums(),
    searchParams,
  ]);

  return (
    <main className="wrap narrow">
      <div className="page-title">
        <p className="eyebrow">💝 Cùng góp kỷ niệm</p>
        <h1>Gửi ảnh cho Gấu</h1>
        <p>
          Mọi người có thể xem kỷ niệm công khai. Thành viên gia đình đăng nhập
          Google để gửi tặng thêm những bức ảnh mới.
        </p>
      </div>

      {!user ? (
        <div className="empty-scrapbook">
          <GauEmptyMascot width={104} height={96} className="empty-mascot" />
          <h2>Đăng nhập để chia sẻ những khoảnh khắc của bạn</h2>
          <p>
            Ảnh do người thân đóng góp sẽ được nén nhẹ nhàng và duyệt trước khi hiển
            thị trong cuốn album chung của Gấu.
          </p>
          <div className="empty-actions">
            <a
              className="primary"
              href="/api/auth/google/start?returnTo=%2Fdong-gop"
            >
              Đăng nhập Google
            </a>
            <Link href="/album" className="secondary">
              Xem Album trước
            </Link>
          </div>
        </div>
      ) : !items.length ? (
        <div className="empty-scrapbook">
          <GauEmptyMascot width={104} height={96} className="empty-mascot" />
          <h3>Chưa có album để đóng góp</h3>
          <p>Quản trị viên gia đình sẽ tạo cuốn album đầu tiên để mọi người cùng gửi ảnh.</p>
        </div>
      ) : (
        <UploadForm albums={items} selected={query.album} />
      )}
    </main>
  );
}
