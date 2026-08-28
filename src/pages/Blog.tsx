import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock, PenLine } from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import { Blob, Eyebrow, Grain } from "../components/Decor";
import { formatPostDate, readingMinutes } from "../data/blog";
import { PHONE_DISPLAY, PHONE_TEL } from "../data/company";
import { usePosts } from "../lib/useSiteData";
import { usePageMeta } from "../lib/usePageMeta";
import { metaFor } from "../data/pageMeta";
import { useParallax, useReveal } from "../lib/useReveal";

/*
  The blog index: every published post, newest first.

  This is the one place posts live. The home page shows the three most recent
  and links here, and the footer links here, so there is a single destination
  rather than an anchor on one page and a list on another.

  Posts come from the `posts` collection, which the client writes from the
  dashboard. Until the first one is published this page says so plainly and
  offers the phone number, rather than showing invented articles.
*/
export default function Blog() {
  usePageMeta(metaFor("/blog"));

  const revealRef = useReveal<HTMLDivElement>();
  const parallaxRef = useParallax<HTMLDivElement>();
  const posts = usePosts();

  const [lead, ...rest] = posts;

  return (
    <div ref={revealRef}>
      <div ref={parallaxRef}>
        <section className="bg-wash relative overflow-hidden">
          <Blob tone="brand" strength={0.18} blur={44} size={460} duration="20s" className="-left-[130px] -top-[150px]" />
          <Blob tone="cyan" strength={0.12} blur={46} size={440} duration="26s" reverse className="-bottom-[190px] -right-[110px]" />
          <Grain opacity={0.05} />
          <Container wide className="relative py-12 md:py-20">
            <p className="rise-in m-0">
              <Eyebrow>Learn</Eyebrow>
            </p>
            <h1
              className="rise-in mt-3 max-w-[20ch] font-display text-h1 font-bold text-ink"
              style={{ "--rise-delay": "150ms" } as React.CSSProperties}
            >
              Simple Answers for Everyday Diabetes Questions
            </h1>
            <p
              className="rise-in mt-4 max-w-[62ch] text-body-lg leading-relaxed text-grey-dark"
              style={{ "--rise-delay": "320ms" } as React.CSSProperties}
            >
              Straightforward articles about continuous glucose monitors, insurance
              coverage, and the questions that come up while managing diabetes.
            </p>
          </Container>
        </section>

        <section className="pb-16 pt-10 md:pb-24 md:pt-14">
          <Container wide>
            {posts.length === 0 ? (
              <div
                data-reveal={0}
                className="reveal-settle mx-auto max-w-[52ch] rounded-[24px] bg-surface-raised p-10 text-center shadow-soft"
              >
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <PenLine size={26} strokeWidth={2} aria-hidden="true" />
                </span>
                <h2 className="mt-5 font-display text-h3 font-bold text-ink">
                  The first articles are on the way
                </h2>
                <p className="mt-3 text-body leading-relaxed text-grey-dark">
                  We are writing them now. In the meantime, our team is happy to answer
                  any question about continuous glucose monitors or coverage.
                </p>
                <Button href={PHONE_TEL} variant="cta" className="mt-7">
                  Call {PHONE_DISPLAY}
                </Button>
              </div>
            ) : (
              <>
                {/* The newest post gets the wide treatment. */}
                <Link
                  to={`/blog/${lead.slug}`}
                  data-reveal={0}
                  className="reveal-curtain reveal-glacial group grid gap-0 overflow-hidden rounded-[26px] bg-surface-raised shadow-soft transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-soft-hover lg:grid-cols-2"
                >
                  <div>
                    {lead.image && (
                      <div className="aspect-[16/10] overflow-hidden bg-grey-light lg:h-full">
                        <img
                          src={lead.image}
                          alt={lead.imageAlt}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex flex-col justify-center p-8 md:p-10">
                      <PostMeta post={lead} />
                      <h2 className="mt-3 font-display text-h2 font-bold leading-tight text-ink">
                        {lead.title}
                      </h2>
                      {lead.excerpt && (
                        <p className="mt-3 max-w-[52ch] text-body leading-relaxed text-grey-dark">
                          {lead.excerpt}
                        </p>
                      )}
                      <span className="mt-6 inline-flex items-center gap-1.5 text-small font-semibold text-brand">
                        Read the article
                        <ArrowRight
                          size={15}
                          strokeWidth={2.2}
                          className="transition-transform duration-(--duration-micro) group-hover:translate-x-0.5"
                        />
                      </span>
                    </div>
                  </div>
                </Link>

                {rest.length > 0 && (
                  <div className="mt-6 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
                    {rest.map((post, index) => (
                      <PostCard key={post.slug} post={post} delay={(index % 3) * 170} />
                    ))}
                  </div>
                )}
              </>
            )}
          </Container>
        </section>
      </div>
    </div>
  );
}

function PostMeta({ post }: { post: { publishedAt: string; body: unknown[] } }) {
  const date = formatPostDate(post.publishedAt);
  return (
    <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption font-semibold uppercase tracking-[0.12em] text-brand">
      {date && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={14} strokeWidth={2.2} aria-hidden="true" />
          {date}
        </span>
      )}
      <span className="inline-flex items-center gap-1.5 text-grey-muted">
        <Clock size={14} strokeWidth={2.2} aria-hidden="true" />
        {readingMinutes(post.body as never)} min read
      </span>
    </p>
  );
}

function PostCard({
  post,
  delay,
}: {
  post: ReturnType<typeof usePosts>[number];
  delay: number;
}) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      data-reveal={delay}
      className="reveal-tilt reveal-slow group flex flex-col overflow-hidden rounded-lg bg-surface-raised shadow-soft transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-soft-hover"
    >
      {post.image && (
        <div className="aspect-[3/2] overflow-hidden bg-grey-light">
          <img
            src={post.image}
            alt={post.imageAlt}
            loading="lazy"
            data-parallax="0.4"
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
        <PostMeta post={post} />
        <h3 className="mt-2.5 font-display text-[1.1rem] font-semibold leading-snug text-ink">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-2 text-small leading-relaxed text-grey-dark">{post.excerpt}</p>
        )}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-small font-semibold text-brand">
          Read the article
          <ArrowRight size={15} strokeWidth={2.2} />
        </span>
      </div>
    </Link>
  );
}
