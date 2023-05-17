---
description: Follow these steps to contribute to the documentation.
sidebar_position: 1
---

# Contribution workflow

The ConsenSys documentation contribution workflow involves proposing changes by creating
[branches](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-branches)
and
[pull requests (PRs)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests)
on this repository.
This facilitates open contributions, testing, and peer review.

To contribute changes:

1. Choose the repository you'd like to contribute to.
    See the list of ConsenSys documentation repositories.

2. In the repository, search for an existing issue to work on, or
   create a new issue describing the content issue you'd like to address.
   Make sure no one else is assigned to the issue, and assign yourself to it.
   If you don't have permission to assign yourself to it, leave a comment on the issue.

3. [Clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)
   the repository to your computer.

    ```bash
    git clone <REPOSITORY-URL>
    ```

4. [Create and checkout a topic branch](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging),
   naming it appropriately.
   We recommend including the issue number and a short description in the branch name (for example,
   `183-doc-cli-option`), which is a reminder to fix only one issue in a PR.

    ```bash
    git checkout -b <ISSUE-NUM>-<ISSUE-DESC>
    ```

   > **Tip:** You can use a Git client such as [Fork](https://fork.dev/) instead of the command line.

5. Open this repository in a text editor of your choice (for example,
   [VS Code](https://code.visualstudio.com/)) and make your changes.
   Refer to the [style guide](style-guide.md) and [Markdown guide](markdown-guide) when making
   documentation changes.

   > **Notes:**
   > - If you add a new documentation page, make sure to edit the sidebar file (typically `sidebars.js`) to [add the page to the sidebar](https://docusaurus.io/docs/sidebar/items).
   > - If you delete, rename, or move a documentation file, make sure to add a redirect to the
       [redirect plugin](https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-client-redirects)
       in `docusaurus.config.js`.

6. [Preview your changes locally](preview.md) to check that the changes render correctly.

7. Add and commit your changes, briefly describing your changes in the commit message.
   Push your changes to the remote origin.

    ```bash
    git add *
    git commit -m "<COMMIT-MESSAGE>"
    git push origin
    ```

8. On the original repository on GitHub, you’ll see a banner
   prompting you to create a PR with your recent changes.
   Create a PR, describing your changes in detail.
   [Link the issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue)
   that your PR fixes by adding `fixes #<ISSUE-NUM>` to the PR description.

9. Specific reviewers are automatically requested when you submit a PR.
   You can request additional reviewers in the right sidebar of your PR – for example, the original
   issue raiser.
   Make any required changes to your PR based on reviewer feedback, repeating steps 4–6.

10. After your PR is approved by two reviewers, all checks have passed, and your branch has no
    conflicts with the main branch, you can merge your PR.
    If you don't have merge access, a maintainer will merge your PR for you.
    You can delete the topic branch after your PR is merged.