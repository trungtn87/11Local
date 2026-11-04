/** Admin-only schema mutation contracts. Never delete or rename a stored field_key. */
export const FIELD_TYPES = ["text", "long_text", "number", "boolean", "url", "select", "multi_select"] as const;
export type FieldType = typeof FIELD_TYPES[number];
export type FieldInput = {
  field_key: string;
  label: string;
  field_type: FieldType;
  help_text: string | null;
  options: string[];
  is_required: boolean;
  is_visible: boolean;
};
export type FieldPatch = Partial<Omit<FieldInput, "field_key">>;
export class FieldInputError extends Error {
  constructor(message: string) { super(message); this.name = "FieldInputError"; }
}
function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new FieldInputError("INVALID_BODY");
  return input as Record<string, unknown>;
}
function stringValue(input: unknown, name: string, limit: number): string {
  if (typeof input !== "string" || input.trim().length === 0 || input.trim().length > limit)
    throw new FieldInputError("INVALID_" + name.toUpperCase());
  return input.trim();
}
function typeValue(input: unknown): FieldType {
  if (typeof input !== "string" || !(FIELD_TYPES as readonly string[]).includes(input))
    throw new FieldInputError("INVALID_FIELD_TYPE");
  return input as FieldType;
}
function booleanValue(input: unknown, name: string): boolean {
  if (typeof input !== "boolean") throw new FieldInputError("INVALID_" + name.toUpperCase());
  return input;
}
function optionsValue(input: unknown): string[] {
  if (!Array.isArray(input) || input.length > 30 ||
      input.some(option => typeof option !== "string" || !option.trim() || option.trim().length > 100))
    throw new FieldInputError("INVALID_OPTIONS");
  const options = (input as string[]).map(option => option.trim());
  if (new Set(options).size !== options.length) throw new FieldInputError("DUPLICATE_OPTIONS");
  return options;
}
function helpValue(input: unknown): string | null {
  if (input === null || input === "") return null;
  if (typeof input !== "string" || input.trim().length > 240)
    throw new FieldInputError("INVALID_HELP_TEXT");
  return input.trim() || null;
}
function assertKnownKeys(body: Record<string, unknown>, allowed: string[]) {
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) throw new FieldInputError("UNKNOWN_FIELD_PROPERTY");
  }
}
export function parseFieldCreate(input: unknown): FieldInput {
  const body = record(input);
  assertKnownKeys(body, ["field_key", "label", "field_type", "help_text", "options", "is_required", "is_visible"]);
  const field_key = stringValue(body.field_key, "field_key", 64);
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(field_key))
    throw new FieldInputError("INVALID_FIELD_KEY");
  const result: FieldInput = {
    field_key, label: stringValue(body.label, "label", 120),
    field_type: typeValue(body.field_type),
    help_text: helpValue(body.help_text ?? null),
    options: optionsValue(body.options ?? []),
    is_required: booleanValue(body.is_required ?? false, "is_required"),
    is_visible: booleanValue(body.is_visible ?? true, "is_visible"),
  };
  validateFieldOptions(result);
  return result;
}
export function parseFieldPatch(input: unknown): FieldPatch {
  const body = record(input);
  assertKnownKeys(body, ["label", "field_type", "help_text", "options", "is_required", "is_visible"]);
  const result: FieldPatch = {};
  if ("label" in body) result.label = stringValue(body.label, "label", 120);
  if ("field_type" in body) result.field_type = typeValue(body.field_type);
  if ("help_text" in body) result.help_text = helpValue(body.help_text);
  if ("options" in body) result.options = optionsValue(body.options);
  if ("is_required" in body) result.is_required = booleanValue(body.is_required, "is_required");
  if ("is_visible" in body) result.is_visible = booleanValue(body.is_visible, "is_visible");
  if (Object.keys(result).length === 0) throw new FieldInputError("EMPTY_UPDATE");
  return result;
}
export function validateFieldOptions(field: Pick<FieldInput, "field_type" | "options">): void {
  if (field.field_type === "select" || field.field_type === "multi_select") {
    if (field.options.length === 0) throw new FieldInputError("OPTIONS_REQUIRED");
  } else if (field.options.length !== 0) {
    throw new FieldInputError("OPTIONS_NOT_ALLOWED");
  }
}
export function parseFieldOrder(input: unknown): string[] {
  const body = record(input);
  assertKnownKeys(body, ["ids"]);
  if (!Array.isArray(body.ids) || body.ids.length === 0 || body.ids.length > 80 ||
      body.ids.some(id => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) ||
      new Set(body.ids).size !== body.ids.length) throw new FieldInputError("INVALID_ORDER");
  return body.ids as string[];
}
/** Existing values only; never rewrite place_details to apply a schema change. */
export function choiceValueCompatible(value: unknown, type: FieldType, options: string[]): boolean {
  if (type === "select") return typeof value === "string" && options.includes(value);
  if (type === "multi_select") return Array.isArray(value) && value.every(v => typeof v === "string" && options.includes(v));
  return true;
}
