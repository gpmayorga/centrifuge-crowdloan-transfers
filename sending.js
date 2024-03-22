const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const fs = require('fs');
const addresses = JSON.parse(fs.readFileSync('uniqueAddresses.json', 'utf8'));

// Uncomment this if trying to resend to fail addresses:
// const addresses = JSON.parse(fs.readFileSync('failedAddresses.json', 'utf8'));

// Define the amount to send (0.002 CFG)
// Note: Centrifuge uses 18 decimal places, so you need to convert the amount accordingly.
const amount = BigInt(2e15); // 0.002 * 10^18
// Connect to the Centrifuge chain
const wsProvider = new WsProvider('wss://fullnode.centrifuge.io');

// Custom log function to output to both console and file
function logToFileAndConsole(message) {
    console.log(message);
    const date = new Date().toISOString();
    message = `${date}: ${message}`;
    fs.appendFileSync('transactions.log', message + '\n', 'utf8');
  }
async function sendCFG() {
  // Make a backup if the file exists, for record keeping
  if (fs.existsSync('failedAddresses.json')) {
    const backupPath = `failedAddresses_${Math.floor(Math.random() * 100)}.json`;
    fs.copyFileSync('failedAddresses.json', backupPath);
    fs.unlinkSync(backupPath);
  }
  const api = await ApiPromise.create({ provider: wsProvider });
  const keyring = new Keyring({ type: 'sr25519' });
  // Add your account to the keyring using the seed phrase
  const sender = keyring.addFromUri('YOUR_SEED_PHRASE');
  let failedAddresses = new Set()
  let batchTx = []

  for (const recipientAddress of addresses) {
    const transfer = api.tx.balances.transfer(recipientAddress, amount);

    if (batchTx.length === 15 || recipientAddress === addresses[addresses.length - 1]) {
      try {
        const hash = await api.tx.utility.batch(batchTx).signAndSend(sender, { nonce: -1 });
        logToFileAndConsole(`Batch of ${batchTx.length} transactions sent with hash: ${hash}`);
        logToFileAndConsole(`Last address in this batch: ${recipientAddress}`)
      } catch (error) {
        logToFileAndConsole(`Error sending batch transaction:`, error);
        batchTx.forEach(tx => failedAddresses.add(tx.args[0].toString()));
        // Update the failedAddresses.json file immediately after catching the error
        fs.writeFileSync('failedAddresses.json', JSON.stringify(Array.from(failedAddresses), null, 2));
      }
      batchTx = []; // Empty the transaction array for the next batch
    }
  }
  
  if(failedAddresses.size > 0){
    logToFileAndConsole(`${failedAddresses.size} addresses failed and were saved to failedAddresses.json for retry.`);
  }
  else{
    logToFileAndConsole("All transfers succeded, closing RPC connections...")
  }
  
  await api.disconnect();
}

sendCFG().catch(error => logToFileAndConsole(error.toString()));
