# NextJS fly.io Deployment Example

This example shows how to create a simple blog with Postgres and Object Storage for uploads using fly.io and Tigris.

## 1. Deploy the app

1. Clone this repo
1. Install the fly cli (`brew install flyctl` on macOS)
1. In a new terminal, run `flyctl login` if you have an account, `flyctl signup` if you need to create one
1. Make sure you are in the example directory `cd fly.io`
1. Run `fly launch` and pick the defaults
1. Once you deploy, you can visit the URL given by `flyctl`. 

Everything should _almost_ work. However, you'll notice that images aren't displaying though. Let's fix that!

## 2. Allow public access to uploads

1. Go to the https://fly.io dashboard and navigate to the `Tigris Object Storage` item
2. Click the link to the bucket connected to your app (your app name will be listed to the right of the bucket)
3. This will redirect you to Tigris. From there, select your bucket again.
4. Click on the Settings link in the top-right
5. In the dropdown for Public / Private access, change it to "Public"
6. Click "Save"

Now you should be able to see images you previously uploaded, as well as new ones, alongside your posts!

## 3. Create a CI/CD Pipeline

Now we will create a simple deployment pipeline that uses GitHub Actions to deploy to fly.io on each push to the `main` branch.

1. Run the following command to generate a fly API token for your app:

    ```
    fly tokens create deploy -x 999999h
    ```

1. Push your copy of this repo to GitHub as a new repo if you haven't already
1. In your GitHub repository settings page, click on "Secrets and Variables --> Actions"
1. Add the secret as `FLY_API_TOKEN` and save
1. Locally, add the following content to `.github/workflows/deploy.yml`:


      ```yml
      name: Fly Deploy
      on:
        push:
          branches:
            - main
      jobs:
        deploy:
          name: Deploy app
          runs-on: ubuntu-latest
          steps:
            - uses: actions/checkout@v4
            - uses: superfly/flyctl-actions/setup-flyctl@master
            - run: flyctl deploy --remote-only
              env:
                FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
      ```

1. Commit the new file and push to `main`

You're done. Your deployment should kick off automatically in GitHub actions.