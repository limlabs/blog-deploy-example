import { redirect } from "next/navigation";

import { prisma } from "../../../lib/db";

import { PostForm } from "../../../components/post-form";

import { uploadPostCoverImage } from "../../../lib/post-cover-image";

export default function NewPostPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">New Post</h1>
      <PostForm
        onSubmit={async (data) => {
          "use server";

          const { title, content, description, coverImage } = data;

          const post = await prisma.post.create({
            data: {
              title,
              content,
              description,
              coverImageUrl: null,
            },
          });

          if (coverImage) {
            console.log("Uploading file");
            const coverImageUrl = await uploadPostCoverImage(
              post.id,
              coverImage,
            );

            await prisma.post.update({
              where: {
                id: post.id,
              },
              data: { coverImageUrl },
            });
          }

          redirect(`/posts/${post.id}`);
        }}
      />
    </div>
  );
}
