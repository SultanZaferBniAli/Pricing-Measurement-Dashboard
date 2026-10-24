#!/usr/bin/env python3
"""
Build the price database seed (server/db/seed/catalog.json) from the MCB
Initiative source workbooks.

Nothing here is a new price: every figure is traced to a file and a row.
Sources:
  - MCB_Pricing_Consolidation_V1.xlsx  (sheets 1, 2, 3, 3b, 4, 6, Sources & Rules)
  - src/data/scopeData.json            (the scope-of-work catalog the manual builder uses)

Usage:  python3 scripts/build_db.py [path/to/MCB Initiative folder]
"""
import json, os, re, sys
from datetime import date
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.abspath(os.path.join(ROOT, ".."))
WB = os.path.join(SRC, "MCB_Pricing_Consolidation_V1.xlsx")
OUT = os.path.join(ROOT, "server", "db", "seed", "catalog.json")

def rows(ws):
    hdr = [str(c.value).strip() if c.value is not None else "" for c in ws[1]]
    for r in ws.iter_rows(min_row=2, values_only=True):
        if all(v is None for v in r):
            continue
        yield {hdr[i]: r[i] for i in range(min(len(hdr), len(r)))}

def num(v):
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).replace(",", "").strip()
    try:
        return float(s)
    except ValueError:
        return None

def key(s):
    return re.sub(r"[^a-z0-9]+", "-", str(s or "").lower()).strip("-")

def slug(*parts):
    return "-".join(key(p) for p in parts if p)

wb = openpyxl.load_workbook(WB, data_only=True)

# ---------------------------------------------------------------- 1. TAM master
items = []
for r in rows(wb["1 TAM Set Prices"]):
    price = num(r.get("TAM price (SAR, ex-VAT)"))
    basis = r.get("Price basis") or ""
    items.append({
        "id": "m-" + slug(r.get("Section"), r.get("Catalog item key")),
        "kind": "master",
        "section": r.get("Section"),
        "category": r.get("Category (Type)"),
        "name": r.get("Item"),
        "key": r.get("Catalog item key"),
        "unit": str(r.get("Unit / qty basis") or "").strip() or None,
        "unitPrice": price,
        "priceBasis": basis,                      # Fixed | Percentage | No price | Tiered text
        "priceAsWritten": r.get("Price as written (if not a number)"),
        "source": r.get("Source label in master") or None,
        "originCheck": r.get("Origin check (this workbook)"),
        "status": r.get("Status"),
        "notes": r.get("Notes (from master)"),
        "vendorsQuoting": int(num(r.get("Vendors quoting a fixed price")) or 0),
        "lowestVendorQuote": num(r.get("Lowest vendor quote (SAR)")),
        "highestVendorQuote": num(r.get("Highest vendor quote (SAR)")),
        "reviewFlag": r.get("Review flag"),
        "sourceFile": "Pricing_Master_Consolidated.xlsx",
        "sourceRow": r.get("Master row"),
    })

# ------------------------------------------------------- 2. past budget lines
past = []
for r in rows(wb["2 Past Budget Prices"]):
    past.append({
        "id": "p-" + slug(r.get("Project"), r.get("#")),
        "project": r.get("Project"),
        "budgetFile": r.get("Budget file"),
        "budgetVersion": r.get("Budget version"),
        "item": r.get("Third-party line item"),
        "description": r.get("Description / assumption (as written)"),
        "total": num(r.get("Total in budget (SAR, ex-VAT)")),
        "qty": num(r.get("Quantity")),
        "qtyUnit": r.get("Quantity unit"),
        "unitPrice": num(r.get("Implied unit price (SAR)")),
        "unitBasis": r.get("Unit basis"),
        "notes": r.get("Notes"),
        "sourceCell": r.get("Source cell"),
        "projectType": "training" if "Culinary" in str(r.get("Project")) else "program",
        "client": "Culinary Arts Commission (MoC)" if "Culinary" in str(r.get("Project")) else "Ministry of Culture",
        "date": "2025-07-09" if "Culinary" in str(r.get("Project")) else "2025-12-01",
    })

