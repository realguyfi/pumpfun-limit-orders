import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { MonitorService } from '../services/monitorService';
import { OrderService } from '../services/orderService';
import { showSuccess, showWarning, showInfo, clearScreen } from '../utils/display';

export async function toggleMonitoring() {
  clearScreen();
  console.log(chalk.cyan('\n🔄 Price Monitoring\n'));

  const monitorService = MonitorService.getInstance();
  const isRunning = monitorService.isRunning();

  if (isRunning) {
    // Currently running, offer to stop
    console.log(chalk.green('✓ Monitoring is currently active'));
    console.log(chalk.gray('Price checks are running every 5 seconds'));

    const { action } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'action',
        message: 'Stop monitoring?',
        default: false
      }
    ]);

    if (action) {
      monitorService.stop();
      showSuccess('Monitoring stopped');
      console.log(chalk.gray('Your orders will not execute automatically until monitoring is restarted.'));
    }
  } else {
    // Not running, check if there are orders to monitor
    const orderService = OrderService.getInstance();
    const activeOrders = await orderService.getActiveOrders();

    if (activeOrders.length === 0) {
      showWarning('No active orders to monitor');
      console.log(chalk.gray('Create some orders first, then start monitoring.'));
      return;
    }

    // Show what will be monitored
    console.log(chalk.yellow('📋 Active orders to monitor:'));
    const uniqueTokens = [...new Set(activeOrders.map(o => o.token))];
    console.log(chalk.white(`  • ${activeOrders.length} orders across ${uniqueTokens.length} tokens`));
    console.log(chalk.white(`  • Tokens: ${uniqueTokens.join(', ')}`));
    console.log(chalk.gray('\nMonitoring will check prices every 5 seconds'));
    console.log(chalk.gray('Orders will execute automatically when target prices are reached'));

    const { action } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'action',
        message: 'Start monitoring?',
        default: true
      }
    ]);

    if (action) {
      const spinner = ora('Starting monitor...').start();
      
      try {
        await monitorService.start();
        spinner.succeed('Monitoring started successfully!');
        
        showInfo('Your orders will now execute automatically when prices reach their targets.');
        console.log(chalk.gray('Keep this terminal open or run in background for continuous monitoring.'));
      } catch (error: any) {
        spinner.fail('Failed to start monitoring');
        console.error(chalk.red('Error:'), error.message);
      }
    }
  }
}