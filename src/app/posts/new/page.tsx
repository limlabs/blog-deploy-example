import { prisma } from "@/app/db";
import { PostForm } from "@/components/postForm";
import { redirect } from "next/navigation";

export default function NewPostPage() {
  return (
    <div>
      <h1>New Post</h1>
      <PostForm onSubmit={async (data) => {
        "use server";
        
        const post = await prisma.post.create({
          data,
        });

        redirect(`/posts/${post.id}`);
      }} />
    </div>
  )
}