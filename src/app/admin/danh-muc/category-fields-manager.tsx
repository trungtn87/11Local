"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save, Settings2 } from "lucide-react";
import styles from "./category-fields.module.css";

type FieldType = "text" | "long_text" | "number" | "boolean" | "url" | "select" | "multi_select";
type Field = {
  id: string;
  category_id: string;
  field_key: string;
  label: string;
  field_type: FieldType;
  help_text: string | null;
  options: string[];
  is_required: boolean;
  is_visible: boolean;
  sort_order: number;
  used_count: number;
};
type Draft = {
  field_key: string;
  label: string;
  field_type: FieldType;
  help_text: string;
  optionsText: string;
  is_required: boolean;
  is_visible: boolean;
};
const empty = (): Draft => ({
  field_key: "", label: "", field_type: "text", help_text: "",
  optionsText: "", is_required: false, is_visible: true,
});
const typeLabels: Record<FieldType, string> = {
  text: "Văn bản ngắn", long_text: "Văn bản dài", number: "Số",
  boolean: "Có / Không", url: "Đường dẫn URL", select: "Chọn một", multi_select: "Chọn nhiều",
};
const errorLabels: Record<string, string> = {
  FIELD_KEY_EXISTS: "Mã trường đã tồn tại trong danh mục.",
  INVALID_FIELD_KEY: "Mã trường chỉ gồm chữ thường, số và dấu gạch dưới; bắt đầu bằng chữ.",
  INVALID_LABEL: "Tên trường phải có từ 1 đến 120 ký tự.",
  INVALID_FIELD_TYPE: "Kiểu dữ liệu không hợp lệ.",
  INVALID_OPTIONS: "Mỗi lựa chọn phải có từ 1 đến 100 ký tự, tối đa 30 lựa chọn.",
  DUPLICATE_OPTIONS: "Danh sách có lựa chọn trùng nhau.",
  OPTIONS_REQUIRED: "Trường chọn một/chọn nhiều phải có ít nhất một lựa chọn.",
  OPTIONS_NOT_ALLOWED: "Kiểu dữ liệu này không sử dụng lựa chọn.",
  FIELD_TYPE_IN_USE: "Trường đã có dữ liệu. Không thể đổi kiểu. Hãy ẩn trường cũ và thêm trường mới.",
  OPTIONS_IN_USE: "Một số địa điểm đang sử dụng lựa chọn bị loại bỏ. Hãy giữ lựa chọn cũ.",
  REQUIRED_FIELD_MISSING_EXISTING_VALUES: "Có địa điểm chưa có giá trị trường này. Không thể bật bắt buộc; hãy bổ sung dữ liệu trước.",
  STALE_FIELD_ORDER: "Danh sách trường đã thay đổi. Hãy tải lại và sắp xếp.",
  FIELD_NOT_FOUND: "Trường không còn tồn tại. Hãy tải lại.",
  TOO_MANY_FIELDS: "Mỗi danh mục chỉ hỗ trợ tối đa 80 trường.",
};
function fieldToDraft(field: Field): Draft {
  return {
    field_key: field.field_key, label: field.label, field_type: field.field_type,
    help_text: field.help_text || "", optionsText: (field.options || []).join("\n"),
    is_required: field.is_required, is_visible: field.is_visible,
  };
}
const choice = (kind: FieldType) => kind === "select" || kind === "multi_select";

