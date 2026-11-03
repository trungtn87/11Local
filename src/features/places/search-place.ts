import { distanceProvider, type Coordinates } from "../distance/distance-service";
import type { PublicPlace } from "./public-place";

export type PlaceFilters = {
  q: string;
  cat: string;
  area: string;
  verifiedOnly: boolean;
  sort: string;
};

export function foldSearch(value: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase("vi")
    .trim();
}

export function filterRealPlaces(
  places: PublicPlace[],
  filters: PlaceFilters,
  userLocation: Coordinates | null,
) {
  const q = foldSearch(filters.q);
  let list = places.filter((place) => {
    if (filters.cat !== "all" && place.category_id !== filters.cat) return false;
    if (filters.area !== "all" && place.area !== filters.area) return false;
    if (filters.verifiedOnly && place.ownership_status !== "verified") return false;
    if (!q) return true;
    const text = foldSearch(
      [place.name, place.category_name, place.address, place.area, place.description]
        .filter(Boolean)
        .join(" "),
    );
    return text.includes(q);
  });

  if (filters.sort === "name") {
    list = [...list].sort((a, b) => a.name.localeCompare(b.name, "vi"));
  } else if (filters.sort === "nearest" && userLocation) {
    list = [...list].sort(
      (a, b) => distanceProvider.calculate(userLocation, a).valueMeters
        - distanceProvider.calculate(userLocation, b).valueMeters,
    );
  } else if (q) {
    list = [...list].sort(
      (a, b) => Number(foldSearch(b.name).includes(q)) - Number(foldSearch(a.name).includes(q))
        || a.name.localeCompare(b.name, "vi"),
    );
  } else {
    list = [...list].sort(
      (a,b) => Date.parse(b.updated_at ?? "") - Date.parse(a.updated_at ?? "") || a.name.localeCompare(b.name,"vi"),
    );
  }
  return list;
}
