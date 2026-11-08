"use client";

import Link from "next/link";
import { GauEmptyMascot } from "@/components/gau-mascot";

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="wrap narrow">
      <div className="empty-scrapbook" role="alert">
        <GauEmptyMascot width={104} height={96} className="empty-mascot" />
        <h2>Chưa tải được trang kỷ niệm này</h2>
        <p>
          Đường truyền đang bận một chút. Gia đình mình bấm thử lại để xem tiếp
          cuốn album của Gấu nhé!
        </p>
        <div className="empty-actions">
          <button type="button" className="primary" onClick={() => reset()}>
            Thử lại
          </button>
          <Link href="/" className="secondary">
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
