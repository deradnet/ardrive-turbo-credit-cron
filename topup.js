\const { ANT } = require('@ar.io/sdk');
const { TurboFactory, ARIOToTokenAmount } = require('@ardrive/turbo-sdk');
const fs = require('fs').promises;
const path = require('path');

async function main() {
  const walletPath = process.argv[2];
  const amountOrPercentage = process.argv[3];
  
  if (!walletPath) {
    console.error('Usage: node topup.js /path/to/wallet.json [amount|percentage%]');
    console.error('Examples:');
    console.error('  node topup.js /path/to/wallet.json           # Top up with full balance');
    console.error('  node topup.js /path/to/wallet.json 50%       # Top up with 50% of balance');
    console.error('  node topup.js /path/to/wallet.json 10        # Top up with 10 ARIO tokens');
    process.exit(1);
  }

  // Extract public key from filename (without .json)
  const publicKey = path.basename(walletPath, '.json');
  console.log('Wallet public key:', publicKey);

  // Load wallet JSON (private key)
  const walletJson = await fs.readFile(walletPath, 'utf8');
  const wallet = JSON.parse(walletJson);

  // Initialize ANT client with your processId
  const ant = ANT.init({ processId: "qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE" });

  // Get raw balance (smallest unit, 6 decimals)
  const balanceRaw = await ant.getBalance({ address: publicKey });
  console.log('AR.IO token balance (raw):', balanceRaw);

  const balanceNum = Number(balanceRaw);
  if (!balanceNum || balanceNum <= 0) {
    console.log('No balance available to top up.');
    process.exit(0);
  }

  // Convert raw balance with 6 decimals precision
  const DECIMALS = 1e6;
  const balanceDecimal = balanceNum / DECIMALS;

  console.log(`Balance in ARIO tokens: ${balanceDecimal}`);

  // Convert decimal balance to token amount for top-up
  const tokenAmount = ARIOToTokenAmount(balanceDecimal);

  console.log(`Topping up with full balance: ${balanceDecimal} ARIO tokens`);

  // Initialize Turbo client
  const turbo = await TurboFactory.authenticated({
    signer: wallet,
    token: 'ario',
  });

  const { status, id } = await turbo.topUpWithTokens({
    tokenAmount,
  });

  console.log(`Top up status: ${status}`);
  console.log(`Transaction ID: ${id}`);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});