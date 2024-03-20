const fs = require('fs');
const axios = require('axios');
const path = require('path');

// Initialize variables
let uniqueAddresses = new Set();
let page = 0;

// Load existing data if available
const dataPath = path.join(__dirname, 'uniqueAddresses.json');


async function fetchTransfers() {
  let hasMore = true;
  let startTime = Date.now(); // Track the start time of the operation
  let requestCount = 0; // Initialize a request counter
  let totalTransfersProcessed = 0;
  let duplicatesFound= 0
  let fetchingFromBlocks = false
  
  console.log("Starting to fetch transfers from account '4fKpoZoBEvw2K48tQf5rMAfexaX9fS9WbsEqWPTaREWBRvhs'")
  while (hasMore) {
    try {
      // Check if more than 10 requests have been made in the last second
      if (requestCount >= 5) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime; // Calculate elapsed time since start
        if (elapsedTime < 1000) { // If less than a second has passed
          console.log(`Too many requests, waiting ${1000 - elapsedTime} ms`)
          await new Promise(resolve => setTimeout(resolve, 1000 - elapsedTime)); // Wait for the remainder of the second
        }
        // Reset counters and start time for the next batch of requests
        requestCount = 0;
        startTime = Date.now();
      }
      let response = ""
      if (fetchingFromBlocks) { // Max amount of pages, fetech the rest by block number
          response = await axios.post('https://centrifuge.api.subscan.io/api/v2/scan/transfers', {
          address: "4fKpoZoBEvw2K48tQf5rMAfexaX9fS9WbsEqWPTaREWBRvhs",
          direction: "sent",
          max_amount:  "0.0001",
          currency: "token",
          block_range: "273300-275221", // Fetch the rest of the blocks after page 100
          page: page,
          row: 100
        }, {
          headers: {
            'User-Agent': 'Apidog/1.0.0 (https://apidog.com)',
            'Content-Type': 'application/json',
            'x-api-key': 'YOUR_API_KEY'
          }
        });
        
      } else { 
          response = await axios.post('https://centrifuge.api.subscan.io/api/v2/scan/transfers', {
          address: "4fKpoZoBEvw2K48tQf5rMAfexaX9fS9WbsEqWPTaREWBRvhs",
          direction: "sent",
          max_amount: "0.0001",
          currency: "token",
          page: page,
          row: 100
        }, {
          headers: {
            'User-Agent': 'Apidog/1.0.0 (https://apidog.com)',
            'Content-Type': 'application/json',
            'x-api-key': 'ac1b1a8325434077855a4034a787bfc2'
          }
        });
      }


      requestCount++; // Increment the request counter after each successful request

      if (response.data.data?.transfers === null) {
        console.log("Transfers field is null.");
        console.log(`Finished at page ${page}`)
        // console.log(JSON.stringify(response.data, null, 2)); // Pretty print the response JSON
        hasMore = false; // If transfer is null, there's no more pages
      } else {
        const transfers = response.data.data.transfers;
        totalTransfersProcessed += transfers.length;
        if (transfers.length === 0) {
          hasMore = false;
        } else {
          transfers.forEach(transfer => {
            const address = transfer.to_account_display.address;
            if (uniqueAddresses.has(address) && transfer.amount == "0.0001") {
              duplicatesFound++
            } else {
              uniqueAddresses.add(address);
            }
          });
          if (page % 25 === 0) {
            console.log(` Total transfers processed so far: ${totalTransfersProcessed}`);
            if (fetchingFromBlocks) {
              console.log(`Page ${page} processed using block number`);
              console.log(` Duplicate addresses so far: ${duplicatesFound}`)
            } else {
              console.log(`Page ${page} processed`);
            }
            
          }
          page++;
          if (page == 100){
            console.log(`last block on page 100: ${transfers[99].block_num}`)
            fetchingFromBlocks = true
            console.log("\x1b[31mFirst 100 pages reached, starting to fetch older blocks\x1b[0m") 
            page = 0 // Reset to page 0 again
          }
        }
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
      break;
    }
  }
  console.log("\nSummary:")
  console.log(` ${uniqueAddresses.size} unique addresses added`)
  console.log(` Duplicate addresses: ${duplicatesFound}`)
  console.log(` Total transfers processed: ${totalTransfersProcessed}\n`)

  fs.writeFileSync(dataPath, JSON.stringify(Array.from(uniqueAddresses), null, 2));
  console.log('Finished fetching transfers and saved unique addresses to uniqueAddresses.json');
}

fetchTransfers().catch(console.error);
