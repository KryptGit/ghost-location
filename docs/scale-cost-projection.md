# Scale cost projection: Zero 2 W vs. custom CM4 PCB

Estimated per-unit landed hardware cost at increasing order volumes, for the two
board options discussed for the Ghost Dongle (USB host + Wi-Fi AP + Node/Python
backend). Figures are modeled from published pricing/case-study data (cited
below), not vendor quotes — treat as directional, not a firm BOM.

## Key inputs found

- **Raspberry Pi Zero 2 W has essentially no bulk discount.** List price $15;
  Approved-Reseller "1 AR buy" price $14; a 400-unit bulk pack from a reseller
  (MakerBright) still prices at exactly $15/unit. Raspberry Pi also historically
  caps the volume any single reseller/customer can order per allocation window
  (documented in a 2022 launch-partner notice: "A maximum volume that can be
  ordered per reseller will be confirmed... no further orders will be loaded
  until we have loaded all of the initial orders"). Buying beyond small retail
  quantities requires applying as an Approved Reseller / commercial account,
  and allocation can still be capped during supply constraints.
- **Compute Module 4 Wireless (2GB, Lite) lists around $35**, sold only in
  **multiples of 250 units minimum order** through distributors (confirmed at
  multiple resellers — PiShop, Chicago Electronic Distributors, welectron,
  rapidonline). No further volume discount beyond the 250-unit MOQ was found
  published; a real quote from an Approved Reseller would be needed to confirm
  whether deeper price breaks exist above 250/1000/etc.
- **PCB assembly cost drops steeply with volume, then flattens.** For a
  comparable mixed SMT board: ~$46.74/board at 5 pcs → $13.70 at 25 → $6.95 at
  100 → $5.06 at 500 → $4.60 at 1,000 → $4.44 at 5,000. Past ~1,000 units the
  curve is nearly flat — setup cost is fully absorbed.
- **Injection-mold tooling**: aluminum "bridge" tooling for a small, simple
  enclosure runs ~$5,000–12,000 and amortizes fast; hardened steel tooling
  ($20,000–50,000+) only pays off past roughly 30,000–50,000 units. Crossover
  where injection molding beats 3D printing on total cost is typically
  500–2,000 units for a simple part.

## Per-unit cost table

### Path A — Raspberry Pi Zero 2 W (no custom PCB)

| Volume | Board | Enclosure | Misc (SD/cable/LED) | **Total/unit** |
|---|---|---|---|---|
| 50 | $15.00 | $6.00 (3D print) | $6.00 | **~$27** |
| 100 | $14.50 | $5.00 (3D print) | $6.00 | **~$25.5** |
| 500 | $14.00 | $4.50 (3D print) | $5.50 | **~$24** |
| 1,000 | $14.00 | $4.00–9.00 (3D print or early bridge tool — close call) | $5.50 | **~$23–28** |
| 5,000 | $14.00 | $3.10 (bridge tool amortized) | $5.00 | **~$22** |
| 10,000 | $14.00 | $3.20–4.20 (steel tool starting to pay off) | $5.00 | **~$22–23** |

The Zero 2 W path is **flat across volume** — it's dominated by the board's
fixed $14–15 price, which barely moves no matter how many you buy.

### Path B — Custom PCB carrier around CM4 Wireless (2GB Lite)

| Volume | CM4 module | PCB fab+assembly (carrier only) | Enclosure | PCB design NRE (amortized, $3–8k) | **Total/unit** |
|---|---|---|---|---|---|
| 50 | $35 | ~$22 | ~$6 | $60–160 | **~$173** (design NRE dominates — 250-unit MOQ makes a true 50-unit run unrealistic anyway) |
| 100 | $35 | ~$16 | ~$5 | $30–80 | **~$111** |
| 250 (true MOQ) | $35 | ~$14 | ~$5 | $12–32 | **~$76** |
| 500 | $35 | ~$13 | ~$4.5 | $6–16 | **~$63.5** |
| 1,000 | $35 | ~$11.6 | ~$4–9 | $3–8 | **~$56–61** |
| 5,000 | $35 | ~$10.4 | ~$3.1 | $0.6–1.6 | **~$49.6** |
| 10,000 | $35 | ~$9.5 | ~$3.2–4.2 | $0.3–0.8 | **~$48.75** |

## Crossover finding

**There isn't one, in this range.** The custom CM4 PCB path never beats the
Zero 2 W path from 50 to 10,000 units — it's stuck roughly **$25–30/unit more
expensive even at 10,000 units** (~$49 vs. ~$22). The reason has nothing to do
with PCB design/NRE (which does amortize away as expected) — it's that the
**CM4 module alone ($35) already costs more than an entire finished Zero 2 W
board ($14–15)**. No amount of carrier-PCB optimization can close a gap that
starts in the base component.

This reframes the earlier assumption in this project's planning: the custom
PCB was originally justified as cheaper than buying the **CM4 IO Board**
($25, an unrelated dev breakout board) — that comparison still holds (skip the
$25 IO board, design a $10–20 carrier instead). But compared against switching
to a **different, cheaper board family** (Zero 2 W) entirely, the CM4 route
is not the cost-optimal path at any volume modeled here.

**When CM4 would still make sense despite the cost gap:**
- If Zero 2 W purchase/allocation limits genuinely block buying the quantity
  you need (real historical precedent above) — cost stops being the deciding
  factor and supply availability takes over.
- If the product needs CM4-specific capability the Zero 2 W lacks (PCIe, more
  RAM tiers, eMMC options) — not indicated by anything in this project's specs.
- At volumes far beyond 10,000/year, where a direct negotiated OEM price from
  Raspberry Pi (not the public distributor price) could undercut the public
  $35 figure — this would require an actual quote from Raspberry Pi's
  commercial/Approved Reseller program to confirm, not published anywhere.

## Sources

- [Farnell CM4/Zero 2 W new-product/reseller pricing notice (PDF)](https://www.farnell.com/datasheets/3677657.pdf)
- [MakerBright — Raspberry Pi Zero 2W Bulk (400 units)](https://makerbright.com/products/raspberry-pi-zero-2w-bulk)
- [PiShop US — CM4 Wireless 2GB Lite, 250-unit OEM box](https://www.pishop.us/product/raspberry-pi-compute-module-4-wireless-2gb-lite-cm4102000-bulk-250-unit-oem-box/)
- [Chicago Electronic Distributors — CM4 Wireless 2GB/16GB, MOQ 250](https://chicagodist.com/products/raspberry-pi-compute-module-4-wireless-2gb-16gb-cm4102016)
- [welectron — CM4 bulk packaging, multiples of 250](https://www.welectron.com/Raspberry-Pi-CM4-Compute-Module-Bulk-Packaging)
- [Rapid Online — CM4 official price list (PDF)](https://static.rapidonline.com/pdf/75-0649.pdf)
- [PCBSync — PCB assembly cost per volume tier](https://pcbsync.com/pcb-assembly-cost/)
- [JLCPCB — PCBA cost breakdown blog](https://jlcpcb.com/blog/pcba-cost-breakdown)
- [JLCPCB — PCB prototype assembly service pricing](https://jlcpcb.com/solutions/pcb-prototype-assembly)
- [Sankhya Farms — JLCPCB PCBA walkthrough case study](https://sankhyafarms.com/open-hardware/jlcpcb-assembly-walkthrough)
- [Zetar Mold — injection molding cost per part breakdown](https://zetarmold.com/injection-molding-cost-per-part-breakdown/)
- [Rapid Protos — low-volume injection molding cost/strategy](https://www.rapid-protos.com/low-volume-injection-molding/)
- [3DDFM — injection molding cost estimator](https://www.3ddfm.com/injection-molding-cost-estimator/)
