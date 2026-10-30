// Published, build-time articles have no Firestore document until an editor
// changes them. Keep this allowlist aligned with src/data/editorialPosts.ts and
// src/data/additionalEditorialPosts.ts. Firestore overrides always win.
export const editorialCatalog = new Map([
  ["what-is-a-continuous-glucose-monitor", {
    title: "What Is a Continuous Glucose Monitor and How Does It Work?",
    excerpt: "A clear introduction to CGM sensors, glucose trends, alerts, and the questions to ask before choosing a device.",
  }],
  ["cgm-vs-finger-stick-blood-sugar-checks", {
    title: "CGM vs. Fingerstick Blood Sugar Checks: What Is the Difference?",
    excerpt: "Learn what each method measures, why readings can differ, and when a standard meter remains useful.",
  }],
  ["how-to-understand-cgm-glucose-trends", {
    title: "How to Understand CGM Glucose Trends in Daily Life",
    excerpt: "Use the graph, trend arrows, and time in range to prepare better questions for your healthcare team.",
  }],
  ["what-to-ask-about-cgm-coverage", {
    title: "What to Ask About CGM Coverage and Diabetes Supplies",
    excerpt: "A practical checklist for discussing a CGM prescription, insurance benefits, supplier status, and out-of-pocket costs.",
  }],
  ["did-eating-too-much-sugar-cause-diabetes", {
    title: "Did Eating Too Much Sugar Cause My Diabetes?",
    excerpt: "Eating sweets alone does not cause diabetes. Learn how type 2 diabetes develops, where sugar fits, and why glucose patterns matter more than blame.",
  }],
  ["do-i-have-to-give-up-carbs-with-diabetes", {
    title: "Do I Have to Give Up Carbs With Diabetes?",
    excerpt: "Diabetes does not mean giving up carbohydrates. Learn how portions, fiber, balanced meals, and your glucose response can guide everyday choices.",
  }],
  ["can-i-drink-alcohol-with-diabetes", {
    title: "Can I Drink Alcohol If I Have Diabetes?",
    excerpt: "Alcohol can raise or lower blood glucose. Learn why medication, food, and monitoring matter, and what to discuss with your diabetes care team.",
  }],
]);
