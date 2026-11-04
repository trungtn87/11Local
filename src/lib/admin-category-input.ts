export const CATEGORY_ICON_OPTIONS = ["utensils", "coffee", "bed", "mountain", "shopping-bag", "wrench"] as const;
export type CategoryVisibility = "visible" | "hidden";
export type CategoryCreate = { id: string; name: string; icon: string; visibility: CategoryVisibility };
export type CategoryPatch = Partial<Pick<CategoryCreate, "name" | "icon" | "visibility">>;

export class CategoryInputError extends Error {
  constructor(message: string) { super(message); this.name = "CategoryInputError"; }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CategoryInputError("INVALID_BODY");
  return value as Record<string, unknown>;
}

function text(value: unknown, key: string, max: number): string {
  if (typeof value !== "string") throw new CategoryInputError("INVALID_" + key.toUpperCase());
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new CategoryInputError("INVALID_" + key.toUpperCase());
  return normalized;
}

function icon(value: unknown): string {
  const selected = text(value, "icon", 40);
  if (!(CATEGORY_ICON_OPTIONS as readonly string[]).includes(selected) && !/^custom:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selected)) throw new CategoryInputError("INVALID_ICON");
  return selected;
}

function visibility(value: unknown): CategoryVisibility {
  if (value !== "visible" && value !== "hidden") throw new CategoryInputError("INVALID_VISIBILITY");
  return value;
}

export function parseCategoryCreate(value: unknown): CategoryCreate {
  const body = object(value);
  const id = text(body.id, "id", 40);
  if (!/^[a-z][a-z0-9_]*$/.test(id)) throw new CategoryInputError("INVALID_ID");
  return {
    id,
    name: text(body.name, "name", 80),
    icon: icon(body.icon),
    visibility: body.visibility === undefined ? "visible" : visibility(body.visibility),
  };
}

export function parseCategoryPatch(value: unknown): CategoryPatch {
  const body = object(value);
  if ("id" in body || "sort_order" in body) throw new CategoryInputError("IMMUTABLE_CATEGORY_ID_OR_ORDER");
  const patch: CategoryPatch = {};
  if ("name" in body) patch.name = text(body.name, "name", 80);
  if ("icon" in body) patch.icon = icon(body.icon);
  if ("visibility" in body) patch.visibility = visibility(body.visibility);
  if (!Object.keys(patch).length) throw new CategoryInputError("EMPTY_UPDATE");
  return patch;
}

export function parseCategoryOrder(value: unknown): string[] {
  const body = object(value);
  if (!Array.isArray(body.ids) || body.ids.length < 1 || body.ids.length > 200) {
    throw new CategoryInputError("INVALID_ORDER");
  }
  const ids = body.ids;
  if (ids.some(id => typeof id !== "string" || !id || id.length > 80) || new Set(ids).size !== ids.length) {
    throw new CategoryInputError("INVALID_ORDER");
  }
  return ids as string[];
}
