/*
  Product catalog for Medville Diabetes.

  Every summary, description and key fact below is the client's approved
  product copy from the website copy document of 2026-08-28, reproduced as
  written. Changes to this wording should come from the client rather than
  from the build.

  Copy rules still apply to anything added later: plain English, no idioms,
  no contractions, short sentences, one idea per sentence.

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

/*
  Availability, set by the client from the dashboard.

  "available"   enquiries proceed as normal
  "coming-soon" shown in the catalog, cannot be enquired about yet
  "sold"        shown but out of stock, the enquiry route is closed

  A missing value means available, so every product written before this
  field existed keeps working unchanged.
*/
export type ProductStatus = "available" | "coming-soon" | "sold";

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
  status?: ProductStatus;
  price?: number;
}

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  available: "Available",
  "coming-soon": "Coming soon",
  sold: "Sold out",
};

/* Whether a visitor may still ask about this product. */
export function isEnquirable(product: Product) {
  return (product.status ?? "available") === "available";
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
      "Real-time continuous glucose monitoring designed to keep glucose information within easy reach.",
    description: [
      "The FreeStyle Libre 3 system continuously measures glucose and automatically sends readings to a compatible device, making it easier to see your glucose information throughout the day.",
      "Its small wearable sensor is applied to the back of the upper arm and provides current readings, glucose trends, and alarm capabilities through compatible FreeStyle Libre technology.",
      "For current users, Medville Diabetes can help with supply availability and the next steps for obtaining compatible sensors.",
    ],
    keyFacts: [
      "Real-time continuous glucose monitoring",
      "Automatic glucose readings",
      "Original Libre 3 sensor provides up to 14 days of wear",
      "Alarm capabilities",
      "Compatible device requirements apply",
      "Prescription required",
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
      "Continuous glucose monitoring with glucose readings, trends, and optional alarms.",
    description: [
      "The FreeStyle Libre 2 system helps users keep track of glucose levels and trends throughout the day using a wearable sensor and compatible reading technology.",
      "Its alarm capabilities can provide notifications for certain glucose events when enabled and used under the required connection conditions.",
      "Medville Diabetes can help with questions about current sensor availability and supply options.",
    ],
    keyFacts: [
      "Continuous glucose monitoring",
      "Up to 14 days of wear per original Libre 2 sensor",
      "Optional glucose alarms",
      "Compatible smartphone, app, or reader requirements apply",
      "Prescription required",
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
      "A 14-day glucose monitoring system that lets users scan for glucose readings and trends.",
    description: [
      "The FreeStyle Libre 14 Day system uses a wearable sensor to continuously measure glucose throughout the day.",
      "Users scan the sensor with a compatible reader or smartphone to view their current glucose reading, trend direction, and historical information.",
      "This earlier-generation system is intended for existing compatible users. Current product availability may vary.",
    ],
    keyFacts: [
      "Up to 14 days of sensor wear",
      "Readings obtained by scanning the sensor",
      "Provides glucose trends and historical information",
      "Indicated for adults age 18 and older",
      "Prescription required",
      "Compatible device requirements apply",
    ],
    imageFront: "/products/freestyle-libre-14-day-front.webp",
    imageBack: "/products/freestyle-libre-14-day-back.webp",
  },
  {
    slug: "freestyle-libre-3-sensor",
    name: "FreeStyle Libre 3 Sensor (Box of 1)",
    brand: "FreeStyle Libre",
    line: "cgm",
    category: "Sensor",
    shortDescription: "Replacement sensor for compatible FreeStyle Libre 3 systems.",
    description: [
      "The FreeStyle Libre 3 sensor continuously measures glucose and automatically sends readings to a compatible FreeStyle Libre 3 device.",
      "Its small design is intended to be worn on the back of the upper arm for up to 14 days.",
      "This package contains one sensor.",
    ],
    keyFacts: [
      "1 sensor per box",
      "Up to 14 days of wear",
      "Real-time glucose readings",
      "For compatible FreeStyle Libre 3 systems",
      "Prescription required",
      "Device compatibility requirements apply",
    ],
    imageFront: "/products/freestyle-libre-3-sensor-front.webp",
    imageBack: "/products/freestyle-libre-3-sensor-back.webp",
  },
  {
    slug: "freestyle-libre-2-sensor",
    name: "FreeStyle Libre 2 Sensor (Box of 1)",
    brand: "FreeStyle Libre",
    line: "cgm",
    category: "Sensor",
    shortDescription: "Replacement sensor for compatible FreeStyle Libre 2 systems.",
    description: [
      "The FreeStyle Libre 2 sensor measures glucose throughout the day as part of the compatible FreeStyle Libre 2 system.",
      "Each sensor is designed to be worn for up to 14 days and supports glucose readings, trends, and compatible alarm functionality.",
      "This package contains one sensor.",
    ],
    keyFacts: [
      "1 sensor per box",
      "Up to 14 days of wear",
      "Supports compatible glucose alarms",
      "For use with compatible FreeStyle Libre 2 systems",
      "Prescription required",
    ],
    imageFront: "/products/freestyle-libre-2-sensor-front.webp",
    imageBack: "/products/freestyle-libre-2-sensor-back.webp",
  },
  {
    slug: "freestyle-libre-14-day-sensor",
    name: "FreeStyle Libre 14 Day Sensor (Box of 1)",
    brand: "FreeStyle Libre",
    line: "cgm",
    category: "Sensor",
    shortDescription: "Replacement sensor for compatible FreeStyle Libre 14 Day systems.",
    description: [
      "The FreeStyle Libre 14 Day sensor continuously measures glucose while worn and stores glucose information for use with the compatible system.",
      "Users scan the sensor using a compatible reader or smartphone to view glucose readings and trends.",
      "This package includes one sensor designed for up to 14 days of wear.",
    ],
    keyFacts: [
      "1 sensor per box",
      "Up to 14 days of wear",
      "Readings accessed by scanning",
      "For compatible FreeStyle Libre 14 Day systems",
      "Prescription required",
    ],
    imageFront: "/products/freestyle-libre-14-day-sensor-front.webp",
    imageBack: "/products/freestyle-libre-14-day-sensor-back.webp",
  },
  {
    slug: "stelo-by-dexcom",
    name: "Stelo by Dexcom",
    brand: "Dexcom",
    line: "cgm",
    category: "System",
    shortDescription:
      "An over-the-counter glucose biosensor designed to help adults better understand their glucose patterns.",
    description: [
      "Stelo by Dexcom is a wearable glucose biosensor that continuously tracks glucose and sends information to the compatible Stelo smartphone app.",
      "It is designed for adults age 18 and older who are not using insulin, including adults with type 2 diabetes or prediabetes who meet its intended-use requirements, as well as adults interested in tracking their glucose.",
      "Stelo is available without a prescription, making glucose tracking accessible without the traditional prescription process.",
    ],
    keyFacts: [
      "Available without a prescription",
      "Designed for adults age 18 and older",
      "Intended for adults who are not using insulin",
      "Up to 15 days of sensor wear",
      "Works with the compatible Stelo smartphone app",
      "Intended-use limitations apply",
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
      "Real-time continuous glucose monitoring with automatic readings, trends, and customizable alerts.",
    description: [
      "Dexcom G7 continuously measures glucose and automatically sends readings to a compatible display device, helping users see current glucose levels and how they are trending throughout the day.",
      "Its sensor and applicator are combined into a compact design intended to simplify application compared with earlier Dexcom generations.",
      "Dexcom currently offers more than one G7 configuration, so exact wear duration and indications depend on the specific G7 product supplied.",
    ],
    keyFacts: [
      "Real-time continuous glucose monitoring",
      "Automatic glucose readings",
      "Customizable alerts",
      "Standard G7 provides up to 10 days of wear",
      "12-hour grace period after the standard sensor session",
      "Compatible smartphone, app, or receiver requirements apply",
      "Prescription required",
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
      "Real-time continuous glucose monitoring with automatic glucose readings and alerts.",
    description: [
      "The Dexcom G6 system uses a wearable sensor and reusable transmitter to automatically send glucose information to a compatible display device.",
      "Users can view current glucose readings, trends, and compatible alerts without manually scanning the sensor.",
      "Dexcom ended manufacturing of the G6 system on July 1, 2026. Remaining inventory may continue to be available through pharmacies and medical distributors while supplies last.",
    ],
    keyFacts: [
      "Real-time continuous glucose monitoring",
      "Automatic readings",
      "Up to 10 days of sensor wear",
      "Reusable transmitter",
      "Compatible smart device or receiver required",
      "Prescription required",
      "Remaining availability may be limited",
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
      "Three replacement sensors for compatible Dexcom G6 continuous glucose monitoring systems.",
    description: [
      "Dexcom G6 sensors continuously measure glucose when used with a compatible G6 transmitter and display device.",
      "Each sensor is designed for a maximum wear period of 10 days and comes with its own applicator for insertion according to Dexcom instructions.",
      "This package includes three sensors with applicators.",
    ],
    keyFacts: [
      "3 sensors per box",
      "Up to 10 days of wear per sensor",
      "Sensor applicator included",
      "Requires compatible Dexcom G6 transmitter",
      "Prescription required",
      "Remaining availability may be limited",
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
      "Reusable transmitter that sends glucose data from a Dexcom G6 sensor to a compatible display device.",
    description: [
      "The Dexcom G6 transmitter connects to the compatible G6 sensor and wirelessly sends glucose information to a compatible smart device or Dexcom receiver.",
      "Unlike the disposable sensor, the transmitter is reused across multiple sensor sessions until its battery reaches the end of its usable life.",
      "This product is intended for use as part of a compatible Dexcom G6 system.",
    ],
    keyFacts: [
      "Reusable G6 component",
      "Connects to compatible Dexcom G6 sensors",
      "Sends glucose information wirelessly",
      "Transmitter battery lasts approximately 3 months",
      "Compatible display device required",
      "Prescription requirements apply",
      "Remaining availability may be limited",
    ],
    imageFront: "/products/dexcom-g6-transmitter-front.webp",
    imageBack: "/products/dexcom-g6-transmitter-back.webp",
  },
  {
    slug: "tandem-tslim-x2",
    name: "Tandem t:slim X2 Insulin Pump",
    brand: "Tandem",
    line: "insulin-pump",
    category: "System",
    shortDescription:
      "A rechargeable touchscreen insulin pump designed for continuous insulin delivery and integration with compatible CGM technology.",
    description: [
      "The Tandem t:slim X2 insulin pump is designed to provide continuous subcutaneous insulin delivery for people who require insulin therapy.",
      "Its color touchscreen provides access to pump settings and insulin delivery information, while compatible configurations can integrate with supported CGM systems and Tandem automated insulin delivery technology.",
      "Insulin pump therapy requires a prescription, appropriate training, and ongoing guidance from a qualified healthcare professional.",
    ],
    keyFacts: [
      "Rechargeable insulin pump",
      "Integrated color touchscreen",
      "Holds up to 300 units of insulin",
      "Supports Control-IQ+ technology in compatible configurations",
      "Compatible with select Dexcom G7 systems",
      "Compatible with FreeStyle Libre 3 Plus in supported configurations",
      "Prescription required",
      "Training and healthcare-provider guidance required",
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
