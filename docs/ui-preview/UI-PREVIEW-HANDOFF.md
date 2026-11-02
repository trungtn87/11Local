# 11Local UI Preview V1 — Bàn giao

> Chỉ là giao diện. Không backend, không database, không xác thực, không bản đồ thật. Toàn bộ dữ liệu là **demo hư cấu** (`src/data/demo.js`).

## Khởi động trên Windows
Cần Node.js 18+. Nhấp đúp `ui-preview\start-preview.bat` (tự cài thư viện lần đầu rồi mở http://127.0.0.1:5173), hoặc:
```powershell
cd D:\11Local\ui-preview
npm install
npm run dev
```
Ảnh chụp: `npm run build; npm run shots` → `screenshots/` (mobile 390 px và desktop 1366 px, dùng Edge/Chrome cài sẵn).

**Xem Admin / Chủ địa điểm:** bấm nút thanh chỉnh (góc trên phải trên mobile, góc dưới trái trên desktop) → chọn vai trò; hoặc mở `http://127.0.0.1:5173/?role=admin`, `?role=owner`, `?role=member`; ép trạng thái bằng `?state=loading|empty|error|offline`. Đây là **công tắc giao diện, không phải phân quyền**.

## Màn hình (20/20 đã có)
Khách: Trang chủ `/` · Tìm kiếm + danh sách + lọc `/tim-kiem` · Bản đồ `/ban-do` (và chế độ bản đồ cạnh danh sách trên desktop) · Chi tiết `/dia-diem/:id` · Album ảnh (lightbox) · Đánh giá (trong chi tiết) · Đóng góp 4 bước `/dong-gop` · Báo sai / gửi ảnh `/bao-sai/:id` · Theo dõi bằng mã `/theo-doi` · Đăng nhập/đăng ký SĐT+OTP `/dang-nhap` · Tài khoản `/tai-khoan`.
Chủ địa điểm: Yêu cầu quản lý `/nhan-quyen/:id` · Dashboard `/quan-ly` · Chỉnh sửa thông tin/ảnh/menu `/quan-ly/chinh-sua/:id`.
Admin: Tổng quan `/admin` · Địa điểm `/admin/dia-diem` · Hàng chờ `/admin/hang-cho` · Chi tiết hồ sơ `/admin/ho-so/:id` · Duyệt/từ chối/bổ sung (cùng trang) · Xác minh quản lý `/admin/xac-minh`.

## Đã tương tác được (mô phỏng, chỉ trong bộ nhớ, mất khi tải lại)
- Tìm không dấu; lọc danh mục/khu vực/xác minh quản lý; sắp xếp; bộ lọc **giữ nguyên** khi đổi danh sách ↔ bản đồ; yêu thích; trạng thái tải/trống/lỗi/mất mạng.
- Bản đồ giả lập: chọn ghim, gộp ghim, phóng to/thu nhỏ, "Tìm trong vùng", "Gần tôi" (vị trí giả).
- Chi tiết: lightbox, tab ảnh/menu, Gọi/Chỉ đường/Chia sẻ (toast), viết/rút đánh giá (chặn khi chưa đăng nhập), ẩn nút Gọi khi thiếu số, ảnh mặc định.
- Đóng góp: tìm trùng, kiểm tra lỗi từng trường, đặt ghim, thêm ảnh mẫu, gửi → **mã tra cứu DEMO** → tra cứu; vòng "cần bổ sung".
- Đăng nhập OTP (nhập 6 số bất kỳ; `000000` để xem lỗi, đếm ngược gửi lại).
- Yêu cầu quản lý (cảnh báo tranh chấp khi đã có người quản lý); Dashboard chủ quán (khoảng ngày, thống kê demo, phản hồi); soạn thay đổi gửi duyệt; ảnh cộng đồng chỉ xem.
- Admin: lọc hàng chờ; so sánh bản công khai ↔ đề xuất; gợi ý trùng; duyệt/từ chối/bổ sung **bắt buộc căn cứ/lý do**; mô phỏng xung đột phiên bản (hai Admin); ẩn/hiện địa điểm (ảnh hưởng ngay trang khách); xác minh quản lý với 5 điều kiện.

## Còn là placeholder
Bản đồ thật, định tuyến, OTP/đăng nhập/phân quyền thật, lưu dữ liệu, tải ảnh thật, hợp nhất hồ sơ trùng, duyệt đánh giá/phản hồi, tranh chấp quản lý, quản lý người dùng/danh mục/nhật ký (Admin), thống kê thật, SEO/chia sẻ, hiệu năng. Duyệt hồ sơ **chưa** tự đưa địa điểm mới lên trang công khai (AT02 chỉ hoàn tất khi có backend).

## Điểm cần Owner duyệt trước khi làm bản đồ
1. Hướng thị giác: bảng màu ngọc lam–hổ phách–chàm, font Be Vietnam Pro, ảnh minh họa SVG (khi có ảnh thật cần nguồn và quyền sử dụng).
2. Bố cục điều hướng mobile 4 mục và nút Đóng góp nổi bật.
3. Luồng đóng góp 4 bước và hiển thị mã tra cứu; quy tắc bắt buộc (tên, danh mục, khu vực, địa chỉ, ghim).
4. Hiển thị khoảng cách "đường thẳng" và không có lọc "Đang mở cửa" (dữ liệu giờ chưa đủ).
5. Kiểu thẻ địa điểm: có sao khi có đánh giá, "Chưa có đánh giá" khi không.
6. Bản đồ: cách gộp ghim, thẻ địa điểm khi chạm ghim, nút "Tìm trong vùng này", xử lý từ chối GPS/lỗi bản đồ (danh sách vẫn dùng được); sau đó mới chọn nhà cung cấp bản đồ (quyết định kỹ thuật riêng, tr.14).
7. Các mục [P]/[U] trong tài liệu v1 (duyệt trước mọi thay đổi của chủ quán, một quản lý chính, giới hạn ảnh 10 MB/10 ảnh, gộp lượt xem 30 phút…) UI chỉ **minh họa**, chưa phải quyết định đã chốt; PLAN.md vẫn REVISE.
8. Tên miền Admin: nên tách khu quản trị khỏi giao diện khách khi triển khai thật.

## Giới hạn đã tuân thủ
Không sửa PLAN.md/docs, không commit/push, không chạy Claudex Loop, không đụng 11Ship. Mọi file mới nằm trong `D:\11Local\ui-preview\`.
