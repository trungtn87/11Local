export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type DistanceResult = {
  valueMeters: number;
  type: "straight-line" | "route";
  source: "haversine" | "valhalla";
};

export interface DistanceProvider {
  calculate(origin: Coordinates, destination: Coordinates): DistanceResult;
}

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export const haversineDistanceProvider: DistanceProvider = {
  calculate(origin, destination) {
    const latitudeDelta = toRadians(destination.latitude - origin.latitude);
    const longitudeDelta = toRadians(destination.longitude - origin.longitude);
    const originLatitude = toRadians(origin.latitude);
    const destinationLatitude = toRadians(destination.latitude);
    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(originLatitude) *
        Math.cos(destinationLatitude) *
        Math.sin(longitudeDelta / 2) ** 2;
    const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    return {
      valueMeters: EARTH_RADIUS_METERS * centralAngle,
      type: "straight-line",
      source: "haversine",
    };
  },
};

// UI chỉ phụ thuộc contract DistanceProvider; sau này có thể inject Valhalla ở đây.
export const distanceProvider: DistanceProvider = haversineDistanceProvider;

export function formatApproximateDistance(distance: DistanceResult) {
  if (distance.valueMeters < 1000) {
    return `≈ ${Math.round(distance.valueMeters / 10) * 10} m`;
  }

  const kilometers = distance.valueMeters / 1000;
  const formatted = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: kilometers < 10 ? 1 : 0,
  }).format(kilometers);
  return `≈ ${formatted} km`;
}
