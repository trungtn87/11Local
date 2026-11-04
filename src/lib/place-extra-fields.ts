export type CategoryField = {
  field_key: string;
  field_type: string;
  label: string;
  options: unknown;
  is_required: boolean;
};

export function validatePlaceDetails(
  input: Record<string, unknown>,
  fields: CategoryField[],
): Record<string, unknown> {
  const valid = new Map(fields.map((field) => [field.field_key, field]));
  for (const key of Object.keys(input)) {
    if (!valid.has(key)) throw new Error("UNKNOWN_DETAIL_FIELD:" + key);
  }

  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = input[field.field_key];
    const empty = value === undefined || value === null || value === "" ||
      (Array.isArray(value) && value.length === 0);
    if (empty) {
      if (field.is_required) throw new Error("REQUIRED_DETAIL_FIELD:" + field.field_key);
      continue;
    }
    const options = Array.isArray(field.options) && field.options.every((v) => typeof v === "string")
      ? field.options as string[] : [];
    switch (field.field_type) {
      case "text":
      case "long_text":
      case "url": {
        const max = field.field_type === "long_text" ? 5000 : 500;
        if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
          throw new Error("INVALID_DETAIL_FIELD:" + field.field_key);
        }
        if (field.field_type === "url") {
          try {
            const url = new URL(value);
            if (!["https:", "http:"].includes(url.protocol)) throw new Error("bad");
          } catch {
            throw new Error("INVALID_DETAIL_FIELD:" + field.field_key);
          }
        }
        result[field.field_key] = value.trim();
        break;
      }
      case "number":
        if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 1_000_000_000) {
          throw new Error("INVALID_DETAIL_FIELD:" + field.field_key);
        }
        result[field.field_key] = value;
        break;
      case "boolean":
        if (typeof value !== "boolean") throw new Error("INVALID_DETAIL_FIELD:" + field.field_key);
        result[field.field_key] = value;
        break;
      case "select":
        if (typeof value !== "string" || !options.includes(value)) {
          throw new Error("INVALID_DETAIL_FIELD:" + field.field_key);
        }
        result[field.field_key] = value;
        break;
      case "multi_select":
        if (!Array.isArray(value) || value.length > 30 ||
          value.some((item) => typeof item !== "string" || !options.includes(item)) ||
          new Set(value).size !== value.length) {
          throw new Error("INVALID_DETAIL_FIELD:" + field.field_key);
        }
        result[field.field_key] = value;
        break;
      default:
        throw new Error("INVALID_DETAIL_TYPE:" + field.field_key);
    }
  }
  return result;
}
