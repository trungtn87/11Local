import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Chính sách bảo mật | 11Local",
  description: "Thông tin về dữ liệu cá nhân và quyền riêng tư khi sử dụng 11Local.",
  alternates: { canonical: "/chinh-sach-bao-mat" },
};

export default function PrivacyPage() {
  return <main className={styles.page}><div className={styles.wrap}>
    <nav className={styles.nav} aria-label="Điều hướng"><Link href="/" className={styles.brand}>11Local</Link><Link href="/" className={styles.back}>← Về trang chủ</Link></nav>
    <article className={styles.paper}>
      <p className={styles.eyebrow}>Quyền riêng tư</p>
      <h1 className={styles.title}>Chính sách bảo mật</h1>
      <p className={styles.date}>Cập nhật: 05/11/2026</p>
      <p className={styles.intro}>11Local là cẩm nang địa điểm cộng đồng tại Cao Bằng. Chính sách này giải thích những thông tin có thể được xử lý khi bạn khám phá, đăng nhập và đóng góp nội dung.</p>
      <section className={styles.section}><h2>1. Dữ liệu chúng tôi xử lý</h2><ul>
        <li><strong>Khi đăng nhập Google:</strong> mã định danh tài khoản Google, tên hiển thị, email và ảnh đại diện do Google cung cấp. 11Local không nhận mật khẩu Google.</li>
        <li><strong>Khi đóng góp:</strong> thông tin địa điểm, mô tả, hình ảnh, đánh giá, nội dung báo sai hoặc yêu cầu quản lý địa điểm do bạn chủ động gửi. Một số mẫu đóng góp có thể yêu cầu thông tin liên hệ để xử lý.</li>
        <li><strong>Khi dùng bản đồ/Gần bạn:</strong> vị trí thiết bị chỉ được xin phép khi bạn cho phép trình duyệt chia sẻ; dùng để hiển thị địa điểm gần bạn. Không cần cấp vị trí để xem phần lớn nội dung.</li>
        <li><strong>Dữ liệu vận hành:</strong> cookie phiên đăng nhập, thống kê truy cập và thông tin kỹ thuật cần thiết để vận hành, phòng chống lạm dụng và xử lý sự cố.</li>
      </ul></section>
      <section className={styles.section}><h2>2. Mục đích sử dụng</h2><p>Thông tin được dùng để đăng nhập, duy trì phiên, hiển thị hồ sơ, tiếp nhận và kiểm duyệt đóng góp, giải quyết yêu cầu nhận quyền quản lý địa điểm, cải thiện trải nghiệm và bảo đảm website hoạt động ổn định. Chúng tôi không dùng dữ liệu đăng nhập Google để gửi quảng cáo thay bạn.</p></section>
      <section className={styles.section}><h2>3. Nội dung công khai</h2><p>Thông tin địa điểm và nội dung được duyệt có thể hiển thị công khai để cộng đồng tra cứu. Không đưa số điện thoại riêng, giấy tờ cá nhân hay thông tin nhạy cảm vào phần mô tả, ảnh hoặc đánh giá công khai. Tài liệu xác minh quyền quản lý chỉ dùng cho quá trình xét duyệt, không phải nội dung giới thiệu địa điểm.</p></section>
      <section className={styles.section}><h2>4. Google và dịch vụ bên ngoài</h2><p>Việc đăng nhập được thực hiện qua Google OAuth. Khi bạn mở chỉ đường bằng Google Maps, bạn chuyển sang dịch vụ của Google và chính sách của Google sẽ áp dụng. Website có thể sử dụng nhà cung cấp lưu trữ và cơ sở dữ liệu để vận hành; dữ liệu chỉ được xử lý trong phạm vi cung cấp dịch vụ.</p></section>
      <section className={styles.section}><h2>5. Lưu trữ và bảo vệ dữ liệu</h2><p>11Local lưu dữ liệu cần thiết cho tài khoản và đóng góp trong thời gian phục vụ hoạt động của website hoặc đáp ứng nghĩa vụ pháp luật. Phiên đăng nhập được bảo vệ bằng cookie chỉ máy chủ đọc. Không hệ thống trực tuyến nào bảo đảm an toàn tuyệt đối; chúng tôi cố gắng giới hạn quyền truy cập và xử lý sự cố khi phát hiện.</p></section>
      <section className={styles.section}><h2>6. Quyền của bạn</h2><p>Bạn có thể ngừng sử dụng, đăng xuất, từ chối cấp quyền vị trí của trình duyệt và yêu cầu kiểm tra, chỉnh sửa hoặc xóa thông tin cá nhân khi phù hợp với quy định pháp luật. Yêu cầu gỡ nội dung cộng đồng được xem xét cùng quyền lợi hợp pháp của các bên và yêu cầu lưu giữ cần thiết.</p></section>
      <section className={styles.section}><h2>7. Thay đổi chính sách và liên hệ</h2><p>Chính sách có thể được cập nhật khi website thay đổi chức năng hoặc yêu cầu pháp lý. Bản cập nhật sẽ được công bố tại trang này. Để gửi yêu cầu liên quan đến dữ liệu cá nhân, vui lòng liên hệ qua kênh hỗ trợ chính thức được công bố trên 11Local; không gửi giấy tờ riêng tư trong phần đóng góp công khai.</p></section>
      <div className={styles.links}><Link href="/">Trang chủ</Link><Link href="/dieu-khoan-su-dung">Điều khoản sử dụng</Link></div>
    </article>
  </div></main>;
}