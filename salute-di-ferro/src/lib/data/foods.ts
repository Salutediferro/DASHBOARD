export type FoodCategory =
  | "CARNI"
  | "PESCE"
  | "UOVA"
  | "LATTICINI"
  | "CEREALI"
  | "LEGUMI"
  | "VERDURE"
  | "FRUTTA"
  | "FRUTTA_SECCA"
  | "OLI_GRASSI"
  | "INTEGRATORI";

export type FoodItem = {
  id: string;
  name: string;
  brand: string | null;
  category: FoodCategory;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  fiberPer100g: number;
};

const f = (
  id: string,
  name: string,
  category: FoodCategory,
  kcal: number,
  p: number,
  c: number,
  fat: number,
  fib = 0,
): FoodItem => ({
  id,
  name,
  brand: null,
  category,
  caloriesPer100g: kcal,
  proteinPer100g: p,
  carbsPer100g: c,
  fatsPer100g: fat,
  fiberPer100g: fib,
});

export const FOODS: FoodItem[] = [
  // CARNI (12)
  f("fd-1", "Pollo petto", "CARNI", 165, 31, 0, 3.6),
  f("fd-2", "Pollo coscia", "CARNI", 209, 26, 0, 11),
  f("fd-3", "Tacchino petto", "CARNI", 135, 29, 0, 1),
  f("fd-4", "Manzo magro", "CARNI", 158, 26, 0, 6),
  f("fd-5", "Vitello", "CARNI", 172, 20, 0, 9),
  f("fd-6", "Maiale lonza", "CARNI", 160, 22, 0, 7),
  f("fd-7", "Prosciutto crudo", "CARNI", 224, 26, 0, 13),
  f("fd-8", "Prosciutto cotto", "CARNI", 215, 19, 1, 15),
  f("fd-9", "Bresaola", "CARNI", 151, 33, 0, 2),
  f("fd-10", "Salame", "CARNI", 400, 24, 1, 33),
  f("fd-11", "Fesa di tacchino", "CARNI", 107, 22, 1, 2),
  f("fd-12", "Hamburger manzo", "CARNI", 250, 20, 0, 19),

  // PESCE (12)
  f("fd-13", "Salmone", "PESCE", 208, 20, 0, 13),
  f("fd-14", "Tonno al naturale", "PESCE", 116, 26, 0, 1),
  f("fd-15", "Merluzzo", "PESCE", 82, 18, 0, 0.7),
  f("fd-16", "Orata", "PESCE", 121, 20, 0, 4),
  f("fd-17", "Branzino", "PESCE", 97, 18, 0, 2.5),
  f("fd-18", "Sgombro", "PESCE", 205, 19, 0, 14),
  f("fd-19", "Gamberi", "PESCE", 99, 24, 0.2, 0.3),
  f("fd-20", "Polpo", "PESCE", 82, 15, 2, 1),
  f("fd-21", "Trota", "PESCE", 141, 20, 0, 6),
  f("fd-22", "Acciughe", "PESCE", 131, 20, 0, 5),
  f("fd-23", "Pesce spada", "PESCE", 144, 20, 0, 7),
  f("fd-24", "Platessa", "PESCE", 86, 18, 0, 1.5),

  // UOVA (3)
  f("fd-25", "Uovo intero", "UOVA", 155, 13, 1.1, 11),
  f("fd-26", "Albume", "UOVA", 52, 11, 0.7, 0.2),
  f("fd-27", "Tuorlo", "UOVA", 322, 16, 3.6, 27),

  // LATTICINI (10)
  f("fd-28", "Latte intero", "LATTICINI", 61, 3.2, 4.8, 3.3),
  f("fd-29", "Latte scremato", "LATTICINI", 34, 3.4, 5, 0.1),
  f("fd-30", "Yogurt greco 0%", "LATTICINI", 59, 10, 3.6, 0.4),
  f("fd-31", "Yogurt bianco", "LATTICINI", 61, 3.5, 4.7, 3.3),
  f("fd-32", "Ricotta", "LATTICINI", 174, 11, 3, 13),
  f("fd-33", "Mozzarella", "LATTICINI", 253, 18, 2.2, 19),
  f("fd-34", "Parmigiano", "LATTICINI", 392, 32, 0.5, 29),
  f("fd-35", "Grana padano", "LATTICINI", 384, 33, 0, 28),
  f("fd-36", "Fiocchi di latte", "LATTICINI", 98, 11, 3.4, 4.3),
  f("fd-37", "Skyr", "LATTICINI", 63, 11, 4, 0.2),

  // CEREALI (12)
  f("fd-38", "Riso basmati", "CEREALI", 350, 7.5, 78, 0.9, 1.3),
  f("fd-39", "Riso integrale", "CEREALI", 337, 7, 74, 2.8, 3),
  f("fd-40", "Pasta di semola", "CEREALI", 353, 12, 71, 1.4, 2.5),
  f("fd-41", "Pasta integrale", "CEREALI", 324, 13, 64, 2.5, 6),
  f("fd-42", "Pane bianco", "CEREALI", 265, 9, 49, 3.2, 2.5),
  f("fd-43", "Pane integrale", "CEREALI", 224, 9, 41, 3, 7),
  f("fd-44", "Avena", "CEREALI", 389, 17, 66, 7, 10.6),
  f("fd-45", "Farro", "CEREALI", 338, 15, 67, 2.5, 6.8),
  f("fd-46", "Quinoa", "CEREALI", 368, 14, 64, 6, 7),
  f("fd-47", "Couscous", "CEREALI", 376, 13, 77, 0.6, 5),
  f("fd-48", "Cornflakes", "CEREALI", 357, 8, 84, 0.4, 3),
  f("fd-49", "Fette biscottate", "CEREALI", 408, 13, 80, 5, 4),

  // LEGUMI (7)
  f("fd-50", "Lenticchie secche", "LEGUMI", 353, 25, 54, 1, 11),
  f("fd-51", "Ceci secchi", "LEGUMI", 364, 19, 61, 6, 12),
  f("fd-52", "Fagioli borlotti", "LEGUMI", 291, 23, 47, 2, 17),
  f("fd-53", "Fagioli cannellini", "LEGUMI", 279, 24, 47, 3, 16),
  f("fd-54", "Piselli", "LEGUMI", 81, 5, 14, 0.4, 5),
  f("fd-55", "Fave", "LEGUMI", 341, 26, 58, 1.5, 25),
  f("fd-56", "Soia gialla", "LEGUMI", 446, 36, 30, 20, 9),

  // VERDURE (14)
  f("fd-57", "Broccoli", "VERDURE", 34, 2.8, 7, 0.4, 2.6),
  f("fd-58", "Spinaci", "VERDURE", 23, 2.9, 3.6, 0.4, 2.2),
  f("fd-59", "Zucchine", "VERDURE", 17, 1.2, 3.1, 0.3, 1),
  f("fd-60", "Melanzane", "VERDURE", 25, 1, 6, 0.2, 3),
  f("fd-61", "Peperoni", "VERDURE", 31, 1, 6, 0.3, 2.1),
  f("fd-62", "Carote", "VERDURE", 41, 0.9, 10, 0.2, 2.8),
  f("fd-63", "Pomodori", "VERDURE", 18, 0.9, 3.9, 0.2, 1.2),
  f("fd-64", "Insalata mista", "VERDURE", 15, 1.4, 2.9, 0.2, 1.3),
  f("fd-65", "Cavolfiore", "VERDURE", 25, 1.9, 5, 0.3, 2),
  f("fd-66", "Cetrioli", "VERDURE", 16, 0.7, 3.6, 0.1, 0.5),
  f("fd-67", "Patate", "VERDURE", 77, 2, 17, 0.1, 2.2),
  f("fd-68", "Patata dolce", "VERDURE", 86, 1.6, 20, 0.1, 3),
  f("fd-69", "Funghi champignon", "VERDURE", 22, 3.1, 3.3, 0.3, 1),
  f("fd-70", "Finocchi", "VERDURE", 31, 1.2, 7, 0.2, 3),

  // FRUTTA (12)
  f("fd-71", "Mela", "FRUTTA", 52, 0.3, 14, 0.2, 2.4),
  f("fd-72", "Banana", "FRUTTA", 89, 1.1, 23, 0.3, 2.6),
  f("fd-73", "Pera", "FRUTTA", 57, 0.4, 15, 0.1, 3.1),
  f("fd-74", "Arancia", "FRUTTA", 47, 0.9, 12, 0.1, 2.4),
  f("fd-75", "Mandarino", "FRUTTA", 53, 0.8, 13, 0.3, 1.8),
  f("fd-76", "Kiwi", "FRUTTA", 61, 1.1, 15, 0.5, 3),
  f("fd-77", "Fragole", "FRUTTA", 32, 0.7, 7.7, 0.3, 2),
  f("fd-78", "Ananas", "FRUTTA", 50, 0.5, 13, 0.1, 1.4),
  f("fd-79", "Uva", "FRUTTA", 69, 0.7, 18, 0.2, 0.9),
  f("fd-80", "Pesche", "FRUTTA", 39, 0.9, 10, 0.3, 1.5),
  f("fd-81", "Albicocche", "FRUTTA", 48, 1.4, 11, 0.4, 2),
  f("fd-82", "Mirtilli", "FRUTTA", 57, 0.7, 14, 0.3, 2.4),

  // FRUTTA SECCA (8)
  f("fd-83", "Mandorle", "FRUTTA_SECCA", 579, 21, 22, 50, 12),
  f("fd-84", "Noci", "FRUTTA_SECCA", 654, 15, 14, 65, 7),
  f("fd-85", "Nocciole", "FRUTTA_SECCA", 628, 15, 17, 61, 10),
  f("fd-86", "Pistacchi", "FRUTTA_SECCA", 560, 20, 28, 45, 10),
  f("fd-87", "Anacardi", "FRUTTA_SECCA", 553, 18, 30, 44, 3),
  f("fd-88", "Pinoli", "FRUTTA_SECCA", 673, 14, 13, 68, 4),
  f("fd-89", "Arachidi", "FRUTTA_SECCA", 567, 26, 16, 49, 8),
  f("fd-90", "Semi di chia", "FRUTTA_SECCA", 486, 17, 42, 31, 34),

  // OLI E GRASSI (5)
  f("fd-91", "Olio EVO", "OLI_GRASSI", 884, 0, 0, 100),
  f("fd-92", "Burro", "OLI_GRASSI", 717, 0.9, 0.1, 81),
  f("fd-93", "Olio di cocco", "OLI_GRASSI", 862, 0, 0, 100),
  f("fd-94", "Olio di semi di girasole", "OLI_GRASSI", 884, 0, 0, 100),
  f("fd-95", "Avocado", "OLI_GRASSI", 160, 2, 9, 15, 7),

  // INTEGRATORI (6)
  f("fd-96", "Whey protein", "INTEGRATORI", 370, 80, 6, 6),
  f("fd-97", "Caseine micellari", "INTEGRATORI", 360, 78, 6, 3),
  f("fd-98", "Creatina monoidrato", "INTEGRATORI", 0, 0, 0, 0),
  f("fd-99", "BCAA in polvere", "INTEGRATORI", 340, 82, 4, 0),
  f("fd-100", "Maltodestrine", "INTEGRATORI", 380, 0, 95, 0),
  f("fd-101", "Omega 3 fish oil", "INTEGRATORI", 900, 0, 0, 100),
];

