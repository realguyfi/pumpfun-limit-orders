import chalk from 'chalk';
import ora from 'ora';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { config } from '../config';
import { formatSOL, showError, clearScreen } from '../utils/display';

export async function checkBalance() {
  clearScreen();
  console.log(chalk.cyan('\n💰 Wallet Balance\n'));

  const spinner = ora('Fetching wallet balance...').start();

  try {
    const connection = new Connection(config.getRpcEndpoint());
    const publicKey = new PublicKey(config.getPublicKey());

    // Get SOL balance
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;

    spinner.succeed('Balance fetched successfully!');

    console.log(chalk.gray('─────────────────────────────'));
    console.log(`Wallet Address: ${chalk.white(config.getPublicKey())}`);
    console.log(`SOL Balance: ${chalk.yellow(formatSOL(balance) + ' SOL')}`);
    
    // Estimate USD value (using approximate price)
    const estimatedUSD = solBalance * 150; // Approximate SOL price
    console.log(`Estimated Value: ${chalk.green('$' + estimatedUSD.toFixed(2))} ${chalk.gray('(@ $150/SOL)')}`);

    // Show warnings if balance is low
    if (solBalance < 0.05) {
      console.log(chalk.yellow('\n⚠️  Low balance warning!'));
      console.log(chalk.gray('You may need more SOL for transaction fees.'));
      console.log(chalk.gray('Recommended minimum: 0.05 SOL'));
    } else if (solBalance < 0.1) {
      console.log(chalk.yellow('\n⚠️  Balance is getting low'));
      console.log(chalk.gray('Consider adding more SOL for multiple trades.'));
    } else {
      console.log(chalk.green('\n✅ Balance is sufficient for trading'));
    }

  } catch (error: any) {
    spinner.fail('Failed to fetch balance');
    showError(error.message);
  }
}