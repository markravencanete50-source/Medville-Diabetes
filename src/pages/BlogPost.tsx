import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, Clock } from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import PostBody from "../components/PostBody";
import { Blob, Grain } from "../components/Decor";
import { formatPostDate, postPlainText, readingMinutes } from "../data/blog";
import { usePost, usePosts } from "../lib/useSiteData";
import { usePageMeta } from "../lib/usePageMeta";
import { useParallax, useReveal } from "../lib/useReveal";
import NotFound from "./NotFound";

/*
  One article.

  The body is rendered by PostBody, the same component the dashboard preview
  uses, so what the author approved is exactly what a reader gets.

  A slug that does not match a published post renders the 404 page rather than
  an empty article. That covers a draft, a deleted post and a typed address
  with one branch.
*/
export default function BlogPost() {
  const { slug } = useParams();
  const post = usePost(slug);
  const posts = usePosts();

  const revealRef = useReveal<HTMLDivElement>();
  const parallaxRef = useParallax<HTMLDivElement>();

  usePageMeta(
    post ? `${post.title} | Medville Diabetes` : "Article not found | Medville Diabetes",
    post ? post.excerpt || postPlainText(post.body).slice(0, 155) : undefined,
  );

  if (!post) return <NotFound />;

  const more = posts.filter((other) => other.slug !== post.slug).slice(0, 3);

  return (
    <div ref={revealRef}>
      <div ref={parallaxRef}>
        <section className="bg-wash relative overflow-hidden">
          <Blob tone="brand" strength={0.15} blur={44} size={420} duration="22s" className="-left-[150px] -top-[160px]" />
          <Grain opacity={0.05} />
          <Container className="relative max-w-[760px] py-10 md:py-14">
            <Link
              to="/blog"
              className="rise-in inline-flex items-center gap-1.5 text-small font-semibold text-brand"
            >
              <ArrowLeft size={15} strokeWidth={2.2} />
              All articles
            </Link>

            <h1
              className="rise-in mt-5 font-display text-h1 font-bold leading-[1.12] text-ink"
              style={{ "--rise-delay": "140ms" } as React.CSSProperties}
            >
              {post.title}
            </h1>

            <p
              className="rise-in mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption font-semibold uppercase tracking-[0.12em] text-brand"
              style={{ "--rise-delay": "280ms" } as React.CSSProperties}
            >
              {formatPostDate(post.publishedAt) && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={14} strokeWidth={2.2} aria-hidden="true" />
                  {formatPostDate(post.publishedAt)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-grey-muted">
                <Clock size={14} strokeWidth={2.2} aria-hidden="true" />
                {readingMinutes(post.body)} min read
              </span>
              {post.author && (
                <span className="normal-case tracking-normal text-grey-muted">
                  By {post.author}
                </span>
              )}
            </p>
          </Container>
        </section>

        {post.image && (
          <Container className="max-w-[900px]">
            <div
              data-reveal={0}
              className="reveal-curtain reveal-glacial -mt-2 overflow-hidden rounded-[24px] shadow-soft"
            >
              <div>
                <img
                  src={post.image}
                  alt={post.imageAlt}
                  data-parallax="0.4"
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            </div>
          </Container>
        )}

        <section className="py-12 md:py-16">
          <Container className="max-w-[760px]">
            <div data-reveal={80} className="reveal-settle reveal-slow">
              <PostBody blocks={post.body} />
            </div>

            <div
              data-reveal={160}
              className="bg-cta-band reveal-blur reveal-glacial relative mt-14 overflow-hidden rounded-[24px] p-8 md:p-10"
            >
              <Grain opacity={0.07} />
              <div className="relative">
                <h2 className="m-0 max-w-[26ch] font-display text-h3 font-bold text-on-dark">
                  Wondering if your insurance may help cover a CGM?
                </h2>
                <p className="mt-2.5 max-w-[54ch] text-small leading-relaxed text-on-dark-brand">
                  It only takes a few minutes to get started. Our team can review your
                  potential eligibility and explain what comes next.
                </p>
                <Button to="/qualify" variant="on-band" className="mt-6">
                  Check My Eligibility
                  <ArrowRight size={16} strokeWidth={2.2} />
                </Button>
              </div>
            </div>
          </Container>
        </section>

        {more.length > 0 && (
          <section className="border-t border-line-brand bg-grey-light py-14">
            <Container wide>
              <h2 className="font-display text-h3 font-bold text-ink">More to read</h2>
              <div className="mt-6 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                {more.map((other, index) => (
                  <Link
                    key={other.slug}
                    to={`/blog/${other.slug}`}
                    data-reveal={index * 170}
                    className="reveal-tilt reveal-slow group flex flex-col overflow-hidden rounded-lg bg-surface-raised shadow-soft transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:shadow-soft-hover"
                  >
                    {other.image && (
                      <div className="aspect-[3/2] overflow-hidden bg-grey-light">
                        <img
                          src={other.image}
                          alt={other.imageAlt}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="px-6 pb-6 pt-5">
                      <h3 className="m-0 font-display text-[1.05rem] font-semibold leading-snug text-ink">
                        {other.title}
                      </h3>
                      {other.excerpt && (
                        <p className="mt-2 text-small leading-relaxed text-grey-dark">
                          {other.excerpt}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </Container>
          </section>
        )}
      </div>
    </div>
  );
}
