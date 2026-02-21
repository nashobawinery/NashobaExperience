---
name: cellartraks-knowledge-base
description: Comprehensive reference for the CellarTraks production management module at Nashoba Valley. Use whenever working on CellarTraks features including production tracking, inventory, recipes, regulatory reporting (TTB federal forms, MA ABCC state forms), winemaking measurements, or compliance features. Read this FIRST before making any CellarTraks changes.
---

# CellarTraks Knowledge Base — Nashoba Valley

This is the living reference for the CellarTraks module. Read this before working on any CellarTraks feature to ensure alignment with real-world winery/distillery/brewery operations and regulatory requirements.

## Module Purpose

CellarTraks is Nashoba Valley's production management platform covering three divisions:
- **Winery** — Wine production from grape to bottle
- **Distillery** — Spirits production from grain/fruit to bottle
- **Brewery** — Beer/cider/seltzer production from grain to package

The module must accomplish:
1. **Production Tracking** — Log every step of production with measurements and notes
2. **Inventory Management** — Track raw materials, work-in-progress, and finished goods
3. **Recipe/Batch Management** — Define recipes and track batches through production
4. **Regulatory Compliance** — Generate data for federal (TTB) and state (MA ABCC) reports
5. **Tax Calculation** — Calculate excise taxes owed based on production/sales volumes

## Three Divisions

### Winery
Production stages: Grape Reception → Crushing/Pressing → Fermentation → Aging/Barrel → Racking → Blending → Fining/Filtering → Bottling → Labeling → Release
Key measurements tracked throughout: **TA** (Titratable Acidity), **pH**, **RS** (Residual Sugar), **Brix** (sugar content), **SO2** (Sulfite levels), **Temperature**

### Distillery
Production stages: Mash Bill Preparation → Mashing → Fermentation → Distillation (Stripping & Spirit Runs) → Barrel Entry → Aging → Proofing → Bottling
Key measurements: **Proof**, **ABV**, **Proof Gallons**, **Original Gravity**, **Final Gravity**, **Temperature**, **Barrel Entry Proof**

### Brewery
Production stages: Recipe/Grain Bill → Mashing → Lautering → Boil/Hop Schedule → Whirlpool → Fermentation → Conditioning → Carbonation → Packaging
Key measurements: **OG** (Original Gravity), **FG** (Final Gravity), **ABV**, **IBU** (Bitterness), **SRM** (Color), **pH**, **Temperature**, **Dissolved Oxygen**

## Key Winemaking Measurements (Detail)

| Measurement | Full Name | What It Measures | Typical Range | Why It Matters |
|---|---|---|---|---|
| **TA** | Titratable Acidity | Total acid concentration (g/L tartaric acid equivalent) | 5.5–8.5 g/L | Balance and taste; too low = flat, too high = sharp |
| **pH** | Potential Hydrogen | Acidity strength on logarithmic scale | 3.0–3.8 for wine | Microbial stability, SO2 effectiveness, color |
| **RS** | Residual Sugar | Sugar remaining after fermentation (g/L) | 0–200+ g/L | Determines dry vs. sweet classification |
| **Brix** | Degrees Brix | Sugar content as percentage by weight | 18–28° at harvest | Predicts potential alcohol; tracks fermentation progress |
| **SO2** | Sulfur Dioxide | Free and total sulfite levels (mg/L / ppm) | Free: 20–40 ppm | Antioxidant and antimicrobial protection |
| **VA** | Volatile Acidity | Acetic acid concentration (g/L) | <0.6 g/L | High VA = vinegar character (spoilage indicator) |
| **ML** | Malolactic Fermentation Status | Conversion of malic to lactic acid | Complete/Incomplete | Softens acidity, adds complexity; tracked as yes/no/in-progress |
| **Temp** | Temperature | Fermentation/storage temperature (°F or °C) | Varies by stage | Controls fermentation rate, flavor development |
| **DO** | Dissolved Oxygen | Oxygen in wine (ppb) | <50 ppb at bottling | Excessive oxygen causes premature aging/oxidation |

## Regulatory Reporting Overview

Nashoba Valley must file regular reports with both federal and state agencies. CellarTraks must track the data needed to complete these forms.

### Federal — Alcohol and Tobacco Tax and Trade Bureau (TTB)

The TTB requires monthly or quarterly reports depending on the operation size and type. Three primary forms, one per division:

| Form | Name | Division | Reporting Unit | Filing Frequency |
|---|---|---|---|---|
| **TTB F 5120.17** | Report of Wine Premises Operations | Winery | Wine Gallons | Monthly |
| **TTB F 5110.40** | Monthly Report of Production Operations | Distillery | Proof Gallons | Monthly |
| **TTB F 5130.9** | Brewer's Report of Operations | Brewery | Barrels (31 gal) | Monthly/Quarterly |

### State — Massachusetts Alcoholic Beverages Control Commission (ABCC)

| Form | Name | Purpose | Filing Frequency |
|---|---|---|---|
| **Form AB-1** | Alcoholic Beverages Excise Return | Report gallons sold and calculate state excise tax | Monthly |
| **Gallons Report** | Monthly Gallons Sold Report | Report gallons sold by category (wine, spirits, beer, cider) | Monthly |

## Federal TTB Classifications (Currently Implemented)

These are stored as enums in the database and assigned to products via `cellartraks_product_classifications`.

### Wine (Form 5120.17)
- Still Wine - not over 14% ABV
- Still Wine - over 14% to 16%
- Still Wine - over 16% to 21%
- Hard Cider (0.5% to <8.5% ABV, apple/pear derived)
- Artificially Carbonated Wine
- Sparkling Wine - Bottle Fermented
- Sparkling Wine - Bulk Process

