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
  const api = await ApiPromise.create({ provider: wsProvider });
  const keyring = new Keyring({ type: 'sr25519' });
  // Add your account to the keyring using the seed phrase
  const sender = keyring.addFromUri('YOUR_SEED_PHRASE');
  let failedAddresses = new Set()
  let amountSent = 0
  for (const recipientAddress of addresses) {
    try {
      // Create a transfer transaction and sign it
      const transfer = api.tx.balances.transfer(recipientAddress, amount);
      const hash = await transfer.signAndSend(sender);
      logToFileAndConsole(`Sending 0.002CFG to ${recipientAddress}`)
      amountSent += 0.002;
      logToFileAndConsole(`Transaction sent with hash: ${hash}`);
    } catch (error) {
      logToFileAndConsole(`Error sending to ${recipientAddress}:`, error);
      failedAddresses.add(recipientAddress);
    }
  }
  logToFileAndConsole(`Total amount sent: ${amountSent}`)
  const failedAddressesPath = 'failedAddresses.json';
  
  // Make a backup if the file exists, for record keeping
  if (fs.existsSync(failedAddressesPath)) {
    const backupPath = `failedAddresses_${Math.floor(Math.random() * 100)}.json`;
    fs.copyFileSync(failedAddressesPath, backupPath);
    fs.unlinkSync(backupPath);
  }

  fs.writeFileSync(failedAddressesPath, JSON.stringify(Array.from(failedAddresses), null, 2));
  logToFileAndConsole(`${failedAddresses.size} addresses failed and were saved to failedAddresses.json for retry.`);
  await api.disconnect();
}

sendCFG().catch(error => logToFileAndConsole(error.toString()));
