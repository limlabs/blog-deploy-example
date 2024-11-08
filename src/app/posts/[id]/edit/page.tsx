

import { prisma } from "@/app/db"
import { PostForm } from "@/components/postForm";
import { notFound, redirect } from "next/navigation";

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
        onSubmit={async (data) => {
          "use server";
          
          await prisma.post.update({
            where: {
              id: post.id,
            },
            data,
          });

          redirect(`/posts/${post.id}`);
        }}
      />
    </div>
  )
}