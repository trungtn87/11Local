/**
 * Marker duy nhất cho các địa điểm đã công khai của 11Local.
 * category_icon lấy từ database; ảnh custom dùng đúng ảnh được quản trị viên tải lên.
 */
export type MapPlace = {
  name: string;
  category_id?: string | null;
  category_name?: string | null;
  category_icon?: string | null;
};

const symbols: Record<string, string> = {
  utensils: "🍜",
  coffee: "☕",
  bed: "🛏️",
  mountain: "⛰️",
  "shopping-bag": "🛍️",
  wrench: "🔧",
};

const categoryDefaults: Record<string, string> = {
  food: "utensils",
  cafe: "coffee",
  stay: "bed",
  sight: "mountain",
  shop: "shopping-bag",
  service: "wrench",
};

const customIconPattern = /^custom:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function resolveCategoryMarker(icon?: string | null, categoryId?: string | null) {
  const fallback = symbols[categoryDefaults[categoryId || ""]] || "📍";
  const match = customIconPattern.exec(icon || "");
  if (match) {
    return { kind: "image" as const, src: "/api/category-icons/" + match[1], fallback };
  }
  return { kind: "symbol" as const, symbol: symbols[icon || ""] || fallback };
}

/** Dùng textContent, không chèn HTML từ tên địa điểm do cộng đồng đóng góp. */
export function createPlaceMarkerElement(place: MapPlace): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "local-place-pin";
  button.title = place.name;
  button.setAttribute("aria-label", "Xem " + place.name + (place.category_name ? " · " + place.category_name : ""));

  const badge = document.createElement("span");
  badge.className = "local-place-pin-badge";
  const symbol = document.createElement("span");
  symbol.className = "local-place-pin-icon";
  symbol.setAttribute("aria-hidden", "true");

  const icon = resolveCategoryMarker(place.category_icon, place.category_id);
  if (icon.kind === "image") {
    const image = document.createElement("img");
    image.src = icon.src;
    image.alt = "";
    image.width = 25;
    image.height = 25;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      image.remove();
      symbol.textContent = icon.fallback;
    }, { once: true });
    symbol.appendChild(image);
  } else {
    symbol.textContent = icon.symbol;
  }
  badge.appendChild(symbol);

  const label = document.createElement("span");
  label.className = "local-place-pin-name";
  label.textContent = place.name;
  badge.appendChild(label);
  button.appendChild(badge);
  return button;
}
