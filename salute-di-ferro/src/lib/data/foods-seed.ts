import type { FoodCategory } from "@/lib/validators/nutrition";

// Italian food reference table — 100 entries across the categories
// surfaced in the food picker. Macros are per 100g of edible part and
// were copied verbatim from the pre-removal `lib/data/foods.ts` (commit
// 6f363c7^) so existing plans designed against these numbers stay
// consistent. Used by `prisma/seed.ts` to populate the global Food
// table on first install.
export type FoodSeedRow = {
  name: string;
  category: FoodCategory;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  fiberPer100g?: number;
};

const f = (
  name: string,
  category: FoodCategory,
  kcal: number,
  p: number,
  c: number,
  fat: number,
  fib?: number,
): FoodSeedRow => ({
  name,
  category,
  caloriesPer100g: kcal,
  proteinPer100g: p,
  carbsPer100g: c,
  fatsPer100g: fat,
  fiberPer100g: fib,
});

export const FOODS_SEED: FoodSeedRow[] = [
  // CARNI
  f("Pollo petto", "CARNI", 165, 31, 0, 3.6),
  f("Pollo coscia", "CARNI", 209, 26, 0, 11),
  f("Tacchino petto", "CARNI", 135, 29, 0, 1),
  f("Manzo magro", "CARNI", 158, 26, 0, 6),
  f("Vitello", "CARNI", 172, 20, 0, 9),
  f("Maiale lonza", "CARNI", 160, 22, 0, 7),
  f("Prosciutto crudo", "CARNI", 224, 26, 0, 13),
  f("Prosciutto cotto", "CARNI", 215, 19, 1, 15),
  f("Bresaola", "CARNI", 151, 33, 0, 2),
  f("Salame", "CARNI", 400, 24, 1, 33),
  f("Fesa di tacchino", "CARNI", 107, 22, 1, 2),
  f("Hamburger manzo", "CARNI", 250, 20, 0, 19),
  // PESCE
  f("Salmone", "PESCE", 208, 20, 0, 13),
  f("Tonno al naturale", "PESCE", 116, 26, 0, 1),
  f("Merluzzo", "PESCE", 82, 18, 0, 0.7),
  f("Orata", "PESCE", 121, 20, 0, 4),
  f("Branzino", "PESCE", 97, 18, 0, 2.5),
  f("Sgombro", "PESCE", 205, 19, 0, 14),
  f("Gamberi", "PESCE", 99, 24, 0.2, 0.3),
  f("Polpo", "PESCE", 82, 15, 2, 1),
  f("Trota", "PESCE", 141, 20, 0, 6),
  f("Acciughe", "PESCE", 131, 20, 0, 5),
  f("Pesce spada", "PESCE", 144, 20, 0, 7),
  f("Platessa", "PESCE", 86, 18, 0, 1.5),
  // UOVA
  f("Uovo intero", "UOVA", 155, 13, 1.1, 11),
  f("Albume", "UOVA", 52, 11, 0.7, 0.2),
  f("Tuorlo", "UOVA", 322, 16, 3.6, 27),
  // LATTICINI
  f("Latte intero", "LATTICINI", 61, 3.2, 4.8, 3.3),
  f("Latte scremato", "LATTICINI", 34, 3.4, 5, 0.1),
  f("Yogurt greco 0%", "LATTICINI", 59, 10, 3.6, 0.4),
  f("Yogurt bianco", "LATTICINI", 61, 3.5, 4.7, 3.3),
  f("Ricotta", "LATTICINI", 174, 11, 3, 13),
  f("Mozzarella", "LATTICINI", 253, 18, 2.2, 19),
  f("Parmigiano", "LATTICINI", 392, 32, 0.5, 29),
  f("Grana padano", "LATTICINI", 384, 33, 0, 28),
  f("Fiocchi di latte", "LATTICINI", 98, 11, 3.4, 4.3),
  f("Skyr", "LATTICINI", 63, 11, 4, 0.2),
  // CEREALI
  f("Riso basmati", "CEREALI", 350, 7.5, 78, 0.9, 1.3),
  f("Riso integrale", "CEREALI", 337, 7, 74, 2.8, 3),
  f("Pasta di semola", "CEREALI", 353, 12, 71, 1.4, 2.5),
  f("Pasta integrale", "CEREALI", 324, 13, 64, 2.5, 6),
  f("Pane bianco", "CEREALI", 265, 9, 49, 3.2, 2.5),
  f("Pane integrale", "CEREALI", 224, 9, 41, 3, 7),
  f("Avena", "CEREALI", 389, 17, 66, 7, 10.6),
  f("Farro", "CEREALI", 338, 15, 67, 2.5, 6.8),
  f("Quinoa", "CEREALI", 368, 14, 64, 6, 7),
  f("Couscous", "CEREALI", 376, 13, 77, 0.6, 5),
  f("Cornflakes", "CEREALI", 357, 8, 84, 0.4, 3),
  f("Fette biscottate", "CEREALI", 408, 13, 80, 5, 4),
  // LEGUMI
  f("Lenticchie secche", "LEGUMI", 353, 25, 54, 1, 11),
  f("Ceci secchi", "LEGUMI", 364, 19, 61, 6, 12),
  f("Fagioli borlotti", "LEGUMI", 291, 23, 47, 2, 17),
  f("Fagioli cannellini", "LEGUMI", 279, 24, 47, 3, 16),
  f("Piselli", "LEGUMI", 81, 5, 14, 0.4, 5),
  f("Fave", "LEGUMI", 341, 26, 58, 1.5, 25),
  f("Soia gialla", "LEGUMI", 446, 36, 30, 20, 9),
  // VERDURE
  f("Broccoli", "VERDURE", 34, 2.8, 7, 0.4, 2.6),
  f("Spinaci", "VERDURE", 23, 2.9, 3.6, 0.4, 2.2),
  f("Zucchine", "VERDURE", 17, 1.2, 3.1, 0.3, 1),
  f("Melanzane", "VERDURE", 25, 1, 6, 0.2, 3),
  f("Peperoni", "VERDURE", 31, 1, 6, 0.3, 2.1),
  f("Carote", "VERDURE", 41, 0.9, 10, 0.2, 2.8),
  f("Pomodori", "VERDURE", 18, 0.9, 3.9, 0.2, 1.2),
  f("Insalata mista", "VERDURE", 15, 1.4, 2.9, 0.2, 1.3),
  f("Cavolfiore", "VERDURE", 25, 1.9, 5, 0.3, 2),
  f("Cetrioli", "VERDURE", 16, 0.7, 3.6, 0.1, 0.5),
  f("Patate", "VERDURE", 77, 2, 17, 0.1, 2.2),
  f("Patata dolce", "VERDURE", 86, 1.6, 20, 0.1, 3),
  f("Funghi champignon", "VERDURE", 22, 3.1, 3.3, 0.3, 1),
  f("Finocchi", "VERDURE", 31, 1.2, 7, 0.2, 3),
  // FRUTTA
  f("Mela", "FRUTTA", 52, 0.3, 14, 0.2, 2.4),
  f("Banana", "FRUTTA", 89, 1.1, 23, 0.3, 2.6),
  f("Pera", "FRUTTA", 57, 0.4, 15, 0.1, 3.1),
  f("Arancia", "FRUTTA", 47, 0.9, 12, 0.1, 2.4),
  f("Mandarino", "FRUTTA", 53, 0.8, 13, 0.3, 1.8),
  f("Kiwi", "FRUTTA", 61, 1.1, 15, 0.5, 3),
  f("Fragole", "FRUTTA", 32, 0.7, 7.7, 0.3, 2),
  f("Ananas", "FRUTTA", 50, 0.5, 13, 0.1, 1.4),
  f("Uva", "FRUTTA", 69, 0.7, 18, 0.2, 0.9),
  f("Pesche", "FRUTTA", 39, 0.9, 10, 0.3, 1.5),
  f("Albicocche", "FRUTTA", 48, 1.4, 11, 0.4, 2),
  f("Mirtilli", "FRUTTA", 57, 0.7, 14, 0.3, 2.4),
  // FRUTTA SECCA
  f("Mandorle", "FRUTTA_SECCA", 579, 21, 22, 50, 12),
  f("Noci", "FRUTTA_SECCA", 654, 15, 14, 65, 7),
  f("Nocciole", "FRUTTA_SECCA", 628, 15, 17, 61, 10),
  f("Pistacchi", "FRUTTA_SECCA", 560, 20, 28, 45, 10),
  f("Anacardi", "FRUTTA_SECCA", 553, 18, 30, 44, 3),
  f("Pinoli", "FRUTTA_SECCA", 673, 14, 13, 68, 4),
  f("Arachidi", "FRUTTA_SECCA", 567, 26, 16, 49, 8),
  f("Semi di chia", "FRUTTA_SECCA", 486, 17, 42, 31, 34),
  // OLI E GRASSI
  f("Olio EVO", "OLI_GRASSI", 884, 0, 0, 100),
  f("Burro", "OLI_GRASSI", 717, 0.9, 0.1, 81),
  f("Olio di cocco", "OLI_GRASSI", 862, 0, 0, 100),
  f("Olio di semi di girasole", "OLI_GRASSI", 884, 0, 0, 100),
  f("Avocado", "OLI_GRASSI", 160, 2, 9, 15, 7),
  // INTEGRATORI
  f("Whey protein", "INTEGRATORI", 370, 80, 6, 6),
  f("Caseine micellari", "INTEGRATORI", 360, 78, 6, 3),
  f("Creatina monoidrato", "INTEGRATORI", 0, 0, 0, 0),
  f("BCAA in polvere", "INTEGRATORI", 340, 82, 4, 0),
  f("Maltodestrine", "INTEGRATORI", 380, 0, 95, 0),
  f("Omega 3 fish oil", "INTEGRATORI", 900, 0, 0, 100),
];
