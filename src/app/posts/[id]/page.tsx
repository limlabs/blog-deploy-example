import { prisma } from "@/app/db"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Converter } from "showdown";
const converter = new Converter();

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
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
      <Button asChild>
        <Link href={`/posts/${id}/edit`}>Edit Post</Link>
      </Button>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: converter.makeHtml(post.content ?? 'No content') }} />
    </div>
  )
}