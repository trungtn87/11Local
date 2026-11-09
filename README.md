# Gia đình Gấu

Nơi lưu giữ những năm tháng yêu thương của Gấu và gia đình.

- Khách chưa đăng nhập xem công khai album, ảnh, bản đồ và cây thời gian.
- Chỉ tài khoản Google **đã được Admin duyệt** mới đăng ảnh hoặc tạo nội dung.
- Thành viên tạo album mới / chọn album sẵn có, liên kết hoặc thêm địa điểm bằng ghim kéo thả, thêm cột mốc, ghi ngày kỷ niệm và đăng nhiều ảnh.
- Nội dung từ tài khoản đã được duyệt **đăng công khai ngay, không qua hàng chờ duyệt nội dung**. Admin có thể sửa/xóa địa điểm và cột mốc, lưu trữ/khôi phục album, xóa ảnh.
- Ảnh tự nén 2048px WebP chất lượng 82, tối đa 20MB/ảnh đầu vào, 30 ảnh/24h/tài khoản; ảnh gốc do người đăng tự lưu.
- Giới hạn 20 nội dung mới (album+địa điểm+cột mốc)/24h/tài khoản. Metadata của một lượt gửi được tạo trong một transaction và idempotent theo request ID.
- Next.js 16, PostgreSQL Neon, MapLibre, Docker trên VPS Nhân Hòa.

## Cấu hình
Cần DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, USER_SESSION_SECRET, ADMIN_PASSWORD, ADMIN_SESSION_SECRET, SITE_URL=https://11local.vn.
OAuth callback https://11local.vn/api/auth/google/callback.
Bản đồ mặc định OpenFreeMap; NEXT_PUBLIC_MAP_STYLE_URL tùy chọn.

## Migration (quan trọng)
Môi trường đang có 0021 (family) và 0024 (album archive), 0025 (auto publish) cần được giữ. **Trước khi deploy bản này**, chạy `migrations/0026_family_member_contributions.sql` trên kết nối Neon direct. Không tự chạy migrations 0001–0020 của 11Local cũ.

0026 bổ sung người tạo nội dung, thông tin liên kết ảnh ↔ địa điểm/cột mốc, ngày chụp, và bảng idempotency. Không xóa ảnh đang có, các trường mới đều nullable.

## Kiểm thử
```sh
npm ci
npm run check
node scripts/check-ssr-html.mjs
DEPLOY_STANDALONE=1 npm run build
```
Kiểm thử thực tế: tài khoản chưa được duyệt không tạo được metadata hay đăng ảnh; tài khoản được duyệt tạo album/địa điểm/mốc và ảnh hiện ngay; thử gửi lại request_id không tạo trùng; upload lỗi giữ ảnh chưa gửi; album đã lưu trữ không nhận ảnh; Admin vẫn xóa/ẩn nội dung.

## Quyền
Mọi người được xem nội dung công khai. Người dùng đã đăng nhập Google nhưng chưa được duyệt không thể gửi ảnh, tạo album, tạo địa điểm hoặc mốc thời gian. Truy cập Admin dùng phiên Admin riêng.
