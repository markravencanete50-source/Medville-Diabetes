import { Link } from "react-router-dom";
import { ArrowRight, BookOpenText } from "lucide-react";
import Container from "../components/Container";
import { formatPostDate, readingMinutes, type Post } from "../data/blog";
import { usePosts } from "../lib/useSiteData";
import { usePageMeta } from "../lib/usePageMeta";
import { metaFor } from "../data/pageMeta";

const TOPICS = [
  { id: "monitoring", label: "Glucose monitoring", description: "Understand CGMs, glucose readings, and the patterns behind them." },
  { id: "everyday", label: "Everyday living", description: "Practical answers about food, drinks, and life with diabetes." },
  { id: "supplies", label: "Supplies and coverage", description: "Know what to ask about devices, prescriptions, and insurance." },
] as const;

export const TOPIC_BY_SLUG: Record<string, (typeof TOPICS)[number]["id"]> = {
  "what-is-a-continuous-glucose-monitor": "monitoring",
  "cgm-vs-finger-stick-blood-sugar-checks": "monitoring",
  "how-to-understand-cgm-glucose-trends": "monitoring",
  "did-eating-too-much-sugar-cause-diabetes": "everyday",
  "do-i-have-to-give-up-carbs-with-diabetes": "everyday",
  "can-i-drink-alcohol-with-diabetes": "everyday",
  "what-to-ask-about-cgm-coverage": "supplies",
};

function TopicFor({ post }: { post: Post }) {
  return <span className="text-caption font-semibold uppercase tracking-[0.13em] text-brand">{TOPICS.find((topic) => topic.id === TOPIC_BY_SLUG[post.slug])?.label ?? "Diabetes education"}</span>;
}

function EditorialPostRow({ post, imageRight = false }: { post: Post; imageRight?: boolean }) {
  return <article>
    <Link
      to={`/blog/${post.slug}`}
      className={`group grid overflow-hidden rounded-[20px] border border-line-brand shadow-soft transition-shadow hover:shadow-soft-hover focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand lg:grid-cols-2 ${imageRight ? "bg-brand-tint" : "bg-surface-raised"}`}
    >
      <div className={`relative aspect-[16/10] overflow-hidden bg-grey-light lg:aspect-auto lg:min-h-[340px] ${imageRight ? "lg:order-2" : ""}`}>
        {post.image ? <img src={post.image} alt={post.imageAlt} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035] motion-reduce:transition-none motion-reduce:group-hover:scale-100" /> : <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-4 bg-wash px-8 text-center text-on-dark">
          <BookOpenText size={42} strokeWidth={1.5} aria-hidden="true" />
          <span className="max-w-[18ch] font-display text-h3 font-bold">Practical diabetes education</span>
        </div>}
      </div>
      <div className={`flex flex-col justify-center p-7 sm:p-9 lg:p-11 ${imageRight ? "lg:order-1" : ""}`}>
        <TopicFor post={post} />
        <h3 className="mt-3 max-w-[24ch] font-display text-h3 font-bold leading-tight text-ink transition-colors group-hover:text-brand">{post.title}</h3>
        <p className="mt-4 max-w-[58ch] text-body leading-relaxed text-grey-dark">{post.excerpt}</p>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-line-brand pt-5">
          <span className="text-caption text-grey-muted">{formatPostDate(post.publishedAt)} · {readingMinutes(post.body)} min read</span>
          <span className="inline-flex items-center gap-2 text-small font-semibold text-brand">Read article <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" /></span>
        </div>
      </div>
    </Link>
  </article>;
}

