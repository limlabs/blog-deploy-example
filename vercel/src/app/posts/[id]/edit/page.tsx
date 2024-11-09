import { notFound, redirect } from "next/navigation";

import { Prisma } from "@prisma/client";

import { PostForm } from "../../../../components/post-form";

import { prisma } from "../../../../lib/db";
import { uploadPostCoverImage } from "../../../../lib/post-cover-image";

export default async function EditPostPage({
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
    <div>
      <h1>Edit Post</h1>
      <PostForm
        initialContent={post.content ?? ""}
        initialTitle={post.title}
        initialCoverImageUrl={post.coverImageUrl ?? ""}
        initialDescription={post.description ?? ""}
        onSubmit={async (data) => {
          "use server";

          const { title, content, description, coverImage } = data;
          let updates: Prisma.PostUpdateInput = {
            title,
            content,
            description,
          };

          if (coverImage) {
            const coverImageUrl = await uploadPostCoverImage(
              post.id,
              coverImage,
            );

            updates = { ...updates, coverImageUrl };
          }

          await prisma.post.update({
            where: {
              id: post.id,
            },
            data: updates,
          });

          redirect(`/posts/${post.id}`);
        }}
      />
    </div>
  );
}
