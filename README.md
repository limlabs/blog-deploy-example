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

  subgraph DevEnvironment[Dev Environment]
    A[Developer Machine] --> B["Local Postgres (Docker)"]
    A --> C[Local filesystem]
  end

  DevEnvironment -- git push --> PreviewEnvironment
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

### 1. Create a new project

Clone this repository, and run `pnpm install`

### 1. Setting up a local environment

First setup your local environment. Copy the `.env.example` file to `.env.development.local` and fill in the values for your local environment. To use the Docker Postgres instance, you can use the following:

```
DATABASE_URL='postgres://postgres:postgres@localhost:5432/blog'
```

Second we'll get a local Postgres database instance running. To make this simpler, we have included a `docker-compose.yml` that starts a new local copy of Postgres on port 5432.

This can be started in the background via this command:

```
docker compose up -d
```

Once the database is running, you can test out the connection is working with the following:

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d blog -c '\l'
```

### 2. Create dev database with Prisma postgres

Go sign up here

Run this command to initialize your local database with the prisma schema for this app:

```
pnpm dlx prisma migrate dev
```

### 3. Start the app

Make sure the app works locally before going further.

```
pnpm dev
```

Then go to http://localhost:3000 and try creating, updating, and viewing posts.

Ideas

- Migrations - separate topic, but comes up a lot: when / how should you run migrations? When app starts up? As a separate script? Does it go in GH Actions or do you run it from your laptop? etc.
