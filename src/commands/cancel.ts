import chalk from 'chalk';
import ora from 'ora';
import { OrderService } from '../services/orderService';

export async function cancelCommand(orderId: string) {
  const spinner = ora('Cancelling order...').start();
  
  try {
    const orderService = OrderService.getInstance();
    const order = await orderService.cancelOrder(orderId);
    
    spinner.succeed(chalk.green('Order cancelled successfully!'));
    
    console.log(chalk.cyan('\n📋 Cancelled Order:'));
    console.log(chalk.gray('─────────────────────────────'));
    console.log(`Order ID: ${chalk.white(order.id)}`);
    console.log(`Type: ${order.type === 'buy' ? chalk.green('BUY') : chalk.red('SELL')}`);
    console.log(`Token: ${chalk.white(order.token)}`);
    console.log(`Amount: ${chalk.white(order.amount.toLocaleString())}`);
    console.log(`Target Price: ${chalk.white('$' + order.targetPrice.toFixed(6))}`);
    console.log(`Status: ${chalk.red('CANCELLED')}`);
    
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to cancel order'));
    console.error(chalk.red('\n❌ Error:'), error.message);
  }
}