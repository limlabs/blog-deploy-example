

import { prisma } from "@/lib/db"
import { PostForm } from "@/components/postForm";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { uploadPostThumbnail } from "@/lib/postThumbnail";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await prisma.post.findUnique({
    where: {
      id: parseInt(id),
    },
  })

  if (!post) {
    return notFound()
  } 
  
  return (
    <div>
      <h1>Edit Post</h1>
      <PostForm 
        initialContent={post.content ?? ''}
        initialTitle={post.title} 
        initialThumbnailUrl={post.thumbnailUrl ?? ''}
        onSubmit={async (data) => {
          "use server";

          const { title, content, thumbnail } = data;
          let updates: Prisma.PostUpdateInput = { title, content };
  
          if (thumbnail) {
            console.log("Uploading file");
            const thumbnailUrl = await uploadPostThumbnail(post.id, thumbnail);

            updates = { ...updates, thumbnailUrl };
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
  )
}