require("dotenv").config({ path: "../.env" });
const Product = require("../src/models/Product");
const connectDB = require("../src/config/db");


const priceMap = {
  classic: {
    3: 1500,
    30: 12000
  },
  premium: {
    10: 6500
  },
  luxury: {
    10: 8500
  }
};


const products = 

 [
  // Classic Fragrances - Alphabetical
  { "name": "Allure Homme Sport", "category": "classic", "size": null, "stock": 0 },
  { "name": "Amor Amor", "category": "classic", "size": null, "stock": 0 },
  { "name": "Amouage Interlude", "category": "classic", "size": 3, "stock": 2 },
  { "name": "Amouage Interlude", "category": "classic", "size": 30, "stock": 1 },
  { "name": "Aqua di gio Profumo", "category": "classic", "size": null, "stock": 0 },
  { "name": "Black Orchid", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Bvlgari Extreme Man", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Cherry in the Air", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Coconut Passion", "category": "classic", "size": null, "stock": 0 },
  { "name": "Cool Water Man", "category": "classic", "size": null, "stock": 0 },
  { "name": "Cool Water Woman", "category": "classic", "size": null, "stock": 0 },
  { "name": "Decadence Marc Jacobs", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Eternity", "category": "classic", "size": null, "stock": 0 },
  { "name": "Escada Magnetism", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Escada Taj Sunset", "category": "classic", "size": null, "stock": 0 },
  { "name": "Fahrenheit Dior", "category": "classic", "size": null, "stock": 0 },
  { "name": "French Coffee", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Good Girl Carolina Herrera", "category": "classic", "size": null, "stock": 0 },
  { "name": "Golden Sand", "category": "classic", "size": null, "stock": 0 },
  { "name": "Gucci Bloom", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Gucci Flora", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Gucci Guilty", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Gucci Oud Intense", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Hugo Boss Man", "category": "classic", "size": null, "stock": 0 },
  { "name": "Hugo Boss Orange", "category": "classic", "size": null, "stock": 0 },
  { "name": "Issey Miyake", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Jadore", "category": "classic", "size": null, "stock": 0 },
  { "name": "Jimmy Choo Woman", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Lovespell Victoria Secret", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Lusty Gourmand", "category": "classic", "size": null, "stock": 0 },
  { "name": "Mango Temptation", "category": "classic", "size": null, "stock": 0 },
  { "name": "Man in Black Bvlgari", "category": "classic", "size": null, "stock": 0 },
  { "name": "Mon Paris", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Olympea Paco Robanne", "category": "classic", "size": 3, "stock": 1 },
  { "name": "One Million", "category": "classic", "size": null, "stock": 0 },
  { "name": "Oud Touch Frank Oliver", "category": "classic", "size": null, "stock": 0 },
  { "name": "Pink Chiffon", "category": "classic", "size": null, "stock": 0 },
  { "name": "Pink Sugar", "category": "classic", "size": null, "stock": 0 },
  { "name": "Polo Blue", "category": "classic", "size": null, "stock": 0 },
  { "name": "Polo Red", "category": "classic", "size": null, "stock": 0 },
  { "name": "Polo Sport", "category": "classic", "size": null, "stock": 0 },
  { "name": "Prada Candy", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Red Door Elizabeth Arden", "category": "classic", "size": null, "stock": 0 },
  { "name": "Si Armani Woman", "category": "classic", "size": null, "stock": 0 },
  { "name": "Strawberry", "category": "classic", "size": null, "stock": 0 },
  { "name": "Stronger With You", "category": "classic", "size": null, "stock": 0 },
  { "name": "Sexy Lady", "category": "classic", "size": null, "stock": 0 },
  { "name": "Sauvage Dior", "category": "classic", "size": null, "stock": 0 },
  { "name": "Scandal Jean Paul Gaultier", "category": "classic", "size": null, "stock": 0 },
  { "name": "Sugar Baby", "category": "classic", "size": null, "stock": 0 },
  { "name": "Terre de Hermes", "category": "classic", "size": null, "stock": 0 },
  { "name": "Tobacco Vanille", "category": "classic", "size": null, "stock": 0 },
  { "name": "Toot Berry", "category": "classic", "size": null, "stock": 0 },
  { "name": "Tom Ford Lavender Extreme", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Victoria Secret Bombshell", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Versace Eros Men", "category": "classic", "size": 3, "stock": 1 },
  { "name": "Wanted by Night Azzaro", "category": "classic", "size": 3, "stock": 1 },
  { "name": "French Coffee", "category": "classic", "size": 3, "stock": 1 },

  // Premium Fragrances - Alphabetical
  { "name": "9PM Afnan", "category": "premium", "size": 10, "stock": 1 },
  { "name": "Addictive Ambergris", "category": "premium", "size": 10, "stock": 1 },
  { "name": "Amber Oud Gold Edition Al Haramain", "category": "premium", "size": null, "stock": 0 },
  { "name": "Bianco Latte", "category": "premium", "size": 10, "stock": 1 },
  { "name": "Blue Moon by Kilian", "category": "premium", "size": null, "stock": 0 },
  { "name": "Blue Seduction Antonio Banderas", "category": "premium", "size": null, "stock": 0 },
  { "name": "Burberry Goddess", "category": "premium", "size": 10, "stock": 1 },
  { "name": "By the Fireplace Martin Margiela", "category": "premium", "size": null, "stock": 0 },
  { "name": "Byredo Tobacco Mandarin", "category": "premium", "size": null, "stock": 0 },
  { "name": "Club De Nuit Intense", "category": "premium", "size": 10, "stock": 1 },
  { "name": "Delina Perfume De Marley", "category": "premium", "size": null, "stock": 0 },
  { "name": "D & G Devotion", "category": "premium", "size": null, "stock": 0 },
  { "name": "Dubai Chocolate", "category": "premium", "size": null, "stock": 0 },
  { "name": "Eilish Billie Eilish", "category": "premium", "size": null, "stock": 0 },
  { "name": "Fucking Fabulous", "category": "premium", "size": null, "stock": 0 },
  { "name": "Gentleman Society by Givenchy", "category": "premium", "size": null, "stock": 0 },
  { "name": "Hacivat Nishane Istanbul", "category": "premium", "size": null, "stock": 0 },
  { "name": "Hibiscus Mahajad", "category": "premium", "size": 10, "stock": 1 },
  { "name": "Imagination Louis Vuitton", "category": "premium", "size": null, "stock": 0 },
  { "name": "Initio Oud for Greatness", "category": "premium", "size": null, "stock": 0 },
  { "name": "Japanese Cherry Blossom", "category": "premium", "size": 10, "stock": 1 },
  { "name": "Kayali Eden Juicy Apple", "category": "premium", "size": 10, "stock": 1 },
  { "name": "Kayali Fleur Majestic Rose Royale", "category": "premium", "size": null, "stock": 0 },
  { "name": "Kayali Invite Only Amber", "category": "premium", "size": 10, "stock": 1 },
  { "name": "Kayali Oudgasm", "category": "premium", "size": 10, "stock": 1 },
  { "name": "Kayali Oudgasm Cafe Oud", "category": "premium", "size": null, "stock": 0 },
  { "name": "Kayali The Wedding Silk Santal", "category": "premium", "size": null, "stock": 0 },
  { "name": "Kayali Utopia Vanilla Coco", "category": "premium", "size": null, "stock": 0 },
  { "name": "Kayali Vanilla 28", "category": "premium", "size": 10, "stock": 1 },
  { "name": "Kayali Vanilla Candy Rock Sugar", "category": "premium", "size": null, "stock": 0 },
  { "name": "Kayali Vanilla Royale Sugared Patchouli", "category": "premium", "size": null, "stock": 0 },
  { "name": "La Nuit de L’Homme", "category": "premium", "size": null, "stock": 0 },
  { "name": "La Nuit Tresor Vanilla Noir", "category": "premium", "size": null, "stock": 0 },
  { "name": "La Vie Est Belle", "category": "premium", "size": null, "stock": 0 },
  { "name": "Layton Parfum de Marly", "category": "premium", "size": null, "stock": 0 },
  { "name": "Mad About You", "category": "premium", "size": null, "stock": 0 },
  { "name": "Mancera Instant Crush", "category": "premium", "size": null, "stock": 0 },
  { "name": "Mancera Red Tobacco", "category": "premium", "size": null, "stock": 0 },
  { "name": "Oud Cadenza", "category": "premium", "size": null, "stock": 0 },
  { "name": "Oud Maracuja", "category": "premium", "size": null, "stock": 0 },
  { "name": "Overdose Oman Luxury", "category": "premium", "size": null, "stock": 0 },
  { "name": "Phantom Elixir", "category": "premium", "size": null, "stock": 0 },
  { "name": "Polo Supreme Oud", "category": "premium", "size": null, "stock": 0 },
  { "name": "Red Wine Brown Sugar", "category": "premium", "size": null, "stock": 0 },
  { "name": "Rose Exposed Tom Ford", "category": "premium", "size": null, "stock": 0 },
  { "name": "Sweet Oud", "category": "premium", "size": null, "stock": 0 },
  { "name": "The Dandy Penhaligons", "category": "premium", "size": null, "stock": 0 },
  { "name": "Vanilla Powder Matiere Premiere", "category": "premium", "size": null, "stock": 0 },
  { "name": "Wild Leather Mancera", "category": "premium", "size": null, "stock": 0 },
  { "name": "Yum Yum by Armaf", "category": "premium", "size": 10, "stock": 1 },
  { "name": "Burberry Goddess", "category": "premium", "size": 10, "stock": 1 },

  // Luxury Fragrances - Alphabetical
  { "name": "Guidance Amouage 46", "category": "luxury", "size": 10, "stock": 1 },
  { "name": "God of Fire Stephane Humbert", "category": "luxury", "size": null, "stock": 0 },
  { "name": "Hundred Silent Ways Nishane", "category": "luxury", "size": null, "stock": 0 },
  { "name": "Rougue Trafalgar Dior", "category": "luxury", "size": null, "stock": 0 },
  { "name": "Stronger With You Sandalwood", "category": "luxury", "size": null, "stock": 0 },
  { "name": "Vanilla Sex Tom Ford", "category": "luxury", "size": null, "stock": 0 }
]



async function seedProducts() {
  try {
    await connectDB();
    await Product.deleteMany();

    const grouped = {};

    for (const item of products) {
      const key = `${item.name}-${item.category}`;

      // Create product if it doesn't exist
      if (!grouped[key]) {
        grouped[key] = {
          name: item.name,
          category: item.category,
          sizes: [],
          isActive: true,
        };
      }

      // ✅ Only push size when it actually exists
      if (
        item.size !== null &&
        priceMap[item.category] &&
        priceMap[item.category][item.size]
      ) {
        grouped[key].sizes.push({
          size: item.size,
          price: priceMap[item.category][item.size],
          stock: item.stock,
        });
      }
    }

    await Product.insertMany(Object.values(grouped));

    console.log("✅ Products seeded (in-stock + out-of-stock saved correctly)");
    process.exit();
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seedProducts();