#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { buyCommand, sellCommand, ordersCommand, cancelCommand, statusCommand, balanceCommand } from './commands';
import { MonitorService } from './services/monitorService';
import { updateSolPrice } from './utils/solPrice';

const program = new Command();

console.log(chalk.cyan(`
🚀 Pump.fun Limit Order Bot
──────────────────────────
`));

program
  .name('pump-bot')
  .description('Simple limit order bot for pump.fun tokens')
  .version('1.0.0');

program
  .command('buy <token> <amount> <price>')
  .description('Set a limit buy order')
  .option('-s, --symbol', 'Use token symbol instead of address')
  .action(buyCommand);

program
  .command('sell <token> <amount> <price>')
  .description('Set a limit sell order')
  .option('-s, --symbol', 'Use token symbol instead of address')
  .action(sellCommand);

program
  .command('orders')
  .description('View all active orders')
  .action(ordersCommand);

program
  .command('cancel <orderId>')
  .description('Cancel a specific order')
  .action(cancelCommand);

program
  .command('status')
  .description('Show bot status and monitoring info')
  .action(statusCommand);

program
  .command('balance')
  .description('Check wallet SOL balance')
  .action(balanceCommand);

program
  .command('monitor <action>')
  .description('Start or stop price monitoring (start/stop)')
  .action(async (action: string) => {
    const monitor = MonitorService.getInstance();
    
    if (action === 'start') {
      await monitor.start();
    } else if (action === 'stop') {
      monitor.stop();
    } else {
      console.log(chalk.red('Invalid action. Use "start" or "stop"'));
    }
  });

program.on('--help', () => {
  console.log('');
  console.log(chalk.gray('Examples:'));
  console.log(chalk.gray('  $ pump-bot buy BONK 1000000 0.000025    # Buy 1M BONK at $0.000025'));
  console.log(chalk.gray('  $ pump-bot sell WIF 500 4.50            # Sell 500 WIF at $4.50'));
  console.log(chalk.gray('  $ pump-bot orders                       # List all pending orders'));
  console.log(chalk.gray('  $ pump-bot cancel order_123             # Cancel a specific order'));
  console.log(chalk.gray('  $ pump-bot monitor start                # Start monitoring prices'));
});

// Update SOL price before parsing commands
updateSolPrice().then(() => {
  program.parse(process.argv);
  
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
});