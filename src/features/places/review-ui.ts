export type ReviewRatingRow = { stars: number; count: number; ratio: number };
export type ReviewDistribution = { stars: number | string; count: number | string };
export function reviewRatingRows(distribution: ReviewDistribution[], total: number): ReviewRatingRow[] {
  const counts = new Map<number, number>();
  for (const entry of distribution) {
    const star = Number(entry.stars);
    const count = Number(entry.count);
    if (Number.isInteger(star) && star >= 1 && star <= 5 &&
      Number.isInteger(count) && count >= 0) counts.set(star, count);
  }
  const denominator = Number.isFinite(total) && total > 0 ? total : 0;
  return [5, 4, 3, 2, 1].map(stars => {
    const count = counts.get(stars) ?? 0;
    return { stars, count, ratio: denominator ? Math.min(100, (count / denominator) * 100) : 0 };
  });
}

export function reviewPageCount(count: number, perPage = 10): number {
  return Math.max(1, Math.ceil(Math.max(0, Number.isFinite(count) ? count : 0) / perPage));
}

export function reviewStatusMessage(status: string, hasPendingRevision: boolean): string {
  if (hasPendingRevision) return "Bản chỉnh sửa đang chờ duyệt. Đánh giá cũ vẫn công khai.";
  if (status === "approved") return "Đánh giá của bạn đã được công khai.";
  if (status === "pending") return "Đánh giá của bạn đang chờ Admin duyệt.";
  if (status === "rejected") return "Đánh giá chưa được duyệt. Bạn có thể chỉnh sửa và gửi lại.";
  return "";
}

const feedback: Record<string, string> = {
  LOGIN_REQUIRED: "Bạn cần đăng nhập Google trước khi đánh giá.",
  REVIEW_EXISTS: "Bạn đã đánh giá địa điểm này. Hãy chỉnh sửa đánh giá hiện có.",
  RATE_LIMITED: "Bạn đã gửi nhiều lần trong hôm nay. Vui lòng thử lại sau.",
  STALE_VERSION: "Đánh giá đã thay đổi ở phiên khác. Mình đã tải lại dữ liệu, hãy kiểm tra và thử lại.",
  INVALID_STARS: "Hãy chọn từ 1 đến 5 sao.",
  INVALID_CONTENT: "Nội dung tối đa 1.000 ký tự và không chứa ký tự điều khiển.",
  PLACE_NOT_FOUND: "Địa điểm không còn được công khai.",
  NOT_FOUND: "Không tìm thấy đánh giá này.",
};
export function reviewFeedback(code: string): string {
  return feedback[code] ?? "Chưa thực hiện được. Vui lòng thử lại.";
}
