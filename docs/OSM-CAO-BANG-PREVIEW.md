# 11Local — Lấy và lọc OpenStreetMap Cao Bằng (chỉ xem trước)

## An toàn dữ liệu

**Không ghi Neon, không thêm vào trang công khai, không có endpoint import.** Công cụ chạy Node.js độc lập, không import `db.ts`, không đọc `DATABASE_URL` và chỉ ghi các file vào `tmp/osm-preview/`. Workflow GitHub không có secrets và chỉ có quyền `contents: read`.

## Nguồn và phạm vi

- Overpass API truy vấn theo **ranh giới hành chính cấp tỉnh Cao Bằng**, không dùng bounding box bao cả tỉnh. Nếu không tìm thấy ranh giới, lệnh dừng thay vì thông báo sai là 0 địa điểm.
- Dữ liệu © OpenStreetMap contributors, giấy phép **ODbL 1.0**. Khi tái sử dụng dữ liệu cần ghi nguồn và tuân thủ nghĩa vụ ODbL, bao gồm chia sẻ dữ liệu phái sinh khi áp dụng.
- Đọc node/way/relation có tên, tọa độ, tag liên quan du lịch/ăn uống/lưu trú/mua sắm/dịch vụ. Không tự tạo địa chỉ hay nội dung giả. Một số loại shop và service đang ẩn trên trang chủ 11Local nhưng **vẫn chỉ xuất danh sách xem trước**.
- Các nhóm food, cafe, stay, sight, shop, service khớp ID danh mục trong Neon. Chất lượng dữ liệu phụ thuộc mức độ đóng góp trên OSM.

## Chạy

Yêu cầu Node.js 22+; không cần cài thêm npm package:

~~~bash
node --test scripts/osm-preview.test.mjs
node scripts/osm-preview.mjs
~~~

Hoặc dùng **Actions → OSM Cao Bang preview (no database writes) → Run workflow**. Sau khi job hoàn tất, tải artifact `osm-cao-bang-preview` gồm:

- `candidates.csv`: danh sách có thể mở trong Excel, sắp theo độ đầy đủ thông tin, đã chống CSV formula injection.
- `candidates.json`: dữ liệu chuẩn hóa, bao gồm OSM ID, chất lượng, cảnh báo trùng.
- `report.md`: thống kê số lượng theo 6 danh mục và tình trạng cần xác minh.

Nếu Overpass bị quá tải, dùng file JSON đã có từ Overpass:

~~~bash
node scripts/osm-preview.mjs --input /path/to/overpass.json
~~~

Nếu có file **xuất riêng** từ 11Local (JSON array hoặc object có mảng places chứa id,name,latitude,longitude), có thể so khớp trùng **không cần kết nối database**:

~~~bash
node scripts/osm-preview.mjs --input /path/to/overpass.json --existing /path/to/11local-export.json
~~~

Không có --existing thì báo cáo sẽ ghi comparedExisting=0: **chưa** so khớp với các địa điểm hiện có trong Neon. Các cặp nghi trùng được gắn nhãn để Admin duyệt, không tự xóa dữ liệu. Thay thư mục output bằng --out-dir nếu cần. Không commit dữ liệu thu thập được vào GitHub repo.

## Google Maps

CSV chỉ có liên kết **mở Google Maps Search để kiểm tra thủ công**; đây không phải việc đồng bộ sao/lượt đánh giá và không dùng Google Places API. Muốn ghép đánh giá Google phải có Places API key, kiểm tra chi phí, quy định hiển thị, attribution và giới hạn lưu trữ. **Không được sao chép rating và userRatingCount Google về Neon để xếp hạng lâu dài**. Trong 11Local, bảng xếp hạng vẫn độc lập trên lượt xem/đánh giá cộng đồng.

## Quy trình xét duyệt

1. Đọc report.md, xem tỷ lệ thiếu địa chỉ và nghi trùng.
2. Kiểm tra CSV/OSM URL/Google Maps bằng tay. Xem xét ảnh, địa chỉ, chủ sở hữu riêng; không tự lấy ảnh Google.
3. Admin quyết định dữ liệu nào đủ chất lượng để nhập ở bước triển khai tiếp theo **sau khi được Owner cho phép**.
