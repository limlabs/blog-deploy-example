import { prisma } from "@/lib/db";
import { PostForm } from "@/components/postForm";
import { redirect } from "next/navigation";
import { uploadPostThumbnail } from "@/lib/postThumbnail";

export default function NewPostPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">New Post</h1>
      <PostForm onSubmit={async (data) => {
        "use server";

        const { title, content, thumbnail } = data;
        
        const post = await prisma.post.create({
          data: {
            title,
            content,
            thumbnailUrl: null,
          }
        });

        if (thumbnail) {
          console.log("Uploading file");
          const thumbnailUrl = await uploadPostThumbnail(post.id, thumbnail);

          await prisma.post.update({
            where: {
              id: post.id,
            },
            data: { thumbnailUrl },
          });
        }

        redirect(`/posts/${post.id}`);
      }} />
    </div>
  )
}