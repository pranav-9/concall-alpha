import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";

import { CATEGORY_LABELS, getAllPostMeta, getPostBySlug } from "../posts";
import { mdxComponents } from "../mdx-components";

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
  return {
    title: `${post.title} – Story of a Stock`,
    description: post.summary,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <main>
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
          <time
            dateTime={post.date}
            className="mt-2 block text-xs text-muted-foreground"
          >
            {post.dateLabel}
          </time>
        </header>

        <div className="space-y-4">
          <MDXRemote source={post.content} components={mdxComponents} />
        </div>
      </article>
    </main>
  );
}
