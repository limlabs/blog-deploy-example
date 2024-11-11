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
    D["Docker image (ECR)"] -- task definition --> E
    E[AWS Fargate Service] -- app data --> F[Production Postgres]
    E -- media uploads --> G[AWS S3]
    E -- routing/traffic managment --> H[Application Load Balancer]
  end

  subgraph LocalEnvironment[Local Environment]
    A[Developer Machine] --> B["Local Postgres (Docker)"]
    A -- media uploads --> C[Local filesystem]
  end

  LocalEnvironment -- git push + workflow dispatch --> ProdEnvironment
```

### Environments

In this model, we will have three environment types:

1. **Local** - what developers use when running on their local laptop.
3. **Production** - what end users will see. In our example, this gets updated automatically whenever a merge to `main` happens.

### Infrastructure Components

#### Database

For storing the blog posts, we will use Postgres. Postgres has a number of advantages compared to other data stores:

- High-performance query engine
- Scales to large data sets
- JSON, vector, and other storage types
- Several managed services make maintenance simple

Locally, we will use Docker to run a copy of Postgres that "just works" with the config in this example.

In the Production environment, we will use RDS Postgres, which offers an affordable, scalable way to manage the Postgres database. They handle scaling and security updates, making it easier to focus on building and maintaining your app.

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
2. Create an S3 bucket to store the Pulumi state:

      ```
      aws s3 mb s3://blog-deploy-example-pulumi-<yourname>
      ```

      Make sure to replace `<yourname>` with some custom name. S3 bucket names are global!

3. Log into Pulumi with the newly created bucket

      ```
      pulumi login s3://blog-deploy-example-pulumi-<yourname>
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


### 5: Deployment Pipeline

With the resources already in place, it's fairly straightforward to add a CI/CD pipeline that deploys updates. In this guide we will use GitHub Actions, which is built into GitHub.

1. Move everything from `./aws-fargate-simple` to `./`
2. Delete the other folders (including the current `.github/worfklows` -- we will replace it in an upcoming step)
3. Push this repo to GitHub if you haven't already
4. In the GitHub repo interface, go the Settings --> Secrets and Variables --> Actions
5. Add the following variables:

   - `MEDIA_BUCKET_NAME` - can get this from `.env.production`
   - `PULUMI_STATE_BUCKET` - can get this from section 2 (e.g. `s3://blog-deploy-example-pulumi-<yourname>` )

6. Add the following secrets:

   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - The simplest way is to generate them for your own IAM user.
      - This is not the most secure way to authenticate with AWS. You may not need these if you are using OIDC auth for your GitHub Actions. Consult your administrator if you're not sure.
   - `POSTGRES_PRISMA_URL` - can get this from `.env.production`
   - `PULUMI_CONFIG_PASSPHRASE` - This is used to encrypt/decrypt the Pulumi state. Generated when running `pulumi login s3://blog-deploy-example-pulumi-<yourname>` for the first time
   
7. Add a new file under `.github/workflows/deploy.yml` with the following contents:

      ```yml
      name: Deploy Fargate (Simple)

      on:
      workflow_dispatch: {}

      jobs:
      deploy:
         runs-on: ubuntu-latest
         defaults:
            run:
            working-directory: aws-fargate-simple

         steps:
            - name: Checkout repository
            uses: actions/checkout@v2

            - uses: actions/setup-node@v3.5.0
            with:
               node-version-file: package.json

            - name: Configure AWS Credentials
            uses: aws-actions/configure-aws-credentials@v1
            with:
               aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
               aws-region: us-west-2
               aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

            - name: Install dependencies
            run: npm install -g pnpm
            - run: pnpm install

            - name: Run migrations
            run: |
               npx prisma migrate deploy
            env:
               POSTGRES_PRISMA_URL: ${{ secrets.POSTGRES_PRISMA_URL }}

            - name: Deploy to production
            uses: pulumi/actions@v6
            with:
               command: up
               stack-name: production
          cloud-url: ${{ vars.PULUMI_STATE_BUCKET }}
        env:
          PULUMI_CONFIG_PASSPHRASE: ${{ secrets.PULUMI_CONFIG_PASSPHRASE }}
      ```

8. Commit and push the file to the `main` brach
9. Go to the Actions tab and select the `Deploy Fargate (Simple)` action from the sidebar
10. Run the workflow using the dropdown on the right
11. Wait for your deploy to complete. It should take about 4-5 minutes maximum