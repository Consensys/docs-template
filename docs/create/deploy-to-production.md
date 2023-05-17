---
description: Deploy your new documentation site to production using Vercel.
sidebar_label: Deploy to production
sidebar_position: 4
---

# Deploy your doc site to production

The recommended method to deploying your docs site is by using
[**Vercel**](https://vercel.com/).

The main benefits of using Vercel over GitHub Pages is the ease of integration
with GitHub repos and also deploying automatic previews on Pull Requests.
The only caveat is that private GitHub repos require all pushes to a PR to also
be members of the Vercel account which increases the cost of the subscription.
In such a case, there is a workaround that allows Vercel to still host the docs
and provide previews but requires a little more setup.

## Scenario A: Public GitHub repo

Once you are ready to deploy to Vercel, ensure that you have done the following:

1. Copy the `vercel.json` file in the root of this template repo to the root of
    your documentation repo

    1. This file contains some URL redirects from older MkDocs docs that we had
        at the company before we moved to Docusaurus.
        If your documentation did not pre-exist in MkDocs, then you can remove
        these fields.

    :::caution
    Please ensure the `cleanUrls` is set to true and specified in the `vercel.json`.
    This is necessary to make sure that Vercel deploys the app properly without
    expecting trailing slashes.
    :::

2. Determine the public URL that you want to use to expose the docs site.
    It is common practice for the URL to follow the format of
    `https://docs.<YOUR_PRODUCT>.consensys.net`; however, that may be different
    depending on your needs.

3. Join the [#documentation](https://consensys.slack.com/archives/C0272B5P1CY)
    Slack channel and ask for Vercel integration for your repo.
    Make sure to provide a link to your repo in your message.

Once integration has occurred, any new PRs should have a Vercel bot update with
a preview link on all new commits to that PR.

<details>
  <summary>
    See example Github comment
  </summary>
  <div>
    <img src={require("./img/vercelGithubComment.png").default} alt="vercelGithub" />
  </div>
</details>

## Scenario B: Private GitHub repo

1. Join the [#documentation](https://consensys.slack.com/archives/C0272B5P1CY)
    Slack channel and ask for Vercel integration for your **_private_** repo.
    Make sure to provide a link to your repo in your message.

2. Your `build.yml` file under `.github/workflows` will be modified to look like
    below (you **do not** need to take this action yourself).
    Essentially, we will bypass the Vercel limitation by having GitHub Actions
    build and push the static build directly to Vercel.
    The Action will also take care of commenting the preview URLs in the PR on
    new commits.

<details>
  <summary>
    Updated <code>build.yml</code>
  </summary>
  <div>

```yaml title=".github/workflows/build.yml"
---
name: Build and Preview

on:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main

jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    # the environment to deploy to / use secrets from
    environment: vercel
    # modify the default permissions of the GITHUB_TOKEN, so as to only allow least privileges
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v3
      - name: Build
        uses: ConsenSys/docs-gha/build@main
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - run: cp vercel.json ./build
      - uses: amondnet/vercel-action@v25.1.1
        id: vercel-action-staging
        if: github.event_name == 'pull_request'
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./build
          scope: infura-web
      - uses: amondnet/vercel-action@v25.1.1
        id: vercel-action-production
        if: github.event_name == 'push'
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./build
          vercel-args: "--prod "
          scope: infura-web
          github-comment: false
```

  </div>
</details>

<details>
  <summary>
    Example Action comment in PR
  </summary>
  <div>
    <img src={require("./img/privateRepoVercel.png").default} alt="privateRepoVercel" />
  </div>
</details>

<hr />

<details>
  <summary>
    Setting up private repos with Vercel (for documentation team only)
  </summary>

1. Install the [Vercel CLI](https://vercel.com/docs/cli#installing-vercel-cli)
2. Run `vercel login`. Make sure you login with an account that is part of the `Infura Web` team account
3. Run `vercel link` in the root directory of your Docusaurus project
   1. Make sure to link to the `Infura Web` account and not your personal one
   2. If you previously created the project in the account already you can link to the existing one, otherwise create a new one
4. After completing the prompts, you should see a `.vercel` folder that includes a JSON file with `Project ID` and `Org ID`
5. Login to the [Vercel Dashboard](https://vercel.com/account/tokens) and navigate to tokens
6. Create a new token with the scope selected to `Infura Web` and expiration set to `never`. Make sure to copy this somewhere securely (preferably 1Password) as this token will never be shown again. If you lose it, it will need to be deleted and regenerated. There is also a security concern, as these tokens have access to the entire `Infura Web` account
7. Navigate to your environments setting in GitHub: `https://github.com/ConsenSys/<DOC_REPO>/settings/environments`. Replace `<DOC_REPO>` with your repo name
8. Create a new environment titled `vercel`.
9. Add three new environment secrets to the `vercel` environment
   1. `ORG_ID`: `orgId` in the `project.json` in `.vercel` folder
   2. `PROJECT_ID`: `projectId` in the `project.json` in `.vercel` folder
   3. `VERCEL_TOKEN`: token generated from step 5-6 above
10. Copy the modified `build.yml` file above and put it into the `.github/workflows` folder
11. Navigate to your project settings on the Vercel Dashboard and change the `Build & Development Settings` under `General` for `Framework Preset` to `Other` and toggle the `Override` for `Build Command` and leave it **empty**. Make sure to **save**. See below for example.
12. Any new PR or push to `main` should automatically trigger the Action to build within GitHub and then have the artifacts pushed to Vercel directly.
13. Make sure to edit the actions if there is something different about the docs repo (e.g. the main branch is called `master` instead of `main`)

  <div>
    <img src={require("./img/privateRepoVercelSettings.png").default} alt="privateRepoVercelSettings" />
  </div>

</details>
