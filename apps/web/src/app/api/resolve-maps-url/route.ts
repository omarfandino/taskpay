import { NextResponse } from "next/server";
import {
  extractCoordsFromMapsUrl,
  extractPlaceLabelFromMapsUrl,
  isMapsUrl,
  type ResolvedLocation,
} from "@/lib/location";

const MAX_REDIRECTS = 8;

function isAllowedHost(hostname: string): boolean {
  const host = hostname.replace(/^www\./, "");
  return (
    host === "maps.app.goo.gl" ||
    host === "goo.gl" ||
    host.endsWith(".google.com") ||
    host.endsWith(".goo.gl")
  );
}

async function expandUrl(inputUrl: string): Promise<string> {
  let current = inputUrl;

  for (let i = 0; i < MAX_REDIRECTS; i++) {
    const res = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TaskPay/1.0; +https://taskpay.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      current = new URL(location, current).href;
      continue;
    }

    if (res.url && res.url !== current) {
      current = res.url;
    }
    break;
  }

  return current;
}

function resolveFromExpandedUrl(expanded: string): ResolvedLocation {
  const coords = extractCoordsFromMapsUrl(expanded);
  if (coords) {
    return {
      normalized: `${coords.lat},${coords.lng}`,
      coords,
      label: "Pin on map",
    };
  }

  const place = extractPlaceLabelFromMapsUrl(expanded);
  if (place) {
    return { normalized: place, coords: null, label: place };
  }

  return {
    normalized: expanded,
    coords: null,
    label: "Location from Maps link",
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { url?: string };
    const url = body.url?.trim();

    if (!url || url.length > 2048) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!isAllowedHost(parsed.hostname)) {
      return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
    }

    if (!isMapsUrl(url)) {
      return NextResponse.json({ error: "Not a Maps URL" }, { status: 400 });
    }

    const sync = resolveFromExpandedUrl(url);
    if (sync.coords || sync.label !== "Location from Maps link") {
      return NextResponse.json(sync);
    }

    const expanded = await expandUrl(url);
    const resolved = resolveFromExpandedUrl(expanded);
    return NextResponse.json(resolved);
  } catch (err) {
    console.error("resolve-maps-url:", err);
    return NextResponse.json(
      { error: "Could not resolve Maps link" },
      { status: 502 }
    );
  }
}
