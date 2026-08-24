export type EthiopianCity = { name: string; slug: string; neighborhoods: string[] };

export const ethiopianCities: EthiopianCity[] = [
  { name: "Addis Ababa", slug: "addis-ababa", neighborhoods: ["Arada", "Bole", "Gulele", "Kirkos", "Kolfe Keranio", "Lideta", "Nifas Silk-Lafto", "Yeka"] },
  { name: "Adama", slug: "adama", neighborhoods: ["Bole", "Dabe", "Ganda Gara", "Kebele 14"] },
  { name: "Bahir Dar", slug: "bahir-dar", neighborhoods: ["Belay Zeleke", "Fasilo", "Kebele 14", "Tana"] },
  { name: "Dire Dawa", slug: "dire-dawa", neighborhoods: ["Dechatu", "Kezira", "Legehare", "Sabian"] },
  { name: "Gondar", slug: "gondar", neighborhoods: ["Azezo", "Arada", "Kebele 18", "Maraki"] },
  { name: "Hawassa", slug: "hawassa", neighborhoods: ["Addis Ketema", "Haik Dar", "Mehal Ketema", "Tabor"] },
  { name: "Jimma", slug: "jimma", neighborhoods: ["Awetu", "Hermata", "Jiren", "Mentina"] },
  { name: "Mekelle", slug: "mekelle", neighborhoods: ["Adi Haki", "Ayder", "Hawelti", "Quiha"] },
];
