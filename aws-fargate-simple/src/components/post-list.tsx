import Link from "next/link";
import Image from "next/image";

import { Post } from "@prisma/client";

import { Button } from "./ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "./ui/card";

export const PostList = ({ posts }: { posts: Post[] }) => {
  if (!posts.length) {
    return (
      <>
        <p>No posts found.</p>
        <Button asChild className="mt-4">
          <Link href="/posts/new">Create a new post</Link>
        </Button>
      </>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardHeader>
            {post.coverImageUrl && (
              <div className="relative w-full h-44 mb-4">
                <Image
                  src={post.coverImageUrl}
                  alt={`Cover image for ${post.title}`}
                  fill
                  className="object-cover rounded-t-lg"
                />
              </div>
            )}
            <CardTitle>{post.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{post.description}</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link href={`/posts/${post.id}`}>Read More</Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              {post.updatedAt.toLocaleDateString()}
            </span>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
