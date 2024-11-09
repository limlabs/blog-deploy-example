## Deployment Architecture Example

In this example, we will write an app in NextJS to illustrate a multi-environment development workflow. Our design includes a database (Postgres) and file uploads to help make things more realistic.

## App Design

Our app will be a simple blog with the following features:

- Form for storing a blog post with the following fields:
  - **Title** - String containing post title
  - **Description** - Used for content preview, such as from home page cards, or search results
  - **Cover Image** - Accepts a local image file to be uploaded
  - **Content** - Textarea that takes markdown and renders it
  - **Created Date** - Date/time the blog post was created
  - **Updated Date** - Date/time the blog post was last updated
- In our app, the blog author will be using the live app to manage posts. They will not be checked into source control (e.g. not a static site)
- We will not cover authentication in this example

## Architecture

```mermaid
flowchart TD

  subgraph ProdEnvironment[Prod Environment]
    D[Vercel App] --> E[Production Postgres]
    D --> F[Production Blob Storage]
  end

  subgraph PreviewEnvironment[Preview Environment]
    G[Preview App] --> H[Preview Postgres]
    G --> I[Preview Blob Storage]
  end

  subgraph LocalEnvironment[Local Environment]
    A[Developer Machine] --> B["Local Postgres (Docker)"]
    A --> C[Local filesystem]
  end

  LocalEnvironment -- git push --> PreviewEnvironment
  PreviewEnvironment -- merge to main --> ProdEnvironment
```

### Environments

In this model, we will have three environment types:

1. **Local** - what developers use when running on their local laptop.
2. **Preview** - what reviewers see when viewing code that has been pushed to a branch other than our production branch.
3. **Production** - what end users will see. In our example, this gets updated automatically whenever a merge to `main` happens.

### Infrastructure Components

#### Database

For storing the blog posts, we will use Postgres. Postgres has a number of advantages compared to other data stores:

- High-performance query engine
- Scales to large data sets
- JSON, vector, and other storage types
- Several managed services make maintenance simple

Locally, we will use Docker to run a copy of Postgres that "just works" with the config in this example.

In Preview and Production environments, we will use Vercel Postgres, which offers an extremely simple way to manage the Postgres database. They handle scaling and security updates, making it easier to focus on building and maintaining your app.

#### Media Storage

For storing the cover images that accompany each post, a different data store is more appropriate. Typically media and other binary assets are stored in a "blob" storage solution, such as Amazon S3. These blob stores are managed by cloud providers, and offer high read scalability and can store large amounts of data affordably.

In our case, we will be using Vercel Blob storage. We chose this to keep the number of cloud vendors and integrations low. This pattern however can work just as well with another cloud storage provider like AWS, GCP or Azure.

To simplify the local development experience, we will include an alternate implementation for storage that depends on the local filesystem. This makes it simple to run `pnpm dev` without any extra setup or authentication.

## What you'll need

- Docker
- NodeJS 20 or later

## Steps

### 1. Set up Local Environment

1. Clone this repository, and run `pnpm install`.
2. Copy the `.env.example` file to `.env.development.local` and fill in the values for your local environment. To use the Docker Postgres instance, you can use the following:

    ```
    POSTGRES_PRISMA_URL='postgres://postgres:postgres@localhost:5432/blog'
    ```

3. Now we'll get a local Postgres database instance running. To make this simpler, we have included a `docker-compose.yml` that starts a new local copy of Postgres on port 5432. This can be started in the background via this command:

    ```
    docker compose up -d
    ```

    Once the database is running, you can test out the connection is working with the following:

    ```bash
    PGPASSWORD=postgres psql -h localhost -U postgres -d blog -c '\l'
    ```

4. Run this command to initialize your local database with the prisma schema for this app:

    ```
    pnpm dlx prisma migrate dev
    ```

5. Start the app

    Make sure the app works locally before going further. Run the following:

    ```
    pnpm dev
    ```

    Then go to http://localhost:3000 and try creating, updating, and viewing posts.

### 2. Set up Database

Next, starting with Postgres, we will set up the Vercel resources to run this app in the cloud. Unfortunately Vercel's DB and Storage can't be programmatically created right now, so we will instead go into the UI to create these.