export function searchFoods(
  q?: string,
  category?: FoodCategory | "ALL",
): FoodItem[] {
  const term = (q ?? "").toLowerCase();
  return FOODS.filter((food) => {
    if (term && !food.name.toLowerCase().includes(term)) return false;
    if (category && category !== "ALL" && food.category !== category) return false;
    return true;
  });
}

export function getFoodById(id: string): FoodItem | undefined {
  return FOODS.find((f) => f.id === id);
}

export function findSubstitutes(
  foodId: string,
  quantity: number,
  max = 5,
): FoodItem[] {
  const base = getFoodById(foodId);
  if (!base) return [];
  const targetKcal = (base.caloriesPer100g * quantity) / 100;
  const targetP = (base.proteinPer100g * quantity) / 100;

  return FOODS.filter((f) => f.id !== foodId && f.category === base.category)
    .map((alt) => {
      const kcal = (alt.caloriesPer100g * quantity) / 100;
      const p = (alt.proteinPer100g * quantity) / 100;
      const kcalDiff = Math.abs(kcal - targetKcal) / Math.max(targetKcal, 1);
      const pDiff = Math.abs(p - targetP) / Math.max(targetP, 0.5);
      return { alt, score: kcalDiff * 0.6 + pDiff * 0.4 };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, max)
    .map((x) => x.alt);
}
