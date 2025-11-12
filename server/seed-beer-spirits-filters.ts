import { db } from "./db";
import { filterOptions } from "@shared/schema";

export async function seedBeerSpiritsFilters() {
  console.log("Seeding beer and spirits filter options...");

  const filterData = [
    // Beer Style
    { fieldType: "beer_style", optionValue: "ipa", displayLabel: "IPA", sortOrder: 1 },
    { fieldType: "beer_style", optionValue: "lager", displayLabel: "Lager", sortOrder: 2 },
    { fieldType: "beer_style", optionValue: "stout", displayLabel: "Stout", sortOrder: 3 },
    { fieldType: "beer_style", optionValue: "porter", displayLabel: "Porter", sortOrder: 4 },
    { fieldType: "beer_style", optionValue: "ale", displayLabel: "Ale", sortOrder: 5 },
    { fieldType: "beer_style", optionValue: "wheat_beer", displayLabel: "Wheat Beer", sortOrder: 6 },
    { fieldType: "beer_style", optionValue: "pilsner", displayLabel: "Pilsner", sortOrder: 7 },
    { fieldType: "beer_style", optionValue: "sour", displayLabel: "Sour", sortOrder: 8 },
    { fieldType: "beer_style", optionValue: "amber", displayLabel: "Amber", sortOrder: 9 },
    { fieldType: "beer_style", optionValue: "pale_ale", displayLabel: "Pale Ale", sortOrder: 10 },
    { fieldType: "beer_style", optionValue: "saison", displayLabel: "Saison", sortOrder: 11 },
    { fieldType: "beer_style", optionValue: "belgian", displayLabel: "Belgian", sortOrder: 12 },

    // Beer Color
    { fieldType: "beer_color", optionValue: "pale", displayLabel: "Pale", sortOrder: 1 },
    { fieldType: "beer_color", optionValue: "amber", displayLabel: "Amber", sortOrder: 2 },
    { fieldType: "beer_color", optionValue: "dark", displayLabel: "Dark", sortOrder: 3 },

    // Beer Bitterness
    { fieldType: "beer_bitterness", optionValue: "mild", displayLabel: "Mild", sortOrder: 1 },
    { fieldType: "beer_bitterness", optionValue: "moderate", displayLabel: "Moderate", sortOrder: 2 },
    { fieldType: "beer_bitterness", optionValue: "hoppy", displayLabel: "Hoppy", sortOrder: 3 },
    { fieldType: "beer_bitterness", optionValue: "very_hoppy", displayLabel: "Very Hoppy", sortOrder: 4 },

    // Spirit Type
    { fieldType: "spirit_type", optionValue: "whiskey", displayLabel: "Whiskey", sortOrder: 1 },
    { fieldType: "spirit_type", optionValue: "bourbon", displayLabel: "Bourbon", sortOrder: 2 },
    { fieldType: "spirit_type", optionValue: "scotch", displayLabel: "Scotch", sortOrder: 3 },
    { fieldType: "spirit_type", optionValue: "rye", displayLabel: "Rye Whiskey", sortOrder: 4 },
    { fieldType: "spirit_type", optionValue: "vodka", displayLabel: "Vodka", sortOrder: 5 },
    { fieldType: "spirit_type", optionValue: "gin", displayLabel: "Gin", sortOrder: 6 },
    { fieldType: "spirit_type", optionValue: "rum", displayLabel: "Rum", sortOrder: 7 },
    { fieldType: "spirit_type", optionValue: "tequila", displayLabel: "Tequila", sortOrder: 8 },
    { fieldType: "spirit_type", optionValue: "mezcal", displayLabel: "Mezcal", sortOrder: 9 },
    { fieldType: "spirit_type", optionValue: "brandy", displayLabel: "Brandy", sortOrder: 10 },
    { fieldType: "spirit_type", optionValue: "cognac", displayLabel: "Cognac", sortOrder: 11 },
    { fieldType: "spirit_type", optionValue: "liqueur", displayLabel: "Liqueur", sortOrder: 12 },

    // Spirit Aging
    { fieldType: "spirit_aging", optionValue: "unaged", displayLabel: "Unaged", sortOrder: 1 },
    { fieldType: "spirit_aging", optionValue: "young", displayLabel: "Young (2-5 years)", sortOrder: 2 },
    { fieldType: "spirit_aging", optionValue: "aged", displayLabel: "Aged (5-10 years)", sortOrder: 3 },
    { fieldType: "spirit_aging", optionValue: "extra_aged", displayLabel: "Extra Aged (10+ years)", sortOrder: 4 },

    // Spirit Flavor
    { fieldType: "spirit_flavor", optionValue: "smooth", displayLabel: "Smooth", sortOrder: 1 },
    { fieldType: "spirit_flavor", optionValue: "bold", displayLabel: "Bold", sortOrder: 2 },
    { fieldType: "spirit_flavor", optionValue: "sweet", displayLabel: "Sweet", sortOrder: 3 },
    { fieldType: "spirit_flavor", optionValue: "spicy", displayLabel: "Spicy", sortOrder: 4 },
    { fieldType: "spirit_flavor", optionValue: "fruity", displayLabel: "Fruity", sortOrder: 5 },
    { fieldType: "spirit_flavor", optionValue: "smoky", displayLabel: "Smoky", sortOrder: 6 },
    { fieldType: "spirit_flavor", optionValue: "herbal", displayLabel: "Herbal", sortOrder: 7 },
    { fieldType: "spirit_flavor", optionValue: "citrus", displayLabel: "Citrus", sortOrder: 8 },
  ];

  for (const filter of filterData) {
    await db
      .insert(filterOptions)
      .values(filter)
      .onConflictDoUpdate({
        target: [filterOptions.fieldType, filterOptions.optionValue],
        set: {
          displayLabel: filter.displayLabel,
          sortOrder: filter.sortOrder,
          isActive: true,
        },
      });
  }

  console.log(`Seeded ${filterData.length} beer and spirits filter options`);
}

// Run if called directly
const isRunDirectly = import.meta.url.startsWith('file:') && process.argv[1] && import.meta.url.endsWith(process.argv[1]);
if (isRunDirectly) {
  seedBeerSpiritsFilters()
    .then(() => {
      console.log("Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error seeding filters:", error);
      process.exit(1);
    });
}