1. Go to https://vercel.com and sign up for an account if you haven't already.
2. Go to the [Storage page](https://vercel.com/liminal/~/stores) and click Create Database. Choose "Postgres, Powered by Neon"

    **Note**: You can choose most Postgres-compatible storage providers here as an alternative, such as Supabase.

3. Click through the menus to continue until you get to the "Create Postgres Database" screen.

    - For Database Name, enter `blog-preview`
    - For Region, choose the region closest to where you're located. It doesn't really matter that much for this app, but is something to consider based on where your users are usually located.

4. Copy the credentials in the ".env.local" tab, and save them to a file in your project named `.env.preview`. You can delete all of the lines except the one with POSTGRES_PRISMA_URL.

5. Run the initial migrations against your new database:

    ```
    pnpm dotenvx run --env-file=.env.preview -- npx prisma migrate deploy
    ```

    You should see output similar to the following:

    ```
      Prisma schema loaded from prisma/schema.prisma
    Datasource "db": PostgreSQL database "verceldb", schema "public" at "clever-autonamed-thing-af39d.us-west-2.aws.neon.tech:5432"

    3 migrations found in prisma/migrations

    Applying migration `20241107213027_init`
    Applying migration `20241108020540_more_fields`
    Applying migration `20241108033315_rename_thumbnail2_cover_image`

    The following migration(s) have been applied:

    migrations/
      └─ 20241107213027_init/
        └─ migration.sql
      └─ 20241108020540_more_fields/
        └─ migration.sql
      └─ 20241108033315_rename_thumbnail2_cover_image/
        └─ migration.sql
          
    ```

6. Try running your local app against the new database:

    ```
    pnpm dotenvx run --env-file=.env.preview -- pnpm dev
    ```

   It should behave the same as before; i.e. creating, editing, listing, and viewing posts still works.
7. Now we will create the production Database the same way. Go to the [Storage page](https://vercel.com/liminal/~/stores) and click Create Database. Choose "Postgres, Powered by Neon"
8. Click through the menus to continue until you get to the "Create Postgres Database" screen.

    - For Database Name, enter `blog-production`

9. Copy the credentials in the ".env.local" tab, and save them to a file in your project named `.env.production`. You can delete all of the lines except the one with POSTGRES_PRISMA_URL.
10. Run the initial migrations against your new database:

    ```
    pnpm dotenvx run --env-file=.env.production -- npx prisma migrate deploy
    ```

11. Try running your local app against the new database:

    ```
    pnpm dotenvx run --env-file=.env.production -- pnpm dev
    ```

   It should behave the same as before; i.e. creating, editing, listing, and viewing posts still works.


### 3. Set up Media Storage

Now that the Database is set up, we need to have a way to host the files that are uploaded. Vercel's deployments do not include persistent storage, so anything files try to save to disk (like with `fs.writeFile`) might not be there when requested (for a lot of reasons).

Instead, we will use Vercel's Blob Storage to handle this duty.

1. Go to the [Storage page](https://vercel.com/liminal/~/stores) and select "Create Database"
2. Select "Blob - Fast object storage"
3. Choose the name `blog-media-preview` and create
4. In the `.env.local` tab, copy the snippet and save it as a new line in your local `.env.preview`
5. Validate that the app can connect to the storage by running local dev with the `.env.preview` variables:

    ```
    pnpm dotenvx run --env-file=.env.preview -- pnpm dev
    ```
  
  You should still be able to upload and preview images. If you inspect the HTML, however, you will notice that your images are coming from `<randomId>.public.vercel-storage.com` instead of `/media` on the server itself.
6. Now let's do the same thing for the production Blob store to knock it out. Go to the [Storage page](https://vercel.com/liminal/~/stores) and select "Create Database"
7. Select "Blob - Fast object storage"
8. Choose the name `blog-media-production` and create
9. In the `.env.local` tab, copy the snippet and save it as a new line in your local `.env.production`
10. Validate that the app can connect to the storage by running local dev with the `.env.production` variables:

    ```
    pnpm dotenvx run --env-file=.env.production -- pnpm dev
    ```

If you've gotten this far, congrats! All of our storage resources are now set up, with a dedicated instance for both previews and production.

### 4. Configure Hosting and Deployments

1. Make sure the repo you cloned in the first section is pushed
1. Go to the Vercel Dashboard
2. Click "Add"
3. Import the 