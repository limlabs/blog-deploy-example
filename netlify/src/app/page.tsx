import Link from "next/link";

import { Button } from "../components/ui/button";
import { PostList } from "../components/post-list";

import { prisma } from "../lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const recentPosts = await prisma.post.findMany({
    take: 3,
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-12">
      <section className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to My Blog</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Exploring the world of web development, one post at a time.
        </p>
      </section>

      <section>
        <h2 className="text-3xl font-bold mb-6">Recent Posts</h2>
        <PostList posts={recentPosts} />
        {recentPosts.length > 0 && (
          <Button asChild className="mt-6">
            <Link href="/posts">Read All Posts</Link>
          </Button>
        )}
      </section>
    </div>
  );
}
