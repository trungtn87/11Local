# Nhà của Gấu

Nơi lưu giữ những năm tháng yêu thương của Gấu và gia đình.

- Khách xem album, ảnh đã duyệt, địa điểm và những cột mốc công khai.
- Tài khoản Google được gửi ảnh vào album, tự nén 2048px WebP chất lượng 82, tối đa 20MB ảnh đầu vào, 30 ảnh/ngày mỗi tài khoản.
- Admin tạo album, ghim nơi đã đi, thêm cột mốc và duyệt ảnh.
- Next.js 16, PostgreSQL Neon, MapLibre, Docker trên VPS Nhân Hòa.

## Cấu hình

Cần DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, USER_SESSION_SECRET, ADMIN_PASSWORD, ADMIN_SESSION_SECRET, SITE_URL=https://11local.vn.
OAuth callback được giữ là https://11local.vn/api/auth/google/callback.
Bản đồ mặc định từ OpenFreeMap, NEXT_PUBLIC_MAP_STYLE_URL là tùy chọn.

## Migration
Chạy migrations/0021_nha_cua_gau.sql bằng kết nối **direct** trên Neon trước khi đưa code mới lên production. Không tự chạy các migration 0001–0020 cũ.
Dữ liệu ảnh *đã nén* lưu ở bảng family_photos dạng bytea. Theo dõi dung lượng Neon và chuyển sang object storage khi cần; không giữ ảnh gốc.

## Kiểm tra
npm ci && npm run check && node scripts/check-ssr-html.mjs
DEPLOY_STANDALONE=1 npm run build

## Quyền truy cập
Bất kỳ ai xem ảnh đã duyệt; chỉ tài khoản Google đăng nhập gửi ảnh. Upload chờ kiểm duyệt. Admin dùng mật khẩu Admin riêng, không chia sẻ public.
