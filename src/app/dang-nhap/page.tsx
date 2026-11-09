import Link from "next/link";
import { GauEmptyMascot } from "@/components/gau-mascot";

export const metadata = { title: "Đăng nhập | Gia đình Gấu" };

export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const {error}=await searchParams;
  const messages: Record<string, string> = {
    pending: "Tài khoản Google của bạn đã được ghi nhận và đang chờ Admin duyệt. Sau khi được duyệt, hãy đăng nhập lại.",
    rejected: "Yêu cầu tham gia đã bị từ chối. Vui lòng liên hệ quản trị viên gia đình.",
    blocked: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên gia đình.",
    auth_failed: "Không thể hoàn tất đăng nhập do sự cố hệ thống. Vui lòng thử lại.",
    invalid_state: "Phiên Google đã hết hạn hoặc cookie bị chặn. Vui lòng thử lại trong cùng trình duyệt.",
    not_configured: "Hệ thống đăng nhập chưa được cấu hình đầy đủ. Vui lòng báo quản trị viên.",
    token_exchange_failed: "Google không thể trao đổi mã đăng nhập. Vui lòng thử lại.",
    missing_identity: "Google không trả về thông tin định danh. Vui lòng thử lại.",
    invalid_identity: "Không thể xác minh tài khoản Google. Vui lòng thử lại.",
    invalid_callback: "Đường dẫn đăng nhập không hợp lệ. Vui lòng bắt đầu lại.",
    account_failed: "Không thể lưu tài khoản vào cơ sở dữ liệu. Vui lòng báo quản trị viên.",
    cancelled: "Bạn đã hủy đăng nhập Google."
  };
  return (
    <main className="wrap narrow">
      <div className="panel account-panel">
        <div className="account-header">
          <GauEmptyMascot width={88} height={80} />
          <div>
            <p className="eyebrow">💝 Cùng góp kỷ niệm</p>
            <h1>Đăng nhập Gia đình Gấu</h1>
          </div>
        </div>
        <p>
          Đăng nhập Google để chia sẻ ảnh và kỷ niệm. Mọi người đều có thể xem
          album công khai mà không cần đăng nhập.
        </p>
        {error && <p role="status" className="status">{messages[error]||"Không thể đăng nhập. Vui lòng thử lại."}</p>}
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