# ------------------------------------------------------------ 3. vendor cards
quotes = []
for r in rows(wb["3 Vendor Prices (Verify)"]):
    price = num(r.get("Vendor price (SAR, ex-VAT)"))
    quotes.append({
        "id": "q-" + slug(r.get("Vendor"), r.get("#")),
        "vendor": r.get("Vendor"),
        "vendorType": r.get("Vendor type"),
        "card": r.get("Price card (file)"),
        "cardVersion": r.get("Card version"),
        "catalogKey": r.get("Catalog item key"),
        "match": r.get("Match to catalog"),
        "section": r.get("Card section"),
        "item": r.get("Item (as written on card)"),
        "description": r.get("Vendor description"),
        "deliveryModel": r.get("Delivery model (Guru V2)"),
        "unit": str(r.get("Unit / qty basis") or "").strip() or None,
        "priceBasis": r.get("Price basis"),
        "unitPrice": price,
        "priceAsWritten": r.get("Price as written (if not a number)"),
        "notes": r.get("Vendor notes"),
        "tamPrice": num(r.get("TAM master price (SAR)")),
        "verification": r.get("Verification status"),
    })

# -------------------------------------------------------- 3b. Veyron media
media = []
for r in rows(wb["3b Veyron Media Rates"]):
    media.append({
        "id": "v-" + str(r.get("#")),
        "vendor": "Veyron",
        "category": r.get("Veyron category"),
        "item": r.get("Item (Arabic, as written)"),
        "qty": num(r.get("Qty")),
        "priceBasis": r.get("Price basis"),
        "unitPrice": num(r.get("Price (SAR, ex-VAT)")),
        "placeholder": r.get("Price as written (if placeholder)"),
        "sourceRow": r.get("Source row (Veyron file)"),
    })
# Drop the placeholder "1 SAR" rows: they are to-be-confirmed, not prices.
media = [m for m in media if m["unitPrice"] and m["unitPrice"] > 1]

# ---------------------------------------------------- 4. items needing price
gaps = []
for r in rows(wb["4 Items Needing Price"]):
    gaps.append({
        "group": r.get("Gap group"),
        "section": r.get("Section"),
        "item": r.get("Item needing a price"),
        "catalogKey": r.get("Catalog item key (if any)"),
        "why": r.get("Why it needs a price"),
        "lowestVendorQuote": num(r.get("Lowest vendor quote (SAR)")),
        "highestVendorQuote": num(r.get("Highest vendor quote (SAR)")),
        "passThroughPct": num(r.get("Pass-through % offered (Threelines)")),
        "benchmark": r.get("Benchmark on file (SAR, source)"),
        "nextStep": r.get("Suggested next step"),
        "priority": r.get("Priority"),
    })

# ------------------------------------------------------ 6. scope mapping
sow = []
for r in rows(wb["6 SoW Mapping (Awards)"]):
    sow.append({
        "section": r.get("Section"),
        "mainItem": r.get("Main item"),
        "subItem": r.get("Sub-item (Awards program scope)"),
        "catalogKey": r.get("Suggested catalog match (key)"),
        "confidence": r.get("Match confidence"),
        "tamPrice": num(r.get("TAM price (SAR)")),
        "unit": r.get("Unit / qty basis"),
        "source": r.get("Source label"),
        "status": r.get("Pricing status"),
        "notes": r.get("Mapping notes"),
    })

# ------------------------------------------------------------- rules
rules = []
ws = wb["Sources & Rules"]
for r in ws.iter_rows(min_row=3, values_only=True):
    if not r or r[0] is None:
        continue
    if str(r[0]).startswith("Source files read"):
        break
    rules.append({"rule": r[0], "value": r[1], "appliesTo": r[2], "source": r[3]})

# ---------------------------------------------------- scope catalog (app)
with open(os.path.join(ROOT, "src", "data", "scopeData.json")) as fh:
    scope = json.load(fh)