export default function CategoryFieldsManager({ categoryId, categoryName }: {
  categoryId: string;
  categoryName: string;
}) {
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const endpoint = "/api/admin/categories/" + encodeURIComponent(categoryId) + "/fields";
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (response.status === 401) throw new Error("Phiên Admin đã hết hạn. Hãy tải lại trang và đăng nhập.");
      if (!response.ok) throw new Error("Không tải được cấu hình trường từ Neon.");
      const body = await response.json();
      setFields(body.fields || []);
      return (body.fields || []) as Field[];
    } finally { setLoading(false); }
  }, [endpoint]);
  useEffect(() => {
    // Schedule the fetch without synchronously updating React state in an effect.
    const controller = new AbortController();
    fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (response.status === 401) throw new Error("Phiên Admin đã hết hạn. Hãy đăng nhập lại.");
        if (!response.ok) throw new Error("Không tải được cấu hình trường từ Neon.");
        return response.json();
      })
      .then(body => {
        if (!controller.signal.aborted) { setFields(body.fields || []); setLoading(false); }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setMessage(error instanceof Error ? error.message : "Lỗi kết nối.");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [endpoint]);

  const pick = (field: Field) => {
    setSelectedId(field.id);
    setCreating(false);
    setDraft(fieldToDraft(field));
    setMessage("");
  };
  const add = () => {
    setSelectedId(null);
    setCreating(true);
    setDraft(empty());
    setMessage("");
  };
  const report = (error: unknown) => setMessage(error instanceof Error ? error.message : "Không lưu được trường.");
  const request = async (url: string, method: string, body: unknown) => {
    const response = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(errorLabels[result.error] ||
      (response.status === 401 ? "Phiên Admin đã hết hạn." : "Cập nhật trường không thành công."));
    return result;
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage("");
    const payload = {
      label: draft.label, field_type: draft.field_type,
      help_text: draft.help_text || null,
      options: choice(draft.field_type) ? draft.optionsText.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [],
      is_required: draft.is_required, is_visible: draft.is_visible,
    };
    try {
      const result = creating
        ? await request(endpoint, "POST", { ...payload, field_key: draft.field_key })
        : await request(endpoint + "/" + selectedId, "PATCH", payload);
      const updated = await load();
      const field = updated.find(item => item.id === result.field.id);
      if (field) pick(field);
      setMessage(creating ? "Đã thêm trường thông tin." : "Đã lưu cấu hình trường.");
    } catch (error) { report(error); }
    finally { setBusy(false); }
  };
  const toggle = async (field: Field) => {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const nextVisible = !field.is_visible;
      await request(endpoint + "/" + field.id, "PATCH", { is_visible: nextVisible });
      const updated = await load();
      if (selectedId === field.id) {
        const current = updated.find(item => item.id === field.id);
        if (current) setDraft(fieldToDraft(current));
      }
      setMessage(nextVisible ? "Đã hiện trường." : "Đã ẩn trường. Giá trị đã lưu của địa điểm được giữ nguyên.");
    } catch (error) { report(error); }
    finally { setBusy(false); }
  };
  const move = async (index: number, delta: number) => {
    if (busy || index + delta < 0 || index + delta >= fields.length) return;
    const next = [...fields];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setBusy(true); setMessage("");
    try {
      await request(endpoint + "/reorder", "PUT", { ids: next.map(item => item.id) });
      await load();
      setMessage("Đã lưu thứ tự hiển thị trường.");
    } catch (error) {
      report(error);
      try { await load(); } catch { /* Keep original error. */ }
    } finally { setBusy(false); }
  };

  const selected = fields.find(item => item.id === selectedId);
  const usedCount = selected?.used_count ?? 0;
  return <section className={styles.section} aria-label={"Trường thông tin của " + categoryName}>
    <div className={styles.heading}>
      <div><h2><Settings2 size={20} aria-hidden="true"/> Trường thông tin · {categoryName}</h2>
        <p>Quy định dữ liệu riêng khi Admin thêm hoặc sửa địa điểm trong danh mục này.</p></div>
      <button type="button" className={styles.primary} disabled={busy} onClick={add}>
        <Plus size={16}/> Thêm trường
      </button>
    </div>
    {message && <p className={styles.notice} role="status">{message}</p>}
    <div className={styles.grid}>
      <div className={styles.panel}>
        <h3>Danh sách trường <span>({fields.length})</span></h3>
        <p className={styles.help}>Có thể sắp xếp bằng mũi tên. Ẩn trường không xóa dữ liệu cũ.</p>
        <div className={styles.list}>
          {fields.map((field, index) => <div className={styles.item} key={field.id}
            data-selected={selectedId === field.id && !creating}>
            <button type="button" onClick={() => pick(field)} className={styles.itemMain}>
              <strong>{field.label}</strong>
              <small>{field.field_key} · {typeLabels[field.field_type]} · {field.used_count} địa điểm có dữ liệu</small>
              <span>{field.is_required ? "Bắt buộc" : "Không bắt buộc"} · {field.is_visible ? "Đang hiện" : "Đang ẩn"}</span>
            </button>
            <div className={styles.itemActions}>
              <button disabled={busy || index === 0} type="button" onClick={() => void move(index, -1)}
                title="Lên một vị trí" aria-label={"Đưa " + field.label + " lên"}><ArrowUp size={15}/></button>
              <button disabled={busy || index === fields.length - 1} type="button" onClick={() => void move(index, 1)}
                title="Xuống một vị trí" aria-label={"Đưa " + field.label + " xuống"}><ArrowDown size={15}/></button>
              <button disabled={busy} type="button" onClick={() => void toggle(field)}
                title={field.is_visible ? "Ẩn trường" : "Hiện trường"}
                aria-label={(field.is_visible ? "Ẩn " : "Hiện ") + field.label}
                aria-pressed={field.is_visible}>
                {field.is_visible ? <Eye size={16}/> : <EyeOff size={16}/>}
              </button>
            </div>
          </div>)}
          {fields.length === 0 && <p className={styles.help}>{loading ? "Đang tải…" : "Chưa có trường thông tin riêng."}</p>}
        </div>
      </div>
      <div className={styles.panel}>
        <h3>{creating ? "Thêm trường mới" : selected ? "Chỉnh sửa trường" : "Chọn trường"}</h3>
        {!creating && !selected ? <p className={styles.help}>Chọn một trường để chỉnh sửa hoặc thêm mới. Các trường này tự xuất hiện ở biểu mẫu nhập địa điểm.</p> :
          <form className={styles.form} onSubmit={save}>
            <label>Mã trường *
              <input value={draft.field_key} required pattern="[a-z][a-z0-9_]*" maxLength={64}
                disabled={!creating} onChange={event => setDraft({ ...draft, field_key: event.target.value })}
                placeholder="vd: wifi_available"/>
              <small>Được lưu trong dữ liệu địa điểm; không thể đổi mã sau khi tạo.</small>
            </label>
            <label>Tên hiển thị *
              <input required maxLength={120} value={draft.label}
                onChange={event => setDraft({ ...draft, label: event.target.value })}
                placeholder="Ví dụ: Có wifi"/>
            </label>
            <label>Kiểu dữ liệu
              <select value={draft.field_type} disabled={usedCount > 0 && !creating}
                onChange={event => {
                  const field_type = event.target.value as FieldType;
                  setDraft(current => ({
                    ...current, field_type,
                    optionsText: choice(field_type) ? current.optionsText : "",
                  }));
                }}>
                {(Object.keys(typeLabels) as FieldType[]).map(type =>
                  <option key={type} value={type}>{typeLabels[type]}</option>)}
              </select>
              {usedCount > 0 && !creating && <small>Đã có dữ liệu tại {usedCount} địa điểm nên không thể đổi kiểu.</small>}
            </label>
            {choice(draft.field_type) && <label>Danh sách lựa chọn * (mỗi dòng một lựa chọn)
              <textarea required rows={4} value={draft.optionsText} maxLength={3200}
                onChange={event => setDraft({ ...draft, optionsText: event.target.value })}
                placeholder={"Wifi\nBãi đỗ xe\nĐiều hòa"}/>
              <small>Có thể bổ sung lựa chọn. Không được bỏ lựa chọn mà địa điểm đang dùng.</small>
            </label>}
            <label>Gợi ý nhập (tùy chọn)
              <textarea rows={2} value={draft.help_text} maxLength={240}
                onChange={event => setDraft({ ...draft, help_text: event.target.value })}
                placeholder="Hướng dẫn nhập thông tin đúng"/>
            </label>
            <div className={styles.checks}>
              <label><input type="checkbox" checked={draft.is_required}
                onChange={event => setDraft({ ...draft, is_required: event.target.checked })}/>
                Bắt buộc nhập</label>
              <label><input type="checkbox" checked={draft.is_visible}
                onChange={event => setDraft({ ...draft, is_visible: event.target.checked })}/>
                Hiển thị trong biểu mẫu và chi tiết</label>
            </div>
            <p className={styles.help}>Nếu các địa điểm hiện có còn thiếu dữ liệu, hệ thống sẽ không cho bật “Bắt buộc nhập”.</p>
            <button type="submit" disabled={busy} className={styles.primary}>
              <Save size={16}/>{busy ? "Đang lưu…" : creating ? "Tạo trường" : "Lưu thay đổi"}
            </button>
          </form>}
      </div>
    </div>
  </section>;
}
