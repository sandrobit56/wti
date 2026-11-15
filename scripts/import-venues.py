"""
File:        scripts/import-venues.py
Application: რა ვჭამოთ? (WTI)
Author:      Sandro Germanishvili
Date:        2026-11-15
Version:     v1.0
Description: Builds data/venues.json from Overture Maps Places for Tbilisi.
             Legal basis: Overture Places is CDLA-Permissive-2.0 / Apache-2.0 / CC0
             per source, with no OpenStreetMap share-alike. We keep each record's
             source + license and show attribution in the app footer.
             Google / Wolt / Glovo / Bolt data is NEVER imported.

Run (needs internet; the GitHub Action does this monthly):
    pip install "overturemaps>=0.19"
    overturemaps download --bbox=44.65,41.62,45.05,41.85 -f geojsonseq -t place -o raw-places.jsonl
    python scripts/import-venues.py raw-places.jsonl
"""
import json
import sys
from datetime import datetime, timezone

OUT = "data/venues.json"
MIN_CONFIDENCE = 0.6

# Overture docs, places guide (Oct 2026): license per source.
LICENSE_BY_SOURCE = {"alltheplaces": "CC0-1.0", "foursquare": "Apache-2.0"}
DEFAULT_LICENSE = "CDLA-Permissive-2.0"
ALLOWED_LICENSES = {"CC0-1.0", "Apache-2.0", "CDLA-Permissive-2.0"}


def as_obj(value):
    """GeoJSON export may give nested structs as objects or JSON strings."""
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def license_for(sources):
    for s in sources or []:
        s = as_obj(s)
        lic = s.get("license")
        if lic:
            return lic, s.get("dataset", "unknown")
        dataset = str(s.get("dataset", ""))
        return LICENSE_BY_SOURCE.get(dataset.lower().replace(" ", ""), DEFAULT_LICENSE), dataset
    raise ValueError("place without sources")


def main(path):
    venues, seen, with_taxonomy = [], 0, 0
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip().lstrip("\x1e")
            if not line:
                continue
            feature = json.loads(line)
            seen += 1
            p = feature["properties"]
            taxonomy = as_obj(p.get("taxonomy")) or {}
            hierarchy = taxonomy.get("hierarchy") or []
            if hierarchy:
                with_taxonomy += 1
            if not hierarchy or hierarchy[0] != "food_and_drink":
                continue
            if (p.get("confidence") or 0) < MIN_CONFIDENCE:
                continue
            if p.get("operating_status") not in (None, "open"):
                continue
            lic, source = license_for(as_obj(p.get("sources")))
            if lic not in ALLOWED_LICENSES:
                continue
            names = as_obj(p.get("names")) or {}
            name = names.get("primary")
            if not name:
                continue
            addresses = as_obj(p.get("addresses")) or []
            address = as_obj(addresses[0]).get("freeform") if addresses else None
            websites = as_obj(p.get("websites")) or []
            lng, lat = feature["geometry"]["coordinates"][:2]
            cats = [taxonomy.get("primary")] + (taxonomy.get("alternates") or []) + hierarchy
            venues.append({
                "id": p["id"] if "id" in p else feature.get("id"),
                "name": name,
                "lat": round(lat, 5),
                "lng": round(lng, 5),
                "address": address,
                "cats": sorted({c for c in cats if c}),
                "website": websites[0] if websites else None,
                "source": source,
                "license": lic,
            })

    # Fail fast: a schema change upstream must not silently ship an empty app.
    if seen == 0:
        raise SystemExit("no places in input — wrong bbox or download failed")
    if with_taxonomy == 0:
        raise SystemExit("no record has taxonomy.hierarchy — Overture schema changed, update this script")
    if len(venues) < 100:
        raise SystemExit(f"only {len(venues)} food venues kept out of {seen} — check filters before publishing")

    venues.sort(key=lambda v: v["id"])
    out = {
        "release": None,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "venues": venues,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"kept {len(venues)} food venues out of {seen} places → {OUT}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: python scripts/import-venues.py raw-places.jsonl")
    main(sys.argv[1])
