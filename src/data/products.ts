/*
  Product catalog for Medville Diabetes.
  Content substance mirrors the client's reference catalog (Quest Health
  Solutions, Continuous Glucose Monitors page) at roughly 70 percent, rewritten
  as original plain English. No text is copied from the reference site.

  Copy rules for every string in this file:
  - Plain English. No idioms. No contractions. No abbreviations without the
    full term written first.
  - Short sentences. One idea per sentence.

  Images are placeholder vector art so the rotate and zoom viewer works today.
  Replace each `imageFront` / `imageBack` with real supplier photography before
  launch. Manufacturers provide press images to authorized resellers.
*/

export type Brand = "FreeStyle Libre" | "Dexcom";

export interface Product {
  slug: string;
  name: string;
  brand: Brand;
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
    imageFront: "/products/libre-front.svg",
    imageBack: "/products/libre-back.svg",
  },
  {
    slug: "freestyle-libre-2",
    name: "FreeStyle Libre 2",
    brand: "FreeStyle Libre",
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
    imageFront: "/products/libre-front.svg",
    imageBack: "/products/libre-back.svg",
  },
  {
    slug: "freestyle-libre-14-day",
    name: "FreeStyle Libre 14 Day",
    brand: "FreeStyle Libre",
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
    imageFront: "/products/libre-front.svg",
    imageBack: "/products/libre-back.svg",
  },
  {
    slug: "stelo-by-dexcom",
    name: "Stelo by Dexcom",
    brand: "Dexcom",
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
    imageFront: "/products/dexcom-front.svg",
    imageBack: "/products/dexcom-back.svg",
  },
  {
    slug: "dexcom-g7",
    name: "Dexcom G7",
    brand: "Dexcom",
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
    imageFront: "/products/dexcom-front.svg",
    imageBack: "/products/dexcom-back.svg",
  },
  {
    slug: "dexcom-g6",
    name: "Dexcom G6",
    brand: "Dexcom",
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
    imageFront: "/products/dexcom-front.svg",
    imageBack: "/products/dexcom-back.svg",
  },
  {
    slug: "dexcom-g6-sensors-applicator",
    name: "Dexcom G6 Sensors and Applicator (3 Sensors Per Box)",
    brand: "Dexcom",
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
    imageFront: "/products/applicator-front.svg",
    imageBack: "/products/applicator-back.svg",
  },
  {
    slug: "dexcom-g6-transmitter",
    name: "Dexcom G6 Transmitter",
    brand: "Dexcom",
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
    imageFront: "/products/transmitter-front.svg",
    imageBack: "/products/transmitter-back.svg",
  },
  {
    slug: "freestyle-libre-14-day-sensor",
    name: "FreeStyle Libre 14 Day Sensor (Box of 1)",
    brand: "FreeStyle Libre",
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
    imageFront: "/products/libre-front.svg",
    imageBack: "/products/libre-back.svg",
  },
  {
    slug: "freestyle-libre-2-sensor",
    name: "FreeStyle Libre 2 Sensor (Box of 1)",
    brand: "FreeStyle Libre",
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
    imageFront: "/products/libre-front.svg",
    imageBack: "/products/libre-back.svg",
  },
  {
    slug: "freestyle-libre-3-sensor",
    name: "FreeStyle Libre 3 Sensor (Box of 1)",
    brand: "FreeStyle Libre",
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
    imageFront: "/products/libre-front.svg",
    imageBack: "/products/libre-back.svg",
  },
];

export const brands: Brand[] = ["FreeStyle Libre", "Dexcom"];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
