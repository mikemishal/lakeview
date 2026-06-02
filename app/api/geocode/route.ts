import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

type NominatimSearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    country?: string;
    state?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    road?: string;
    house_number?: string;
    postcode?: string;
  };
};

function buildLocation(result: NominatimSearchResult) {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  const streetAddress = [result.address?.house_number, result.address?.road]
    .filter(Boolean)
    .join(" ");

  return {
    label: result.display_name,
    latitude,
    longitude,
    country: result.address?.country ?? "",
    state: result.address?.state ?? "",
    city: result.address?.city ?? result.address?.town ?? result.address?.village ?? "",
    neighborhood: result.address?.neighbourhood ?? result.address?.suburb ?? "",
    streetAddress,
    postalCode: result.address?.postcode ?? "",
  };
}

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const lat = (url.searchParams.get("lat") ?? "").trim();
  const lng = (url.searchParams.get("lng") ?? "").trim();

  try {
    if (query) {
      const searchUrl = new URL("https://nominatim.openstreetmap.org/search");
      searchUrl.searchParams.set("format", "jsonv2");
      searchUrl.searchParams.set("addressdetails", "1");
      searchUrl.searchParams.set("limit", "5");
      searchUrl.searchParams.set("q", query);

      const response = await fetch(searchUrl.toString(), {
        headers: {
          "User-Agent": "Project-Lakeview/1.0",
        },
      });

      if (!response.ok) {
        return NextResponse.json({ error: "Failed to geocode location." }, { status: 502 });
      }

      const results = (await response.json()) as NominatimSearchResult[];

      return NextResponse.json({
        results: results
          .map(buildLocation)
          .filter(
            (item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
          ),
      });
    }

    if (lat && lng) {
      const reverseUrl = new URL("https://nominatim.openstreetmap.org/reverse");
      reverseUrl.searchParams.set("format", "jsonv2");
      reverseUrl.searchParams.set("addressdetails", "1");
      reverseUrl.searchParams.set("lat", lat);
      reverseUrl.searchParams.set("lon", lng);

      const response = await fetch(reverseUrl.toString(), {
        headers: {
          "User-Agent": "Project-Lakeview/1.0",
        },
      });

      if (!response.ok) {
        return NextResponse.json({ error: "Failed to reverse geocode location." }, { status: 502 });
      }

      const result = (await response.json()) as NominatimSearchResult;

      return NextResponse.json({ result: buildLocation(result) });
    }

    return NextResponse.json({ error: "Provide either q or lat/lng." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to geocode location." }, { status: 500 });
  }
}
