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

    // Upload the image data to the S3 bucket
    await s3.send(new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: destinationPath,
      Body: data,
      ACL: "public-read",
    }));

    return {
      url: `https://${process.env.BUCKET_NAME}.fly.storage.tigris.dev/${destinationPath}`,
    };
  },
};

const defaultStorageProvider = process.env.BUCKET_NAME
  ? blobStorageProvider
  : localStorageProvider;
export const media = defaultStorageProvider;
