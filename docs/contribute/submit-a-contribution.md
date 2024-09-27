---
description: Submit a contribution by making a GitHub pull request.
sidebar_position: 1
---

# Submit a contribution

The Consensys documentation uses a [docs-as-code](https://www.writethedocs.org/guide/docs-as-code/)
approach, meaning documentation is created using the same tools as code.
The contribution workflow involves proposing changes to the docs by creating [forks and pull
requests (PRs)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/getting-started/about-collaborative-development-models#fork-and-pull-model)
on the documentation GitHub repositories.
This facilitates open contributions, testing, and review.

## Steps

To contribute changes:

1. Choose the repository you'd like to contribute to.
   See the [list of Consensys documentation repositories](../index.md#list-of-documentation-sites).

   :::note
   These steps only apply to the doc sites that use Docusaurus.
   :::

2. In the repository, search for an existing issue to work on, or [create a new
   issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/creating-an-issue)
   describing the documentation issue you'd like to address.
   Make sure no one else is assigned to the issue, and assign yourself to it.
   If you don't have permission to assign yourself to it, leave a comment on the issue or contact a
   maintainer of that repository.

3. [Fork the repository](https://docs.github.com/en/get-started/quickstart/fork-a-repo#forking-a-repository)
   to your personal account.

   :::note
   For repositories that don't allow forking, such as Infura, you can skip steps 3–6 and clone the
   original repository instead.
   :::

4. [Clone your forked repository](https://docs.github.com/en/get-started/quickstart/fork-a-repo#cloning-your-forked-repository)
   to your computer.

     ```bash
     git clone <FORKED-REPO-URL>
     ```

5. Change directories into the cloned forked repository.

    ```bash
    cd <FORKED-REPO-NAME>
    ```

6. [Add an upstream remote.](https://docs.github.com/en/get-started/quickstart/fork-a-repo#configuring-git-to-sync-your-fork-with-the-upstream-repository)

     ```bash
     git remote add upstream <ORIGINAL-REPO-URL>
     ```

7. [Create and checkout a topic branch](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging),
   naming it appropriately.
   We recommend including the issue number and a short description in the branch name (for example,
   `183-doc-cli-option`), which is a reminder to fix only one issue in a PR.

     ```bash
     git checkout -b <ISSUE-NUM>-<ISSUE-DESC>
     ```

   :::tip
   You can use a Git client such as [Fork](https://fork.dev/) instead of the command line.
   :::

8. Open the repository in a text editor of your choice (for example, [VS Code](https://code.visualstudio.com/))
   and make your documentation changes.
   Make sure to [follow the style guidelines](style-guide.md) and [format your Markdown correctly](./format-markdown.md).

   :::caution important
   If you delete, rename, or move a documentation file, make sure to add a
   [redirect](../create/configure-docusaurus.md#redirects).
   :::

9. [Preview your changes locally](preview.md) to check that the changes render correctly.

10. Add and commit your changes, briefly describing your changes in the commit message.
   Push your changes to the remote origin.

     ```bash
     git add *
     git commit -m "<COMMIT-MESSAGE>"
     git push origin
     ```

11. On the original repository on GitHub, you’ll see a banner prompting you to create a PR with your
    recent changes.
    Create a PR, describing your changes in detail.
    [Link the issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue)
    that your PR fixes by adding `fixes #<ISSUE-NUM>` to the PR description.

12. If your PR fails any checks, displayed at the bottom of the PR page, fix those errors.
    If you want to include a new word that causes a [spell check](../configure/spell-check.md) error,
    you can add that word to the [`project-words.txt`](../create/repo-structure.md#-project-wordstxt)
    file.

13. For most doc repositories, specific reviewers are automatically requested when you submit a PR.
    You can request additional reviewers in the right sidebar of your PR – for example, the original
    issue raiser.
    Make any required changes to your PR based on reviewer feedback, repeating steps 7–9.

14. After your PR is approved by two reviewers, all checks have passed, and your branch has no
    conflicts with the main branch, you can merge your PR.
    If you don't have merge access, a maintainer will merge your PR for you.
    You can delete the topic branch after your PR is merged.

Thank you for contributing to the docs!