scope_items = []
for s in scope["sections"]:
    for it in s["items"]:
        scope_items.append({
            "id": it["id"],
            "kind": "scope",
            "section": it["section"],
            "subCategory": it["subCategory"],
            "name": it["name"],
            "unit": it.get("type"),
            "unitPrice": it.get("unitPrice"),
            "source": it.get("priceSource") or None,
            "matchStatus": it.get("matchStatus"),
            "mappingNote": it.get("mappingNote"),
            "sourceItem": it.get("sourceItem"),
        })

# -------------------------------------------------------------- benchmarks
# Flight and ground-transport research figures already carried by the app.
benchmarks = []
ref = scope.get("reference", {})
for row in ref.get("domestic_flights", []):
    benchmarks.append({"kind": "domestic_flight", **row})
for row in ref.get("ground_transport", [])[1:]:
    benchmarks.append({"kind": "ground_transport", "row": row})
# Flight's Exercise workbook: international business / first class return fares (SAR).
flights = {
    "USA": {"first": 56000, "business": 32000}, "UK": {"first": 37500, "business": 28500},
    "Australia": {"business": 33500}, "Canada": {"business": 20000}, "France": {"business": 27000},
    "Italy": {"business": 13000}, "Spain": {"business": 13500}, "Switzerland": {"business": 17500},
    "Germany": {"business": 15000},
}
for country, fares in flights.items():
    for cls, fare in fares.items():
        benchmarks.append({"kind": "international_flight", "country": country, "class": cls,
                           "fareSar": fare, "source": "Flight's Exercise.xlsx"})
benchmarks += [
    {"kind": "misc", "item": "Executive airport lounge", "value": 7000, "unit": "4 passes (1 intl arrival + 3 local departures)", "source": "Flight's Exercise.xlsx"},
    {"kind": "misc", "item": "Luxury car with driver", "value": 8000, "unit": "per day, 2 cars x 12 hours", "source": "Flight's Exercise.xlsx"},
    {"kind": "misc", "item": "Saudi representative / escort", "value": 5000, "unit": "per day (2 x 8h shifts)", "source": "Flight's Exercise.xlsx"},
    {"kind": "misc", "item": "Average activity cost per delegate-day (lunch, dinner, lounges, site visits)", "value": 20000, "unit": "per day", "source": "Flight's Exercise.xlsx"},
]

out = {
    "meta": {
        "builtOn": date.today().isoformat(),
        "currency": "SAR",
        "excludesVat": True,
        "sources": [
            "MCB_Pricing_Consolidation_V1.xlsx", "Pricing_Master_Consolidated.xlsx",
            "Threelines - Pricing V1.pdf", "Guru Pricing_V2.xlsx", "Zebra Pricing.xlsx", "Tura Pricing.xlsx",
            "Pricing_Veyron_16.06.2026.xlsx", "Culinary Training Proposal Budget V7.xlsm", "WIP Filmmakers S5.xlsm",
            "Flight's Exercise.xlsx", "Scope_of_Work_Tracker.xlsx",
        ],
        "counts": {
            "masterItems": len(items), "masterPriced": sum(1 for i in items if i["unitPrice"]),
            "scopeItems": len(scope_items), "vendorQuotes": len(quotes),
            "vendorQuotesPriced": sum(1 for q in quotes if q["unitPrice"]),
            "mediaRates": len(media), "pastBudgetLines": len(past), "gaps": len(gaps), "sowMappings": len(sow),
        },
    },
    "rules": rules,
    "masterItems": items,
    "scopeItems": scope_items,
    "vendorQuotes": quotes,
    "mediaRates": media,
    "pastBudgetLines": past,
    "gaps": gaps,
    "sowMappings": sow,
    "benchmarks": benchmarks,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=1)
print(json.dumps(out["meta"]["counts"], indent=1))
print("wrote", OUT, os.path.getsize(OUT) // 1024, "KB")
