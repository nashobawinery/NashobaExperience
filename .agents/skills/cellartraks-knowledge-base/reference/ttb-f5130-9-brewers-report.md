# TTB Form 5130.9 — Brewer's Report of Operations

**Form Number**: TTB F 5130.9 (04/2015)
**OMB Number**: 1513-0007
**Agency**: Alcohol and Tobacco Tax and Trade Bureau (TTB), Department of the Treasury
**Instructions Form**: TTB F 5130.26i (10/2021)
**Uploaded**: February 2026

## Overview

This is the primary federal report for brewery operations. It tracks all beer inventory movement — production, receipts, removals, losses — for a reporting period.

## Filing Requirements

| Condition | Frequency | Due Date |
|---|---|---|
| Liable for >$50,000 in beer taxes this calendar year | Monthly | 15th day after end of month (e.g., October report due Nov 15) |
| Liable for ≤$50,000 in taxes (current AND prior year) | Quarterly | 15th day after end of quarter (Q1 Jan-Mar due Apr 15, etc.) |

- Quarterly filers may use this form (5130.9) or the simpler TTB F 5130.26
- Must retain completed form for inspection by TTB for minimum 3 years
- Can submit via hard copy (to Cincinnati NRC) or electronically via Pay.gov

## Reporting Unit

**All beer quantities are reported in BARRELS (1 barrel = 31 gallons)**
- Round all entries to the nearest second decimal place (e.g., 12.75 barrels)

## Header Information (CellarTraks must store)

| Field | Description | CellarTraks Source |
|---|---|---|
| Brewery EIN | Federal Employer Identification Number | Company settings |
| TTB Brewery Number | Assigned TTB permit number (BR-XXXXXX) | Company settings |
| Brewery Name | Legal name of brewery | Company settings |
| Brewery Location | Full address (Number, Street, City, County, State, ZIP) | Company settings |
| Reporting Period | Month or Quarter being reported | User selection |

## Part 1 — Beer Summary

This is the core of the report. It uses a columnar layout tracking beer across different physical locations/stages.

### Columns (Beer Locations)

| Column | Label | Description |
|---|---|---|
| (a) | Operations | Row label/description |
| (b) | Cellar | Beer in fermentation/conditioning tanks |
| (c) | Racking — Bulk | Beer in bulk containers (kegs not counted here) |
| (d) | Racking — Keg | Beer in kegs |
| (e) | Bottling — Bulk | Beer in bottling line bulk tanks |
| (f) | Bottling — Case | Beer in cases/packaged |
| (g) | Totals | Sum of columns (b) through (f) |

### Additions to Beer Inventory (Lines 1-13)

| Line | Description | CellarTraks Data Needed |
|---|---|---|
| 1 | On hand beginning of report period | Previous period ending inventory (line 33 of last report) |
| 2 | Beer produced by fermentation | Volume of beer produced during period (sum of completed fermentation batches) |
| 3 | Addition of water and other liquids | Volume of water/adjuncts added post-fermentation |
| 4 | Beer received from racking and bottling | Internal transfers received back |
| 5 | Beer received in bond | Non-taxpaid beer transferred from other breweries under same ownership, or imported beer from customs |
| 6 | Beer received from cellars | Internal transfer from cellar |
| 7 | Beer returned to this brewery after removal | Taxpaid beer returned to THIS brewery |
| 8 | Beer returned from another brewery of same ownership | Taxpaid beer returned from sibling brewery |
| 9 | Racked | Beer moved to racking (internal movement) |
| 10 | Bottled | Beer moved to bottling (internal movement) |
| 11 | Physical inventory disclosed an overage | Positive inventory variance |
| 12 | (Blank — reserved for special entries, consult TTB) | |
| 13 | **Total additions + on hand** | Sum of lines 1-12 for each column |

### Removals from Beer Inventory (Lines 14-34)

