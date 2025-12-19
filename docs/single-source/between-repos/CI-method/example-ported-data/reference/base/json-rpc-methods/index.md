---
title: Base JSON-RPC API
warning: This data is sourced from https://github.com/MetaMask/metamask-docs/tree/main/services all edits to this page will be lost
---

# Base JSON-RPC API

The standard Ethereum methods documented in this section are supported by Infura on the Base network. For custom Base methods, see the official Optimism Ethereum JSON-RPC API documentation (Bedrock release).

The Base optimistic layer 2 rollup chain is built by Coinbase, in collaboration with Optimism on the MIT-licensed OP Stack (Bedrock).

## Available Methods

### Standard Ethereum Methods

Base supports all standard Ethereum JSON-RPC methods:

* `eth_accounts` - Returns a list of addresses owned by client
* `eth_blockNumber` - Returns the number of most recent block
* `eth_call` - Executes a new message call immediately without creating a transaction on the block chain
* `eth_chainId` - Returns the currently configured chain id
* `eth_estimateGas` - Generates and returns an estimate of how much gas is necessary to allow the transaction to complete
* `eth_feeHistory` - Returns the fee history for the returned block range
* `eth_gasPrice` - Returns the current price per gas in wei
* `eth_getBalance` - Returns the balance of the account of given address
* `eth_getBlockByHash` - Returns information about a block by hash
* `eth_getBlockByNumber` - Returns information about a block by block number
* `eth_getCode` - Returns code at a given address
* `eth_getLogs` - Returns an array of all logs matching a given filter object
* `eth_getStorageAt` - Returns the value from a storage position at a given address
* `eth_getTransactionByHash` - Returns the information about a transaction requested by transaction hash
* `eth_getTransactionCount` - Returns the number of transactions sent from an address
* `eth_getTransactionReceipt` - Returns the receipt of a transaction by transaction hash
* `eth_sendRawTransaction` - Creates new message call transaction or a contract creation for signed transactions
* `eth_syncing` - Returns an object with data about the sync status or false

### Filter Methods

* `eth_newFilter` - Creates a filter object, based on filter options, to notify when the state changes
* `eth_newBlockFilter` - Creates a filter in the node, to notify when a new block arrives
* `eth_newPendingTransactionFilter` - Creates a filter in the node, to notify when new pending transactions arrive
* `eth_uninstallFilter` - Uninstalls a filter with given id
* `eth_getFilterChanges` - Polling method for a filter, which returns an array of logs which occurred since last poll
* `eth_getFilterLogs` - Returns an array of all logs matching filter with given id

### Net Methods

* `net_version` - Returns the current network id
* `net_peerCount` - Returns number of peers currently connected to the client

### Web3 Methods

* `web3_clientVersion` - Returns the current client version

## Example Usage

```bash
curl -X POST https://base-mainnet.infura.io/v3/YOUR-PROJECT-ID \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_blockNumber",
    "params": [],
    "id": 1
  }'
```

## Network Information

* **Chain ID**: 8453
* **Network Name**: Base Mainnet
* **RPC URL**: `https://base-mainnet.infura.io/v3/YOUR-PROJECT-ID`

---

*This content is ported from [MetaMask docs](https://docs.metamask.io/services/reference/base/json-rpc-methods) and automatically synced.*

