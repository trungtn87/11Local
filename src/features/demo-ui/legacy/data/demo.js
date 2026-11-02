// ============================================================================
// DỮ LIỆU DEMO — KHÔNG PHẢI DỮ LIỆU THẬT
// Toàn bộ tên địa điểm, người dùng, đánh giá, lượt xem, số liệu dưới đây là hư cấu,
// chỉ để xem thử giao diện. Không được dùng làm nội dung công khai (v1 tr.4, tr.13).
// Địa danh hành chính (khu vực) chỉ dùng để minh họa bộ lọc.
// ============================================================================

export const DEMO_NOTICE = 'Dữ liệu demo hư cấu — không phải địa điểm thật';

export const categories = [
  { id: 'food', label: 'Ăn uống', icon: 'utensils', enabled: true },
  { id: 'cafe', label: 'Cafe', icon: 'coffee', enabled: true },
  { id: 'stay', label: 'Lưu trú', icon: 'bed', enabled: true },
  { id: 'sight', label: 'Tham quan', icon: 'mountain', enabled: true },
  { id: 'shop', label: 'Mua sắm', icon: 'shopping-bag', enabled: true },
  // v1 tr.5: "Chỉ mở nhóm có dữ liệu phù hợp" — nhóm chưa có dữ liệu hiển thị khóa
  { id: 'service', label: 'Dịch vụ', icon: 'wrench', enabled: false },
];

export const areas = ['TP. Cao Bằng', 'Hòa An', 'Trùng Khánh', 'Hạ Lang', 'Quảng Hòa', 'Nguyên Bình', 'Bảo Lạc'];

