---
description: Follow these style guidelines for writing good documentation.
sidebar_position: 2
---

# Style guide

Style guidelines help keep the Consensys documentation consistent, concise, and readable.
Refer to the following guides when writing, editing, or reviewing doc content:

- [**Microsoft Writing Style Guide**](https://learn.microsoft.com/en-us/style-guide/welcome/) - Refer to this guide for style, voice, grammar, and text formatting guidelines.
- [**Diátaxis framework**](https://diataxis.fr/) - Refer to this guide for information about
  function-based docs.
- [**Consensys Editorial Style Guide**](https://www.notion.so/consensys/Consensys-Editorial-Style-Guide-d5b9867e85df4ae38f8bed44f61a77d5) -
  Refer to this guide for spelling and usage of blockchain-related terms.
  [Vale](run-vale.md) assists writers to adhere to this style.
  This guide is only available to internal Consensys contributors.

The following section also highlights the top five style tips from these guides.

## Top five style tips

### 1. Organize content by function

Write and organize docs [based on function](https://diataxis.fr/):

- [How-to guides](https://diataxis.fr/how-to-guides/) provide instructions to
  achieve a specific outcome.
  How-to guides assume users already have some basic knowledge or understanding of the product.
- [Conceptual content](https://diataxis.fr/explanation/), or explanation, provides background
  information about a feature.
  Conceptual content can explain what the feature is, how it works at a high level, why it's needed,
  and when and where it's used.
- [Tutorials](https://diataxis.fr/tutorials/) provide a set of end-to-end steps to
  complete a project.
  Tutorials are complete and reproducible.
  They don't assume users have prior knowledge of the subject or required tools.
- [Reference content](https://diataxis.fr/reference/) provides technical
  descriptions of APIs, command line options, and other elements of code.
  Reference content is straightforward and doesn't include long explanations or guides.

### 2. Use a conversational tone

Be [simple and conversational](https://learn.microsoft.com/en-us/style-guide/brand-voice-above-all-simple-human)
in your writing:

- In general, use [active voice](https://docs.microsoft.com/en-us/style-guide/grammar/verbs#active-and-passive-voice),
  [present tense](https://learn.microsoft.com/en-us/style-guide/grammar/verbs#verb-tense), and
  [second person](https://learn.microsoft.com/en-us/style-guide/grammar/person) to focus on the reader.
- [Use common contractions](https://learn.microsoft.com/en-us/style-guide/word-choice/use-contractions),
  such as "it’s" and "you’re," as if you're speaking to the reader.
- Be informal, but not *too* informal.
  Don't use slang, figures of speech, or run-on sentences.

:::info example

❌ *If we're unable to find another library that works with the execution environment, another way
   of solving the problem is by patching the dependency ourselves.
   For this, `patch-package` can be leveraged.*

✅ *If you can't find another library that works with the execution environment, you can patch the
   dependency yourself using `patch-package`.*

:::

### 3. Write for developers

Write for a [developer audience](https://learn.microsoft.com/en-us/style-guide/developer-content/):

- You don't need to market the product to the reader.
  Understand what they're seeking to learn or do, and optimize your content to help them achieve
  that fast.
- List prerequisites and suggest good practices.
  For example, instruct readers to secure private keys and protect RPC endpoints in production environments.
- Write [code samples](format-markdown.md#code-sample-style-guide) that are readable, can be 
  copied and pasted, and work as expected.

:::info example

❌ *To start Teku, run the following command:*

```bash
// Set --ee-endpoint to the URL of your execution engine and
// --ee-jwt-secret-file to the path to your JWT secret file.
teku \
  --ee-endpoint=http://localhost:8550 \
  --ee-jwt-secret-file=my-jwt-secret.hex \
  --metrics-enabled=true \
  --rest-api-enabled=true
```

✅ *To start Teku, run the following command:*

```bash
teku \
  --ee-endpoint=<URL of execution engine>        \
  --ee-jwt-secret-file=<path to JWT secret file> \
  --metrics-enabled=true                         \
  --rest-api-enabled=true
```

:::

### 4. Create scannable content

Make sure readers can [effectively scan your content](https://learn.microsoft.com/en-us/style-guide/scannable-content/):

- [Get to your point fast](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice#get-to-the-point-fast)
  and make your point clear.
- [Use short, simple sentences.](https://learn.microsoft.com/en-us/style-guide/word-choice/use-simple-words-concise-sentences)
  Remove nonessential, redundant, or non-specific words and sentences.
- Break up three or more paragraphs of text with subheadings, admonitions, lists, tables, code samples,
  or images.
- [Establish patterns in content.](https://learn.microsoft.com/en-us/style-guide/scannable-content/#establish-patterns-in-content)
  Use consistent language across list items and page titles.
  Use consistent content structure across different pages.

:::info example

❌ *Cryptographic techniques must be leveraged by the private transaction manager in order to achieve
transaction authenticity, participant authentication, and historical data preservation (that is,
through a chain of cryptographically hashed data).
Much of the cryptographic work including symmetric key generation and data encryption/decryption is
delegated to the enclave instead of the private transaction manager in order to achieve a separation
of concerns, as well as to provide performance improvements through parallelization of certain
crypto-operations.*

✅ *The private transaction manager must use cryptographic techniques to:*

- *Authenticate transactions.*
- *Authenticate participants.*
- *Preserve historical data.*

*It delegates this work to the enclave, which manages encryption and decryption in isolation.
The separation of duties between the private transaction manager and enclave improves performance
and strengthens the security of private keys.*

:::

### 5. Format text properly

Follow these rules for [formatting common text
elements](https://learn.microsoft.com/en-us/style-guide/text-formatting/):

- Use [sentence case](https://learn.microsoft.com/en-us/style-guide/capitalization) for headings,
  titles, and labels.
- Use code formatting (surround text with backticks `` ` ``) for references to URLs and file names.
- Use bold text (surround text with double asterisks `**`) for references to user interface elements.
- Use [descriptive link text](https://developers.google.com/style/link-text?hl=en).

:::info example

❌ *[Click here](https://discord.gg/hyperledger) for Besu support.*

✅ *If you have questions about Besu for public networks, ask on the **#besu** channel on
[LFDT Discord](https://discord.gg/hyperledger).*

:::
