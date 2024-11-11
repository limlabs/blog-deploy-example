"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";

export const formSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  content: z.string().min(1),
  coverImage: z.any(),
});

export const PostForm = ({
  onSubmit,
  initialTitle = "",
  initialDescription = "",
  initialContent = "",
  initialCoverImageUrl = "",
}: {
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  initialTitle?: string;
  initialDescription?: string;
  initialContent?: string;
  initialCoverImageUrl?: string;
  initialCoverImageFilename?: string;
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      title: initialTitle,
      content: initialContent,
      description: initialDescription,
    },
  });

  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    initialCoverImageUrl,
  );

  const [coverImage, setCoverImage] = useState<File | null>(null);

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit({
      ...data,
      coverImage,
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Cover Image</FormLabel>
          <FormControl>
            <Input
              type="file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  return;
                }

                setCoverImage(file);

                const reader = new FileReader();
                reader.onload = async () => {
                  const dataUrl = reader.result as string;
                  setCoverImageUrl(dataUrl);
                };

                reader.readAsDataURL(file);
              }}
            />
          </FormControl>
        </FormItem>
        {coverImageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImageUrl} alt="Thumbnail of blog post cover image" />
          </>
        )}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content (Markdown)</FormLabel>
              <FormControl>
                <Textarea {...field} rows={10} />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="text-right">
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Form>
  );
};
