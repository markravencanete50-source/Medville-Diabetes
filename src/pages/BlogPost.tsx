import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Container from "../components/Container";
import Button from "../components/Button";
import PostBody from "../components/PostBody";
import ArticleHeader, { BODY_COLUMN } from "../components/ArticleHeader";
import { Grain } from "../components/Decor";
import {
  DEFAULT_TEMPLATE,
  hasAnimations,
  postPlainText,
  readingMinutes,
} from "../data/blog";
import { usePost, usePosts } from "../lib/useSiteData";
import { usePageMeta } from "../lib/usePageMeta";
import { metaFor } from "../data/pageMeta";
import { reveal, useParallax, useReveal } from "../lib/useReveal";
import NotFound from "./NotFound";

/*
  One article.

  The header and the body are rendered by ArticleHeader and PostBody, the
  same components the dashboard preview uses, so what the author approved is
  exactly what a reader gets, layout included.

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

  /* Set here rather than in the 404 this renders for an unknown slug: a
     child's effect runs first, so that component's tags would be overwritten
     by these. A draft and a deleted post take the same branch. */
  usePageMeta(
    post
      ? {
          title: `${post.title} | Medville Diabetes`,
          description: post.excerpt || postPlainText(post.body).slice(0, 155),
          image: post.image || undefined,
          type: "article",
        }
      : { ...metaFor("/404"), noindex: true },
  );

  if (!post) return <NotFound />;

  const template = post.template ?? DEFAULT_TEMPLATE;
  const more = posts.filter((other) => other.slug !== post.slug).slice(0, 3);

  /* An article whose blocks arrive one by one is not wrapped in a reveal of
     its own, or every block would be animated twice. One without any block
     motion keeps the single gentle settle the page has always had. */
  const perBlock = hasAnimations(post.body);

  return (
    <div ref={revealRef}>
      <div ref={parallaxRef}>
        <ArticleHeader
          title={post.title}
          excerpt={post.excerpt}
          author={post.author}
          publishedAt={post.publishedAt}
          minutes={readingMinutes(post.body)}
          image={post.image}
          imageAlt={post.imageAlt}
          template={template}
          backLink
          parallax
        />

        <section className="py-12 md:py-16">
          <Container className={BODY_COLUMN[template]}>
            <div
              {...(perBlock ? {} : reveal(80))}
              className={perBlock ? undefined : "reveal-settle reveal-slow"}
            >
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