// x, y: vị trí 0–100 trên bản đồ giả lập (không phải tọa độ thật)
export const places = [
  { id: 'p1', name: 'Quán Bếp Than Đầu Nguồn', cat: 'food', area: 'TP. Cao Bằng', address: 'Số 12, phố Demo A, phường Demo', x: 46, y: 52, phone: '0200 000 0001', hours: '06:30 – 21:30 hằng ngày', price: '50.000 – 120.000đ', managed: true, op: 'active', rating: { avg: 4.6, count: 5 }, art: { kind: 'food', seed: 3 }, photos: { official: 4, community: 5 }, menu: true, updated: '28/10/2026',
    desc: 'Quán demo phục vụ món nướng và lẩu theo mùa. Mô tả này là văn bản mẫu để thử bố cục trang chi tiết.' },
  { id: 'p2', name: 'Cafe Sương Mù', cat: 'cafe', area: 'TP. Cao Bằng', address: 'Số 5, ngõ Demo B', x: 52, y: 46, phone: null, hours: null, price: null, managed: false, op: 'unknown', rating: null, art: { kind: 'cafe', seed: 7 }, photos: { official: 0, community: 2 }, menu: false, updated: '30/10/2026',
    desc: 'Địa điểm demo thiếu số điện thoại và giờ mở cửa — dùng để thử trạng thái “không có nút Gọi giả” (AT05).' },
  { id: 'p3', name: 'Nhà Sàn Bên Suối', cat: 'stay', area: 'Hòa An', address: 'Xóm Demo C, xã Demo', x: 36, y: 40, phone: '0200 000 0003', hours: 'Nhận phòng 14:00 – 22:00', price: '300.000 – 600.000đ', managed: true, op: 'active', rating: { avg: 4.2, count: 3 }, art: { kind: 'stay', seed: 11 }, photos: { official: 6, community: 1 }, menu: false, updated: '25/10/2026',
    desc: 'Nhà sàn demo cho khách nghỉ qua đêm, gần suối. Nội dung hư cấu chỉ để minh họa.' },
  { id: 'p4', name: 'Điểm Ngắm Hoàng Hôn Đỉnh Demo', cat: 'sight', area: 'Trùng Khánh', address: 'Đường lên đồi Demo', x: 72, y: 28, phone: null, hours: 'Cả ngày', price: 'Miễn phí', managed: false, op: 'active', rating: null, art: { kind: 'sight', seed: 5 }, photos: { official: 0, community: 8 }, menu: false, updated: '27/10/2026',
    desc: 'Điểm tham quan demo. Chưa có đánh giá nào để thử trạng thái “Chưa có đánh giá”.' },
  { id: 'p5', name: 'Thác Nước Giả Lập', cat: 'sight', area: 'Hạ Lang', address: 'Bản Demo, xã Demo', x: 84, y: 20, phone: null, hours: null, price: null, managed: false, op: 'temp-closed', rating: { avg: 4.8, count: 2 }, art: { kind: 'water', seed: 2 }, photos: { official: 0, community: 6 }, menu: false, updated: '20/10/2026',
    desc: 'Địa điểm demo đang “tạm đóng” — trạng thái hoạt động hiển thị riêng, không lẫn với trạng thái kiểm duyệt (v1 tr.6).' },
  { id: 'p6', name: 'Chợ Phiên Demo', cat: 'shop', area: 'Quảng Hòa', address: 'Thị trấn Demo', x: 62, y: 66, phone: null, hours: 'Sáng chủ nhật', price: null, managed: false, op: 'active', rating: null, art: { kind: 'shop', seed: 9 }, photos: { official: 0, community: 3 }, menu: false, updated: '26/10/2026',
    desc: 'Chợ phiên hư cấu, họp theo ngày. Chỉ dùng để thử danh mục Mua sắm.' },
  { id: 'p7', name: 'Phở Chua Cô Demo', cat: 'food', area: 'TP. Cao Bằng', address: 'Số 88, phố Demo D', x: 49, y: 56, phone: '0200 000 0007', hours: '06:00 – 14:00', price: '35.000 – 60.000đ', managed: false, op: 'active', rating: null, art: { kind: 'food', seed: 14 }, photos: { official: 0, community: 1 }, menu: true, updated: '31/10/2026',
    desc: 'Quán demo mới được duyệt, chưa có người quản lý và chưa có đánh giá.' },
  { id: 'p8', name: 'Homestay Gió Núi', cat: 'stay', area: 'Nguyên Bình', address: 'Bản Demo, xã Demo', x: 22, y: 62, phone: '0200 000 0008', hours: 'Nhận phòng 13:00', price: '250.000 – 450.000đ', managed: true, op: 'active', rating: null, art: { kind: 'stay', seed: 21 }, photos: { official: 3, community: 0 }, menu: false, updated: '29/10/2026',
    desc: 'Homestay demo đã xác minh quản lý nhưng chưa ai đánh giá — nhãn xác minh không phải điểm chất lượng (v1 tr.4).' },
  { id: 'p9', name: 'Cafe Đá Vôi', cat: 'cafe', area: 'TP. Cao Bằng', address: 'Số 31, đường Demo E', x: 43, y: 48, phone: '0200 000 0009', hours: '07:00 – 22:00', price: '25.000 – 55.000đ', managed: false, op: 'active', rating: { avg: 3.9, count: 2 }, art: { kind: 'cafe', seed: 17 }, photos: { official: 0, community: 4 }, menu: true, updated: '24/10/2026',
    desc: 'Cafe demo với ánh sáng tự nhiên, dùng để thử danh sách dày ở khu trung tâm.' },
  { id: 'p10', name: 'Lều Săn Mây', cat: 'sight', area: 'Bảo Lạc', address: 'Đỉnh Demo', x: 12, y: 24, phone: null, hours: null, price: null, managed: false, op: 'unknown', rating: null, art: { kind: 'sight', seed: 30 }, photos: { official: 0, community: 0 }, menu: false, updated: '31/10/2026',
    desc: 'Địa điểm demo không có ảnh nào — dùng để thử ảnh mặc định (AT05).' },
];

