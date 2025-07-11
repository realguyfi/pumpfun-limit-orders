import chalk from 'chalk';
import { OrderService } from '../services/orderService';
import { MonitorService } from '../services/monitorService';
import { config } from '../config';
import { clearScreen } from '../utils/display';

export async function showStatus() {
  clearScreen();
  console.log(chalk.cyan('\n🤖 Bot Status\n'));

  try {
    console.log(chalk.gray('═══════════════════════════════════════════'));

    // Monitoring status
    const monitorService = MonitorService.getInstance();
    const isMonitoring = monitorService.isRunning();

    console.log(`Monitoring: ${isMonitoring ? chalk.green('✓ Active') : chalk.red('✗ Inactive')}`);
    console.log(`Wallet: ${chalk.white(config.getPublicKey().substring(0, 8) + '...')}`);

    // Order statistics
    const orderService = OrderService.getInstance();
    const stats = await orderService.getOrderStats();

    console.log(chalk.cyan('\n📊 Order Statistics'));
    console.log(chalk.gray('───────────────────────────────────────────'));
    console.log(`Active Orders: ${chalk.yellow(stats.active)}`);
    console.log(`Executed Orders: ${chalk.green(stats.executed)}`);
    console.log(`Cancelled Orders: ${chalk.gray(stats.cancelled)}`);
    console.log(`Failed Orders: ${chalk.red(stats.failed)}`);
    console.log(`Total Orders: ${chalk.white(stats.total)}`);

    // Active orders breakdown
    if (stats.active > 0) {
      const activeOrders = await orderService.getActiveOrders();
      console.log(chalk.cyan('\n🎯 Active Order Summary'));
      console.log(chalk.gray('───────────────────────────────────────────'));

      let buyOrders = 0;
      let sellOrders = 0;

      activeOrders.forEach(order => {
        if (order.type === 'buy') buyOrders++;
        else sellOrders++;
      });

      console.log(`Buy Orders: ${chalk.green(buyOrders)}`);
      console.log(`Sell Orders: ${chalk.red(sellOrders)}`);

      // Show monitored tokens
      const uniqueTokens = [...new Set(activeOrders.map(o => o.token))];
      console.log(`\nMonitored Tokens: ${chalk.white(uniqueTokens.join(', '))}`);
    }

    // Monitoring info
    if (isMonitoring) {
      const monitoredTokens = await monitorService.getMonitoredTokens();
      console.log(chalk.cyan('\n👀 Monitoring Details'));
      console.log(chalk.gray('───────────────────────────────────────────'));
      console.log(`Check Interval: ${chalk.white('30 seconds')}`);
      console.log(`Last Check: ${chalk.white(monitorService.getLastCheckTime() || 'Never')}`);
      console.log(`Tokens Monitored: ${chalk.white(monitoredTokens.length)}`);
    } else {
      console.log(chalk.yellow('\n⚠️  Price monitoring is not active'));
      console.log(chalk.gray('Start monitoring from the main menu to execute orders automatically.'));
    }

    console.log(chalk.gray('\n═══════════════════════════════════════════'));

  } catch (error: any) {
    console.error(chalk.red('Error fetching status:'), error.message);
  }
}