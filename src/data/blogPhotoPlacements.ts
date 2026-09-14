import type { ImageBlock, Post } from "./blog";

type Placement = { heading: string; photo: string; alt: string };

/* These are licensed photographs, inserted after the opening paragraph of
   the named section so the image supports the nearby explanation. */
export const BLOG_PHOTO_PLACEMENTS: Record<string, Placement[]> = {
  "did-eating-too-much-sugar-cause-diabetes": [
    { heading: "Sweets Alone Do Not Cause Type 2 Diabetes", photo: "sugar-cubes-meter", alt: "Sugar cubes arranged around a blood glucose meter" },
    { heading: "Sugar Is One Part of the Risk Picture", photo: "meal-vegetables-rice", alt: "A plate of rice, beans, and vegetables" },
    { heading: "Glucose Patterns Matter More Than Blame", photo: "tracking-calendar", alt: "A person records information on a calendar beside a glucose meter and phone" },
  ],
  "do-i-have-to-give-up-carbs-with-diabetes": [
    { heading: "Choosing Carbohydrates With More Fiber", photo: "meal-beans-rice", alt: "A meal with rice, vegetables, and greens on a plate" },
    { heading: "Building a Balanced Meal With Carbs", photo: "meal-brown-rice", alt: "A bowl with rice, vegetables, and other meal components" },
    { heading: "Learning From Your Glucose Patterns", photo: "cgm-food-app", alt: "A person wearing a glucose sensor checks a phone near a meal" },
  ],
  "can-i-drink-alcohol-with-diabetes": [
    { heading: "How Alcohol Affects Blood Glucose", photo: "wine-dinner", alt: "A glass of red wine beside a restaurant meal" },
    { heading: "What Counts as a Standard Drink?", photo: "wine-restaurant", alt: "People dining with wine at a restaurant" },
    { heading: "Steps to Discuss Before Drinking", photo: "wine-table", alt: "Wine glasses and food arranged on a dining table" },
  ],
  "what-is-a-continuous-glucose-monitor": [
    { heading: "What Does a CGM Measure?", photo: "cgm-reading-book", alt: "A woman wearing an arm sensor reads a book at home" },
    { heading: "What Can the Graph and Alerts Tell You?", photo: "cgm-chart-phone", alt: "A person views a glucose chart on a smartphone" },
    { heading: "Do You Still Need a Blood Glucose Meter?", photo: "meter-in-hands", alt: "A person holds a blood glucose meter and test strip" },
  ],
  "cgm-vs-finger-stick-blood-sugar-checks": [
    { heading: "A Meter Gives You a Result at One Moment", photo: "finger-test-close", alt: "Close-up of a fingertip blood drop beside a glucose meter" },
    { heading: "A CGM Shows Direction and Patterns", photo: "cgm-reading-book", alt: "A woman wearing a continuous glucose sensor reads at home" },
    { heading: "When Should You Use a Fingerstick Check?", photo: "finger-test-jeans", alt: "A seated person prepares a fingerstick glucose check" },
  ],
  "how-to-understand-cgm-glucose-trends": [
    { heading: "Start With the Current Reading and Trend Arrow", photo: "cgm-chart-phone", alt: "A smartphone displays a glucose trend chart" },
    { heading: "Look at the Daily Graph, Not Just One Moment", photo: "outdoor-activity", alt: "A woman wearing a glucose sensor exercises outdoors" },
    { heading: "What Does Time in Range Mean?", photo: "tracking-calendar", alt: "A phone, glucose meter, and calendar used to review daily information" },
  ],
  "what-to-ask-about-cgm-coverage": [
    { heading: "Start With Your Healthcare Professional", photo: "doctor-office", alt: "A healthcare professional talks with a patient in an office" },
    { heading: "Ask Your Plan About the Benefit", photo: "doctor-paperwork", alt: "A doctor and patient review paperwork during a visit" },
    { heading: "Know What Happens After the Order", photo: "diabetes-tools", alt: "A glucose meter and related diabetes testing supplies" },
  ],
};

export function addInlinePhotos(post: Post): Post {
  const placements = BLOG_PHOTO_PLACEMENTS[post.slug];
  if (!placements) return post;

  let pending: Placement | undefined;
  let paragraphCount = 0;
  const body: Post["body"] = [];
  for (const block of post.body) {
    body.push(block);
    if (block.type === "heading") {
      pending = placements.find(({ heading }) => heading === block.text);
      paragraphCount = 0;
    } else if (block.type === "paragraph" && pending) {
      paragraphCount += 1;
      // A one-line lead-in reads better beside the explanation it introduces.
      if (block.text.length < 160 && paragraphCount === 1) continue;
      const image: ImageBlock = {
        id: `${post.slug}-photo-${pending.photo}`,
        type: "image",
        url: `/blog/inline/${pending.photo}.webp`,
        alt: pending.alt,
        ratio: "3/2",
        width: "inset",
      };
      body.push(image);
      pending = undefined;
    }
  }
  return { ...post, body };
}
