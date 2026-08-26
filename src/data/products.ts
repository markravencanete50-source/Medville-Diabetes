/*
  Product catalog for Medville Diabetes.
  Content substance mirrors the client's reference catalog (Quest Health
  Solutions, Continuous Glucose Monitors page) at roughly 70 percent, rewritten
  as original plain English. No text is copied from the reference site.

  Copy rules for every string in this file:
  - Plain English. No idioms. No contractions. No abbreviations without the
    full term written first.
  - Short sentences. One idea per sentence.

  Images are the client's supplier photography, front and back for every
  product. The originals are 1536x1024 PNGs at roughly 1.4 MB each; they are
  converted to 1200 px WebP by `scripts/optimize-product-photos.mjs`, which
  takes the set from 28.5 MB to 0.75 MB. Serve the WebP files only. Hosting
  bandwidth is the one line item that can push the client past the 0 to 5 USD
  per month ceiling in Section 7.3 of the agreement.
*/

export type Brand = "FreeStyle Libre" | "Dexcom" | "Tandem";

/* The two product lines the catalog is organised under. The products page
   shows one card per line; each line routes to its own listing. */
export type ProductLine = "cgm" | "insulin-pump";

export interface Product {
  slug: string;
  name: string;
  brand: Brand;
  line: ProductLine;
  category: "System" | "Sensor" | "Accessory";
  shortDescription: string;
  description: string[];
  keyFacts: string[];
  imageFront: string;
  imageBack: string;
  featured?: boolean;
}

