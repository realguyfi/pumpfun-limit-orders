import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { OrderService } from '../services/orderService';
import { showOrdersTable, showSuccess, showError, showWarning, clearScreen } from '../utils/display';

export async function cancelOrder() {
  clearScreen();
  console.log(chalk.cyan('\n❌ Cancel Order\n'));

  try {
    const orderService = OrderService.getInstance();
    const orders = await orderService.getActiveOrders();

    if (orders.length === 0) {
      showWarning('No active orders to cancel.');
      return;
    }

    // Show current orders
    console.log(chalk.yellow('Active Orders:'));
    showOrdersTable(orders);

    // Let user select which order to cancel
    const { selectedOrderId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedOrderId',
        message: 'Select order to cancel:',
        choices: orders.map(order => ({
          name: `${order.type.toUpperCase()} ${order.amount} ${order.token} at $${order.targetPrice.toFixed(6)} (ID: ${order.id.substring(0, 8)}...)`,
          value: order.id
        }))
      }
    ]);

    // Confirm cancellation
    const selectedOrder = orders.find(o => o.id === selectedOrderId);
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Cancel ${selectedOrder?.type} order for ${selectedOrder?.amount} ${selectedOrder?.token}?`,
        default: false
      }
    ]);

    if (!confirm) {
      console.log(chalk.gray('Cancellation aborted'));
      return;
    }

    // Cancel the order
    const spinner = ora('Cancelling order...').start();
    await orderService.cancelOrder(selectedOrderId);
    spinner.succeed('Order cancelled successfully!');

    showSuccess(`Order ${selectedOrderId.substring(0, 8)}... has been cancelled`);

  } catch (error: any) {
    showError(error.message);
  }
}