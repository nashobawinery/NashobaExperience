import { storage } from "./storage";
import type { InsertProduct, InsertTriviaQuestion } from "@shared/schema";

const seedProducts: InsertProduct[] = [
  {
    name: "Reserve Cabernet Sauvignon",
    category: "Wine",
    price: "34.99",
    description: "Rich and full-bodied with notes of dark cherry, oak, and subtle vanilla undertones. Aged in French oak barrels for 18 months.",
    stock: "in-stock",
    wineColor: "red",
    sweetness: "dry",
    body: "full",
    abv: "13.5%",
    servingTemp: "60-65°F",
    tastingNotes: "Dark cherry, blackberry, vanilla, tobacco",
    foodPairings: "Grilled steak, roasted lamb, aged cheeses",
    isStaffPick: true,
    isFeatured: true,
    sku: "NS-CAB-001",
  },
  {
    name: "Aged Apple Brandy",
    category: "Spirits",
    price: "45.00",
    description: "Smooth and refined apple brandy aged in oak barrels for 3 years. Complex flavor profile with hints of caramel and oak.",
    stock: "in-stock",
    abv: "40%",
    servingTemp: "Room temperature",
    tastingNotes: "Caramel, oak, apple, cinnamon",
    foodPairings: "Dark chocolate, apple desserts, cheese",
    isStaffPick: false,
    isFeatured: false,
    sku: "NS-BR-001",
  },
  {
    name: "Chardonnay Reserve",
    category: "Wine",
    price: "28.99",
    description: "Crisp and elegant Chardonnay with notes of citrus, green apple, and mineral undertones. Unoaked for pure fruit expression.",
    stock: "in-stock",
    wineColor: "white",
    sweetness: "dry",
    body: "medium",
    abv: "12.5%",
    servingTemp: "45-50°F",
    tastingNotes: "Citrus, green apple, pear, mineral",
    foodPairings: "Grilled fish, chicken, seafood pasta",
    isStaffPick: true,
    isFeatured: false,
    sku: "NS-CHAR-001",
  },
  {
    name: "Sparkling Rosé",
    category: "Wine",
    price: "32.99",
    description: "Delicate bubbles with strawberry and floral notes. Perfect for celebrations or warm summer evenings.",
    stock: "in-stock",
    wineColor: "rosé",
    sweetness: "off-dry",
    body: "light",
    abv: "11.5%",
    servingTemp: "40-45°F",
    tastingNotes: "Strawberry, rose petals, citrus, brioche",
    foodPairings: "Appetizers, salads, light seafood",
    isStaffPick: false,
    isFeatured: true,
    sku: "NS-ROSE-001",
  },
  {
    name: "Blueberry Hard Cider",
    category: "Beer",
    price: "12.99",
    description: "Refreshing hard cider infused with natural blueberry flavor. Sweet and tart with crisp apple notes.",
    stock: "in-stock",
    abv: "5.5%",
    servingTemp: "35-40°F",
    tastingNotes: "Blueberry, apple, honey",
    foodPairings: "BBQ, pork, sharp cheddar",
    isStaffPick: true,
    isFeatured: false,
    sku: "NS-CID-001",
  },
  {
    name: "Peach Bellini Cocktail Can",
    category: "Canned Cocktails",
    price: "8.99",
    description: "Ready-to-drink sparkling peach cocktail. Refreshing and perfect for picnics or outdoor events.",
    stock: "in-stock",
    abv: "6%",
    servingTemp: "Ice cold",
    tastingNotes: "Peach, prosecco, citrus",
    foodPairings: "Brunch foods, light appetizers",
    isStaffPick: false,
    isFeatured: false,
    sku: "NS-CAN-001",
  },
  {
    name: "Pinot Noir Estate",
    category: "Wine",
    price: "38.99",
    description: "Smooth and elegant Pinot Noir with notes of cherry, earth, and delicate spice. From our estate vineyard.",
    stock: "in-stock",
    wineColor: "red",
    sweetness: "dry",
    body: "medium",
    abv: "13%",
    servingTemp: "55-60°F",
    tastingNotes: "Cherry, mushroom, clove, earth",
    foodPairings: "Duck, salmon, mushroom risotto",
    isStaffPick: true,
    isFeatured: false,
    sku: "NS-PN-001",
  },
  {
    name: "Bourbon Barrel-Aged Stout",
    category: "Beer",
    price: "16.99",
    description: "Imperial stout aged in bourbon barrels. Rich, complex, and warming with notes of chocolate and vanilla.",
    stock: "in-stock",
    abv: "10%",
    servingTemp: "50-55°F",
    tastingNotes: "Chocolate, bourbon, vanilla, coffee",
    foodPairings: "Chocolate desserts, beef stew",
    isStaffPick: false,
    isFeatured: true,
    sku: "NS-BEER-002",
  },
];

