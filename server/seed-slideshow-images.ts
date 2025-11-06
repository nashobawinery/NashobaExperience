import { db } from "./db";
import { slideshowImages } from "@shared/schema";

const images = [
  {
    filename: "Winery-areal_1762431445607.webp",
    caption: "Welcome to Nashoba Valley Winery!",
    description: "Aerial view of our beautiful winery, vineyards, and pond",
    displayOrder: 1,
    isActive: true,
  },
  {
    filename: "better barrels_1762444383358.jpg",
    caption: "Our barrel room",
    description: "Traditional oak barrels aging our finest products",
    displayOrder: 2,
    isActive: true,
  },
  {
    filename: "tasting room_1762444383363.jpg",
    caption: "Tasting room experience",
    description: "Our welcoming tasting bar where the journey begins",
    displayOrder: 3,
    isActive: true,
  },
  {
    filename: "friends_1762444383359.jpg",
    caption: "Gather with friends",
    description: "Guests enjoying a tasting together",
    displayOrder: 4,
    isActive: true,
  },
  {
    filename: "Grounds_1762444383360.jpg",
    caption: "Our scenic grounds",
    description: "The winery building surrounded by beautiful vineyards",
    displayOrder: 5,
    isActive: false,
  },
  {
    filename: "Vineyards_1762444383363.jpg",
    caption: "Fresh from the vineyard",
    description: "Grapes ripening on the vine",
    displayOrder: 6,
    isActive: false,
  },
  {
    filename: "wine_1762444383363.jpg",
    caption: "Premium wines",
    description: "Enjoying our handcrafted wines with a view",
    displayOrder: 7,
    isActive: false,
  },
  {
    filename: "Brandy_1762444383359.jpg",
    caption: "Artisan spirits",
    description: "Our award-winning brandy",
    displayOrder: 8,
    isActive: false,
  },
  {
    filename: "josh_1762444383360.jpg",
    caption: "Expert guidance",
    description: "Our knowledgeable staff ready to assist",
    displayOrder: 9,
    isActive: false,
  },
  {
    filename: "charcu_1762444383359.jpg",
    caption: "Perfect pairings",
    description: "Charcuterie and products to complement your tasting",
    displayOrder: 10,
    isActive: false,
  },
  {
    filename: "retail2_1762444383362.jpg",
    caption: "Browse our selection",
    description: "Retail area featuring local products and gifts",
    displayOrder: 11,
    isActive: false,
  },
  {
    filename: "Pavillion_1762444383362.jpg",
    caption: "The Pavilion",
    description: "Historic event space for celebrations",
    displayOrder: 12,
    isActive: false,
  },
  {
    filename: "Pavillion gather_1762444383362.jpg",
    caption: "Memorable gatherings",
    description: "Family and friends enjoying The Pavilion",
    displayOrder: 13,
    isActive: false,
  },
  {
    filename: "knoll fun_1762444383361.webp",
    caption: "Knoll at sunset",
    description: "Outdoor seating area with vineyard views",
    displayOrder: 14,
    isActive: false,
  },
  {
    filename: "knoll service_1762444383361.jpg",
    caption: "Warm hospitality",
    description: "Staff greeting guests at the entrance",
    displayOrder: 15,
    isActive: false,
  },
  {
    filename: "grateful_1762444383360.jpg",
    caption: "Gratitude and celebration",
    description: "Thank you for visiting us",
    displayOrder: 16,
    isActive: false,
  },
  {
    filename: "Nice_1762444383361.jpg",
    caption: "Gourmet offerings",
    description: "Selection of specialty foods and products",
    displayOrder: 17,
    isActive: false,
  },
  {
    filename: "barrels_1762444383358.jpg",
    caption: "Craftsmanship",
    description: "Traditional barrel aging process",
    displayOrder: 18,
    isActive: false,
  },
];

async function seedSlideshowImages() {
  console.log("🌱 Seeding slideshow images...");

  try {
    // Insert all images
    for (const image of images) {
      await db.insert(slideshowImages).values(image);
      console.log(`✅ Added: ${image.filename}`);
    }

    console.log(`\n✨ Successfully seeded ${images.length} slideshow images!`);
    console.log(`📸 ${images.filter(img => img.isActive).length} images are currently active in the slideshow`);
  } catch (error) {
    console.error("❌ Error seeding slideshow images:", error);
    throw error;
  }
}

// Run the seed function
seedSlideshowImages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
