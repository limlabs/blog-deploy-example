"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import z from "zod";
import { Button } from "./ui/button";
import { useState } from "react";

export const formSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  thumbnail: z.any(),
});

export const PostForm = ({
  onSubmit,
  initialTitle = "",
  initialContent = "",
  initialThumbnailUrl = "",
}: {
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  initialTitle?: string;
  initialContent?: string;
  initialThumbnailUrl?: string;
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      title: initialTitle,
      content: initialContent,
    },
  });

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    initialThumbnailUrl
  );
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit({
      ...data,
      thumbnail,
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
        <FormItem>
          <FormLabel>Thumbnail</FormLabel>
          <FormControl>
            <Input
              type="file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  return;
                }

                setThumbnail(file);

                const reader = new FileReader();
                reader.onload = async () => {
                  const dataUrl = reader.result as string;
                  setThumbnailUrl(dataUrl);
                };

                reader.readAsDataURL(file);
              }}
            />
          </FormControl>
        </FormItem>
        {thumbnailUrl && <img src={thumbnailUrl} alt="Thumbnail" />}
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
