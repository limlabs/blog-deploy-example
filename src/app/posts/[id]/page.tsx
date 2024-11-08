import styles from "@/styles/markdown.module.css";

import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { Converter } from "showdown";
import { ArrowLeft, Edit } from "lucide-react";
const converter = new Converter();

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: {
      id: parseInt(id),
    },
  });

  if (!post) {
    return notFound();
  }

  return (
    <article className="max-w-3xl mx-auto">
      <div className="flex flex-row items-center justify-between mb-4">
        <Button variant="ghost" asChild>
          <Link href="/posts" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All posts
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/posts/${post.id}/edit`} className="flex items-center">
          <Edit />
            Edit Post
          </Link>
        </Button>
      </div>
      {post.thumbnailUrl && (
        <div className="relative w-full h-[400px] mb-8">
          <Image
            src={post.thumbnailUrl}
            alt={`Cover image for ${post.title}`}
            fill
            className="object-cover rounded-lg"
            priority
          />
        </div>
      )}
      <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
      <div className="flex items-center text-muted-foreground mb-8">
        {new Date(post.updatedAt).toLocaleDateString()}
      </div>
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <div
          className={styles.markdown}
          dangerouslySetInnerHTML={{
            __html: converter.makeHtml(post.content ?? ""),
          }}
        />
      </div>
    </article>
  );
}
