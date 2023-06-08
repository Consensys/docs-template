# ConsenSys Docs Template

This is a documentation template repo built using [Docusaurus 2](https://docusaurus.io/). It can be used to create new documentation websites for ConsenSys projects. If that's something you want to do, you'll need:

- Permissions in the [ConsenSys GitHub](https://github.com/ConsenSys) to create a new repository _If you don't have this, or are unsure, write to the ConsenSys Help Desk, which administers the GitHub organization._
- A working installation of Node.js. It is highly recommended that you use a tool like [`nvm`](https://github.com/nvm-sh/nvm#installing-and-updating) to manage Node.js versions on your machine.
- Access to Github workflows on your computer: through the command line, or [GitHub Desktop](https://desktop.github.com/) (though you might experience issues at the 'commit' phase due to ConsenSys' commit configuration)
- A code editor, such as VSCode
- Enough understanding of the above, plus JavaScript and its frameworks--or time, a desire to learn, and an internet connection 😎 Specifically: - Have a brief look at the [Docusaurus documentation](https://docusaurus.io/docs) - A general understanding of JavaScript and [React.js](https://reactjs.org/)

**Do not simply fork this repo, unless you want to modify these sample docs themselves. Instead, follow the process below:**

## Creating new docs

1. Towards the top of this page, in the center-right, click on the green `"Use this template"` button and on the drop-down `"Create a new repository"`.

   <details>
     <summary>See example</summary>
     <div>
       <img
         src={require("./img/useThisTemplate.png").default}
         alt="useThisTemplate"
       />
     </div>
   </details>

2. Fill out the details for your fork from the template. Please prefix the repo with `docs-` and then include your `project name`. For example, `docs-metamask` or `docs-infura`.

   <details>
     <summary>See example</summary>
     <div>
       <img
         src={require("./img/createNewRepository.png").default}
         alt="createNewRepository"
       />
     </div>
   </details>

3. Choose `Public`, `Internal` or `Private` depending on your needs. The difference between Internal and Private is that by default any ConsenSys member can see your repository if set as Internal, whereas Private will be completely invisible except to GitHub administrators of the organization. _Consider carefully how public you want your docs to be._

4. After creating the repository, navigate to the `Settings` page which is on the far right side of the `<> Code` tab.

5. Ensure that the following settings are enabled/disabled from top to bottom for the General tab.

   **General**

   - ❌ Template repository

   **Features**

   - ❌ Wikis
   - ✅ Issues
   - ✅ Allow forking
   - ❌ Sponsorships
   - ❌ / ✅ Discussions
   - ❌ / ✅ Projects

   **Pull Requests**

   - ❌ Allow merge commits
   - ✅ Allow squash merging
   - ❌ Allow rebase merging commits
   - ❌ / ✅ Always suggest updating pull request branches
   - ❌ Allow auto-merge
   - ✅ Automatically delete head branches

6. Go to the `Collaborators and teams` under `Access` on the left sidebar. Add `protocol-pliny` from the green `Add teams` button. Add any other relevant teams, such as your own as needed.

7. At the moment, it is not possible to easily use branch protection on `main` when using the `semantic-release` plugin. If you disable this, then branch protection can be enabled.

## Running locally

You will need to have **Node.js** installed to run the live previews of the docs locally.

It is highly recommended that you use a tool like [`nvm`](https://github.com/nvm-sh/nvm#installing-and-updating) to manage Node.js versions on your machine.

### Installing recommended Node.js version with `nvm`

1. Follow the above instructions to install `nvm` on your machine, or go [here](https://github.com/nvm-sh/nvm#installing-and-updating).
2. Go to root folder of this project in your terminal.
3. Run `nvm install` followed by `nvm use`. This will install the version specified by this project in the `.nvmrc` file.

### Running this project

1. Navigate to root folder of the project after installing Node.js
2. Run the following in sequence, which only needs to be done once:

   ```bash
   npm install
   npm run prepare
   ```

3. To preview and for every time afterwards:
   ```bash
   npm run start
   ```

### Local Development

    $ npm install
    $ npm run prepare
    $ npm start

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

    $ npm run build

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Adding new words to the dictionary

This repository includes a _linter_, which you can think of as a spell-check that also checks code formatting and standards, and a lot more. It's possible that you will use a word in your content that is not known to the linter, and your build, or commit, will fail.

If this happens, take a look at `project-words.txt` in the root directory of your project; if the word that the linter caught is correctly spelled, and you wish it to pass the linter's test, add it to `project-words.txt`, save, add and commit those changes, and see if it passes.
