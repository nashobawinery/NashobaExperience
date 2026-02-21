# Massachusetts Form AB-1 — Alcoholic Beverages Excise Return

**Form**: Form AB-1 (Rev. 6/14)
**Agency**: Massachusetts Department of Revenue
**Uploaded**: February 2026

## Overview

This is the Massachusetts state excise tax return for alcoholic beverages. It reports all alcohol imported, purchased, manufactured, or otherwise acquired during the month, calculates gallons sold by category, and determines excise tax owed. It is filed monthly.

## Filing Requirements

| Item | Detail |
|---|---|
| Frequency | Monthly |
| Due Date | 20th day of the month following the reporting month |
| Late Penalty | 1% per month (or fraction) of unpaid balance, up to 25% max |
| Interest | Assessed on any unpaid tax after due date |
| Payment | Check payable to Commonwealth of Massachusetts |
| Mail to | Massachusetts Department of Revenue, PO Box 7012, Boston, MA 02204 |

## Header Information

| Field | Description |
|---|---|
| Name of licensee | Legal business name |
| License number | MA alcohol license number |
| Federal Identification number (EIN) | Federal EIN |
| Social Security number | SSN (if applicable) |
| Street address, City/Town, State, Zip | Business address |
| Month | Reporting month |
| Amended return checkbox | If correcting a prior filing |
| Change of address checkbox | If address changed |

## Page 1 — Computation of Excise

This is the main tax calculation page. Each line pulls totals from a corresponding schedule.

### Tax Lines

| Line | Type of Beverage | Unit | Rate | Source Schedule | Tax Calculation Method |
|---|---|---|---|---|---|
| 1 | Malt beverages | 31-gal barrels | $3.30/barrel | Schedule A, line 2 col a | Total imported/purchased minus adjustments (Schedule F), then multiply by rate |
| 2 | Still wine, including vermouth | Wine gallons | $0.55/gallon | Schedule B1, line 5 col a | Total sold minus adjustments, then multiply by rate |
| 3 | Champagne and all other sparkling wines | Wine gallons | $0.70/gallon | Schedule B2, line 5 col a | Total sold minus adjustments, then multiply by rate |
| 4 | Alcoholic beverages (≤15% ABV, not malt/wine) | Wine gallons | $1.10/gallon | Schedule C, line 5 col a | Total sold minus adjustments, then multiply by rate |
| 5 | Alcoholic beverages (>15% to ≤50% ABV) | Wine gallons | $4.05/gallon | Schedule D, line 5 col a | Total sold minus adjustments, then multiply by rate |
| 6 | Alcoholic beverages (>50% ABV) | Proof gallons | $4.05/proof gallon | Schedule E, lines 5a+5b col a | Total sold minus adjustments, then multiply by rate |
| 7 | Alcohol in containers ≤1 wine gallon | Proof gallons | $4.05/proof gallon | Schedule G, line 8 col a | Proof gallons sold minus adjustments, then multiply by rate |
| 8 | Cider (>3% to ≤6% ABV by weight) | Wine gallons | $0.03/gallon | Schedule I, line 5 col a | Total sold minus adjustments, then multiply by rate |
| 9 | **Total excise** | | | Sum of lines 1-8 | If positive: pay. If negative: refund. |

### Important Tax Calculation Notes

- **Line 1 (Malt)**: Uses "imported/purchased/acquired" method — tax based on volume ACQUIRED, not sold
- **Lines 2-8**: Uses "sold" method — tax based on volume SOLD (acquired + beginning inventory - ending inventory)
- **Adjustments** (column b): From Schedule F — deductions for out-of-state sales, military sales, airline sales, breakage, theft, disposal, non-taxable transfers, religious wine sales
- Liters conversion: multiply liters by 0.264172 to get gallons

## Schedule A — Malt Beverages Imported, Purchased or Otherwise Acquired

Lists all malt beverage receipts by individual invoice:

| Field | Description |
|---|---|
| Date received | Receipt date |
| Invoice number | Purchase invoice # |
| From whom acquired | Supplier name |
| Number of barrels or cases | Quantity received |
| Number of liters (if applicable) | For metric quantities |
| Gallons — No tax paid (col a) | Gallons on which no MA tax was paid |
| Gallons — Mass. tax paid (col b) | Gallons on which MA tax was already paid |

**Line 1**: Total imported, purchased or otherwise acquired
**Line 2**: Thirty-one gallon barrels (or fractional part) — this is the taxable amount that flows to Page 1, Line 1

## Schedule B1 — Still Wine, Including Vermouth

Lists all still wine acquisitions by invoice. Uses inventory method to determine "sold":

| Line | Description |
|---|---|
| 1 | Total manufactured, purchased or otherwise acquired |
| 2 | Inventory at beginning of month |
| 3 | Add lines 1 and 2 |
| 4 | Inventory at end of month |
| 5 | **Total sold** (line 3 minus line 4) — flows to Page 1, Line 2 |

Two columns: (a) No tax paid, (b) Mass. tax paid

## Schedule B2 — Champagne and All Other Sparkling Wines

Same structure as B1. Line 5 total sold flows to Page 1, Line 3.

## Schedule C — Alcoholic Beverages ≤15% ABV (Excluding Malt, Wine, Vermouth)

