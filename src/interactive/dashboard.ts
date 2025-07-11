import inquirer from 'inquirer';
import chalk from 'chalk';
import { MonitorService } from '../services/monitorService';
import { OrderService } from '../services/orderService';
import { PriceService } from '../services/priceService';
import { formatPrice, clearScreen, showInfo, showWarning } from '../utils/display';
import { config } from '../config';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';

export async function showDashboard() {
  clearScreen();
  console.log(chalk.cyan('\n📊 Dashboard\n'));

  const monitor = MonitorService.getInstance();
  const orderService = OrderService.getInstance();
  const priceService = new PriceService();

  try {
    // Get data
    const isRunning = monitor.isRunning();
    const lastCheck = monitor.getLastCheckTime();
    const activeOrders = await orderService.getActiveOrders();
    const stats = await orderService.getOrderStats();
    const monitoredTokens = await monitor.getMonitoredTokens();

    // Wallet info
    console.log(chalk.white('💰 Wallet'));
    console.log(chalk.gray('─────────────────────────────'));
    const pubkey = config.getPublicKey();
    console.log(`Address: ${chalk.white(pubkey.substring(0, 8) + '...' + pubkey.substring(pubkey.length - 4))}`);
    
    // Get balance
    try {
      const connection = new Connection(config.getRpcEndpoint(), 'confirmed');
      const balance = await connection.getBalance(config.getKeypair().publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      const SOL_PRICE = parseFloat(process.env.SOL_PRICE_USD || '150');
      console.log(`Balance: ${chalk.green(solBalance.toFixed(4) + ' SOL')} (~$${(solBalance * SOL_PRICE).toFixed(2)})`);
    } catch (error) {
      console.log(`Balance: ${chalk.gray('Unable to fetch')}`);
    }

    // Monitoring status
    console.log(chalk.white('\n🔄 Monitoring'));
    console.log(chalk.gray('─────────────────────────────'));
    console.log(`Status: ${isRunning ? chalk.green('🟢 Active') : chalk.red('🔴 Inactive')}`);
    if (lastCheck) {
      console.log(`Last Check: ${chalk.gray(lastCheck)}`);
    }
    console.log(`Check Interval: ${chalk.gray('Every 5 seconds')}`);

    // Order statistics
    console.log(chalk.white('\n📈 Order Statistics'));
    console.log(chalk.gray('─────────────────────────────'));
    console.log(`Active: ${chalk.yellow(stats.active)} | Executed: ${chalk.green(stats.executed)} | Cancelled: ${chalk.gray(stats.cancelled)} | Failed: ${chalk.red(stats.failed)}`);

    // Active orders with current prices
    if (activeOrders.length > 0) {
      console.log(chalk.white('\n🎯 Active Orders'));
      console.log(chalk.gray('─────────────────────────────'));
      
      // Group by token
      const ordersByToken = activeOrders.reduce((acc: any, order) => {
        if (!acc[order.tokenAddress]) {
          acc[order.tokenAddress] = {
            token: order.token,
            orders: []
          };
        }
        acc[order.tokenAddress].orders.push(order);
        return acc;
      }, {});

      for (const [tokenAddress, data] of Object.entries(ordersByToken) as any) {
        const currentPrice = await priceService.getPrice(tokenAddress);
        console.log(`\n${chalk.white(data.token)}: ${currentPrice ? formatPrice(currentPrice) : chalk.gray('Fetching...')}`);
        
        for (const order of data.orders) {
          const arrow = order.type === 'buy' ? '↓' : '↑';
          const amount = order.type === 'buy' && order.usdAmount 
            ? `$${order.usdAmount.toFixed(2)}` 
            : `${order.amount} tokens`;
          const distance = currentPrice 
            ? `${Math.abs(((order.targetPrice - currentPrice) / currentPrice * 100)).toFixed(1)}%`
            : '?%';
          
          const typeColor = order.type === 'buy' ? chalk.green : chalk.red;
          console.log(chalk.gray(`  ${arrow} ${typeColor(order.type.toUpperCase())} ${amount} at ${formatPrice(order.targetPrice)} (${distance} away)`));
        }
      }
    } else {
      console.log(chalk.white('\n🎯 Active Orders'));
      console.log(chalk.gray('─────────────────────────────'));
      console.log(chalk.gray('No active orders'));
    }

    // Show monitoring control
    console.log();
    
    if (!isRunning && activeOrders.length > 0) {
      showWarning('You have active orders but monitoring is stopped!');
    }
    
    const choices = [];
    if (isRunning) {
      choices.push({ name: '🔴 Stop Monitoring', value: 'stop' });
    } else if (activeOrders.length > 0) {
      choices.push({ name: '🟢 Start Monitoring', value: 'start' });
    }
    choices.push({ name: '🔄 Refresh Dashboard', value: 'refresh' });
    choices.push({ name: '↩️  Back to Main Menu', value: 'back' });

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        loop: false,
        choices
      }
    ]);

    switch (action) {
      case 'start':
        await monitor.start();
        showInfo('Monitoring started successfully!');
        await showDashboard(); // Refresh
        break;
      case 'stop':
        monitor.stop();
        showInfo('Monitoring stopped');
        await showDashboard(); // Refresh
        break;
      case 'refresh':
        await showDashboard();
        break;
      case 'back':
        return;
    }
  } catch (error: any) {
    console.error(chalk.red('Error loading dashboard:'), error.message);
  }
}