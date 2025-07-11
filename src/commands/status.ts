import chalk from 'chalk';
import { OrderService } from '../services/orderService';
import { MonitorService } from '../services/monitorService';
import { config } from '../config';

export async function statusCommand() {
  try {
    console.log(chalk.cyan('\n🤖 Bot Status'));
    console.log(chalk.gray('═══════════════════════════════════════════'));
    
    // Monitoring status
    const monitorService = MonitorService.getInstance();
    const isMonitoring = monitorService.isRunning();
    
    console.log(`Monitoring: ${isMonitoring ? chalk.green('✓ Active') : chalk.red('✗ Inactive')}`);
    console.log(`Wallet: ${chalk.white(config.getPublicKey())}`);
    
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
    
    // Active orders summary
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
    }
    
    // Monitoring info
    if (isMonitoring) {
      const monitoredTokens = await monitorService.getMonitoredTokens();
      console.log(chalk.cyan('\n👀 Monitored Tokens'));
      console.log(chalk.gray('───────────────────────────────────────────'));
      console.log(`Tokens being monitored: ${chalk.white(monitoredTokens.length)}`);
      console.log(`Check interval: ${chalk.white('30 seconds')}`);
      console.log(`Last check: ${chalk.white(monitorService.getLastCheckTime() || 'Never')}`);
    } else {
      console.log(chalk.yellow('\n⚠️  Price monitoring is not active'));
      console.log(chalk.gray('Start monitoring with: pump-bot monitor start'));
    }
    
  } catch (error: any) {
    console.error(chalk.red('\n❌ Error fetching status:'), error.message);
  }
}