export default function Blog() {
  usePageMeta(metaFor("/blog"));
  const posts = usePosts();
  const featured = posts.find((post) => post.slug === "what-is-a-continuous-glucose-monitor") ?? posts[0];
  const remaining = posts.filter((post) => post.slug !== featured?.slug);
  const uncategorized = remaining.filter((post) => !TOPIC_BY_SLUG[post.slug]);

  return <>
    <section className="bg-wash"><Container wide className="py-11 md:py-16">
      <p className="text-caption font-semibold uppercase tracking-[0.18em] text-on-dark-accent">Medville Diabetes journal</p>
      <h1 className="mt-4 max-w-[21ch] font-display text-h1 font-bold leading-tight text-on-dark">Clear Answers for Life With Diabetes</h1>
      <p className="mt-4 max-w-[62ch] text-body-lg leading-relaxed text-on-dark-brand">Explore practical guides to glucose monitoring, daily choices, and getting the supplies you need. Each article gives you useful questions to take to your healthcare team.</p>
    </Container></section>

    <Container wide className="py-10 md:py-14">
      {posts.length === 0 ? <p className="text-body text-grey-dark">Articles are coming soon. Explore our <Link to="/products/cgm" className="font-semibold text-brand underline">CGM products</Link> in the meantime.</p> : <>
        <nav aria-label="Blog topics" className="flex flex-wrap gap-2 border-b border-line-brand pb-8">{TOPICS.map((topic) => <a key={topic.id} href={`#${topic.id}`} className="rounded-full border border-line-brand bg-surface-raised px-4 py-2 text-small font-semibold text-brand transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand">{topic.label}</a>)}</nav>
        {featured && <section aria-labelledby="start-heading" className="pt-10 md:pt-14">
          <p className="text-caption font-semibold uppercase tracking-[0.16em] text-brand">Start here</p><h2 id="start-heading" className="mt-2 font-display text-h2 font-bold text-ink">A Guide to Glucose Monitoring</h2>
          <Link to={`/blog/${featured.slug}`} className="group mt-6 grid overflow-hidden rounded-[20px] border border-line-brand bg-surface-raised shadow-soft focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand lg:grid-cols-[1.05fr_1fr]">
            {featured.image && <div className="aspect-[16/10] overflow-hidden bg-grey-light lg:aspect-auto"><img src={featured.image} alt={featured.imageAlt} {...{ fetchpriority: "high" }} className="h-full w-full object-cover" /></div>}
            <div className="flex flex-col justify-center p-7 md:p-10"><TopicFor post={featured} /><h3 className="mt-3 max-w-[24ch] font-display text-h2 font-bold leading-tight text-ink group-hover:text-brand">{featured.title}</h3><p className="mt-4 max-w-[54ch] text-body leading-relaxed text-grey-dark">{featured.excerpt}</p><span className="mt-6 inline-flex items-center gap-2 text-small font-semibold text-brand">Read the guide <ArrowRight size={17} aria-hidden="true" /></span></div>
          </Link>
        </section>}
        {TOPICS.map((topic, topicIndex) => {
          const matches = remaining.filter((post) => TOPIC_BY_SLUG[post.slug] === topic.id);
          return <section id={topic.id} key={topic.id} aria-labelledby={`${topic.id}-heading`} className="scroll-mt-24 pt-14 md:pt-20">
            <div className="flex flex-col justify-between gap-3 border-t border-line-brand pt-8 md:flex-row md:items-end"><div><h2 id={`${topic.id}-heading`} className="font-display text-h2 font-bold text-ink">{topic.label}</h2><p className="mt-2 max-w-[60ch] text-body text-grey-dark">{topic.description}</p></div><span className="text-caption font-semibold text-grey-muted">{matches.length} {matches.length === 1 ? "article" : "articles"}</span></div>
            {matches.length ? <div className="mt-7 space-y-7 md:space-y-9">{matches.map((post, postIndex) => <EditorialPostRow key={post.slug} post={post} imageRight={(topicIndex + postIndex) % 2 === 1} />)}</div> : <p className="mt-6 text-small text-grey-dark">More guides are on the way.</p>}
          </section>;
        })}
        {uncategorized.length > 0 && <section aria-labelledby="more-heading" className="pt-16"><h2 id="more-heading" className="font-display text-h2 font-bold text-ink">More articles</h2><div className="mt-7 space-y-7 md:space-y-9">{uncategorized.map((post, postIndex) => <EditorialPostRow key={post.slug} post={post} imageRight={postIndex % 2 === 1} />)}</div></section>}
      </>}
    </Container>

    <section className="bg-brand-tint py-12 md:py-16"><Container wide className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
      <div><h2 className="font-display text-h3 font-bold text-ink">Need help with diabetes supplies?</h2><p className="mt-2 max-w-[60ch] text-body leading-relaxed text-grey-dark">Learn about our CGM options and how our team helps you navigate the supply process.</p></div>
      <div className="flex flex-wrap gap-3"><Link to="/products/cgm" className="rounded-full bg-brand px-5 py-3 text-small font-semibold text-on-dark hover:bg-brand-hover">Explore CGMs</Link><Link to="/services" className="rounded-full border border-brand px-5 py-3 text-small font-semibold text-brand hover:bg-surface-raised">How we help</Link></div>
    </Container></section>
  </>;
}
