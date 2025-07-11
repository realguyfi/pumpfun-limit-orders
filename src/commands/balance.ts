import chalk from 'chalk';
import ora from 'ora';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { config } from '../config';

export async function balanceCommand() {
  const spinner = ora('Fetching wallet balance...').start();
  
  try {
    const connection = new Connection(config.getRpcEndpoint());
    const publicKey = new PublicKey(config.getPublicKey());
    
    // Get SOL balance
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    spinner.succeed(chalk.green('Balance fetched successfully!'));
    
    console.log(chalk.cyan('\n💰 Wallet Balance'));
    console.log(chalk.gray('─────────────────────────────'));
    console.log(`Wallet: ${chalk.white(config.getPublicKey())}`);
    console.log(`SOL Balance: ${chalk.yellow(solBalance.toFixed(4) + ' SOL')}`);
    console.log(`Value: ${chalk.green('$' + (solBalance * 150).toFixed(2))} ${chalk.gray('(@ $150/SOL)')}`);
    
    if (solBalance < 0.05) {
      console.log(chalk.yellow('\n⚠️  Low balance warning!'));
      console.log(chalk.gray('You may need more SOL for transaction fees.'));
    }
    
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to fetch balance'));
    console.error(chalk.red('\n❌ Error:'), error.message);
  }
}