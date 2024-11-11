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

In Preview and Production environments, we will use RDS Postgres, which offers an affordable, scalable way to manage the Postgres database. They handle scaling and security updates, making it easier to focus on building and maintaining your app.

#### Media Storage

For storing the cover images that accompany each post, a different data store is more appropriate. Typically media and other binary assets are stored in a "blob" storage solution, such as Amazon S3. These blob stores are managed by cloud providers, and offer high read scalability and can store large amounts of data affordably.

In our case, we will be using AWS S3. We chose this to keep the number of cloud vendors and integrations low.

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

### 2. Set up Foundation Resources

Next, starting with Postgres, we will set up the AWS resources to run this app in the cloud. To manage these resources as code, we will use Pulumi.

In this project, we have already created some resources that we can use to quickly create the resources we need in a way that supports our proposed deployment architecture. These are located in the `pulumi/` folder.

1. Install [Pulumi for AWS](https://www.pulumi.com/docs/iac/get-started/aws/begin/)
2. Create a local pulumi state file by logging in

      ```
      pulumi login --local
      ```

3. Go to the directory where the Pulumi project is located and start pulumi:

      ```
      cd pulumi
      pulumi init --stack production
      ```

### 3. Initialize the Database

1. Run the following command to pull a connection string that will work locally:

      ```
      cd ../
      scripts/env_pull.sh
      ```

      This will go into your `.env.production` file. This file is `.gitignore`d so that you don't accidentally check in your production credentials

2. Apply database migrations by running the following:

      ```
      pnpm dotenvx run --env-file=.env.production -- npx prisma migrate deploy
      ```

      You should see output similar to the following:

      ```
         Environment variables loaded from .env
      Prisma schema loaded from prisma/schema.prisma
      Datasource "db": PostgreSQL database "blog", schema "public" at "<hostname>:5432"

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
            
      All migrations have been successfully applied.
      ```

3. Try running your local app against the new database:

   ```
   pnpm dotenvx run --env-file=.env.production -- pnpm dev
   ```

   It should behave the same as before; i.e. creating, editing, listing, and viewing posts still works.

### 4. Deploy the App

Now we are going to deploy the app to AWS as an ECS Fargate service. Fargate offers a way to run containers without an underlying Virtual Machine. This cuts down on the maintenance of a VM, as well as increases the scalability of the service.

1. First, run this command to turn off "init" mode for our Pulumi stack:

      ```bash
      cd pulumi
      pulumi config set init false 
      pulumi up
      ```

2. This should build and push a Docker image, and create a service in Fargate. Once everything is deployed, you can visit the `appURL` output from Pulumi to try it out!

3. To update your service, edit some files, and then `cd pulumi && pulumi up`. The Docker container will automatically be rebuilt and deployed over the existing version.