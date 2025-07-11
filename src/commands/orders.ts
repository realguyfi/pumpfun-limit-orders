import chalk from 'chalk';
import { OrderService } from '../services/orderService';

export async function ordersCommand() {
  try {
    const orderService = OrderService.getInstance();
    const orders = await orderService.getActiveOrders();
    
    if (orders.length === 0) {
      console.log(chalk.yellow('\n📭 No active orders found.'));
      console.log(chalk.gray('Create a new order with: pump-bot buy <token> <amount> <price>'));
      return;
    }
    
    console.log(chalk.cyan('\n📋 Active Orders'));
    console.log(chalk.gray('═══════════════════════════════════════════════════════════════════════════════'));
    console.log(
      chalk.gray('ID') + ' '.repeat(14) +
      chalk.gray('Type') + ' '.repeat(4) +
      chalk.gray('Token') + ' '.repeat(6) +
      chalk.gray('Amount') + ' '.repeat(10) +
      chalk.gray('Target Price') + ' '.repeat(4) +
      chalk.gray('Status') + ' '.repeat(4) +
      chalk.gray('Created')
    );
    console.log(chalk.gray('───────────────────────────────────────────────────────────────────────────────'));
    
    orders.forEach(order => {
      const id = order.id.substring(0, 12) + '...';
      const type = order.type.toUpperCase();
      const typeColor = order.type === 'buy' ? chalk.green(type) : chalk.red(type);
      const amount = order.amount.toLocaleString();
      const price = '$' + order.targetPrice.toFixed(6);
      const status = order.status.toUpperCase();
      const statusColor = order.status === 'pending' ? chalk.yellow(status) : chalk.gray(status);
      const created = new Date(order.createdAt).toLocaleString();
      
      console.log(
        chalk.white(id.padEnd(16)) +
        typeColor.padEnd(13) +
        chalk.white(order.token.padEnd(11)) +
        chalk.white(amount.padEnd(16)) +
        chalk.white(price.padEnd(16)) +
        statusColor.padEnd(15) +
        chalk.gray(created)
      );
    });
    
    console.log(chalk.gray('═══════════════════════════════════════════════════════════════════════════════'));
    console.log(chalk.gray(`\nTotal active orders: ${orders.length}`));
    
  } catch (error: any) {
    console.error(chalk.red('\n❌ Error fetching orders:'), error.message);
  }
}