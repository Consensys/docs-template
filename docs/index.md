---
title: Overview
---

# ConsenSys documentation guide

Welcome to the ConsenSys documentation guide.
This guide contains information about contributing to ConsenSys developer documentation sites and
creating new documentation sites.

## Overview

Each ConsenSys developer product has a documentation site, maintained by the [ConsenSys developer
documentation team](https://consensyssoftware.atlassian.net/wiki/spaces/PEG/pages/398159216798/Documentation+Pliny)
and/or a product team.
The docs use a [docs-as-code](https://www.writethedocs.org/guide/docs-as-code/) approach and are
mostly open source, empowering developers and community members to contribute to the docs alongside
the docs team.

This guide aims to help writers, developers, product managers, and community members [contribute to
the existing doc sites](contribute) and [create new doc sites](create).

:::note
This guide assumes familiarity with Git, GitHub, and Markdown.
:::

Most of the doc sites are built using the [Docusaurus](https://docusaurus.io/) static site generator
and hosted on [Vercel](https://vercel.com/).

## List of documentation sites

The following table shows the full list of developer documentation sites supported by ConsenSys.

| Doc site                                                                | GitHub repository                                                                   | Site platform | Hosting platform | Description                                                                                                                                                              |
|-------------------------------------------------------------------------|-------------------------------------------------------------------------------------|---------------|------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Teku](https://docs.teku.consensys.net/)                                | [`consensys/doc.teku`](https://github.com/consensys/doc.teku)                       | Docusaurus    | Vercel           | Maintained by the docs team.                                                                                                                                             |
| [Hyperledger Besu](https://besu.hyperledger.org/en/stable/)             | [`hyperledger/besu-docs`](https://github.com/hyperledger/besu-docs)                 | Docusaurus    | GitHub Pages     | Maintained by the docs team. This is a Hyperledger project and has its own [Besu docs contribution guidelines](https://wiki.hyperledger.org/display/BESU/Documentation). |
| [Web3Signer](https://docs.web3signer.consensys.net/)                    | [`consensys/web3signer`](https://github.com/ConsenSys/web3signer)                   | Docusaurus    | Vercel           | Maintained by the docs team.                                                                                                                                             |
| [MetaMask](https://docs.metamask.io/)                                   | [`metamask/metamask-docs`](https://github.com/MetaMask/metamask-docs)               | Docusaurus    | GitHub Pages     | Maintained by the docs team. This project has additional [MetaMask docs contribution guidelines](https://github.com/MetaMask/metamask-docs/blob/main/CONTRIBUTING.md).   |
| [Infura](https://docs.infura.io/infura/)                                | `infura/docs` (private)                                                             | Docusaurus    | Vercel           | Maintained by the docs team.                                                                                                                                             |
| [Truffle](https://trufflesuite.com/docs/)                               | [`trufflesuite/trufflesuite.com`](https://github.com/trufflesuite/trufflesuite.com) | MkDocs        | GitHub Pages     | Maintained by the Truffle team.                                                                                                                                          |
| [Linea](https://docs.linea.build/)                                      | [`consensys/doc.zk-evm`](https://github.com/consensys/doc.zk-evm)                   | Docusaurus    | Vercel           | Maintained by the Linea team.                                                                                                                                            |
| [ConsenSys NFT](https://docs.consensys-nft.com/)                        | `consensys/doc.consensys-nft` (private)                                             | Docusaurus    | Vercel           | Maintained by the ConsenSys NFT team.                                                                                                                                    |
| [MetaMask Fiat On-Ramp](https://docs.metamask-onramp.consensys.net/)    | `consensys/doc.metamask-onramp` (private)                                           | Docusaurus    | Vercel           | Maintained by the MetaMask Fiat On-Ramp team.                                                                                                                            |
| [GoQuorum](https://docs.goquorum.consensys.net/)                        | [`consensys/doc.goquorum`](https://github.com/consensys/doc.goquorum)               | Docusaurus    | Vercel           | Maintained by the docs team.                                                                                                                                             |
| [Orchestrate](https://docs.orchestrate.consensys.net/)                  | `consensys/doc.orchestrate` (private)                                               | Docusaurus    | Vercel           | Maintained by the docs team.                                                                                                                                             |
| [Tessera](https://docs.tessera.consensys.net/)                          | [`consensys/doc.tessera`](https://github.com/ConsenSys/doc.tessera)                 | Docusaurus    | Vercel           | Maintained by the docs team.                                                                                                                                             |
| [EthSigner](https://docs.ethsigner.consensys.net/)                      | [`consensys/doc.ethsigner`](https://github.com/ConsenSys/doc.ethsigner)             | Docusaurus    | Vercel           | Maintained by the docs team.                                                                                                                                             |
| [gnark](https://docs.gnark.consensys.net/)                              | [`consensys/doc.gnark`](https://github.com/ConsenSys/doc.gnark)                     | Docusaurus    | Vercel           | Maintained by the docs team.                                                                                                                                             |
| [Documentation guide](https://docs-template.consensys.net/) (this site) | [`consensys/docs-template`](https://github.com/ConsenSys/docs-template)             | Docusaurus    | Vercel           | Maintained by the docs team.                                                                                                                                             |