| Line | Description | CellarTraks Data Needed | Tax Implications |
|---|---|---|---|
| 14 | Removed for consumption or sale | Sales/distribution volume | **TAXABLE** — multiply by tax rate for TTB F 5000.24 |
| 15 | Removed tax-determined for tavern on premises | Beer transferred to on-site taproom/tavern | **TAXABLE** — multiply by tax rate for TTB F 5000.24 |
| 16 | Removed without tax for export | Export shipments | Tax-free |
| 17 | Removed without tax for vessel/aircraft supplies | Military/transport supplies | Tax-free |
| 18 | Removed without tax for research & development | R&D use | Tax-free |
| 19 | Removed without tax to other breweries of same ownership | Transfers to sibling breweries | Tax-free |
| 20 | Removed without tax — beer unfit for sale, used in manufacturing | Spoiled beer used in production | Tax-free |
| 21 | Beer consumed on premises (NOT in tavern) | Tastings, staff consumption on brewery floor | Not subject to tax |
| 22 | Beer transferred for racking | Internal movement to racking | Internal |
| 23 | Beer transferred for bottling | Internal movement to bottling | Internal |
| 24 | Beer returned to cellars | Internal movement back to cellar | Internal |
| 25 | Beer racked | Volume racked | Internal |
| 26 | Beer bottled | Volume bottled | Internal |
| 27 | Laboratory samples | Volume used for lab testing | Not taxable |
| 28 | Beer destroyed at brewery | Destroyed non-taxpaid beer (no prior approval needed) | Not taxable |
| 29 | Beer transferred to distilled spirits plant | Beer sent for distillation | Not taxable (taxed as spirits) |
| 30 | Losses, including theft | Known losses — must explain in Remarks | May create tax liability |
| 31 | Physical inventory disclosed a shortage | Unexplained inventory variance | May create tax liability |
| 32 | (Blank — reserved for special entries) | | |
| 33 | **Total on hand end of period** | Line 13 minus lines 14-32 for each column | Must match physical inventory |
| 34 | **Total beer** | Sum of lines 14-33 | Must equal line 13 |

### Prior Period Adjustments (Lines 35-36)

| Line | Description | Notes |
|---|---|---|
| 35 | Additions to beer inventory (+/-) | Corrections to previously reported additions |
| 36 | Removals from beer inventory (+/-) | Corrections to previously reported removals |

- Not included in lines 13 or 34 totals
- Must explain in Part 3 - Remarks

## Part 2 — Cereal Beverage Summary

For products with less than 0.5% ABV (near-beer). Reported in **whole barrels only**.

| Line | Description |
|---|---|
| 1 | Produced |
| 2 | Removed |
| 3 | Received |
| 4 | Loss and wastage |
| 5 | (Blank) |
| 6 | Total on hand end of period |

## Part 3 — Remarks

Free-text section for:
- Explaining losses (line 30) and shortages (line 31) — **required**
- Explaining prior period adjustments (lines 35-36) — **required**
- Final report notation when closing brewery
- Any other relevant notes

## Tax Calculation

Tax is NOT calculated on this form. Instead:
1. Take barrels from lines 14 and 15 (taxable removals)
2. Multiply by the appropriate federal tax rate
3. Report on separate form **TTB F 5000.24** (Excise Tax Return) or via Pay.gov

### Current Federal Beer Tax Rates (for reference)

| Production Volume | Rate |
|---|---|
| First 60,000 barrels (small brewer ≤2M barrels/year) | $3.50/barrel |
| 60,001 to 2,000,000 barrels | $16.00/barrel |
| Over 2,000,000 barrels | $18.00/barrel |

*Note: Nashoba Valley qualifies as a small brewer and would use the $3.50/barrel rate.*

## Key Rules & Requirements

1. **Signing authority**: Only brewery representatives with signing authority or power of attorney on file with TTB
2. **Record retention**: Minimum 3 years
3. **Inventory reconciliation**: Line 33 must match physical inventory; line 34 must equal line 13
4. **Losses vs. shortages**: Losses = known events (theft, damage); Shortages = unexplained variances from inventory counts. Both must be explained.
5. **Tavern vs. premises consumption**: Beer sold in on-site tavern (line 15) IS taxable; beer consumed elsewhere on premises (line 21) is NOT
6. **Destroyed beer**: Non-taxpaid beer can be destroyed without prior approval (line 28). Taxpaid beer destroyed is reported on TTB F 5620.8 for refund, NOT on this form.
7. **Beer transferred to distillery**: Goes on line 29, taxed as spirits instead

## What CellarTraks Must Track (Summary)

To auto-populate this form, CellarTraks brewery division needs to track:

### Inventory by Location
- Cellar (fermenters/conditioning tanks)
- Racking — Bulk
- Racking — Keg
- Bottling — Bulk
- Bottling — Case

### Production Events
- Fermentation completions (volume produced)
- Water/liquid additions
- Internal transfers between locations (cellar → racking → bottling)
- Racking events (volume racked)
- Bottling/packaging events (volume bottled/canned)

### Removals
- Sales/distribution (taxable)
- Tavern/taproom transfers (taxable)
- Exports
- Transfers to other breweries (same ownership)
- Transfers to distillery
- R&D usage
- Lab samples
- Beer destroyed

### Inventory Adjustments
- Physical inventory counts with variance tracking (overage/shortage)
- Loss events with explanations

### Period Tracking
- Beginning inventory (carried from prior period end)
- Ending inventory (physical count reconciliation)
- Prior period adjustment records
