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
Bản đồ mặc định OpenFreeMap với POI nền (quán ăn, du lịch, khu vực...) giữ nguyên theo style nhà cung cấp; NEXT_PUBLIC_MAP_STYLE_URL tùy chọn.
Admin có mục **Quản lý địa điểm** riêng: ghim kéo thả, danh mục, phân biệt điểm giới thiệu/điểm gia đình đã ghé, ẩn/hiện, lưu trữ có khôi phục, liên kết nhiều album.
Dữ liệu POI nền chỉ để xem, không thể sửa/xóa qua Admin; Admin chỉ quản lý các địa điểm lưu trong family_places.

## Migration (quan trọng)
Môi trường đang có 0021 (family) và 0024 (album archive), 0025 (auto publish) cần được giữ. Nếu chưa áp dụng, chạy `migrations/0026_family_member_contributions.sql` trên kết nối Neon direct. **Trước khi deploy mã nguồn có bản đồ mới**, chạy thêm `migrations/0027_family_map_places.sql` trên Neon direct. Không tự chạy toàn bộ migrations lịch sử. Không tự chạy migrations 0001–0020 của 11Local cũ.

0026 bổ sung người tạo nội dung, thông tin liên kết ảnh ↔ địa điểm/cột mốc, ngày chụp và bảng idempotency.
0027 bổ sung category/kind/visibility/description/address/archived_at cho `family_places` và bảng `family_place_albums` (nhiều album trên một địa điểm). Migration idempotent, backfill liên kết album từ địa điểm và ảnh cũ, không xóa ảnh hay địa điểm.
Sau khi áp dụng migration, triển khai Docker / Next.js mới. Trước khi áp dụng 0027, API địa điểm mới sẽ trả lỗi, trang bản đồ không thể truy vấn schema mới.

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

## Kiểm tra bản đồ địa điểm (sau migration và deploy)
- Bản đồ hiển thị các POI nền OpenFreeMap theo zoom (không phải dữ liệu từ DB Gia đình Gấu), tên khu vực và tuyến đường.
- Admin → Quản lý địa điểm: tạo điểm giới thiệu, chọn danh mục, ghim vị trí, ẩn/hiện, sửa; thử lưu trữ và khôi phục.
- Thêm địa điểm gia đình đã ghé; gắn cùng điểm với 2 album, xác minh cả hai album hiện trên trang bản đồ.
- Địa điểm bị ẩn/lưu trữ không xuất hiện trên bản đồ; album và ảnh không bị xóa.
- Thành viên được duyệt tiếp tục tạo địa điểm cùng ảnh trong Cùng góp kỷ niệm; tạo thêm album cho điểm đã có không ghi đè liên kết trước.
