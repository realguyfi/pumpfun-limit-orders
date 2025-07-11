import inquirer from 'inquirer';
import chalk from 'chalk';
import { MonitorService } from '../services/monitorService';
import { OrderService } from '../services/orderService';
import { PriceService } from '../services/priceService';
import { formatPrice, clearScreen, showInfo } from '../utils/display';

export async function showMonitorStatus() {
  clearScreen();
  console.log(chalk.cyan('\n🔄 Monitor Status\n'));

  const monitor = MonitorService.getInstance();
  const orderService = OrderService.getInstance();
  const priceService = new PriceService();

  // Get monitoring status
  const isRunning = monitor.isRunning();
  const lastCheck = monitor.getLastCheckTime();
  const activeOrders = await orderService.getActiveOrders();
  const monitoredTokens = await monitor.getMonitoredTokens();

  // Display status
  console.log(chalk.white('Status:'), isRunning ? chalk.green('🟢 Running') : chalk.red('🔴 Stopped'));
  
  if (lastCheck) {
    console.log(chalk.white('Last Check:'), chalk.gray(lastCheck));
  }
  
  console.log(chalk.white('Active Orders:'), chalk.yellow(activeOrders.length));
  console.log(chalk.white('Monitored Tokens:'), chalk.yellow(monitoredTokens.length));

  // Show current prices for monitored tokens
  if (monitoredTokens.length > 0 && isRunning) {
    console.log(chalk.cyan('\n📊 Current Prices:'));
    console.log(chalk.gray('─────────────────────────────'));
    
    for (const tokenAddress of monitoredTokens) {
      const orders = activeOrders.filter(o => o.tokenAddress === tokenAddress);
      if (orders.length > 0) {
        const token = orders[0].token;
        const price = await priceService.getPrice(tokenAddress);
        
        console.log(`${chalk.white(token)}: ${price ? formatPrice(price) : chalk.gray('Fetching...')}`);
        
        // Show active orders for this token
        for (const order of orders) {
          const arrow = order.type === 'buy' ? '↓' : '↑';
          const amount = order.type === 'buy' && order.usdAmount 
            ? `$${order.usdAmount.toFixed(2)}` 
            : `${order.amount} tokens`;
          console.log(chalk.gray(`  ${arrow} ${order.type.toUpperCase()} ${amount} at ${formatPrice(order.targetPrice)}`));
        }
      }
    }
  }

  // Show menu options
  console.log();
  const choices = [];
  
  if (isRunning) {
    choices.push({ name: '🔴 Stop Monitoring', value: 'stop' });
  } else if (activeOrders.length > 0) {
    choices.push({ name: '🟢 Start Monitoring', value: 'start' });
  }
  
  choices.push({ name: '↩️  Back to Main Menu', value: 'back' });

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices
    }
  ]);

  switch (action) {
    case 'start':
      await monitor.start();
      showInfo('Monitoring started');
      break;
    case 'stop':
      monitor.stop();
      showInfo('Monitoring stopped');
      break;
    case 'back':
      return;
  }

  // Show status again if not going back
  if (action !== 'back') {
    await showMonitorStatus();
  }
}