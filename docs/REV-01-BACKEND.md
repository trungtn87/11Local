# REV-01 — Đánh giá địa điểm: backend bước 1

## Phạm vi
- Tận dụng `public.reviews`, khóa duy nhất `(place_id,user_id)`, `api.public_places` (chỉ tính đánh giá approved).
- Chỉ phiên Google thật (`public.users.google_sub IS NOT NULL`) được gửi/sửa/xóa.
- Không dùng OTP, không hỗ trợ ảnh hoặc phản hồi chủ quán ở bước này.
- Giữ nguyên địa điểm, user ID, ảnh, điểm cũ và cả view công khai.
- Migration `migrations/0011_place_reviews.sql` chỉ bổ sung cột, bảng, chỉ mục và revoke.

## Public API
| Method | Endpoint | Quyền | Nội dung |
|---|---|---|---|
| GET | `/api/reviews?placeId=<uuid>&page=1&limit=10` | Công khai | `reviews` đã duyệt, `ratingAvg`, `ratingCount`, `distribution`. Khi có Google session, trả thêm `mine` riêng tư |
| POST | `/api/reviews` | Google | JSON `{ "placeId": "uuid", "stars": 5, "content": "..." }` |
| PATCH | `/api/reviews/<reviewUuid>` | Chủ đánh giá | JSON `{ "stars": 4, "content": "...", "expectedVersion": 1 }` |
| DELETE | `/api/reviews/<reviewUuid>` | Chủ đánh giá | Xóa mềm, loại ngay khỏi điểm công khai |

`content` là tùy chọn, tối đa 1.000 ký tự; sao là số nguyên 1–5. Phải gửi mã địa điểm đã công khai, không gửi theo tên/slug. Giới hạn 10 lần gửi/chỉnh sửa/24h/tài khoản Google. Một tài khoản chỉ có một dòng đánh giá/địa điểm; muốn sửa phải gọi PATCH. Sau khi đã xóa, POST sẽ tái sử dụng cùng dòng và gửi duyệt lại.

Trạng thái ban đầu `pending`; sửa đánh giá `approved` tạo `review_revisions` chờ duyệt, nội dung công khai cũ không đổi. Sửa liên tiếp thay phiên bản đang chờ; dữ liệu thay thế giữ lại với trạng thái `superseded`. PATCH dùng `expectedVersion` để phát hiện cập nhật đồng thời (HTTP 409). Khi bị từ chối, người dùng có thể chỉnh sửa và gửi lại.

## Admin API (UI ở bước 2)
| Method | Endpoint | Quyền | Nội dung |
|---|---|---|---|
| GET | `/api/admin/reviews?status=pending` | Admin | Hàng chờ gồm đánh giá mới và bản sửa; trả `pendingTotal` |
| POST | `/api/admin/reviews/<reviewUuid>/decision` | Admin | JSON `{ "action": "approve", "expectedVersion": 1 }` |
| POST | Cùng endpoint | Admin | Duyệt/từ chối bản sửa: thêm `"revisionId": "<uuid>"` |
| POST | Cùng endpoint | Admin | Từ chối: `"action": "reject"` và `"note"` từ 5 ký tự |
| POST | Cùng endpoint | Admin | Ẩn đánh giá công khai: `"action": "hide"` và `"note"` từ 5 ký tự |

Tất cả thao tác thay đổi dữ liệu chạy transaction và ghi `moderation_logs`; Admin session hiện tại không tạo tài khoản người dùng giả. Ẩn/xóa đặt `moderation_status='rejected'` để view điểm số hiện tại lập tức loại đánh giá. Bản sửa được duyệt mới thay `stars/content` của dòng công khai.

## Triển khai và nghiệm thu
1. Chạy migration 0011 trên nhánh Neon tách biệt và kiểm tra bảng, quyền đọc. Chỉ áp dụng Neon chính trước khi deploy API; không chạy trên DB 11Ship/AutoTrade.
2. Chạy `npm run check` (lint, node tests, Next build) qua CI PR.
3. Bước 2: nối UI đánh giá thực tế và hàng chờ Admin, thử đăng nhập Google, 1–5 sao, 409 khi trùng, 401 khi chưa login, duyệt mới/sửa/ẩn; xác nhận điểm công khai thay đổi đúng.

Lưu ý: API không công khai số điện thoại/email, không trả nội dung đang chờ cho người xem khác. Các endpoint GET luôn gửi `Cache-Control: no-store` vì cùng phản hồi có thể chứa đánh giá riêng tư của người đăng nhập.
