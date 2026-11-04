# OWN-02 — Giao diện xác minh chủ địa điểm — Bước 2

## Giao diện thật, không dùng dữ liệu mẫu
- Trang chi tiết địa điểm business: thêm CTA "Yêu cầu nhận quyền quản lý" về `/nhan-quyen/:slug`.
- Google user: form gửi yêu cầu, tự nhận place UUID từ `/api/places?slug=`, không cho nhập tự do id, không tự nhận quyền chỉ vì Google/email/số điện thoại.
- Sau khi gửi: chuyển đến `/yeu-cau-nhan-quyen?claim=:id`, đọc trạng thái và lịch sử của chính người dùng từ `/api/me/ownership-claims`; upload WebP chứng minh từ ảnh gốc / phản hồi khi `needs_info`.
- Trang tài khoản có liên kết "Yêu cầu nhận quyền" và "Địa điểm của tôi".
- `/quan-ly` chỉ liệt kê địa điểm có quyền active qua `/api/me/managed-places`, chưa giả lập chức năng chỉnh sửa (đó là Bước 3).
- Trang Admin `/admin/xac-minh` dùng phiên Admin hiện hành, hàng chờ 30 mục/trang, các bộ lọc, hồ sơ, minh chứng riêng tư, phản hồi, tình trạng quản lý, đối chiếu thủ công và hành động duyệt, từ chối, yêu cầu bổ sung, tranh chấp.
- Cấp/tạm khóa/thu hồi/khôi phục manager qua API; tác động thực tế và logging ở backend OWN-01.
- Form validate ở client chỉ hỗ trợ UX; server là thẩm quyền cuối cùng.

## Kịch bản nghiệm thu sau khi triển khai
1. Khách chưa đăng nhập vào địa điểm business -> CTA đăng nhập Google; quay lại đúng form.
2. Địa điểm `attraction` không có CTA; link direct không nhận quyền.
3. Tài khoản Google gửi form: thấy hồ sơ thật và trạng thái pending, upload tối đa 3 ảnh; chỉ Admin xem ảnh.
4. Admin phiên chưa đăng nhập: chỉ thấy nút về /admin, không đọc được dữ liệu.
5. Admin yêu cầu bổ sung; người gửi gửi tin và hồ sơ quay về pending, không mất lịch sử.
6. Admin duyệt sau khi ghi phương pháp xác minh; `/quan-ly` nhận quyền mới khi refresh.
7. Admin từ chối/tranh chấp có lý do; hai chủ active không thể tồn tại, error OWNER_EXISTS rõ ràng.
8. Suspend/revoke một manager: người đó biến khỏi `/quan-ly` sau lần tải kế tiếp.
9. Mobile (<=700px) và desktop >=1200px: form và Admin không tràn ngang, nút có nhãn và trạng thái lỗi.
10. Không có dữ liệu giả, không lộ bằng chứng qua API công khai, không thay đổi ảnh cộng đồng.

## Thứ tự triển khai
- PR OWN-01 backend phải merge trước. DB Neon 11Local phải áp dụng và kiểm tra migration `0012_ownership_management.sql` trước khi deploy UI mới.
- OWN-02 tạo PR riêng dựa trên branch OWN-01. Sau khi OWN-01 merge, retarget OWN-02 vào main và chạy CI lại.
- Chưa áp dụng migration hoặc ghi dữ liệu vào Neon production chỉ bằng việc mở PR.
