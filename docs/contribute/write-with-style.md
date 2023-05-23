---
description: Follow these style guidelines for writing good documentation.
sidebar_position: 2
---

# Write with style

Style guidelines help keep the ConsenSys documentation consistent, concise, and readable.
Refer to the following guides when writing, editing, or reviewing doc content:

- [**Microsoft Writing Style Guide**](https://learn.microsoft.com/en-us/style-guide/welcome/) -
  Refer to this guide for style, voice, grammar, and text formatting guidelines.
- [**Divio documentation system**](https://documentation.divio.com/) - Refer to this guide for
  information about function-based docs.
- [**ConsenSys Editorial Style Guide**](https://docs.google.com/document/d/1smRdw4TUIpz9re_o0_0DKdH_nK6cSPMJOK6BcbhjJ7Y/edit?usp=sharing) -
  Refer to this guide for spelling and usage of blockchain-related terms.

The following section also highlights the top five style tips from these guides.

## Top five style tips

### 1. Organize content by function

Write and organize docs [based on function](https://documentation.divio.com/):

- [How-to guides](https://documentation.divio.com/how-to-guides/) provide instructions to
  achieve a specific outcome.
  How-to guides assume users already have some basic knowledge or understanding of the product.
- [Conceptual content](https://documentation.divio.com/explanation/) provides background
  information about a feature.
  Conceptual content can explain what the feature is, how it works at a high level, why it's needed,
  and when and where it's used.
- [Tutorials](https://documentation.divio.com/tutorials/) provide a set of end-to-end steps to
  complete a project.
  Tutorials are complete and reproducible.
  They don't assume users have prior knowledge of the subject or required tools.
- [Reference content](https://documentation.divio.com/reference/) provides technical
  descriptions of APIs, command line options, and other elements of code.
  Reference content is straightforward and doesn't include long explanations or guides.

### 2. Use a conversational tone

Be [simple and conversational](https://learn.microsoft.com/en-us/style-guide/brand-voice-above-all-simple-human)
in your writing:

- In general, use [active voice](https://docs.microsoft.com/en-us/style-guide/grammar/verbs#active-and-passive-voice),
  [present tense](https://learn.microsoft.com/en-us/style-guide/grammar/verbs#verb-tense), and
  [second person](https://learn.microsoft.com/en-us/style-guide/grammar/person) to focus on the reader.
- Use common contractions, such as "it’s" and "you’re," as if you're speaking to the reader.
- Be informal, but not *too* informal.
  Don't use emojis, slang, figures of speech, or run-on sentences.

:::info example

❌ *If an error is received we will update `error` to a value of `true`.*

✅ *If you receive an error, update `error` to `true`.*

:::

### 3. Write for developers

Write for a [developer audience](https://learn.microsoft.com/en-us/style-guide/developer-content/):

- Be precise and technically correct.
- Don't use marketing or creative language.
- Suggest good practices.
  For example, instruct readers to secure private keys and protect RPC endpoints in production environments.
- Write [code samples](https://learn.microsoft.com/en-us/style-guide/developer-content/code-examples)
  so that readers can copy and paste them and have them work as expected.

:::info example

❌
```
// Use this command to install and run Besu.
user@mycomputer Develop % asdfdkjlksjdaf
asldkjfakljsdfa
asdfasafsdfasdfas
asdfasdfasdfasfda
```

✅ *Use this command to install and run Besu:*
```
asdfasldkjasf \
asdfasdfas \
asdfasdfasdf
```

:::

### 4. Create scannable content

Create [scannable content](https://learn.microsoft.com/en-us/style-guide/scannable-content/):

- [Get to your point fast](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice#get-to-the-point-fast)
  and make your point clear.
- [Use short, simple sentences.](https://learn.microsoft.com/en-us/style-guide/word-choice/use-simple-words-concise-sentences)
  Remove unnecessary, redundant, or non-specific words and content.
- Break up three or more paragraphs of text with subheadings, admonitions, lists, tables, or images.
- Use consistent patterns.
  Be consistent across list items, page titles, page content structure, etc.

:::info example

❌
run on paragraph with inconsistent tenses.

✅
bulleted list with short consistent items.
:::

### 5. Format text properly

Format text properly and consistently:

- Use sentence case for headings.
- Use code formatting (surround text with backticks) for references to URLs and file names.
- Make user interface elements bold.
  :::tip example
  Select **Continue**.
  :::
- Use descriptive link text.

also see md file names

#### Specific guidelines

ConsenSys documentation follows the [Microsoft Writing Style Guide](https://docs.microsoft.com/en-us/style-guide/welcome/), which is a straightforward reference for natural and clear writing style. The following are some important style recommendations:

- **Abbreviations** - Avoid [abbreviations and acronyms](https://docs.microsoft.com/en-us/style-guide/acronyms) unless they're well-known or often repeated in the documentation. Use "for example" instead of "e.g," and "that is" instead of "i.e."
- **Active voice** - Use [active voice](https://docs.microsoft.com/en-us/style-guide/grammar/verbs#active-and-passive-voice) where possible. Use "you" to create a personal tone.
- **Code samples** - Provide code samples that can be copied and pasted in a console or editor with minimal editing, and work as expected.
  - When writing code samples in a programming language, refer to the programming language's style guide.
  - Always provide code samples as text in a code block; never use screenshots that would force the user to type it manually.
  - When breaking up lines in a command sample, add line breaks (`\`) to ensure it can work when pasted.
  - Don't include the console prompt (`>`,`$`,`#`,`%`, or the full `user@mycomputer Develop %`) or other characters that would prevent the command to run when pasted.
  - If values must be replaced in a sample, use placeholders such as `<your IP address>`.
- **Contractions** - Use common contractions, such as "it’s" and "you’re," to create a friendly, informal tone.
- **Sentence case for headings** - Use sentence case instead of title case for headings.
- **"We recommend"** - In general, don't use first person. However, use "we recommend" to introduce a product recommendation. Don't use "ConsenSys recommends" or "it is recommended."
- **GitHub permalinks** - When linking to a GitHub file, use the <!-- markdown-link-check-disable-next-line --> [permanent link (permalink)](https://docs.github.com/en/repositories/working-with-files/using-files/getting-permanent-links-to-files) to the file. You can copy the permalink by selecting the ellipses (`...`) in the upper right corner of the file page, and selecting **Copy permalink**.

Refer to the [Microsoft Guide](https://docs.microsoft.com/en-us/style-guide/welcome/) for any other questions on style.
