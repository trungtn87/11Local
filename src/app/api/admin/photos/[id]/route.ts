import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Ảnh không hợp lệ" }, { status: 400 });
  }
  try {
    // Intentional hard delete: admin explicitly requests photo removal.
    // Removes the stored binary, not the album or Google account.
    const rows = await db().unsafe(
      "DELETE FROM family_photos WHERE id::text=$1 RETURNING id",
      [id],
    );
    return rows.length
      ? NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
      : NextResponse.json({ error: "Không tìm thấy ảnh" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Không thể xóa ảnh" }, { status: 500 });
  }
}
