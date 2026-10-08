/* Products and the sample person used in the form. Product names match src/data/products.ts in the website. */
export type Product = { id: string; name: string; brand: string; kind: string; img: string };

export const PRODUCTS: Product[] = [
  { id: "libre3", name: "FreeStyle Libre 3", brand: "FreeStyle Libre", kind: "CGM system", img: "img/freestyle-libre-3-front.webp" },
  { id: "g7", name: "Dexcom G7", brand: "Dexcom", kind: "CGM system", img: "img/dexcom-g7-front.webp" },
  { id: "stelo", name: "Stelo by Dexcom", brand: "Dexcom", kind: "Glucose biosensor", img: "img/stelo-by-dexcom-front.webp" },
  { id: "libre2", name: "FreeStyle Libre 2", brand: "FreeStyle Libre", kind: "CGM system", img: "img/freestyle-libre-2-front.webp" },
  { id: "tslim", name: "Tandem t:slim X2", brand: "Tandem", kind: "Insulin pump", img: "img/tandem-tslim-x2-front.webp" },
  { id: "g6", name: "Dexcom G6", brand: "Dexcom", kind: "CGM system", img: "img/dexcom-g6-front.webp" },
];

/*
  Invented sample details for the form scene. Never use a real person's
  details in marketing material: the project's HIPAA rules forbid it. The
  phone number is in the 555-0100 to 555-0199 range set aside for fiction.
*/
export const SAMPLE = {
  first: "Jordan",
  last: "Rivera",
  email: "jordan@example.com",
  phone: "(555) 555-0142",
  city: "Springfield",
  state: "Illinois",
};

export const PHONE = "888-564-2595";
export const EMAIL = "info@medvillediabetes.com";
export const SITE = "medvillediabetes.com";
export const HOURS = "Monday to Friday, 8AM to 5PM Pacific Time";
