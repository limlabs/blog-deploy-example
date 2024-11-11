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

### 2. Set up Foundation Resources

Next, starting with Postgres, we will set up the AWS resources to run this app in the cloud. To manage these resources as code, we will use Pulumi.

In this project, we have already created some resources that we can use to quickly create the resources we need in a way that supports our proposed deployment architecture. These are located in the `pulumi/` folder and include:

- `foundation/` - Resources that are created once for each Pulumi stack (`preview` and `production`). These include the Postgres database (using RDS Aurora Serverless), database bastion, load balancer, ECR repo for storing Docker images, and the Fargate cluster where our services will be deployed.
- `app/` - The NextJS blog app. When in preview mode, this is associated with multiple Pulumi stacks; in production, only a single stack exists.

For this section, we will focus on the `foundation/` directory.

1. Install [Pulumi for AWS](https://www.pulumi.com/docs/iac/get-started/aws/begin/)
2. Create a local pulumi state file by logging in

      ```
      pulumi login --local
      ```

3. Go to the directory where the Pulumi project is located and start pulumi:

      ```
      cd foundation/pulumi
      pulumi up
      ```

      - Select "preview" for the stack for this step -- we will create the production environment later

4. Run the following command to pull a connection string that will work locally:

      ```
      # If you are using macOS or Linux, run this command
      scripts/pull_connection_string.sh preview

      # If you're on Windows, you can run the Powershell command as an alternate
      pwsh scripts/pull_connection_string.ps1 preview
      ```

5. It's time to deploy database migrations. To do this, we will use the bastion created as part of the foundation infrastructure. A bastion is a small EC2 instance (virtual machine) that has network connectivity to both our database and our local machine. In our case, we have created a small script to make it easier to create a database tunnel using the bastion. Run the following command to create a bastion connection:

      ```
      # If you are using macOS or Linux, run this command
      scripts/db_tunnel.sh preview

      # If you're on Windows, you can run the Powershell command as an alternate
      pwsh scripts/db_tunnel.ps1 preview
      ```

6. With the tunnel still running, open a new terminal window inside the NPM project root (`aws-fargate/` in this repo) and run the following:

      ```
      pnpm dotenvx run --env-file=.env.preview -- npx prisma migrate deploy
      ```

      You should see output similar to the following:

      ```
         Environment variables loaded from .env
      Prisma schema loaded from prisma/schema.prisma
      Datasource "db": PostgreSQL database "blog", schema "public" at "127.0.0.1:5432"

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

7. Try running your local app against the new database:

   ```
   pnpm dotenvx run --env-file=.env.preview -- pnpm dev
   ```

   It should behave the same as before; i.e. creating, editing, listing, and viewing posts still works.