# OWN-01 — Xác minh và quản lý chủ địa điểm — Bước 1

## Mục tiêu và giới hạn

- Google OAuth hiện có chỉ xác thực người dùng; KHÔNG mặc nhiên xác minh chủ quán.
- Chỉ địa điểm business đã công khai mới nhận yêu cầu. Admin xác minh thủ công và quyết định.
- Một địa điểm có tối đa một `owner` với `status='active'` (unique index ở migration 0007).
- Chủ có thể quản lý nhiều địa điểm; Admin có thể phân quyền thêm `manager`.
- Không sửa schema hay ID dữ liệu địa điểm, Google user, ảnh và đánh giá cũ.
- Bước 1 là backend; UI nhận quyền/Admin/dashboard chủ quán triển khai ở bước 2/3.
- Không chạy migration tự động khi build Render. Sau khi PR được duyệt, chạy 0012
  trên database 11Local Neon đúng môi trường trước khi deploy route mới.
- Tuyệt đối không chạy migration trên 11Ship hoặc AutoTrade.

## Database

`migrations/0012_ownership_management.sql` mở rộng `ownership_claims` để ghi
tên, SĐT, quan hệ, phiên bản, phương pháp xác minh, người duyệt thủ công qua
Admin session (actor_user_id ở audit log là NULL vì Admin session chưa gắn user).
Bổ sung `needs_info` vào check trạng thái. Các bảng mới:
- `ownership_claim_messages`: tin Admin yêu cầu bổ sung, người gửi phản hồi.
- `ownership_claim_evidence_images`: WebP riêng tư, 3 ảnh/yêu cầu, tối đa 2 MiB
  sau nén; không có route công khai và không liên quan `place_photos`.
- `ownership_claim_limits`: tối đa 5 yêu cầu/tài khoản Google/24 giờ.
- `place_managers.version`: chống cập nhật đồng thời.

Mọi bảng chứa bằng chứng riêng tư bị REVOKE từ `anonymous`,
`local_public_reader`, `PUBLIC`. Không thêm bất kỳ bảng nào vào `api.public_places`.

## API — Google authenticated

| Method | URL | Tác dụng |
|---|---|---|
| POST | /api/ownership-claims | JSON `{placeId,claimantName,contactPhone,relationship:'owner'|'authorized',statement}` |
| GET | /api/me/ownership-claims | Yêu cầu và tin nhắn **chỉ của tôi** |
| POST | /api/ownership-claims/:id/reply | JSON `{expectedVersion,message}`, chỉ từ `needs_info` |
| POST | /api/ownership-claims/:id/evidence | Multipart `file`, 1 ảnh/lần, 3 ảnh/yêu cầu |
| GET | /api/me/managed-places | Chỉ những địa điểm có vai trò active |

Gửi yêu cầu mới chỉ khi không có yêu cầu đang mở của cùng user/place.
Trạng thái `pending`, `needs_info`, `disputed` được coi là đang mở.
Đã bị từ chối có thể gửi lại; approved không tự tạo quyền nếu không có Admin duyệt.
Ảnh chứng minh chỉ nhận trong `pending` hoặc `needs_info`.

## API — Admin session only

| Method | URL | Tác dụng |
|---|---|---|
| GET | /api/admin/ownership-claims?status=pending&page=1 | Danh sách tối đa 30 yêu cầu/trang |
| GET | /api/admin/ownership-claims/:id | Thông tin, tin nhắn, bằng chứng và người quản lý |
| GET | /api/admin/ownership-claims/:id/evidence/:photoId | Đọc ảnh riêng tư |
| POST | /api/admin/ownership-claims/:id/decision | JSON `{action,expectedVersion,note?,reviewMethod?}` |
| POST | /api/admin/place-managers/:placeId/decision | JSON `{action,userId,expectedVersion?,note}` |

Các `action` nhận quyền: `approve`, `reject`, `needs_info`, `dispute`.
Duyệt `approve` bắt buộc `reviewMethod` (>=5 ký tự) như 'Đã gọi xác minh'.
Các thao tác khác bắt buộc `note` (>=5 ký tự), lý do trả cho người gửi.
Nếu đã có active owner, `approve` trả 409 OWNER_EXISTS. Để chuyển chủ,
Admin phải xem xét chứng cứ và đình chỉ/thu hồi chủ cũ trước khi duyệt người mới.
Không tự động chuyển quyền chỉ vì có thêm người yêu cầu.

Các `action` quản lý: `grant_manager`, `suspend`, `resume`, `revoke`.
Không cấp `owner` trực tiếp qua manager API; chỉ cấp từ ownership claim approved.
Resume chủ cũ không được vượt qua ràng buộc một active owner. Tất cả thao tác
có audit log và transaction khóa hàng `places` trước khi thay đổi quan hệ.

## Bất biến và nghiệm thu

1. Không có Google session -> 401; Google user chỉ đọc/gửi yêu cầu của chính mình.
2. Người gửi không thể tự duyệt/cấp quyền; admin session tách khỏi session Google.
3. Race giữa hai duyệt claim của một place: chỉ một active owner được cấp quyền.
4. Yêu cầu đã duyệt/từ chối không được duyệt lần 2; version cũ -> 409.
5. Trạng thái tranh chấp không tự thu hồi chủ hiện tại. Admin có thể suspend và
   resolve bằng quyết định thủ công; `places.ownership_status` được tính lại.
6. Suspend/revoke có hiệu lực tức thì trong `getManagedPlaceRole` và API danh sách;
   không thể dùng vai trò được gửi lên từ trình duyệt để vượt quyền.
7. Bằng chứng không công khai, không có trong ảnh quán, không cho truy cập từ user khác.
8. API thay đổi dữ liệu có Origin check, giới hạn kích thước đầu vào, version guard.
9. `npm run check` phải xanh trên PR; smoke test Neon thật sau migration cần chạy
   với tài khoản test và Admin test, KHÔNG dùng ảnh/bằng chứng cá nhân thực.
10. Chức năng chỉnh sửa và upload ảnh của chủ quán thuộc Bước 3 và sẽ gọi
    `getManagedPlaceRole` ở phía server trước mỗi ghi dữ liệu. Bản sửa đang chờ
    duyệt không được vào public view; khi người gửi bị thu hồi quyền, việc duyệt
    bản sửa cũ cũng phải kiểm tra quyền hiện tại.

## Rollout

- Kiểm tra migration dry-run trên bản sao/nhánh Neon trước, đặc biệt dữ liệu
  `ownership_claims` cũ và partial unique index.
- Apply migration 0012 lên DB 11Local sau khi có backup. Xác minh privileges
  và kiểm tra không thay đổi ID của `places`, `users`, `place_photos`.
- Deploy backend; kiểm tra việc tạo claim, bổ sung, duyệt, từ chối, tranh chấp,
  đình chỉ và thu hồi với các phiên test riêng. Sau đó triển khai UI ở Bước 2.
