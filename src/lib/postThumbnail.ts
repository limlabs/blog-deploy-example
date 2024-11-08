import path from "path";
import { media } from "./mediaStorage";

export const uploadPostThumbnail = async (postId: number, file: File) => {
  const storagePath = `thumbnails/${postId}-${Date.now()}${path.extname(file.name)}`;
  const buffer = await file.arrayBuffer();
  
  await media.upload(storagePath, Buffer.from(buffer));
  
  return media.getMediaURL(storagePath);
}