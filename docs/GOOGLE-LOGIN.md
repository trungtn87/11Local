# Đăng nhập Google

Luồng: `/dang-nhap` → `/api/auth/google/start` → Google → `/api/auth/google/callback` → trang yêu cầu ban đầu hoặc `/tai-khoan`.

## Cấu hình máy chủ

- `DATABASE_URL`: Neon hiện tại; không tạo database mới.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: OAuth client loại **Web application** trong Google Auth Platform. Secret chỉ đặt ở máy chủ.
- `USER_SESSION_SECRET`: chuỗi ngẫu nhiên tối thiểu 32 ký tự; giữ ổn định qua các lần deploy. Blueprint tự sinh khi tạo service.
- Áp dụng migration `migrations/0006_google_auth.sql` nếu chưa có. Migration giữ dữ liệu users cũ, thêm Google subject và thông tin hồ sơ.

Trong Google Auth Platform, đặt tên ứng dụng 11Local, cấu hình Branding/Audience và client Web application. Thêm chính xác redirect URI:

```
https://one1local-web.onrender.com/api/auth/google/callback
http://localhost:3000/api/auth/google/callback
```

Khi dùng tên miền riêng, thêm callback của tên miền đó trước khi chuyển lưu lượng. Khi ứng dụng Google còn ở Testing, thêm email thử nghiệm vào Test users; chuyển Production khi mở cho cộng đồng.

## Nghiệm thu

1. Mở `/dang-nhap`, chọn Google; lần đầu tạo một user theo `google_sub`.
2. Đăng xuất và đăng nhập lại cùng Google: giữ user ID, cập nhật tên/email/ảnh.
3. Mở `/api/auth/google/start?returnTo=%2Fquan-ly`: đăng nhập xong trở về `/quan-ly`.
4. Hủy consent: trở về trang đăng nhập với thông báo. Callback thiếu/sai state không tạo tài khoản.
5. Đăng xuất: cookie phiên bị xóa, `/api/auth/session` trả anonymous.
6. Đăng nhập Google không cấp quyền Admin hoặc quyền chủ địa điểm; các quyền này giữ luồng xác minh riêng.

Chỉ thông tin hồ sơ cơ bản được lưu; không lưu access token Google. Phiên 11Local ký HMAC, cookie HttpOnly, SameSite=Lax và Secure ở production, hết hạn sau 30 ngày.

Tài liệu Google: https://developers.google.com/identity/openid-connect/openid-connect
