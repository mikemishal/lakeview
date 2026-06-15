export type ServiceAreaStatus = "in_area" | "out_of_area" | "unknown";

const DEFAULT_SERVICE_RADIUS_MILES = 50;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineDistanceMiles(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

export function getProviderServiceAreaStatus(params: {
  ownerLatitude: number | null | undefined;
  ownerLongitude: number | null | undefined;
  providerLatitude: number | null | undefined;
  providerLongitude: number | null | undefined;
  providerServiceRadiusMiles: number | null | undefined;
}): {
  status: ServiceAreaStatus;
  distanceMiles: number | null;
  thresholdMiles: number;
} {
  const {
    ownerLatitude,
    ownerLongitude,
    providerLatitude,
    providerLongitude,
    providerServiceRadiusMiles,
  } = params;

  const thresholdMiles =
    typeof providerServiceRadiusMiles === "number" && providerServiceRadiusMiles > 0
      ? providerServiceRadiusMiles
      : DEFAULT_SERVICE_RADIUS_MILES;

  if (
    typeof ownerLatitude !== "number" ||
    typeof ownerLongitude !== "number" ||
    typeof providerLatitude !== "number" ||
    typeof providerLongitude !== "number"
  ) {
    return {
      status: "unknown",
      distanceMiles: null,
      thresholdMiles,
    };
  }

  const distanceMiles = haversineDistanceMiles(
    ownerLatitude,
    ownerLongitude,
    providerLatitude,
    providerLongitude
  );

  return {
    status: distanceMiles <= thresholdMiles ? "in_area" : "out_of_area",
    distanceMiles,
    thresholdMiles,
  };
}