export const reviewsByPlace = {
  p1: [
    { id: 'r1', user: 'Biệt danh Demo 1', stars: 5, text: 'Nội dung đánh giá mẫu (hư cấu) để xem bố cục danh sách nhận xét.', date: '20/10/2026', reply: 'Phản hồi mẫu của quản lý quán — đã qua Admin duyệt.' },
    { id: 'r2', user: 'Biệt danh Demo 2', stars: 4, text: 'Đánh giá mẫu thứ hai. Có thể có nhiều dòng để thử xuống dòng và rút gọn nội dung dài.', date: '18/10/2026' },
    { id: 'r3', user: 'Biệt danh Demo 3', stars: 5, text: 'Đánh giá mẫu thứ ba.', date: '12/10/2026' },
    { id: 'r4', user: 'Biệt danh Demo 4', stars: 4, text: 'Đánh giá mẫu thứ tư.', date: '09/10/2026' },
    { id: 'r5', user: 'Biệt danh Demo 5', stars: 5, text: 'Đánh giá mẫu thứ năm.', date: '02/10/2026' },
  ],
  p3: [
    { id: 'r6', user: 'Biệt danh Demo 6', stars: 4, text: 'Đánh giá mẫu cho nhà sàn.', date: '15/10/2026' },
  ],
};

export const adminQueue = [
  { id: 'h101', kind: 'new-place', title: 'Cafe Mây Lưng Chừng', area: 'Hòa An', submitter: 'Khách (mã tra cứu)', sub: 'guest', at: '02/11/2026 09:12', age: 'Mới', status: 'pending', version: 1,
    data: { 'Tên': 'Cafe Mây Lưng Chừng', 'Danh mục': 'Cafe', 'Địa chỉ': 'Số 9, đường Demo G, Hòa An', 'Tọa độ': 'Ghim đã kiểm tra', 'Mô tả': 'Quán cafe nhìn ra núi, mở sáng sớm.', 'SĐT công khai': '0200 000 0101' },
    photos: 2, dupes: [{ id: 'p9', name: 'Cafe Đá Vôi', why: 'Tên gần giống, cách ~1,2 km (đường thẳng)' }] },
  { id: 'h102', kind: 'new-place', title: 'Nhà Nghỉ Trăng Non', area: 'TP. Cao Bằng', submitter: 'Biệt danh Demo 7 (thành viên)', sub: 'member', at: '01/11/2026 18:40', age: '1 ngày', status: 'pending', version: 1,
    data: { 'Tên': 'Nhà Nghỉ Trăng Non', 'Danh mục': 'Lưu trú', 'Địa chỉ': 'Số 40, phố Demo H', 'Tọa độ': 'Ghim đã kiểm tra', 'Mô tả': '(không có)', 'SĐT công khai': '(không có)' },
    photos: 0, dupes: [] },
  { id: 'h103', kind: 'edit-place', title: 'Quán Bếp Than Đầu Nguồn', placeId: 'p1', area: 'TP. Cao Bằng', submitter: 'Quản lý đã xác minh', sub: 'manager', at: '01/11/2026 14:05', age: '1 ngày', status: 'pending', version: 3, baseStale: true,
    diff: [
      { k: 'Giờ mở cửa', old: '06:30 – 21:30 hằng ngày', now: '06:30 – 22:30 hằng ngày' },
      { k: 'Khoảng giá', old: '50.000 – 120.000đ', now: '60.000 – 150.000đ' },
    ], photos: 0, dupes: [] },
  { id: 'h104', kind: 'report-error', title: 'Cafe Đá Vôi', placeId: 'p9', area: 'TP. Cao Bằng', submitter: 'Khách (mã tra cứu)', sub: 'guest', at: '31/10/2026 20:21', age: '2 ngày', status: 'pending', version: 1,
    data: { 'Loại báo sai': 'Đã đóng cửa', 'Nội dung': 'Báo mẫu (hư cấu): quán có vẻ đã chuyển đi nơi khác.' }, photos: 1, dupes: [] },
  { id: 'h105', kind: 'photo', title: 'Ảnh mới — Nhà Sàn Bên Suối', placeId: 'p3', area: 'Hòa An', submitter: 'Quản lý đã xác minh', sub: 'manager', at: '30/10/2026 08:00', age: '3 ngày', status: 'pending', version: 1,
    data: { 'Vai trò ảnh': 'Ảnh chính thức (thay ảnh bìa)', 'Số ảnh': '2' }, photos: 2, dupes: [] },
  { id: 'h106', kind: 'new-place', title: 'Quán Cơm Lam Demo', area: 'Quảng Hòa', submitter: 'Khách (mã tra cứu)', sub: 'guest', at: '25/10/2026 11:00', age: '8 ngày — tồn lâu', status: 'needs-info', version: 2,
    data: { 'Tên': 'Quán Cơm Lam Demo', 'Danh mục': 'Ăn uống', 'Địa chỉ': 'Thị trấn Demo', 'Tọa độ': 'Cần xác nhận lại ghim' },
    photos: 0, dupes: [] },
];

