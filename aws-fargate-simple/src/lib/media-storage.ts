import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

export interface MediaStorageProvider {
  upload: (destinationPath: string, data: Buffer) => Promise<{ url: string }>;
}

const localStoragePath = "public/media";

const localStorageProvider: MediaStorageProvider = {
  upload: async (destinationPath, data) => {
    const outputPath = path.join(localStoragePath, destinationPath);
    const dirname = path.dirname(outputPath);

    await fs.mkdir(dirname, { recursive: true });
    await fs.writeFile(outputPath, data);
    return { url: `/media/${destinationPath}` };
  },
};

const blobStorageProvider: MediaStorageProvider = {
  upload: async function (destinationPath: string, data: Buffer) {
    const s3 = new S3Client({});
    const key = `media/${destinationPath}`;

    // Upload the image data to the S3 bucket
    await s3.send(new PutObjectCommand({
      Bucket: process.env.MEDIA_BUCKET_NAME,
      Key: key,
      Body: data,
    }));

    return {
      url: `${process.env.CDN_URL}/${key}`,
    };
  },
};

const defaultStorageProvider = process.env.MEDIA_BUCKET_NAME
  ? blobStorageProvider
  : localStorageProvider;
export const media = defaultStorageProvider;
