---
description: Follow these steps to create a new documentation site.
sidebar_label: Set up your site
sidebar_position: 1
---

# Set up your doc site

Most Consensys documentation sites are built using [Docusaurus](https://docusaurus.io/), a static
site generator optimized for technical documentation.
See the [Docusaurus documentation](https://docusaurus.io/docs) for general information about
creating and maintaining a Docusaurus site.

This page walks you through setting up a Docusaurus site for Consensys documentation.
You'll use this template repository to set up your doc repository.

## Prerequisites

Ensure you have permission in the [Consensys GitHub organization](https://github.com/Consensys) to
create a new repository.
If you don't have permission, request it from Consensys Help Desk, which administers the GitHub organization.

## Steps

1. Go to [this repository on GitHub](https://github.com/consensys/docs-template).

2. Select the green **Use this template** button, and **Create a new repository**.

   ![Use this template screenshot](./img/useThisTemplate.png)

3. Fill out the details for your fork from the template.
   You can prefix the repo with `docs-` and then include your project name.
   For example, `docs-metamask` or `docs-infura`.

   ![Create new repository screenshot](./img/createNewRepository.png)

   Choose **Public**, **Internal**, or **Private** depending on your needs.
   For internal repositories, any member of the Consensys GitHub organization can see your
   repository  by default, whereas private repositories are completely hidden except to GitHub
   administrators of the organization.

4. After creating the repository, navigate to the **Settings** page which is on the far right side of
   the **Code** tab.

5. Ensure that the following settings are enabled/disabled on the **General** tab:

   - **General**
     - ❌ **Template repository**
   - **Features**
     - ❌ **Wikis**
     - ✅ **Issues**
     - ✅ **Allow forking**
     - ❌ **Sponsorships**
     - ❌ / ✅ **Discussions**
     - ❌ / ✅ **Projects**
   - **Pull Requests**
     - ❌ **Allow merge commits**
     - ✅ **Allow squash merging**
     - ❌ **Allow rebase merging commits**
     - ❌ / ✅ **Always suggest updating pull request branches**
     - ❌ **Allow auto-merge**
     - ✅ **Automatically delete head branches**

6. Go to the **Collaborators and teams** under **Access** on the left sidebar.
   Select **Add teams**, and add **protocol-pliny** to add the Consensys developer docs team.
   Add any other teams, such as your own, as needed.

7. Currently, it's not possible to easily use branch protection on `main` when using the
   `semantic-release` plugin.
   If you disable this, then you can enable branch protection.

You've set up your new doc site!
See how to [run and preview your site locally](../contribute/preview.md).
