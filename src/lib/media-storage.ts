import fs from "node:fs/promises";
import path from "node:path";
import { put } from '@vercel/blob'

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
  }
};

const blobStorageProvider: MediaStorageProvider = {
  upload: async function (destinationPath: string, data: Buffer) {
    return put(destinationPath, data, { access: 'public'});
  },
}

const defaultStorageProvider = process.env.BLOB_READ_WRITE_TOKEN ? blobStorageProvider : localStorageProvider;
export const media = defaultStorageProvider;
