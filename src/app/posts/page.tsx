import { PostList } from "@/components/postList";
import { prisma } from "@/lib/db";

export default async function AllPostsPage() {
  const posts = await prisma.post.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <section>
      <h2 className="text-3xl font-bold mb-6">All Posts</h2>
      <PostList posts={posts} />
    </section>
  );
}