Same structure as B1. Requires "Type of beverage" column. Line 5 flows to Page 1, Line 4.
Includes: low-ABV spirits, liqueurs, ready-to-drink cocktails under 15%.

## Schedule D — Alcoholic Beverages >15% to ≤50% ABV

Same structure. Reported in **wine gallons** (not proof gallons, even for spirits).
Includes all beverages of 100 proof or less.
Line 5 flows to Page 1, Line 5.

## Schedule E — Alcoholic Beverages >50% ABV

Different structure — reported in **proof gallons**:

| Line | Description |
|---|---|
| 1 | Total manufactured, purchased, rectified or otherwise acquired |
| 2 | Inventory at beginning of month |
| 3 | Add lines 1 and 2 |
| 4 | Inventory at end of month |
| 5 | Total to be accounted for (line 3 minus line 4) |
| 5a | Sold in original packages — taxable |
| 5b | Bottled products sold — taxable |
| 6 | Total accounted for (must equal line 5) |

Lines 5a + 5b flow to Page 1, Line 6.

## Schedule F — Deductions (Adjustments)

Used to claim deductions from taxable amounts. Separate schedule for each consignee.

### Header Fields
- Consignor name, address, EIN
- Consignee name, address, EIN
- Date shipped
- How shipped (carrier name)

### Deduction Reasons (checkboxes)
- Sale outside of Massachusetts
- Sale of wine for religious purposes
- Sale to military
- Sale to airline
- Loss of inventory due to breakage
- Officially reported theft
- Disposal
- Non-taxable transfer

### Deduction Lines (by beverage type)
| Line | Beverage Type | Unit | Include In |
|---|---|---|---|
| 1 | Malt beverages | Gallon barrels | Schedule A, line 2 |
| 2 | Still wine including vermouth | Wine gallons | Schedule B1, line 5 |
| 3 | Champagne and sparkling wines | Wine gallons | Schedule B2, line 5 |
| 4 | Alcoholic beverage ≤15% | Wine gallons | Schedule C, line 5 |
| 5 | Alcoholic beverage >15% to ≤50% | Wine gallons | Schedule D, line 5 |
| 6 | Alcoholic beverage >50% | Proof gallons | Schedule E, line 6 |
| 7 | Alcohol in containers ≤1 gallon | Wine gallons | Schedule G, line 5 |
| 8 | Cider >3% to ≤6% | Wine gallons | Schedule I, line 5 |

## Schedule G — Alcohol

For alcohol subject to Chapter 138 (excludes denatured and methyl/wood alcohol).
Reported in **proof gallons**.

| Line | Description |
|---|---|
| 1 | Total manufactured, purchased or otherwise acquired |
| 2 | Inventory at beginning of month |
| 3 | Add lines 1 and 2 |
| 4 | Inventory at end of month |
| 5 | Total sold (line 3 minus line 4) |
| 6 | Proof gallons sold for scientific/chemical/manufacturing/industrial/culinary/pharmaceutical/medical purposes in containers >1 wine gallon — **nontaxable** |
| 7 | Proof gallons used for rectification or other process by reporting licensee |
| 8 | **Proof gallons sold in containers ≤1 wine gallon — taxable** (flows to Page 1, Line 7) |

## Schedule I — Cider

For cider containing >3% but ≤6% ABV by weight at 60°F.
Reported in **wine gallons**. Same inventory structure as Schedule B1.
Line 5 flows to Page 1, Line 8.

## Mapping AB-1 to CellarTraks State Tax Classifications

| AB-1 Line | Beverage | CellarTraks classKey | Tax Rate |
|---|---|---|---|
| 1 | Malt beverages | `malt_beverages` | $3.30/barrel |
| 2 | Still wine, incl. vermouth | `still_wine` | $0.55/gal |
| 3 | Champagne & sparkling | `sparkling_wine` | $0.70/gal |
| 4 | Alcoholic beverages ≤15% | `alcoholic_beverages_15_or_less` | $1.10/gal |
| 5 | Alcoholic beverages >15%-50% | `distilled_spirits_15_to_50` | $4.05/gal |
| 6 | Alcoholic beverages >50% | `distilled_spirits_over_50` | $4.05/proof gal |
| 7 | Alcohol in small containers | (maps to `distilled_spirits_over_50` or similar) | $4.05/proof gal |
| 8 | Cider >3%-6% | `hard_cider` | $0.03/gal |

## What CellarTraks Must Track (Summary)

### For Each Beverage Category
- Monthly acquisitions/production (with invoice details: date, invoice #, supplier)
- Beginning of month inventory
- End of month inventory
- Gallons sold = (Acquired + Beginning Inventory) - Ending Inventory
- Track whether MA tax was already paid on each receipt

### Deductions/Adjustments
- Out-of-state sales (by consignee)
- Military, airline, religious sales
- Breakage, theft, disposal
- Non-taxable transfers
- Each deduction needs: consignee info, date shipped, carrier

### Tax Calculation
- Apply correct rate per category
- Handle proof gallon conversion for >50% ABV products
- Sum all lines for total excise due

### Key Differences from Federal Reporting
- MA uses "gallons sold" (inventory-based) rather than "gallons removed" for most categories
- Malt beverages use "acquired" basis, not sold
- Due date is 20th (not 15th like federal)
- MA tracks by buyer/supplier invoice detail
- Unit for >50% spirits is proof gallons; ≤50% spirits is wine gallons
