import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

const WALLET_PATH = path.join(process.cwd(), 'dist', 'config', 'wallet.json');
const WALLET_DIR = path.dirname(WALLET_PATH);

export async function checkFirstRun(): Promise<boolean> {
  // Check if wallet.json exists
  return !fs.existsSync(WALLET_PATH);
}

export async function runSetupWizard() {
  console.log(chalk.cyan('\n🚀 Welcome to Pump.fun Limit Order Bot!\n'));
  console.log(chalk.yellow('No wallet detected. Generating a new wallet via PumpPortal...\n'));

  let publicKey: string;
  let privateKey: string;
  let pumpPortalApiKey: string;

  try {
    // Call PumpPortal API to create wallet
    const response = await fetch('https://pumpportal.fun/api/create-wallet', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to create wallet via PumpPortal API');
    }

    const walletData = await response.json();
    
    // Extract wallet details from response
    // The API returns a wallet with linked API key
    publicKey = walletData.walletPublicKey;
    privateKey = walletData.privateKey;
    pumpPortalApiKey = walletData.apiKey;

    console.log(chalk.green('✅ Wallet generated successfully!\n'));
    
    // Display wallet details prominently
    console.log(chalk.cyan('YOUR WALLET DETAILS:'));
    console.log(chalk.cyan('====================\n'));
    
    console.log(chalk.white('Public Address (send SOL here to start trading):'));
    console.log(chalk.yellow(publicKey));
    console.log(chalk.gray('⬆️  Send SOL to this address before creating orders'));
    console.log();
    
    console.log(chalk.white('Private Key:'));
    console.log(chalk.yellow(privateKey));
    console.log();
    
    console.log(chalk.red('⚠️  SECURITY WARNING: Never share your private key with anyone!'));
    console.log(chalk.red('Anyone with your private key can steal all your funds.\n'));
    
    console.log(chalk.cyan('To import this wallet to Phantom:'));
    console.log(chalk.gray('1. Open Phantom → Settings → Manage Wallets'));
    console.log(chalk.gray('2. Click "Add Wallet" → "Import Private Key"'));
    console.log(chalk.gray('3. Paste your private key from above\n'));
    
  } catch (error) {
    console.log(chalk.yellow('⚠️  Could not create wallet via PumpPortal API. Generating locally...\n'));
    
    // Fallback to local generation
    const keypair = Keypair.generate();
    publicKey = keypair.publicKey.toBase58();
    privateKey = bs58.encode(keypair.secretKey);
    
    console.log(chalk.green('✅ Wallet generated locally!\n'));
    
    // Display wallet details
    console.log(chalk.cyan('YOUR WALLET DETAILS:'));
    console.log(chalk.cyan('====================\n'));
    
    console.log(chalk.white('Public Address (send SOL here to start trading):'));
    console.log(chalk.yellow(publicKey));
    console.log(chalk.gray('⬆️  Send SOL to this address before creating orders'));
    console.log();
    
    console.log(chalk.white('Private Key:'));
    console.log(chalk.yellow(privateKey));
    console.log();
    
    console.log(chalk.red('⚠️  SECURITY WARNING: Never share your private key with anyone!'));
    console.log(chalk.red('Anyone with your private key can steal all your funds.\n'));
    
    console.log(chalk.cyan('To import this wallet to Phantom:'));
    console.log(chalk.gray('1. Open Phantom → Settings → Manage Wallets'));
    console.log(chalk.gray('2. Click "Add Wallet" → "Import Private Key"'));
    console.log(chalk.gray('3. Paste your private key from above\n'));
    
    // Need to get API key separately if local generation
    console.log(chalk.yellow('Since wallet was generated locally, you\'ll need a PumpPortal API key.'));
    console.log(chalk.gray('Get your API key at: https://pumpportal.fun\n'));
    
    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your PumpPortal API key:',
        validate: (input) => {
          if (!input || input.length < 10) {
            return 'Please enter a valid PumpPortal API key';
          }
          return true;
        }
      }
    ]);
    
    pumpPortalApiKey = apiKey;
  }

  // Save configuration
  const walletConfig = {
    publicKey,
    privateKey,
    pumpPortalApiKey
  };

  // Ensure directory exists
  if (!fs.existsSync(WALLET_DIR)) {
    fs.mkdirSync(WALLET_DIR, { recursive: true });
  }

  fs.writeFileSync(WALLET_PATH, JSON.stringify(walletConfig, null, 2));

  console.log(chalk.gray(`Configuration saved to: ${WALLET_PATH}`));
  console.log(chalk.gray('You can always find your keys there if needed.\n'));
  
  console.log(chalk.cyan('📍 IMPORTANT: PumpPortal Lightning trades charge a 1% fee on all transactions.'));
  console.log(chalk.gray('This provides fast, reliable execution without slippage issues.\n'));
  
  // Configure RPC endpoint
  console.log(chalk.cyan('🌐 RPC Configuration'));
  console.log(chalk.gray('The bot needs an RPC endpoint to connect to Solana.\n'));
  
  const { customRpc } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'customRpc',
      message: 'Do you want to use a custom RPC endpoint?',
      default: false
    }
  ]);
  
  let rpcEndpoint = 'https://api.mainnet-beta.solana.com';
  
  if (customRpc) {
    const { rpcUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'rpcUrl',
        message: 'Enter your RPC endpoint URL:',
        validate: (input) => {
          if (!input.startsWith('http://') && !input.startsWith('https://')) {
            return 'Please enter a valid URL starting with http:// or https://';
          }
          return true;
        }
      }
    ]);
    rpcEndpoint = rpcUrl;
  } else {
    console.log(chalk.gray('Using default public Solana RPC endpoint'));
  }
  
  // Create or update .env file
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }
  
  // Update or add RPC_ENDPOINT
  if (envContent.includes('RPC_ENDPOINT=')) {
    envContent = envContent.replace(/RPC_ENDPOINT=.*/g, `RPC_ENDPOINT=${rpcEndpoint}`);
  } else {
    envContent += `\n# Solana RPC Endpoint\nRPC_ENDPOINT=${rpcEndpoint}\n`;
  }
  
  // Ensure SOL_PRICE_USD is set
  if (!envContent.includes('SOL_PRICE_USD=')) {
    envContent += `\n# SOL Price in USD\nSOL_PRICE_USD=150\n`;
  }
  
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log(chalk.green('\n✅ RPC configuration saved!'));
  
  // Remind about SOL
  console.log(chalk.yellow('\n💡 Before you start trading:'));
  console.log(chalk.green('  • Send SOL to your wallet address shown above'));
  console.log(chalk.gray('  • Each trade requires ~0.01 SOL in network fees'));
  console.log(chalk.gray('  • PumpPortal charges 1% fee on all trades'));
  console.log(chalk.gray('  • Start with small amounts to test\n'));

  const { ready_to_start } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'ready_to_start',
      message: 'Ready to start trading?',
      default: true
    }
  ]);

  if (!ready_to_start) {
    console.log(chalk.gray('\nRun the bot again when you\'re ready!'));
    process.exit(0);
  }
}