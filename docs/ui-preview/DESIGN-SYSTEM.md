# 11Local — Design System V1 (đề xuất, chờ Owner duyệt)

Nguồn thực thi: `src/styles/tokens.css`, `src/styles/app.css`, `src/components/*`.

## Định hướng
Sáng, thoáng, ảnh là trung tâm. Bản sắc Cao Bằng qua màu: **ngọc lam** (thác, núi đá vôi), **hổ phách** (hạt dẻ, lúa chín), **chàm** (vải Tày–Nùng, dùng cho khu Admin/dữ liệu demo). Không sao chép giao diện ứng dụng khác. Ảnh trong preview là **minh họa sinh bằng SVG** (không phải ảnh thật).

## Token
| Nhóm | Giá trị chính |
|---|---|
| Primary | `#0f5f52` (700), `#14796a`, `#d6efe9`/`#ebf7f4` nền nhạt |
| Accent (hành động đóng góp) | `#d9822b` (500), `#b9661a` |
| Chàm (Admin, demo) | `#2b3a6b`, `#1f2a52` |
| Nền / chữ | `#faf8f3` nền ấm, `#ffffff` bề mặt, `#1d2623` chữ, `#4b5753`, `#74807b` |
| Trạng thái | success `#1b7f4b`, warning `#a86a00`, danger `#b3261e`, info `#2b5fa8` |
| Font | Be Vietnam Pro (gói cục bộ, đủ dấu tiếng Việt), 12–38 px |
| Spacing | bậc 4 px: 4 8 12 16 20 24 32 40 48 64 |
| Radius | 8 / 12 / 16 / 24 / pill |
| Shadow | `--sh-1..3` |
| Chạm tối thiểu | 44 px |

## Thành phần (đã dựng)
Button (primary / accent / outline / ghost / danger, sm/lg, loading) · Input, Select, Textarea, Field (nhãn, gợi ý, lỗi) · SearchBar · Chip lọc · Segmented · Tabs · Badge trạng thái (kiểm duyệt, hoạt động, xác minh quản lý, demo) · PlaceCard (dọc/ngang) · PlaceArt + ảnh mặc định · Gallery + Lightbox · Rating + phân bố sao · MapView giả lập (ghim, gộp ghim, thẻ địa điểm, "tìm trong vùng", vị trí tham chiếu) · PinPicker · Sheet/Modal/ConfirmDialog · Toast · Banner · StateBlock (trống/lỗi/mất mạng/hạn chế quyền) · Skeleton · Steps · Timeline · Diff · Bảng/Stat/Biểu đồ cột · Decision bar.

## Layout
- **Mobile (≥360 px, ưu tiên):** header logo + tìm kiếm; bottom nav 4 mục *Khám phá · Bản đồ · Đóng góp · Tài khoản* (đủ tầm ngón cái); thanh Gọi/Chỉ đường cố định cuối trang chi tiết; bộ lọc dạng bottom sheet.
- **Tablet (≥640 px):** lưới 3 cột, sheet thành hộp thoại giữa.
- **Desktop (≥960 px):** header có điều hướng; bộ lọc trái, danh sách giữa, bản đồ bật khi cần; chi tiết 2 cột có cột hành động dính; khu quản lý có thanh điều hướng riêng (chàm cho Admin, ngọc lam cho chủ địa điểm).

## Quy tắc nhất quán
1. Nhãn "Đã xác minh quản lý" luôn đi với chú thích: không phải điểm chất lượng.
2. Ba trạng thái tách riêng: kiểm duyệt · hoạt động · quản lý.
3. Mọi trạng thái tải/trống/lỗi/mất mạng/hạn chế quyền có thông điệp + hành động tiếp theo.
4. Hành động gửi: nút khóa + spinner khi đang xử lý.
5. Không hiện nút Gọi khi thiếu số; không đoán giờ mở cửa; "Chưa có đánh giá" khi chưa có dữ liệu.
6. Mọi dữ liệu/ảnh minh họa mang dấu demo; dải demo luôn hiện đầu trang.

---
## Cập nhật V5 (theo `design/11Local Canvas.dc.html`, lượt 3 — chờ Owner duyệt)
Chỉ đổi lớp token/CSS, không đổi chức năng. Nguồn: `src/styles/tokens.css` (+ khối "V5 refinements" cuối `app.css`).
- Font: **Plus Jakarta Sans** (gói cục bộ `@fontsource`, 400–800); tiêu đề 800.
- Màu: primary `#0F766E` (nút chữ trắng) / `#14B8A6` (icon, ghim, chọn) / `#CCFBF1`; accent **vàng `#FFC400`** chỉ cho "Đóng góp"/"Mới duyệt", chữ trên vàng `#3D2800`; nền `#F7F8FA`, viền `#EAECF0`, chữ `#191919`/`#475467`/`#667085`. Chàm của V1 được thay bằng xám đá cho khu Admin.
- Bo góc 12 (nút/ô nhập) · 16 (thẻ) · 20 (hero/sheet) · pill; bóng `rgba(16,24,40,…)`.
- Dải demo: nền `#F0FDFA`, chip "DEMO" vàng nhạt.
- Chưa làm: icon Phosphor duotone (vẫn dùng Lucide).
