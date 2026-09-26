import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";

import { SectionDepthGate } from "@/app/company/components/section-depth-gate";
import { buildJournalGateNext, isSignupGateEnabled, JOURNAL_GATE_SECTION } from "@/lib/signup-gate";
import { getIsAuthenticated } from "@/lib/supabase/auth-state";
import { getSiteUrl } from "@/lib/site-url";

import { CATEGORY_LABELS, getAllPostMeta, getPostBySlug } from "../posts";
import { mdxComponents } from "../mdx-components";
import { gatePost, liftPoster, linksCompanyPage, nextReads, readMinutes } from "../related";
import { JournalReadTracker } from "@/components/journal-read-tracker";
import { TelegramJoinCard } from "@/components/telegram-join-card";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllPostMeta().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  // A cover overrides the site-wide share card for this post only.
  const images = post.image
    ? [{ url: post.image, alt: post.imageAlt ?? post.title }]
    : undefined;
  return {
    title: `${post.title} – Story of a Stock`,
    description: post.summary,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary,
      url: `/blog/${slug}`,
      siteName: "Story of a Stock",
      publishedTime: post.date,
      tags: post.tags,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
      ...(images ? { images } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();
  const minutes = readMinutes(post.content);
  // Sign-up gate, decided on the server like the company tabs (posts render per
  // request — the root layout reads the session). The marker goes in whenever
  // the post has a cut, so a new sign-up's return link has an anchor to land on;
  // only logged-out readers get the clip and the card. Any auth failure reads
  // as anonymous (auth-state.ts).
  const gate = isSignupGateEnabled() ? gatePost(post.content) : null;
  const gated = gate !== null && !(await getIsAuthenticated());
  const postBody = (
    <div className="space-y-5">
      <MDXRemote source={liftPoster(gate?.source ?? post.content)} components={mdxComponents} />
    </div>
  );
  // Derived, never hand-picked: the company's other stories and any comparison
  // that links its page; for a Notebook post, the newest in its category.
  // Each candidate's body is read at most once per page (the lookup is asked
  // per company code; a comparison links two).
  const bodies = new Map<string, string>();
  const next = nextReads(post, getAllPostMeta(), (p, code) => {
    let body = bodies.get(p.slug);
    if (body === undefined) {
      body = getPostBySlug(p.slug)?.content ?? "";
      bodies.set(p.slug, body);
    }
    return linksCompanyPage(body, code);
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    url: `${getSiteUrl()}/blog/${slug}`,
    author: { "@type": "Person", name: "Pranav Yadav" },
    publisher: { "@type": "Organization", name: "Story of a Stock" },
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <Link
          href="/blog"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Journal
        </Link>

        <header className="mb-8 mt-4 border-b border-border pb-6">
          {post.category ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {CATEGORY_LABELS[post.category]}
            </span>
          ) : null}
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {post.title}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">Pranav Yadav</span>
            {" · "}
            <time dateTime={post.date}>{post.dateLabel}</time>
            {" · "}
            <span>{minutes} min read</span>
          </p>
        </header>

        {gated ? (
          // No company code: Journal gate events stay out of per-company gate funnels.
          <SectionDepthGate
            companyCode={undefined}
            sectionId={JOURNAL_GATE_SECTION}
            postSlug={slug}
            scope="post"
            below={gate.below}
            nextPath={buildJournalGateNext(slug)}
          >
            {postBody}
          </SectionDepthGate>
        ) : (
          postBody
        )}
        {next.length > 0 ? (
          <nav aria-label="Next read" className="mt-12 border-t border-border pt-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Next read
            </p>
            <ul className="mt-3 space-y-3">
              {next.map((p) => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.slug}`} className="group block py-1">
                    <span className="block text-[15px] font-semibold leading-snug text-foreground group-hover:underline">
                      {p.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {p.company ? `${p.company} · ` : ""}
                      {p.dateLabel}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <div className="mt-10">
          <TelegramJoinCard surface="journal_post" />
        </div>
        <JournalReadTracker slug={slug} />
      </article>
    </main>
  );
}
