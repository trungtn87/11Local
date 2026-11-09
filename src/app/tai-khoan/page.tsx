import Link from "next/link";
import { getCurrentUser } from "@/lib/user-auth";
import { LogoutButton } from "@/components/logout-button";
import { GauEmptyMascot } from "@/components/gau-mascot";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tài khoản | Gia đình Gấu" };

export default async function Account() {
  const user = await getCurrentUser();

  return (
    <main className="wrap narrow">
      <div className="panel account-panel">
        <div className="account-header">
          <GauEmptyMascot width={88} height={80} />
          <div>
            <p className="eyebrow">🏡 Thành viên gia đình</p>
            <h1>Tài khoản Gia đình Gấu</h1>
          </div>
        </div>

        {user ? (
          <>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <p>
              Bạn có thể đóng góp ảnh vào các cuốn album của Gấu. Ảnh sẽ hiển thị ngay sau khi đăng thành công.
            </p>
            <div className="empty-actions">
              <Link className="primary" href="/dong-gop">
                Đăng ảnh kỷ niệm
              </Link>
              <LogoutButton />
            </div>
          </>
        ) : (
          <>
            <p>
              Mọi người đều có thể xem album, chuyến đi và cột mốc trưởng thành của
              Gấu. Đăng nhập Google khi bạn muốn gửi tặng thêm ảnh kỷ niệm.
            </p>
            <div className="empty-actions">
              <a
                className="primary"
                href="/api/auth/google/start?returnTo=%2Ftai-khoan"
              >
                Đăng nhập Google
              </a>
              <Link className="secondary" href="/album">
                Xem Album của Gấu
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
