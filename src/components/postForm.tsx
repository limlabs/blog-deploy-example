"use client";

import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import z from "zod"
import { Button } from "./ui/button";

export const formSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
})

export const PostForm = ({
  onSubmit,
  initialTitle = "",
  initialContent = "",
}: {
  onSubmit: (data: z.infer<typeof formSchema>) => void
  initialTitle?: string
  initialContent?: string
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      title: initialTitle,
      content: initialContent,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="content" render={({ field }) => (
          <FormItem>
            <FormLabel>Content</FormLabel>
            <FormControl>
              <Textarea {...field} rows={10} />
            </FormControl>
          </FormItem>
        )} />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  )
}