import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { ArrowLeft, Edit } from "lucide-react";

import { Button } from "../../../components/ui/button";

import { prisma } from "../../../lib/db";

import styles from "@/styles/markdown.module.css";

export const dynamic = "force-dynamic";

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
      {post.coverImageUrl && (
        <div className="relative w-full h-[400px] mb-8">
          <Image
            src={post.coverImageUrl}
            alt={`Cover image for ${post.title}`}
            fill
            className="object-cover rounded-lg"
            priority
          />
        </div>
      )}
      <h1 className="text-4xl font-bold mb-2">{post.title}</h1>
      {post.description && (
        <p className="text-2xl text-muted-foreground mb-4">
          {post.description}
        </p>
      )}
      <div className="flex items-center text-muted-foreground mb-2">
        Published on {new Date(post.updatedAt).toLocaleDateString()}
      </div>
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <Markdown className={styles.markdown}>{post.content ?? ""}</Markdown>
      </div>
    </article>
  );
}