### Spirits (Form 5110.40)
Whisky (Bourbon, Rye, Corn, Malt, Wheat, American Single Malt, Blended, Other), Brandy (Grape, Fruit, Pomace, Applejack, Other), Rum, Gin, Distilled Gin, Vodka, Neutral Spirits, Cordials/Liqueurs, Tequila, Mezcal, Flavored Spirits, Other Spirits

### Beer (Form 5130.9)
Beer, Lager, Ale, Porter, Stout, Malt Liquor, Malt Beverage, Flavored Malt Beverage, Hard Seltzer

## State Tax Classifications (Currently Implemented)

Stored in `cellartraks_state_tax_classes` table (database-driven, editable rates). Currently seeded for Massachusetts:

| Class Key | Display Name | Tax Rate | Unit | ABV Range |
|---|---|---|---|---|
| malt_beverages | Malt Beverages | $3.30 | per barrel | — |
| hard_cider | Hard Cider (3-6% ABV) | $0.03 | per gallon | 3-6% |
| still_wine | Still Wine | $0.55 | per gallon | — |
| sparkling_wine | Sparkling Wine / Champagne | $0.70 | per gallon | — |
| alcoholic_beverages_15_or_less | Alcoholic Beverages (15% ABV or less) | $1.10 | per gallon | ≤15% |
| distilled_spirits_15_to_50 | Distilled Spirits (15-50% ABV) | $4.05 | per gallon | 15-50% |
| distilled_spirits_over_50 | Distilled Spirits (over 50% ABV) | $4.05 | per proof gallon | >50% |

## Current Implementation Status

### Built
- CellarTraks shell with division navigation (Winery, Distillery, Brewery, Shared Operations, Classifications)
- Federal & State product classifications (assign TTB + MA classes to products)
- State Tax Rates management (editable tax rates from database)
- Toast Item Mapping (legacy ABCC classification from Toast menu items)
- Wine Sales Report (formerly ABCC Gallons Report — monthly gallons sold tracking)
- Dashboard placeholder

### Not Yet Built (Coming Soon)
- Production tracking per division
- Inventory management per division
- Recipe/batch management
- Inter-division inventory transfers
- Federal TTB report generation (Forms 5120.17, 5110.40, 5130.9)
- State ABCC report generation (Form AB-1 with tax calculations)
- Lab measurement tracking (TA, pH, RS, Brix, SO2, etc.)
- Barrel management and aging logs
- Bottling run tracking

## Uploaded Regulatory Forms & Reference Documents

*This section will be updated as the user uploads forms and reference documents.*

| Document | Description | Storage Location | Date Added |
|---|---|---|---|
| *(awaiting uploads)* | | | |

## Key Technical Details

- **Schema file**: `shared/schema.ts` (CellarTraks tables start around line 5608)
- **Backend routes**: `server/cellartraks-routes.ts`
- **Frontend pages**: `client/src/pages/cellartraks/`
- **Main component**: `CellarTraks.tsx` (shell with sidebar navigation)
- **Classifications UI**: `CellarTraksClassifications.tsx`
- **State Tax Rates UI**: `StateTaxClassifications.tsx`
- **Database tables**: `cellartraks_product_classifications`, `cellartraks_state_tax_classes`
- **Division values**: `winery`, `distillery`, `brewery`

## Domain Glossary

| Term | Definition |
|---|---|
| **TTB** | Alcohol and Tobacco Tax and Trade Bureau — federal agency regulating alcohol production |
| **ABCC** | Alcoholic Beverages Control Commission — Massachusetts state regulatory body |
| **Proof** | Measure of alcohol strength; 1 proof = 0.5% ABV (e.g., 80 proof = 40% ABV) |
| **Proof Gallon** | One gallon of liquid at 100 proof (50% ABV); the standard TTB unit for spirits taxation |
| **Wine Gallon** | One US gallon regardless of alcohol content; the standard TTB unit for wine |
| **Barrel** | 31 US gallons; the standard TTB unit for beer/malt beverages |
| **Brix** | Sugar content measurement; degrees Brix = grams of sugar per 100 grams of solution |
| **Must** | Freshly pressed grape juice before/during fermentation |
| **Lees** | Sediment (dead yeast, grape solids) that settles during fermentation |
| **Racking** | Transferring wine off the lees to a clean vessel |
| **Fining** | Adding agents to clarify wine by removing suspended particles |
| **Malolactic Fermentation (MLF)** | Secondary fermentation converting sharp malic acid to softer lactic acid |
| **Free SO2** | Active, protective portion of sulfur dioxide in wine |
| **Total SO2** | All sulfur dioxide in wine (free + bound) |
| **TA** | Titratable Acidity — total acid concentration measured by titration |
| **RS** | Residual Sugar — sugar remaining after fermentation |
| **VA** | Volatile Acidity — primarily acetic acid; indicator of spoilage |
| **Mash Bill** | Recipe of grains used in spirits/beer production (percentages of corn, rye, barley, wheat, etc.) |
| **Heads / Hearts / Tails** | Distillation fractions: heads (foreshots, methanol-rich), hearts (desired spirit), tails (fusel oils) |
| **Angel's Share** | Evaporation loss during barrel aging |
| **Gauging** | Measuring proof and volume of spirits for tax purposes |
| **Excise Tax** | Tax levied on production or sale of alcohol, paid per unit volume |
| **AB-1** | Massachusetts Alcoholic Beverages Excise Return form |
| **IBU** | International Bitterness Units — measure of hop bitterness in beer |
| **SRM** | Standard Reference Method — measure of beer color |
| **OG / FG** | Original Gravity / Final Gravity — density readings before and after fermentation |
