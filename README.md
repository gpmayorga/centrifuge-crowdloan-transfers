## Sending funds to crowdloan contributors for Centrifuge
### March 2024
This repo has been created in an effort to help the remaining crowdloan contributors claim their rewards sending the necessary fees for the transfer to happen. The script is intended to run only once and not again after the transfers are done but will be kept here for the records.

#### Contents:
The `getUniqueAddresses.js` script is designed to fetch unique addresses from Centrifuge's subscan API. It queries for an initial transfer previously done on-chain to all crowdloan contributors where 0.001CFG was sent. The script tries to cincumvent Subscan limitations on API requests/s and max_pages by querying for the remaining block numbers once limits are reached.

Once all unique addresses are collected, they are saved to a JSON file named `uniqueAddresses.json`. This file is commited to this repository for the records

It's important to note that an API key is required for the requests, which needs to be added where `'YOUR_API_KEY'` is mentioned in the code. A free subscription is enough.

The `sending.js` script is used to send transactions to a list of addresses. It loads the unique addresses from the `uniqueAddresses.json` file generated by the `getUniqueAddresses.js` script. For each address, it creates and signs a transfer transaction using a specified amount and sends it. The script logs the details of each transaction, including any errors, to both the console and a log file named `transactions.log`. To use this script, a connection to the Centrifuge blockchain is established, and a seed phrase for the sender's account must be provided where `'YOUR_SEED_PHRASE'` is mentioned.

Both scripts require the addition of sensitive information before use:
- The `getUniqueAddresses.js` script needs an API key to be added.
- The `sending.js` script requires a seed phrase to sign transactions.
