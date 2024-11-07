import { Post } from "@prisma/client";
import { prisma } from "./db";
import { Converter } from "showdown";

const converter = new Converter();

const PostsList = ({ posts }: { posts: Post[] }) => {
  if (posts.length === 0) {
    return <p>No posts were found.</p>;
  }

  return (
    <ul>
      {posts.map((post) => (
          <li key={post.id}>
            <h2>{post.title}</h2>
            <div
              dangerouslySetInnerHTML={{
                __html: converter.makeHtml(post.content ?? ''),
              }}
            />
          </li>
        ))}
    </ul>
  )
}

export default async function Home() {
  const posts = await prisma.post.findMany();

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <h1>Posts</h1>
      <PostsList posts={posts} />
    </div>
  );
}
