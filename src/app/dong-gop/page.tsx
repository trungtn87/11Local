import Link from "next/link";
import {getCurrentUser} from "@/lib/user-auth";
import {albums,places,milestones} from "@/lib/family";
import {UploadForm} from "@/components/upload-form";
import {GauEmptyMascot} from "@/components/gau-mascot";

export const dynamic = "force-dynamic";
export const metadata = {title:"Góp kỷ niệm | Gia đình Gấu"};

export default async function Contribute({searchParams}:{searchParams:Promise<{album?:string}>}) {
  const [user,items,pins,events,query] = await Promise.all([
    getCurrentUser(),albums(),places(),milestones(),searchParams
  ]);
  return <main className="wrap narrow">
    <div className="page-title">
      <p className="eyebrow">💝 Cùng góp kỷ niệm</p>
      <h1>Gửi ảnh và câu chuyện cho Gấu</h1>
      <p>Thành viên Google đã được duyệt có thể tạo album, ghim địa điểm, thêm cột mốc trên cây thời gian và đăng ảnh ngay, không chờ duyệt nội dung.</p>
    </div>
    {!user ? <div className="empty-scrapbook">
      <GauEmptyMascot width={104} height={96} className="empty-mascot"/>
      <h2>Đăng nhập để cùng lưu giữ kỷ niệm</h2>
      <p>Tài khoản cần được Admin gia đình phê duyệt trước khi đăng ảnh hoặc thêm nội dung.</p>
      <div className="empty-actions">
        <a className="primary" href="/api/auth/google/start?returnTo=%2Fdong-gop">Đăng nhập Google</a>
        <Link className="secondary" href="/album">Xem album</Link>
      </div>
    </div> : <UploadForm albums={items} places={pins} milestones={events} selected={query.album}/>}
  </main>;
}
