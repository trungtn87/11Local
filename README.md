# 11Local

Nền tảng khám phá địa phương, bắt đầu từ Cao Bằng. Ứng dụng gồm giao diện demo đa màn hình cho khách, thành viên, chủ địa điểm và quản trị viên; bản đồ MapLibre thật của **MAP-01A** vẫn có tại `/map`.

## Công nghệ

- Next.js (App Router) + TypeScript
- MapLibre GL JS
- OpenFreeMap Bright (dữ liệu OpenStreetMap), không cần API key cho giai đoạn prototype
- Giao diện demo V1 với dữ liệu hư cấu, chưa kết nối backend hoặc xác thực thật

## Chạy local

Yêu cầu Node.js 22+ và npm.

```bash
npm ci
npm run dev
```

Mở `http://localhost:3000` để xem giao diện chính hoặc `http://localhost:3000/map` để xem bản đồ MapLibre thật.

Các route demo tiêu biểu: `/tim-kiem`, `/ban-do`, `/dia-diem/p1`, `/dong-gop`, `/quan-ly` và `/admin`. Công cụ ở góc màn hình cho phép đổi vai trò và trạng thái giao diện; đây không phải phân quyền thật.

Các bước kiểm tra:

```bash
npm run lint
npm test
npm run build
```

## Deploy lên Render

Repo có `render.yaml` để tạo một Node web service tại Singapore:

1. Merge code vào branch deploy (thường là `main`).
2. Trong Render Dashboard, chọn **New → Blueprint** và kết nối repo này.
3. Kiểm tra service `11local-web`, sau đó Apply Blueprint.

Render chạy `npm ci && npm run build`, khởi động bằng `npm start` và kiểm tra sức khỏe tại `/map`. Ứng dụng không dùng API riêng của Render nên có thể chuyển sang VPS hỗ trợ Node.js mà không đổi code.

### Đổi nguồn bản đồ

Mặc định ứng dụng dùng style công khai:

```text
https://tiles.openfreemap.org/styles/bright
```

Có thể đặt `NEXT_PUBLIC_MAP_STYLE_URL` trong môi trường build để chuyển sang style hoặc tile service tự host khi lên VPS. Nên đánh giá lại hạn mức/chính sách nguồn tile trước khi tăng lưu lượng production.
