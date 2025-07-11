import inquirer from 'inquirer';
import chalk from 'chalk';
import { OrderService } from '../services/orderService';
import { showOrdersTable, showWarning, clearScreen, showSuccess, showError } from '../utils/display';

export async function manageOrders() {
  clearScreen();
  console.log(chalk.cyan('\n📋 Manage Orders\n'));

  try {
    const orderService = OrderService.getInstance();
    const orders = await orderService.getActiveOrders();

    if (orders.length === 0) {
      showWarning('No active orders found.');
      console.log(chalk.gray('Create new orders from the main menu.'));
      return;
    }

    // Show all orders
    showOrdersTable(orders);
    console.log(chalk.gray(`\nTotal active orders: ${orders.length}`));

    // Ask what to do
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        loop: false,
        choices: [
          { name: '❌ Cancel an Order', value: 'cancel' },
          { name: '↩️  Back to Main Menu', value: 'back' }
        ]
      }
    ]);

    if (action === 'cancel') {
      // Show orders again with numbers
      console.log(chalk.cyan('\n📋 Select Order to Cancel:\n'));
      
      const orderChoices = orders.map((order, index) => ({
        name: `${index + 1}. ${order.type.toUpperCase()} ${order.type === 'buy' && order.usdAmount ? `$${order.usdAmount.toFixed(2)}` : `${order.amount} tokens`} of ${order.token} at $${order.targetPrice.toFixed(6)}`,
        value: order.id
      }));
      
      orderChoices.push({ name: '↩️  Back', value: 'back' });

      const { orderId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'orderId',
          message: 'Select order to cancel:',
          loop: false,
          choices: orderChoices
        }
      ]);

      if (orderId !== 'back') {
        // Confirm cancellation
        const selectedOrder = orders.find(o => o.id === orderId);
        if (selectedOrder) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Cancel ${selectedOrder.type} order for ${selectedOrder.token}?`,
              default: false
            }
          ]);

          if (confirm) {
            try {
              await orderService.cancelOrder(orderId);
              showSuccess('Order cancelled successfully!');
            } catch (error: any) {
              showError(error.message);
            }
          }
        }
      }
    }
  } catch (error: any) {
    showError(error.message);
  }
}