# 11Local Discord — bước 2: tích hợp sự kiện nghiệp vụ

Điều kiện tiên quyết: mã nền tảng từ PR #40 đã được merge vào `main`.
Không cần migration mới cho bước 2; dùng lại
`migrations/0014_discord_notification_outbox.sql`.

## Sự kiện được nối tự động

| Nhóm | Thao tác | Link quản trị |
|---|---|---|
| Đóng góp | Địa điểm mới; báo sai; sửa thông tin; ảnh; phản hồi yêu cầu bổ sung | `/admin/dong-gop` |
| Đánh giá | Đánh giá mới; chỉnh sửa đánh giá; Admin duyệt/từ chối/ẩn | `/admin/danh-gia` |
| Xác minh | Yêu cầu nhận quyền; phản hồi bổ sung; Admin duyệt/từ chối/yêu cầu bổ sung/tranh chấp | `/admin/xac-minh` |
| Chủ địa điểm | Gửi chỉnh sửa/ảnh; Admin duyệt/từ chối nội dung | `/admin/noi-dung-chu` |
| Quyền quản lý | Admin cấp/tạm khóa/khôi phục/thu hồi quyền quản lý | `/admin/xac-minh` |
| Kiểm duyệt đóng góp | Admin duyệt/từ chối/yêu cầu bổ sung | `/admin/dong-gop` |

Tất cả thông báo chỉ chứa mẫu chữ do hệ thống kiểm soát, loại sự kiện và UUID.
Không đưa tên người gửi, số điện thoại, email, lời nhắn tự nhập, tài liệu
xác minh, dữ liệu ảnh hoặc lý do quyết định vào Discord.

## Tính nhất quán

- Chỉ ghi một bản ghi outbox **bên trong** transaction PostgreSQL thành công.
  Khi transaction rollback, bản ghi thông báo cũng rollback.
- `event_key` có dạng `<event-action>:<entity-uuid>:<version-or-revision>`;
  cùng một sự kiện không sinh nhiều bản ghi khi thử lại.
- Tuyệt đối không gọi Discord HTTP trong transaction nghiệp vụ.
  Dispatcher từ PR #40 gửi ra ngoài qua endpoint token riêng.
- Tính năng **tắt mặc định**; khi `DISCORD_NOTIFICATIONS_ENABLED` khác
  `true`, các thao tác nghiệp vụ vẫn hoạt động và không truy vấn outbox.
- Khi bật, **phải áp dụng migration 0014 trước**. Nếu quên áp dụng,
  thao tác nghiệp vụ sẽ thất bại để đảm bảo không công bố một thay đổi
  mà mất dấu sự kiện trong outbox. Không bật tính năng giữa lúc
  migration chưa hoàn tất.
- Gửi thành công phụ thuộc Webhook còn hiệu lực và dispatcher/scheduler đang
  chạy. Render Free ngủ có thể làm thông báo bị trễ; trên VPS dùng timer.
- Các thông báo trong giai đoạn tính năng tắt không được backfill tự động,
  tránh bắn hàng loạt thông báo cũ lúc mới bật.

## Lưu ý triển khai

Khi một sự kiện được ghi vào outbox, message sẽ chỉ đến Discord sau lần gọi dispatcher thành công. Việc tạo hàng đợi không tự kích hoạt tác vụ nền trên Render Free; cần cron/timer độc lập để đạt thông báo gần thời gian thực.

## Nghiệm thu

1. Áp dụng migration 0014 lên database **11Local** (không phải AutoTrade).
2. Đặt `DISCORD_WEBHOOK_URL` và `DISCORD_DISPATCH_TOKEN` trong Secret Manager.
3. Trên môi trường thử nghiệm, đặt `DISCORD_NOTIFICATIONS_ENABLED=true`.
4. Đăng nhập Admin và gọi `POST /api/admin/discord/test` một lần.
5. Gửi một đóng góp thử, xác minh bản ghi outbox xuất hiện đúng một lần;
   cố ý rollback một transaction khác, xác minh không có bản ghi Discord.
6. Gọi dispatcher bằng Bearer token, kiểm tra Embed và link Admin.
7. Kiểm tra chức năng đăng nhập, đăng địa điểm, đánh giá và xác minh vẫn hoạt động.

Cài đặt bật/tắt **từng nhóm** trong giao diện Admin, báo cáo 20:00,
cảnh báo hệ thống, gửi lại thủ công và cảnh báo giám sát sẽ triển khai các bước sau.
