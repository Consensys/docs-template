---
sidebar_position: 7
---

# Production deployment

The recommended method to deploying your docs site is by using [**Vercel**](https://vercel.com/).

The main benefits of using Vercel over GitHub Pages is the ease of integration with GitHub repos and also deploying automatic previews on Pull Requests. The only caveat is that private GitHub repos require all pushes to a PR to also be members of the Vercel account which increases the cost of the subscription. In such a case, there is a workaround that allows Vercel to still host the docs and provide previews but requires a little more setup.

## Scenario A: Public GitHub repo

Once you are ready to deploy to Vercel, ensure that you have done the following:

1. Copy the `vercel.json` file in the root of this template repo to the root of your documentation repo

   1. This file contains some URL redirects from older MkDocs docs that we had at the company before we moved to Docusaurus. If your documentation did not pre-exist in MkDocs, then you can remove these fields.

   :::caution

   Please ensure the `cleanUrls` is set to true and specified in the `vercel.json`. This is necessary to make sure that Vercel deploys the app properly without expecting trailing slashes.

   :::

2. Determine the public URL that you want to use to expose the docs site. It is common practice for the URL to follow the format of `https://docs.<YOUR_PRODUCT>.consensys.net`; however, that may be different depending on your needs.
3. Join the [#documentation](https://consensys.slack.com/archives/C0272B5P1CY) Slack channel and ask for Vercel integration for your repo. Make sure to provide a link to your repo in your message.

Once integration has occurred, any new PRs should have a Vercel bot update with a preview link on all new commits to that PR.

<details>
  <summary>
    See example Github comment
  </summary>
  <div>
    <img src={require("./img/vercelGithubComment.png").default} alt="vercelGithub" />
  </div>
</details>

## Scenario B: Private GitHub repo

1. Join the [#documentation](https://consensys.slack.com/archives/C0272B5P1CY) Slack channel and ask for Vercel integration for your **_private_** repo. Make sure to provide a link to your repo in your message.
2. Your `build.yml` file under `.github/workflows` will be modified to look like below (you **do not** need to take this action yourself). Essentially, we will bypass the Vercel limitation by having GitHub Actions build and push the static build directly to Vercel. The Action will also take care of commenting the preview URLs in the PR on new commits.

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
      - uses: amondnet/vercel-action@v25.1.1 # // cspell:disable-line
        id: vercel-action-staging
        if: github.event_name == 'pull_request'
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./build
          scope: infura-web
      - uses: amondnet/vercel-action@v25.1.1 # // cspell:disable-line
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
