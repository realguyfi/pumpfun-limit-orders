import chalk from 'chalk';
import Table from 'cli-table3';

export function clearScreen() {
  process.stdout.write('\x1Bc');
}

export function formatPrice(price: number): string {
  if (price < 0.0001) {
    return `$${price.toExponential(2)}`;
  } else if (price < 1) {
    return `$${price.toFixed(6)}`;
  } else {
    return `$${price.toFixed(2)}`;
  }
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function formatSOL(lamports: number): string {
  return (lamports / 1e9).toFixed(4);
}

export function showOrdersTable(orders: any[]) {
  const table = new Table({
    head: [
      chalk.gray('ID'),
      chalk.gray('Type'),
      chalk.gray('Token'),
      chalk.gray('Amount'),
      chalk.gray('Target Price'),
      chalk.gray('Status'),
      chalk.gray('Created')
    ],
    style: { head: [], border: [] }
  });

  orders.forEach(order => {
    const typeColor = order.type === 'buy' ? chalk.green : chalk.red;
    const statusColor = order.status === 'pending' ? chalk.yellow : chalk.gray;
    
    // Format amount based on order type
    let amountStr;
    if (order.type === 'buy' && order.usdAmount) {
      amountStr = `$${order.usdAmount.toFixed(2)}`;
    } else if (order.type === 'sell') {
      amountStr = formatNumber(order.amount);
    } else {
      amountStr = '-';
    }
    
    table.push([
      order.id.substring(0, 8) + '...',
      typeColor(order.type.toUpperCase()),
      order.token,
      amountStr,
      formatPrice(order.targetPrice),
      statusColor(order.status.toUpperCase()),
      new Date(order.createdAt).toLocaleDateString()
    ]);
  });

  console.log(table.toString());
}

export function showError(message: string) {
  console.log(chalk.red(`\n❌ Error: ${message}\n`));
}

export function showSuccess(message: string) {
  console.log(chalk.green(`\n✅ ${message}\n`));
}

export function showWarning(message: string) {
  console.log(chalk.yellow(`\n⚠️  ${message}\n`));
}

export function showInfo(message: string) {
  console.log(chalk.cyan(`\nℹ️  ${message}\n`));
}