export const products: Product[] = [
  {
    slug: "freestyle-libre-3",
    name: "FreeStyle Libre 3",
    brand: "FreeStyle Libre",
    line: "cgm",
    category: "System",
    featured: true,
    shortDescription:
      "A continuous glucose monitoring system that you wear for 14 days. It sends a new glucose reading to your phone every minute.",
    description: [
      "The FreeStyle Libre 3 system measures your glucose all day and all night. You wear one small sensor on the back of your upper arm for up to 14 days.",
      "The sensor sends a new reading to your phone every minute. You do not need to scan the sensor, and you do not need routine finger sticks.",
      "You can set optional alarms that tell you when your glucose is too low or too high. You can also share your readings with family members and with your care team.",
    ],
    keyFacts: [
      "Worn for up to 14 days",
      "One new reading every minute, sent to your phone",
      "No routine finger sticks",
      "Optional low and high glucose alarms",
      "One of the smallest sensors available today",
    ],
    imageFront: "/products/freestyle-libre-3-front.webp",
    imageBack: "/products/freestyle-libre-3-back.webp",
  },
  {
    slug: "freestyle-libre-2",
    name: "FreeStyle Libre 2",
    brand: "FreeStyle Libre",
    line: "cgm",
    category: "System",
    featured: true,
    shortDescription:
      "A continuous glucose monitoring system approved by the United States Food and Drug Administration for adults and for children as young as 4 years old.",
    description: [
      "The FreeStyle Libre 2 system is an integrated continuous glucose monitoring system. It is approved by the United States Food and Drug Administration for adults and for children as young as 4 years old.",
      "You wear one sensor on the back of your upper arm for up to 14 days. The system includes optional alarms that tell you when your glucose is too low or too high.",
      "Readings can be viewed on a compatible phone or on the FreeStyle Libre 2 reader.",
    ],
    keyFacts: [
      "Approved for children as young as 4 years old",
      "Worn for up to 14 days",
      "Optional low and high glucose alarms",
      "Works with a compatible phone or with the FreeStyle Libre 2 reader",
    ],
    imageFront: "/products/freestyle-libre-2-front.webp",
    imageBack: "/products/freestyle-libre-2-back.webp",
  },
  {
    slug: "freestyle-libre-14-day",
    name: "FreeStyle Libre 14 Day",
    brand: "FreeStyle Libre",
    line: "cgm",
    category: "System",
    shortDescription:
      "Read your glucose with a one-second scan of the sensor. No finger stick calibration is required.",
    description: [
      "The FreeStyle Libre 14 Day system measures your glucose through a small sensor worn on the back of your upper arm.",
      "To see your current reading, you scan the sensor with your phone or with the reader. The scan takes about one second and works through clothing.",
      "The system does not require finger stick calibration.",
    ],
    keyFacts: [
      "One-second scan to read your glucose",
      "No finger stick calibration required",
      "Sensor worn on the back of the upper arm",
      "Scan works through clothing",
    ],
    imageFront: "/products/freestyle-libre-14-day-front.webp",
    imageBack: "/products/freestyle-libre-14-day-back.webp",
  },
  {
    slug: "stelo-by-dexcom",
    name: "Stelo by Dexcom",
    brand: "Dexcom",
    line: "cgm",
    category: "System",
    shortDescription:
      "Tracks your glucose 24 hours a day and shows you how food, exercise, and sleep affect your levels.",
    description: [
      "Stelo by Dexcom is a glucose biosensor that tracks your glucose 24 hours a day.",
      "The Stelo application shows you how food, exercise, and even sleep affect your glucose. This helps you understand your own patterns and make healthier choices.",
      "Stelo is designed for adults who do not use insulin.",
    ],
    keyFacts: [
      "Tracks glucose 24 hours a day",
      "Shows how food, exercise, and sleep affect your levels",
      "Designed for adults who do not use insulin",
      "Readings appear in the Stelo application on your phone",
    ],
    imageFront: "/products/stelo-by-dexcom-front.webp",
    imageBack: "/products/stelo-by-dexcom-back.webp",
  },
  {
    slug: "dexcom-g7",
    name: "Dexcom G7",
    brand: "Dexcom",
    line: "cgm",
    category: "System",
    featured: true,
    shortDescription:
      "The newest Dexcom system. A smaller sensor with a faster warmup that sends readings to your phone or watch automatically.",
    description: [
      "The Dexcom G7 is the newest continuous glucose monitoring system from Dexcom. It is designed to give you greater control over your diabetes.",
      "The sensor is smaller than earlier Dexcom sensors and is ready to use sooner after you apply it. Readings are sent to your phone or smart watch automatically, without scanning.",
      "You can set alerts that warn you before your glucose goes too low or too high, and you can share your readings with people you trust.",
    ],
    keyFacts: [
      "Smaller sensor with a faster warmup",
      "Readings sent automatically to a phone or smart watch",
      "Alerts before glucose goes too low or too high",
      "Share readings with family and your care team",
    ],
    imageFront: "/products/dexcom-g7-front.webp",
    imageBack: "/products/dexcom-g7-back.webp",
  },
  {
    slug: "dexcom-g6",
    name: "Dexcom G6",
    brand: "Dexcom",
    line: "cgm",
    category: "System",
    shortDescription:
      "Shows your current glucose number and the direction it is going, with alerts and no finger sticks.",
    description: [
      "The Dexcom G6 continuous glucose monitoring system shows your current glucose number and the direction it is going, so you always know where your glucose is headed.",
      "The system sends readings to your phone or receiver automatically. It does not require finger sticks or scanning.",
      "Alerts can warn you before your glucose goes too low or too high.",
    ],
    keyFacts: [
      "Shows your number and the direction it is going",
      "Automatic readings, no finger sticks, no scanning",
      "Alerts before glucose goes too low or too high",
      "Works with a phone or with the Dexcom receiver",
    ],
    imageFront: "/products/dexcom-g6-front.webp",
    imageBack: "/products/dexcom-g6-back.webp",
  },
  {
    slug: "dexcom-g6-sensors-applicator",
    name: "Dexcom G6 Sensors and Applicator (3 Sensors Per Box)",
    brand: "Dexcom",
    line: "cgm",
    category: "Sensor",
    shortDescription:
      "Replacement sensors and the applicator for the Dexcom G6 system. Each box contains 3 sensors.",
    description: [
      "This box contains 3 replacement sensors and the applicator for the Dexcom G6 continuous glucose monitoring system.",
      "The applicator places the sensor on your skin in one simple step.",
    ],
    keyFacts: [
      "3 sensors in each box",
      "Includes the applicator",
      "For use with the Dexcom G6 system",
    ],
    imageFront: "/products/dexcom-g6-sensors-applicator-front.webp",
    imageBack: "/products/dexcom-g6-sensors-applicator-back.webp",
  },
  {
    slug: "dexcom-g6-transmitter",
    name: "Dexcom G6 Transmitter",
    brand: "Dexcom",
    line: "cgm",
    category: "Accessory",
    shortDescription:
      "Attaches to the top of the Dexcom G6 sensor and sends your readings wirelessly to your display device.",
    description: [
      "The Dexcom G6 transmitter attaches to the top of the Dexcom G6 sensor.",
      "It sends your glucose readings wirelessly to your phone or to the Dexcom receiver.",
    ],
    keyFacts: [
      "Attaches to the top of the sensor",
      "Sends readings wirelessly to your display device",
      "For use with the Dexcom G6 system",
    ],
    imageFront: "/products/dexcom-g6-transmitter-front.webp",
    imageBack: "/products/dexcom-g6-transmitter-back.webp",
  },
  {
    slug: "freestyle-libre-14-day-sensor",
    name: "FreeStyle Libre 14 Day Sensor (Box of 1)",
    brand: "FreeStyle Libre",
    line: "cgm",
    category: "Sensor",
    shortDescription:
      "A replacement sensor for the FreeStyle Libre 14 Day system. Worn on the back of the upper arm, it measures glucose every minute.",
    description: [
      "This is a replacement sensor for the FreeStyle Libre 14 Day system. Each box contains 1 sensor.",
      "The sensor is worn on the back of the upper arm. It continuously measures your glucose every minute.",
    ],
    keyFacts: [
      "1 sensor in each box",
      "Worn on the back of the upper arm",
      "Measures glucose every minute",
    ],
    imageFront: "/products/freestyle-libre-14-day-sensor-front.webp",
    imageBack: "/products/freestyle-libre-14-day-sensor-back.webp",
  },
  {
    slug: "freestyle-libre-2-sensor",
    name: "FreeStyle Libre 2 Sensor (Box of 1)",
    brand: "FreeStyle Libre",
    line: "cgm",
    category: "Sensor",
    shortDescription:
      "A replacement sensor for the FreeStyle Libre 2 system. It is compatible with the FreeStyle Libre 2 reader and lasts 14 days.",
    description: [
      "This is a replacement sensor for the FreeStyle Libre 2 system. Each box contains 1 sensor.",
      "The sensor is compatible with the FreeStyle Libre 2 reader and with compatible phones. Each sensor lasts up to 14 days.",
    ],
    keyFacts: [
      "1 sensor in each box",
      "Lasts up to 14 days",
      "Compatible with the FreeStyle Libre 2 reader",
    ],
    imageFront: "/products/freestyle-libre-2-sensor-front.webp",
    imageBack: "/products/freestyle-libre-2-sensor-back.webp",
  },
  {
    slug: "freestyle-libre-3-sensor",
    name: "FreeStyle Libre 3 Sensor (Box of 1)",
    brand: "FreeStyle Libre",
    line: "cgm",
    category: "Sensor",
    shortDescription:
      "A replacement sensor for the FreeStyle Libre 3 system, the 14-day continuous glucose monitoring system.",
    description: [
      "This is a replacement sensor for the FreeStyle Libre 3 system. Each box contains 1 sensor.",
      "The FreeStyle Libre 3 system is a 14-day continuous glucose monitoring system. The sensor sends a new reading to your phone every minute, without scanning and without routine finger sticks.",
    ],
    keyFacts: [
      "1 sensor in each box",
      "Worn for up to 14 days",
      "A new reading every minute, sent to your phone",
    ],
    imageFront: "/products/freestyle-libre-3-sensor-front.webp",
    imageBack: "/products/freestyle-libre-3-sensor-back.webp",
  },
  {
    slug: "tandem-tslim-x2",
    name: "Tandem t:slim X2",
    brand: "Tandem",
    line: "insulin-pump",
    category: "System",
    shortDescription:
      "A slim insulin pump with a color touchscreen. It can adjust your insulin automatically when it is connected to a Dexcom sensor.",
    description: [
      "The t:slim X2 insulin pump is made by Tandem Diabetes Care. It is a small, slim pump with a color touchscreen. It delivers insulin through a thin tube called an infusion set, so you need fewer daily injections.",
      "The cartridge holds up to 300 units of insulin. The battery recharges from a standard charger, so you do not buy or replace batteries.",
      "The pump can connect to a Dexcom continuous glucose monitor. With Control-IQ technology, the pump predicts where your glucose is heading and adjusts your insulin automatically to help keep you in your target range.",
      "You can update the software of the pump at home. New features can arrive without replacing the pump. Our team can help you check whether your coverage includes an insulin pump.",
    ],
    keyFacts: [
      "Made by Tandem Diabetes Care",
      "Slim design with a color touchscreen",
      "Holds up to 300 units of insulin",
      "Rechargeable battery, no batteries to replace",
      "Connects to Dexcom continuous glucose monitors",
      "Control-IQ technology adjusts insulin automatically",
      "Software updates from home",
    ],
    imageFront: "/products/tandem-tslim-x2-front.webp",
    imageBack: "/products/tandem-tslim-x2-back.webp",
  },
];

/* CGM brand filter chips. The insulin pump listing has one brand and shows
   no filter, so this list stays scoped to the monitor brands. */
export const brands: Brand[] = ["FreeStyle Libre", "Dexcom"];

export function lineProducts(line: ProductLine): Product[] {
  return products.filter((p) => p.line === line);
}

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
