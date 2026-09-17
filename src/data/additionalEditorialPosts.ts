import type { Post, PostBlock } from "./blog";

type DraftBlock = PostBlock extends infer Block ? Block extends PostBlock ? Omit<Block, "id"> : never : never;
const paragraph = (text: string): DraftBlock => ({ type: "paragraph", text });
const heading = (text: string): DraftBlock => ({ type: "heading", level: 2, text });
const list = (...items: string[]): DraftBlock => ({ type: "list", style: "bullet", items });
const callout = (text: string): DraftBlock => ({ type: "callout", tone: "brand", text });

function article(slug: string, title: string, excerpt: string, image: string, imageAlt: string, blocks: DraftBlock[]): Post {
  return {
    slug, title, excerpt, image, imageAlt,
    author: "Medville Diabetes", publishedAt: "2026-09-14", published: true, template: "classic",
    body: blocks.map((block, index) => ({ ...block, id: `${slug}-${index + 1}` } as PostBlock)),
  };
}

/* Original educational copy. Clinical sources are linked in each article.
   Coverage details are intentionally conditional and point to Medicare's
   current page rather than promising a benefit or a specific cost. */
export const ADDITIONAL_EDITORIAL_POSTS: Post[] = [
  article(
    "what-is-a-continuous-glucose-monitor",
    "What Is a Continuous Glucose Monitor and How Does It Work?",
    "A clear introduction to CGM sensors, glucose trends, alerts, and the questions to ask before choosing a device.",
    "https://res.cloudinary.com/zixjwbqv/image/upload/f_auto,q_auto,c_limit,w_1920/v1789678419/medville/migrated/9b0d9a0fb26470dffd3f0118.webp",
    "A woman wearing a continuous glucose sensor on her upper arm",
    [
      paragraph("A continuous glucose monitor, or CGM, is a wearable device that estimates glucose levels throughout the day and night. Instead of showing only one result when you test, it shows how your glucose changes over time. That can make daily patterns easier to discuss with your healthcare team."),
      heading("What Does a CGM Measure?"),
      paragraph("A small sensor sits just under the skin, usually on the arm or abdomen depending on the device. It measures glucose in the fluid between cells. A transmitter sends readings to a compatible phone, reader, or other display. Since this is not a direct blood measurement, the reading may differ from a finger-stick result, especially when glucose is changing quickly."),
      paragraph("Most systems update readings every few minutes. Some display a current estimate, a graph, and an arrow showing the direction of change. Features, wear time, phone compatibility, and alert options vary by model. Follow the instructions for the device you use."),
      heading("What Can the Graph and Alerts Tell You?"),
      paragraph("A single reading is one point in time. A CGM graph adds context: you may notice a repeated rise after a meal, a drop during activity, or a change overnight. Some models can alert you when glucose is low, high, or moving quickly. Your care team can help set personal targets and explain when to act on an alert."),
      list("Current reading: the device's estimate at that moment.", "Trend arrow: the direction and pace of change.", "Daily graph: how readings changed over several hours.", "Time in range: the share of time readings stayed within a target range chosen with your care team."),
      callout("A CGM is a tool for understanding patterns. It does not replace your healthcare team's advice or your device's safety instructions."),
      heading("Do You Still Need a Blood Glucose Meter?"),
      paragraph("Sometimes, yes. A standard meter may be needed if a CGM reading does not match how you feel, a sensor is not working, or the device instructions ask you to confirm a result. Keep the supplies your care team recommends. Our guide to [CGM and finger-stick checks](/blog/cgm-vs-finger-stick-blood-sugar-checks) explains the difference."),
      heading("Questions to Ask Before Choosing a CGM"),
      list("Is a CGM appropriate for my treatment plan?", "Which device features and phone or reader options fit my routine?", "What should I do if an alert or reading does not match my symptoms?", "How will we review trends together, and what are my personal targets?", "What prescription and coverage steps apply to me?"),
      paragraph("Explore the [CGM products](/products/cgm) shown by Medville Diabetes and learn [how our supply process works](/services). If you have coverage questions, start with our [CGM coverage guide](/blog/what-to-ask-about-cgm-coverage)."),
      heading("Sources and Further Reading"),
      list("[Continuous glucose monitoring](https://www.niddk.nih.gov/health-information/diabetes/overview/managing-diabetes/continuous-glucose-monitoring) — National Institute of Diabetes and Digestive and Kidney Diseases", "[Continuous glucose monitors](https://www.cdc.gov/diabetes/treatment/continuous-glucose-monitors.html) — Centers for Disease Control and Prevention"),
    ],
  ),
  article(
    "cgm-vs-finger-stick-blood-sugar-checks",
    "CGM vs. Fingerstick Blood Sugar Checks: What Is the Difference?",
    "Learn what each method measures, why readings can differ, and when a standard meter remains useful.",
    "https://res.cloudinary.com/zixjwbqv/image/upload/f_auto,q_auto,c_limit,w_1920/v1789678424/medville/migrated/e295e71c6075b845d9856a73.webp",
    "A person using a lancet for a fingerstick blood glucose check",
    [
      paragraph("A blood glucose meter and a continuous glucose monitor answer related but different questions. A finger-stick test measures glucose in a small drop of blood at that moment. A CGM estimates glucose in fluid just below the skin and shows readings over time. Many people use both as part of a care plan."),
      heading("A Meter Gives You a Result at One Moment"),
      paragraph("With a standard meter, you use a test strip and a small drop of blood. The result helps you check glucose at a specific time, such as before a meal, after activity, or when you feel unwell. Your care team will tell you when to check and what targets apply to you. A meter does not show what happened between tests."),
      heading("A CGM Shows Direction and Patterns"),
      paragraph("A CGM sensor estimates glucose every few minutes. It can show whether your readings are rising, falling, or staying fairly steady. Its graph can help you and your care team discuss patterns across meals, activity, medicine, sleep, and other parts of your day. Read [how a CGM works](/blog/what-is-a-continuous-glucose-monitor) for a device overview."),
      heading("Why Might the Two Numbers Be Different?"),
      paragraph("A meter measures blood. A CGM measures fluid between cells, where changes may appear a little later. Differences may be more noticeable when glucose changes quickly, such as after a meal or exercise. Sensor issues and device-specific factors can also affect a reading. One difference does not necessarily mean either device is broken."),
      heading("When Should You Use a Fingerstick Check?"),
      paragraph("Follow your device instructions and your care team's plan. NIDDK notes that you may need a meter to check a CGM result if it does not match your symptoms or if you doubt the reading. Some devices require meter checks for calibration or certain treatment decisions. Do not ignore symptoms because a display looks normal."),
      callout("If you think your glucose is low or high, follow the action plan your healthcare professional gave you. Seek urgent medical help when symptoms are severe or your plan tells you to do so."),
      heading("Choosing the Right Monitoring Routine"),
      paragraph("Your treatment, risk of low glucose, comfort with devices, and coverage can all affect the choice. Ask which readings to record, when to confirm a CGM result, and how to share useful trends at visits. For a practical next step, see [how to understand CGM trends](/blog/how-to-understand-cgm-glucose-trends) and browse our [CGM options](/products/cgm)."),
      heading("Sources and Further Reading"),
      list("[Continuous glucose monitoring](https://www.niddk.nih.gov/health-information/diabetes/overview/managing-diabetes/continuous-glucose-monitoring) — NIDDK", "[Monitoring your blood sugar](https://www.cdc.gov/diabetes/diabetes-testing/monitoring-blood-sugar.html) — CDC"),
    ],
  ),
  article(
    "how-to-understand-cgm-glucose-trends",
    "How to Understand CGM Glucose Trends in Daily Life",
    "Use the graph, trend arrows, and time in range to prepare better questions for your healthcare team.",
    "https://res.cloudinary.com/zixjwbqv/image/upload/f_auto,q_auto,c_limit,w_1920/v1789678418/medville/migrated/1ff322a83a1987abf49b3d54.webp",
    "A person wearing a glucose sensor checks a phone beside a prepared meal",
    [
      paragraph("A CGM can give you many readings each day. You do not need to judge every change on its own. The most useful starting point is to look for repeated patterns and bring them to your healthcare team. This guide explains what the common displays mean without setting a treatment target for you."),
      heading("Start With the Current Reading and Trend Arrow"),
      paragraph("The number on the screen is the device's current glucose estimate. The arrow shows whether glucose is rising, falling, or staying steady. Together, they give more context than a number alone. Alerts and arrows differ across devices, so learn the symbols and instructions for your model."),
      heading("Look at the Daily Graph, Not Just One Moment"),
      paragraph("The graph can show how your glucose changes around meals, movement, medication, stress, or sleep. Food and activity both affect readings, and the same meal may look different on different days. Notice a recurring question, such as whether your reading rises after lunch or falls during a walk, rather than drawing a conclusion from one day."),
      list("Write down when a pattern happens and what you were doing.", "Compare similar times on more than one day.", "Bring the graph and your questions to your next care visit.", "Ask before changing a medication dose or treatment plan."),
      heading("What Does Time in Range Mean?"),
      paragraph("Time in range is the percentage of time your CGM estimates glucose within a target range. Many educational materials describe 70 to 180 mg/dL as a common range for many adults with diabetes, but a safe target is individual. Age, pregnancy, other conditions, and risk of low glucose can change the goal. Ask your healthcare professional which range and time goal fit you."),
      heading("What If a Reading Does Not Match How You Feel?"),
      paragraph("Check the device instructions and your care plan. A CGM measures fluid between cells, so its reading can differ from a blood glucose meter, particularly during a quick change. A finger-stick check may be needed if symptoms and the display disagree. Our [comparison of CGM and finger-stick checks](/blog/cgm-vs-finger-stick-blood-sugar-checks) explains why."),
      callout("Your CGM data is information to discuss with your healthcare team. Do not change medication or ignore symptoms based only on a chart."),
      heading("Make the Data Useful at Your Next Visit"),
      paragraph("Choose one or two patterns to ask about. For example: What might explain my repeated afternoon rise? What should I do when an alert sounds? Should I adjust when I check glucose around activity? Your care team can interpret the full picture, including your treatment and health history. For more on meals, read our guide to [carbohydrates and diabetes](/blog/do-i-have-to-give-up-carbs-with-diabetes)."),
      heading("Sources and Further Reading"),
      list("[How to use your CGM for better diabetes management](https://diabetes.org/living-with-diabetes/treatment-care/food-monitoring) — American Diabetes Association", "[Continuous glucose monitors](https://www.cdc.gov/diabetes/treatment/continuous-glucose-monitors.html) — CDC", "[Continuous glucose monitoring](https://www.niddk.nih.gov/health-information/diabetes/overview/managing-diabetes/continuous-glucose-monitoring) — NIDDK"),
    ],
  ),
  article(
    "what-to-ask-about-cgm-coverage",
    "What to Ask About CGM Coverage and Diabetes Supplies",
    "A practical checklist for discussing a CGM prescription, insurance benefits, supplier status, and out-of-pocket costs.",
    "https://res.cloudinary.com/zixjwbqv/image/upload/f_auto,q_auto,c_limit,w_1920/v1789678421/medville/migrated/ef85bc61fa7cb342693fb5a9.webp",
    "A doctor talks with a patient in a consultation room",
    [
      paragraph("A CGM can be useful, but the path to getting one may involve your healthcare professional, an insurance plan, and a supplier. Coverage depends on the plan and the details of your care. A short list of questions can help you understand the steps before you place an order."),
      heading("Start With Your Healthcare Professional"),
      paragraph("Ask whether a CGM fits your care plan and which model's features meet your needs. A prescription or order may be required. Your clinician may also need to document your treatment and provide instructions for using the device. If you use Medicare, the healthcare professional must evaluate eligibility before ordering a CGM."),
      heading("Ask Your Plan About the Benefit"),
      paragraph("A plan may handle a CGM under a medical equipment benefit or a pharmacy benefit. Ask how your plan covers the specific device and sensors, whether prior authorization is needed, and which suppliers are in its network. Also ask about deductibles, coinsurance, copays, and replacement supply rules. Check the plan's current written benefit details because coverage can change."),
      list("Is this CGM covered under medical equipment or pharmacy benefits?", "Is a prescription, prior authorization, or recent clinical note required?", "Which suppliers and device models are covered?", "What will I owe for the initial device and ongoing sensors?", "How and when can I request replacement supplies?"),
      heading("If You Have Medicare"),
      paragraph("Medicare says Part B may cover a CGM and related supplies when a healthcare professional orders them and eligibility conditions are met. Its current page lists insulin use or a history of problems with low blood sugar, along with adequate training to use the device. Medicare also advises checking that the clinician and equipment supplier are enrolled and asking the supplier about assignment. Review [Medicare's current CGM coverage page](https://www.medicare.gov/coverage/continuous-glucose-monitors) for the full rules and costs that apply to you."),
      callout("A quick conversation or eligibility check is not a guarantee of coverage. Confirm the final benefit, required documents, supplier status, and your cost with your plan before ordering."),
      heading("Know What Happens After the Order"),
      paragraph("Ask who will request the prescription or supporting records, how you will be updated, and whom to contact if a document is missing. Once the device arrives, ask where to get setup instructions and how refills are handled. Medville Diabetes explains its [supply process](/services) and lists its [CGM products](/products/cgm). You can [contact our team](/contact) with questions about next steps."),
      heading("Sources and Further Reading"),
      list("[Continuous glucose monitors](https://www.medicare.gov/coverage/continuous-glucose-monitors) — Medicare", "[Continuous glucose monitoring](https://www.niddk.nih.gov/health-information/diabetes/overview/managing-diabetes/continuous-glucose-monitoring) — NIDDK"),
    ],
  ),
];
