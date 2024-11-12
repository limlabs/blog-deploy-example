Steps:

## Before Deploying

1. Make sure you have the output set up as `standalone` in your `next.config.js`:

    ```typescript
    import type { NextConfig } from "next";

    const nextConfig: NextConfig = {
      /* config options here */
      output: "standalone",
      experimental: {
        serverActions: {
          bodySizeLimit: "5mb",
        },
      },
    };

    export default nextConfig;
    ```

    If you're cloning the example, this should already be set up for you.

## 1. Deploy the app

1. Install the fly cli (`brew install flyctl` on macOS)
2. Run `flyctl login` if you have an account, `flyctl signup` if you need to create one
3. Run `fly launch` and pick the defaults
4. Once you deploy, you can visit the URL given by `flyctl`. 

Everything should _almost_ work. However, you'll notice that images aren't displaying though. Let's fix that!


## 2. Allow public access to uploads

1. Go to the https://fly.io dashboard and navigate to the `Tigris Object Storage` item
2. Click the link to the bucket connected to your app (your app name will be listed to the right of the bucket)
3. This will redirect you to Tigris. From there, select your bucket again.
4. Click on the Settings link in the top-right
5. In the dropdown for Public / Private access, change it to "Public"
6. Click "Save"

Now you should be able to see images you previously uploaded, as well as new ones, alongside your posts!


