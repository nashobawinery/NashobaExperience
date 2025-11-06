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
    question: "What university does Rich, one of the owners, attend?",
    answers: ["Sonoma State", "UC Davis", "University of California", "University of Google"],
    correctIndex: 3,
    explanation: "Rich attended the University of Google, learning the craft through hands-on experience and self-education!",
    isActive: true,
  },
  {
    question: "How many acres is the current site that Nashoba sits on?",
    answers: ["39 acres", "43 acres", "52 acres", "60 acres"],
    correctIndex: 2,
    explanation: "Nashoba Valley Winery sits on a beautiful 52-acre property in Bolton, Massachusetts.",
    isActive: true,
  },
  {
    question: "How many solar panels are on top of 'The Cave'?",
    answers: ["26 panels", "52 panels", "71 panels", "100 panels"],
    correctIndex: 2,
    explanation: "There are 71 solar panels on top of The Cave, helping Nashoba operate sustainably!",
    isActive: true,
  },
  {
    question: "In what year was Nashoba Valley Winery founded?",
    answers: ["1968", "1978", "1988", "1995"],
    correctIndex: 1,
    explanation: "Nashoba Valley Winery was founded in 1978, making it one of Massachusetts' pioneering wineries.",
    isActive: true,
  },
  {
    question: "Who currently owns Nashoba Valley Winery?",
    answers: ["The Smith Family", "The Pelletier Family", "The Johnson Family", "A corporate group"],
    correctIndex: 1,
    explanation: "The Pelletier Family proudly owns and operates Nashoba Valley Winery, continuing the tradition of quality winemaking.",
    isActive: true,
  },
  {
    question: "What year did J's Restaurant open at the winery?",
    answers: ["1990", "1995", "1998", "2005"],
    correctIndex: 2,
    explanation: "J's Restaurant opened in 1998, adding a world-class dining experience to complement Nashoba's beverages.",
    isActive: true,
  },
  {
    question: "How many acres is the Nashoba Valley estate?",
    answers: ["25 acres", "50 acres", "75 acres", "100 acres"],
    correctIndex: 1,
    explanation: "The Nashoba Valley estate spans 50 acres of beautiful New England countryside.",
    isActive: true,
  },
  {
    question: "What is Nashoba's motto?",
    answers: ["Made in Massachusetts", "Born in Concord, Raised in Bolton", "New England's Finest", "From Orchard to Bottle"],
    correctIndex: 1,
    explanation: "Nashoba's motto is 'Born in Concord, Raised in Bolton,' reflecting its proud Massachusetts heritage.",
    isActive: true,
  },
  {
    question: "What ranking did J's Restaurant receive in 2021?",
    answers: ["#1 Best Winery Restaurant", "#3 Best Winery Restaurant", "#5 Best Restaurant", "#10 Best Restaurant"],
    correctIndex: 1,
    explanation: "J's Restaurant was honored as the #3 Best Winery Restaurant in 2021, showcasing its exceptional cuisine!",
    isActive: true,
  },
  {
    question: "What type of wines did Nashoba originally specialize in?",
    answers: ["Traditional grape wines", "Fruit wines from local orchards", "Imported wines", "Sparkling wines"],
    correctIndex: 1,
    explanation: "Nashoba originally specialized in fruit wines made from local orchards, embracing New England's agricultural heritage.",
    isActive: true,
  },
  {
    question: "In which Massachusetts town is Nashoba Valley Winery located?",
    answers: ["Concord", "Bolton", "Harvard", "Acton"],
    correctIndex: 1,
    explanation: "Nashoba Valley Winery is located in Bolton, Massachusetts, in the heart of scenic central Massachusetts.",
    isActive: true,
  },
  {
    question: "How long has Nashoba been crafting beverages?",
    answers: ["25+ years", "35+ years", "45+ years", "55+ years"],
    correctIndex: 2,
    explanation: "Nashoba has been crafting quality beverages for over 45 years, perfecting their craft since 1978!",
    isActive: true,
  },
  {
    question: "What does 'Nashoba' mean?",
    answers: ["Beautiful Valley", "Bear Place", "River Country", "Apple Hill"],
    correctIndex: 1,
    explanation: "Nashoba means 'Bear Place' in the Native American Algonquin language, honoring the region's indigenous heritage.",
    isActive: true,
  },
  {
    question: "What publications have featured J's Restaurant?",
    answers: ["Zagat and Boston Magazine", "Zagat, Yankee Magazine, and Boston Globe", "Wine Spectator only", "Food & Wine Magazine"],
    correctIndex: 1,
    explanation: "J's Restaurant has been featured in prestigious publications including Zagat, Yankee Magazine, and the Boston Globe!",
    isActive: true,
  },
  {
    question: "What types of beverages does Nashoba produce?",
    answers: ["Only wines", "Wines and beers", "Wines, spirits, and beers", "Just spirits"],
    correctIndex: 2,
    explanation: "Nashoba produces a diverse selection of wines, spirits, and beers, offering something for every palate!",
    isActive: true,
  },
  {
    question: "What is special about Nashoba's production methods?",
    answers: ["Mass produced", "Handcrafted and premium", "Automated processing", "Import-based"],
    correctIndex: 1,
    explanation: "Nashoba uses handcrafted and premium production methods, ensuring the highest quality in every bottle.",
    isActive: true,
  },
  {
    question: "What was the original use of the Nashoba Valley land?",
    answers: ["Farmland", "Apple orchards", "Dairy farm", "Forest"],
    correctIndex: 1,
    explanation: "The land was originally used for apple orchards, which inspired Nashoba's fruit wine tradition and famous apple brandy.",
    isActive: true,
  },
  {
    question: "How many different products does Nashoba typically offer?",
    answers: ["About 25", "About 50", "About 75", "About 100+"],
    correctIndex: 3,
    explanation: "Nashoba offers about 100+ different products, providing an incredible variety of wines, spirits, and beers!",
    isActive: true,
  },
  {
    question: "What season typically sees the largest harvest at the winery?",
    answers: ["Spring", "Summer", "Fall", "Winter"],
    correctIndex: 2,
    explanation: "Fall is harvest season at Nashoba, when the orchards and vineyards yield their finest fruits for winemaking.",
    isActive: true,
  },
  {
    question: "What is Nashoba's most popular wine style?",
    answers: ["Dry reds", "Sweet fruit wines", "Sparkling wines", "Rosés"],
    correctIndex: 1,
    explanation: "Sweet fruit wines are Nashoba's most popular style, celebrating New England's bountiful fruit harvests!",
    isActive: true,
  },
  {
    question: "Does Nashoba grow all its own grapes?",
    answers: ["Yes, 100% estate grown", "No, all imported", "Mix of estate and sourced", "Only contract farming"],
    correctIndex: 2,
    explanation: "Nashoba uses a mix of estate-grown and carefully sourced grapes and fruits to create their diverse product range.",
    isActive: true,
  },
  {
    question: "What is the address of Nashoba Valley Winery?",
    answers: ["100 Wattaquadock Hill Road", "50 Orchard Hill Road", "200 Valley Road", "75 Winery Lane"],
    correctIndex: 0,
    explanation: "Visit Nashoba at 100 Wattaquadock Hill Road in Bolton, Massachusetts for an unforgettable experience!",
    isActive: true,
  },
  {
    question: "What makes Nashoba's location special?",
    answers: ["Ocean views", "Mountain peaks", "Hilltop with scenic views", "Riverside setting"],
    correctIndex: 2,
    explanation: "Nashoba is perched on a hilltop with breathtaking scenic views of central Massachusetts countryside!",
    isActive: true,
  },
  {
    question: "What is one of Nashoba's signature spirits?",
    answers: ["Tequila", "Apple brandy", "Rum", "Whiskey"],
    correctIndex: 1,
    explanation: "Apple brandy is one of Nashoba's signature spirits, made from New England apples and aged to perfection.",
    isActive: true,
  },
  {
    question: "When is the best time to visit Nashoba for outdoor dining?",
    answers: ["Winter only", "Spring through Fall", "Summer only", "Year-round"],
    correctIndex: 1,
    explanation: "Spring through Fall offers the best weather for outdoor dining at J's Restaurant with stunning hilltop views!",
    isActive: true,
  },
  {
    question: "Does Nashoba offer wedding and event services?",
    answers: ["No events allowed", "Corporate weddings only", "Full event services", "Weddings only"],
    correctIndex: 2,
    explanation: "Nashoba offers full event services, making it a perfect venue for weddings, celebrations, and corporate events!",
    isActive: true,
  },
  {
    question: "What philosophy guides Nashoba's winemaking?",
    answers: ["Quantity over quality", "Quality and handcrafted excellence", "Fast production", "Traditional methods only"],
    correctIndex: 1,
    explanation: "Quality and handcrafted excellence guide every step of Nashoba's winemaking and spirit production.",
    isActive: true,
  },
  {
    question: "How does Nashoba support local agriculture?",
    answers: ["Doesn't use local products", "Sources from local orchards and farms", "Only imports ingredients", "Uses synthetic flavors"],
    correctIndex: 1,
    explanation: "Nashoba proudly sources from local orchards and farms, supporting Massachusetts agriculture and ensuring fresh, quality ingredients!",
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
