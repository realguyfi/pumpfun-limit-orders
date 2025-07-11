import chalk from 'chalk';
import { OrderService } from '../services/orderService';
import { showOrdersTable, showWarning, clearScreen } from '../utils/display';

export async function viewOrders() {
  clearScreen();
  console.log(chalk.cyan('\n📋 Your Orders\n'));

  try {
    const orderService = OrderService.getInstance();
    const orders = await orderService.getActiveOrders();

    if (orders.length === 0) {
      showWarning('No active orders found.');
      console.log(chalk.gray('Create new orders from the main menu.'));
      return;
    }

    showOrdersTable(orders);
    
    console.log(chalk.gray(`\nTotal active orders: ${orders.length}`));

  } catch (error: any) {
    console.error(chalk.red('Error fetching orders:'), error.message);
  }
}