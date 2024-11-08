import { media } from "./media-storage";

export const uploadPostCoverImage = async (postId: number, file: File) => {
  const storagePath = `postCoverImages/${postId}__${Date.now()}__${file.name}`;
  const buffer = await file.arrayBuffer();

  await media.upload(storagePath, Buffer.from(buffer));

  return media.getMediaURL(storagePath);
};
