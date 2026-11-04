import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng | 11Local",
  description: "Quy định sử dụng, đóng góp và quản lý thông tin địa điểm trên 11Local.",
  alternates: { canonical: "/dieu-khoan-su-dung" },
};

export default function TermsPage() {
  return <main className={styles.page}><div className={styles.wrap}>
    <nav className={styles.nav} aria-label="Điều hướng"><Link href="/" className={styles.brand}>11Local</Link><Link href="/" className={styles.back}>← Về trang chủ</Link></nav>
    <article className={styles.paper}>
      <p className={styles.eyebrow}>Thông tin sử dụng</p>
      <h1 className={styles.title}>Điều khoản sử dụng</h1>
      <p className={styles.date}>Cập nhật: 05/11/2026</p>
      <p className={styles.intro}>Chào mừng bạn đến với 11Local — nền tảng khám phá địa điểm và chia sẻ trải nghiệm tại Cao Bằng. Khi sử dụng website, bạn đồng ý tuân thủ những nguyên tắc dưới đây.</p>
      <section className={styles.section}><h2>1. Phạm vi dịch vụ</h2><p>11Local cung cấp thông tin tham khảo về địa điểm, hình ảnh, đánh giá, menu, bảng giá, sự kiện và nội dung cộng đồng khi có. Thông tin có thể thay đổi theo thực tế; trước khi di chuyển, đặt dịch vụ hoặc chi tiêu, bạn nên xác minh trực tiếp với địa điểm. 11Local không mặc nhiên là bên cung cấp hàng hóa, dịch vụ của các địa điểm được giới thiệu.</p></section>
      <section className={styles.section}><h2>2. Tài khoản và đăng nhập</h2><p>Một số chức năng yêu cầu đăng nhập bằng tài khoản Google. Bạn chịu trách nhiệm bảo vệ quyền truy cập tài khoản của mình và không mạo danh người khác. Đăng nhập Google không tự động đồng nghĩa với quyền quản lý địa điểm hoặc quyền quản trị website.</p></section>
      <section className={styles.section}><h2>3. Đóng góp cộng đồng</h2><p>Bạn có thể đề xuất địa điểm mà không cần tài khoản nếu chức năng hỗ trợ, hoặc gửi ảnh, đánh giá và yêu cầu sửa thông tin theo quy trình của website. Nội dung có thể cần kiểm duyệt trước khi công khai. Khi gửi nội dung, bạn xác nhận có quyền chia sẻ, nội dung không vi phạm pháp luật và không xâm phạm quyền của người khác.</p><ul>
        <li>Không đăng nội dung bịa đặt, xúc phạm, quảng cáo rác, gian lận đánh giá hoặc tiết lộ dữ liệu cá nhân của người khác khi chưa được phép.</li>
        <li>Không đăng ảnh, bài viết hoặc tài liệu có bản quyền nếu bạn không có quyền sử dụng.</li>
        <li>Bạn vẫn giữ quyền đối với nội dung của mình và cho phép 11Local lưu trữ, hiển thị, biên tập kỹ thuật (như thay đổi kích thước ảnh) nhằm vận hành dịch vụ, trong phạm vi cần thiết.</li>
      </ul></section>
      <section className={styles.section}><h2>4. Xác minh chủ địa điểm</h2><p>Một địa điểm có thể xuất hiện trên 11Local trước khi chủ sở hữu xác minh. Nhãn “Chưa xác minh chủ địa điểm” không có nghĩa là 11Local đại diện cho cơ sở đó. Quyền quản lý chỉ được cấp sau khi quản trị viên xem xét bằng chứng; nếu xảy ra tranh chấp, quyền có thể được xem xét lại hoặc tạm dừng.</p></section>
      <section className={styles.section}><h2>5. Kiểm duyệt và xử lý vi phạm</h2><p>11Local có quyền từ chối, ẩn hoặc gỡ nội dung, hạn chế tài khoản hoặc thu hồi quyền quản lý khi có căn cứ nội dung vi phạm điều khoản, quyền của bên thứ ba hoặc quy định pháp luật. Người dùng có thể báo sai thông tin để quản trị viên xem xét. Việc kiểm duyệt không phải cam kết mọi thông tin đều chính xác.</p></section>
      <section className={styles.section}><h2>6. Bản đồ, khoảng cách và liên kết ngoài</h2><p>Khoảng cách “Gần bạn” chỉ mang tính ước tính theo đường thẳng, không phải quãng đường di chuyển. Nút “Chỉ đường” có thể mở Google Maps; khi đó, điều khoản và chính sách riêng của dịch vụ bên ngoài sẽ áp dụng.</p></section>
      <section className={styles.section}><h2>7. Giới hạn trách nhiệm</h2><p>Trong phạm vi pháp luật cho phép, 11Local không chịu trách nhiệm về giao dịch độc lập giữa bạn và chủ địa điểm, hoặc thiệt hại do sử dụng thông tin chưa được xác minh. Điều khoản này không loại trừ các trách nhiệm bắt buộc theo pháp luật.</p></section>
      <section className={styles.section}><h2>8. Thay đổi và liên hệ</h2><p>Điều khoản có thể được cập nhật để phản ánh thay đổi của website và pháp luật. Phiên bản hiện hành được công bố trên trang này. Vấn đề về nội dung, quyền sở hữu hoặc tài khoản có thể được gửi qua kênh hỗ trợ chính thức được công bố trên 11Local.</p></section>
      <div className={styles.links}><Link href="/">Trang chủ</Link><Link href="/chinh-sach-bao-mat">Chính sách bảo mật</Link></div>
    </article>
  </div></main>;
}