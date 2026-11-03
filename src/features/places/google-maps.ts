import type { Coordinates } from "../distance/distance-service";

export function getGoogleMapsDirectionsUrl(destination: Coordinates) {
  const coordinates = `${destination.latitude},${destination.longitude}`;
  // URL đa nền tảng: mobile ưu tiên mở Google Maps nếu đã cài, nếu không
  // trình duyệt tiếp tục dùng Google Maps web. Không gọi Directions API.
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinates)}`;
}
