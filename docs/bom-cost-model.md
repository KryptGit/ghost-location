# Ghost Dongle — BOM / cost model (target: ≥$10 net profit/unit)

Researched via Exa web search against current (Sep 2026) distributor/fab listings. Builds on
the two hardware paths and BOM tables already sketched in `headless/hardware-plan.html`.
All figures are estimates from public listings/calculators, not firm quotes — get real
quotes from JLCPCB/PCBWay and a distributor before committing spend.

## Sources checked
- Raspberry Pi CM4 Wireless 2GB Lite (CM4102000) pricing: Newark ($55.60 qty 1), PiShop.us
  ($62.50), PiShop.ca 250-unit OEM box ($67.50/unit — **no real bulk discount found**),
  raspberrypi.dk (~$62 equiv). Official RPi site lists CM4 "from $41.25" but that's the
  cheapest non-wireless/lowest-RAM variant, not this SKU.
- Raspberry Pi Zero 2 W: official price is $15, but current reseller listings show
  $68–89/unit with "out of stock" — signals ongoing supply constraint, not a reliable
  planning price.
- JLCPCB PCBA: $8.18 setup (economic), $0.0016/solder joint, $0.48/board minimum SMT
  assembly charge, panel recommended above 50pcs.
- JLCPCB bare 4-layer PCB fab (100mm×100mm reference): $106.30 total at 100pcs (~$1.06/board),
  $421.10 total at 500pcs (~$0.84/board). Our board is smaller, so treat these as ceilings.
- FDM 3D printing: roughly flat per-part cost regardless of volume (no tooling) — small/medium
  enclosure lands ~$13–45/part depending on size/material; volume discounts are modest (maybe
  10–15% off at 500–1000+ units), not a step-change.
- Injection molding: ~$8,000 tool (simple single-cavity, small ABS part) + ~$0.65–2.25/part
  amortized depending on volume. Break-even vs. FDM is typically **800–1,500 units** for a
  simple enclosure — below that, FDM is cheaper in total.

## Path 1 — Raspberry Pi Zero 2 W (no custom PCB)

| Item | MVP tier (50–100 units) | Scale tier (1,000–5,000 units) |
|---|---|---|
| Zero 2 W board | $15 (list) **or $68–89 (current real market)** | $18–25 if a distributor business account gets you near-list; **no guarantee** |
| 3D-printed enclosure | $15–20 | $11–15 |
| Micro-USB OTG → USB-C/Lightning adapter cable | $1–3 | $1–2 |
| microSD 16GB | $4–5 | $3–4 |
| Packaging | $1.50–3 | $1–2 |
| **Total/unit — optimistic (list-price board)** | **~$36–41** | **~$34–38** |
| **Total/unit — realistic (market-price board)** | **~$89–100** | not modeled (see risk note) |

## Path 2 — Custom carrier PCB around CM4 Wireless 2GB Lite

| Item | MVP tier (50–100 units) | Scale tier (1,000 units) | Scale tier (5,000 units) |
|---|---|---|---|
| CM4 Wireless 2GB Lite module | $60–67 | $58–62 (little real bulk discount seen) | $55–60 |
| Bare 4-layer PCB (smaller than 100×100mm ref) | $8–12/board | $0.80–1.20/board | $0.60–0.90/board |
| SMT assembly (setup+joints+min. charge, ~100 joints) | $2–4/board | $0.80–1.20/board | $0.70–1.00/board |
| Power/connector components (USB conn., regulator, LEDs, button, antenna+u.FL) | $6–9 | $5–7 | $4–6 |
| microSD 16GB | $4–5 | $3–4 | $3–4 |
| Enclosure | $15–20 (FDM) | $11–13 (FDM) **or** ~$8.65 (IM, tool amortized) | $2–3 (IM, tool now amortized) |
| Packaging | $1.50–3 | $1–2 | $0.75–1.50 |
| **Total/unit** | **~$97–120** | **~$80–91** (FDM) / **~$78–86** (IM) | **~$66–75** |

CM4 module cost is the dominant, near-fixed floor here — it did not show meaningful bulk
discounting in any listing found, which is the single biggest swing factor in this model.

## Recommended retail price (≥$10 net profit after ~7% payment/platform fees)

Formula: `retail = (unit_cost + 10) / 0.93`

| Path / tier | Unit cost used | Recommended retail |
|---|---|---|
| Zero 2 W, MVP, optimistic cost ($38) | $38 | **~$52** |
| Zero 2 W, MVP, realistic market cost ($95) | $95 | **~$113** |
| Zero 2 W, scale, optimistic cost ($36) | $36 | **~$49** |
| CM4 custom PCB, MVP ($108) | $108 | **~$127** |
| CM4 custom PCB, scale 1,000 (FDM, $85) | $85 | **~$102** |
| CM4 custom PCB, scale 5,000 (IM, $70) | $70 | **~$86** |

## Risks / assumptions to flag
1. **Board pricing is the biggest unknown, not the enclosure or PCB.** Neither Zero 2 W nor
   CM4 showed real per-unit savings at volume in public listings — get an actual distributor
   quote (Digi-Key/Mouser/Newark business account) before locking a price.
2. Zero 2 W is currently supply-constrained at retail; the "$15" figure may not be achievable
   at the quantities needed. If forced to source at $68–89/unit, Zero 2 W loses its cost
   advantage over the CM4 path entirely.
3. Injection-mold tooling only pays off above ~800–1,500 units for a simple enclosure —
   don't tool before the MVP batch validates demand and the design is locked.
4. FCC Part 15B testing (~$2,000–6,000, one-time) and any PCB design NRE ($3,000–8,000 for
   the custom PCB path) are **not included** in the per-unit numbers above — amortize
   separately against your first production run's total unit count.
5. All fab/assembly figures came from JLCPCB's public calculators/blog examples for a
   *reference* board size, not your actual Gerbers — treat as directional until quoted.