const seedTriviaQuestions: InsertTriviaQuestion[] = [
  {
    question: "What region of France is Cabernet Sauvignon most famously associated with?",
    answers: ["Burgundy", "Bordeaux", "Champagne", "Loire Valley"],
    correctIndex: 1,
    explanation: "Bordeaux is the most famous region for Cabernet Sauvignon, particularly in the left bank areas like Pauillac and Margaux where it thrives in gravelly soils.",
    isActive: true,
  },
  {
    question: "At what temperature should red wine typically be served?",
    answers: ["Ice cold (40°F)", "Refrigerator temp (45°F)", "Cool room temp (55-65°F)", "Warm (75°F)"],
    correctIndex: 2,
    explanation: "Red wine is best served slightly below room temperature, around 55-65°F, to bring out its full flavor profile without overwhelming the palate with alcohol warmth.",
    isActive: true,
  },
  {
    question: "What does the term 'terroir' refer to in winemaking?",
    answers: ["The wine barrel type", "The combination of soil, climate, and geography", "The grape variety", "The fermentation process"],
    correctIndex: 1,
    explanation: "Terroir encompasses all the natural factors that affect a wine: the soil composition, climate, elevation, and geographic features of the vineyard.",
    isActive: true,
  },
  {
    question: "Which grape variety is Champagne primarily made from?",
    answers: ["Cabernet Sauvignon", "Chardonnay and Pinot Noir", "Sauvignon Blanc", "Merlot"],
    correctIndex: 1,
    explanation: "Champagne is primarily made from three grape varieties: Chardonnay, Pinot Noir, and Pinot Meunier, with Chardonnay and Pinot Noir being the most prominent.",
    isActive: true,
  },
  {
    question: "What does ABV stand for in alcoholic beverages?",
    answers: ["Actual Beverage Volume", "Alcohol By Volume", "Alcoholic Beverage Vintage", "After Barrel Vinification"],
    correctIndex: 1,
    explanation: "ABV stands for Alcohol By Volume, which indicates the percentage of alcohol in the beverage. For example, a wine with 13% ABV contains 13% pure alcohol.",
    isActive: true,
  },
  {
    question: "What is the process of removing sediment from wine called?",
    answers: ["Filtering", "Decanting", "Aging", "Crushing"],
    correctIndex: 1,
    explanation: "Decanting is the process of pouring wine from its bottle into another container to separate the wine from any sediment that has formed, particularly common in older red wines.",
    isActive: true,
  },
  {
    question: "Which country produces the most wine in the world?",
    answers: ["France", "Italy", "Spain", "United States"],
    correctIndex: 1,
    explanation: "Italy is traditionally the world's largest wine producer by volume, though it trades places with France depending on the vintage year. Both countries have centuries of winemaking tradition.",
    isActive: true,
  },
  {
    question: "What is the ideal serving temperature for sparkling wine?",
    answers: ["Room temperature (70°F)", "Slightly chilled (55°F)", "Very cold (40-45°F)", "Warm (75°F)"],
    correctIndex: 2,
    explanation: "Sparkling wine should be served very cold at 40-45°F to preserve the bubbles and maintain crispness. Warmer temperatures cause the wine to lose its effervescence quickly.",
    isActive: true,
  },
  {
    question: "What is the main difference between brandy and whiskey?",
    answers: ["Brandy is made from fruit, whiskey from grain", "Brandy is aged longer", "Whiskey has more alcohol", "There is no difference"],
    correctIndex: 0,
    explanation: "Brandy is distilled from fermented fruit juice (typically grapes), while whiskey is distilled from fermented grain mash. This fundamental difference in base ingredients creates their distinct flavor profiles.",
    isActive: true,
  },
  {
    question: "What does 'dry' mean when describing wine?",
    answers: ["The wine is old", "The wine has low sugar content", "The wine is high in tannins", "The wine has no bubbles"],
    correctIndex: 1,
    explanation: "A 'dry' wine has very little residual sugar, meaning most of the grape sugars were converted to alcohol during fermentation. This results in a wine that is not sweet.",
    isActive: true,
  },
];

export async function seedDatabase() {
  console.log("Starting database seed...");

  try {
    // Seed products
    console.log("Seeding products...");
    for (const product of seedProducts) {
      await storage.createProduct(product);
    }
    console.log(`✓ Seeded ${seedProducts.length} products`);

    // Seed trivia questions
    console.log("Seeding trivia questions...");
    for (const question of seedTriviaQuestions) {
      await storage.createTriviaQuestion(question);
    }
    console.log(`✓ Seeded ${seedTriviaQuestions.length} trivia questions`);

    // Set default discount tiers
    console.log("Setting default discount tiers...");
    await storage.setSetting("discount_tiers", {
      tier1: { min: 3, max: 5, discount: 0.05 },
      tier2: { min: 6, max: 11, discount: 0.10 },
      tier3: { min: 12, max: 23, discount: 0.15 },
      tier4: { min: 24, max: 999, discount: 0.24 },
    });
    console.log("✓ Set discount tiers");

    console.log("✅ Database seed completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run the seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => {
    console.log("Seed complete, exiting...");
    process.exit(0);
  }).catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
}