export const claims = [
  { id: 'c201', place: 'Homestay Gió Núi', placeId: 'p8', who: 'Người yêu cầu Demo A', role: 'Chủ cơ sở (tự khai)', phoneMatch: true, at: '01/11/2026', status: 'pending', note: 'SĐT tài khoản trùng SĐT quán — đối chiếu nguồn liên hệ trước khi duyệt nhanh.', evidence: ['Ảnh biển hiệu (mẫu)'] },
  { id: 'c202', place: 'Cafe Đá Vôi', placeId: 'p9', who: 'Người yêu cầu Demo B', role: 'Nhân viên (tự khai)', phoneMatch: false, at: '31/10/2026', status: 'verifying', note: 'SĐT khác SĐT quán — cần gọi xác nhận thẩm quyền đại diện.', evidence: [] },
  { id: 'c203', place: 'Quán Bếp Than Đầu Nguồn', placeId: 'p1', who: 'Người yêu cầu Demo C', role: 'Người thân chủ quán (tự khai)', phoneMatch: false, at: '30/10/2026', status: 'dispute', note: 'Địa điểm đã có người quản lý — mở hồ sơ tranh chấp, không chuyển quyền tự động.', evidence: ['Giấy tờ mẫu'] },
];

export const myContributions = [
  { code: 'DEMO-7K3M-Q9XP', title: 'Cafe Mây Lưng Chừng', kind: 'Địa điểm mới', status: 'pending', at: '02/11/2026' },
  { code: 'DEMO-2B8F-L4ZN', title: 'Quán Cơm Lam Demo', kind: 'Địa điểm mới', status: 'needs-info', at: '25/10/2026', message: 'Admin (mẫu): Vui lòng xác nhận lại vị trí ghim trên bản đồ và bổ sung một ảnh mặt tiền.' },
  { code: 'DEMO-5T1W-H6RC', title: 'Phở Chua Cô Demo', kind: 'Địa điểm mới', status: 'approved', at: '30/10/2026' },
  { code: 'DEMO-9D4J-V2YE', title: 'Chợ Phiên Demo', kind: 'Báo sai', status: 'rejected', at: '20/10/2026', reason: 'Lý do từ chối (mẫu): Thông tin báo chưa đủ căn cứ.' },
];

export const ownerStats = {
  range: '7 ngày qua (demo)',
  updated: '02/11/2026 08:00 (giờ Việt Nam)',
  views: 312, calls: 41, directions: 58, links: 9,
  daily: [32, 41, 38, 55, 47, 60, 39],
  days: ['T6', 'T7', 'CN', 'T2', 'T3', 'T4', 'T5'],
};

export const statusLabel = {
  pending: ['Chờ duyệt', 'warning'],
  'needs-info': ['Cần bổ sung', 'info'],
  approved: ['Đã duyệt', 'success'],
  rejected: ['Từ chối', 'danger'],
  withdrawn: ['Đã rút', 'neutral'],
  hidden: ['Bị ẩn', 'neutral'],
  verifying: ['Đang xác minh', 'info'],
  dispute: ['Tranh chấp', 'danger'],
  cancelled: ['Đã hủy', 'neutral'],
};

export const opLabel = {
  unknown: ['Chưa rõ hoạt động', 'neutral'],
  active: ['Đang hoạt động', 'success'],
  'temp-closed': ['Tạm đóng', 'warning'],
  closed: ['Ngừng hoạt động', 'danger'],
};

export const kindLabel = {
  'new-place': 'Địa điểm mới', 'edit-place': 'Sửa thông tin', 'report-error': 'Báo sai', photo: 'Ảnh', review: 'Đánh giá', claim: 'Nhận quyền',
};

export const byId = (id) => places.find((p) => p.id === id);
export const catLabel = (id) => categories.find((c) => c.id === id)?.label ?? id;

// Tìm không dấu (v1 tr.5)
export const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
