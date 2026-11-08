import Link from "next/link";
import { GauEmptyMascot } from "@/components/gau-mascot";

export const metadata = { title: "Đăng nhập | Nhà của Gấu" };

export default function Login() {
  return (
    <main className="wrap narrow">
      <div className="panel account-panel">
        <div className="account-header">
          <GauEmptyMascot width={88} height={80} />
          <div>
            <p className="eyebrow">💝 Cùng góp kỷ niệm</p>
            <h1>Đăng nhập Nhà của Gấu</h1>
          </div>
        </div>
        <p>
          Đăng nhập Google để chia sẻ ảnh và kỷ niệm. Mọi người đều có thể xem
          album công khai mà không cần đăng nhập.
        </p>
        <div className="empty-actions">
          <a
            className="primary"
            href="/api/auth/google/start?returnTo=%2Fdong-gop"
          >
            Tiếp tục với Google
          </a>
          <Link className="secondary" href="/">
            ← Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
