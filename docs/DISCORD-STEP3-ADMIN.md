# 11Local Discord — bước 3: cài đặt trong Admin

PR #42 đã merge vào main. PR #44 triển khai bước 3 và chỉ merge sau khi CI xanh.

## Điều kiện trước khi triển khai

1. Đã có migration `0014_discord_notification_outbox.sql` của bước 1.
2. Áp dụng **bổ sung** `migrations/0015_discord_admin_settings.sql`
   vào **Neon 11Local**. Không reset dữ liệu, không tạo DB mới và không dùng DB AutoTrade.
3. Cài `DISCORD_WEBHOOK_URL` (bảo mật phía server) và `DISCORD_DISPATCH_TOKEN`
   (>=32 ký tự), `SITE_URL` HTTPS đúng origin.
4. Mở cổng vận hành một lần bằng `DISCORD_NOTIFICATIONS_ENABLED=true`.
   Sau đó bật/tắt nhóm trong Admin; **không cần sửa .env theo từng nhóm**.
5. Có scheduler/token dispatch từ bước 1 nếu muốn gửi tự động; Render Free ngủ
   không đảm bảo background task. Admin gửi thử/gửi lại sử dụng dispatch trực tiếp.

## Sử dụng

Vào `/admin` → **Cài đặt Discord** → `/admin/cai-dat/discord`.
Đăng nhập phiên Admin trước; tài khoản Google của khách không được phép vào.

- **Cấu hình chung:** bật/tắt toàn bộ nhóm thông báo. Dữ liệu được lưu
  trong `public.discord_notification_settings` với version chống ghi đè.
  Mặc định toàn bộ tính năng tắt an toàn. Chỉ Admin đã đăng nhập đổi được.
- **Nhóm thông báo:** đóng góp, đánh giá, xác minh/quyền quản lý, kết quả
  kiểm duyệt và cảnh báo hệ thống. Cảnh báo hệ thống được hoàn thiện ở bước 4.
  **Không có báo cáo tổng hợp tự động theo ngày và không có lịch 20:00.**
- **Kết nối:** chỉ hiển thị tình trạng Webhook URL **hợp lệ về định dạng**
  và cổng vận hành, không hiển thị URL/token. Trạng thái “đã cấu hình”
  không có nghĩa Discord chắc chắn hoạt động. **Gửi thử** để xác minh.
- **Lịch sử:** 30 mục mới nhất, tên sự kiện, nhóm, số lần thử, mã lỗi,
  thời gian gửi/trạng thái. Có nút **Gửi lại** với bản ghi failed khi nhóm
  đang bật. Không sửa status của mục sent.
- **Gửi thử:** thao tác được phép dù bật/tắt nhóm đang tắt, nhưng yêu cầu
  cổng môi trường bật + webhook hợp lệ + phiên Admin.
- Tắt nhóm thông báo ngăn cả enqueue mới lẫn phát tán hàng đợi chưa gửi
  của nhóm đó. Khi mở lại, các item pending trước đó được tiếp tục xử lý;
  item failed chỉ retry thủ công nếu muốn.

## API

| API | Phân quyền | Chức năng |
| --- | --- | --- |
| `GET /api/admin/discord` | Admin | settings + 30 history + cờ env/webhook |
| `PATCH /api/admin/discord` | Admin + same-origin + optimistic version | Lưu config trong Neon |
| `POST /api/admin/discord/test` | Admin + same-origin | Gửi Discord thử |
| `POST /api/admin/discord/retry` | Admin + same-origin | Gửi lại failed |
| `POST /api/internal/discord/dispatch` | Secret Bearer token | Worker từ bước 1, lọc theo nhóm |

Không cung cấp endpoint công khai cấu hình, không cấp quyền cho người dùng thường.
Dữ liệu phía trình duyệt không bao gồm Discord URL hoặc secret. Event payload
chỉ bao gồm mô tả chuẩn hóa và mã hồ sơ, không có PII/ảnh/bằng chứng.

## Giới hạn và nghiệm thu

PR chỉ thêm cấu hình và UI. Không tự áp dụng migration, không gửi thông báo
thật, không cấu hình secrets hoặc deploy. Khi không có env gate true, các thao
tác nghiệp vụ không chạm vào settings/outbox nên không bị ảnh hưởng.

Thử nghiệm cần: khóa Admin, CSRF, version conflict 409, lưu 5 toggle,
Webhooks bị thiếu/không hợp lệ, test 200/502, retry 200/202/409,
enqueue trong transaction, dispatcher chỉ lấy nhóm đang bật và không gửi
message pending khi master tắt. CI phải xanh trước khi merge.

Quyết định Owner ngày 04/11/2026: hủy hẳn báo cáo Discord tự động hằng ngày.
Không triển khai cron/digest, không cung cấp toggle báo cáo trong Admin.
Hàng outbox digest đời cũ (nếu có) được giữ nguyên dữ liệu để tương thích,
nhưng dispatcher và thao tác gửi lại từ chối gửi các hàng này.
