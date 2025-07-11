import chalk from 'chalk';
import ora from 'ora';
import { OrderService } from '../services/orderService';
import { JupiterService } from '../services/jupiterService';
import { validateTokenAddress } from '../utils/validators';

export async function sellCommand(token: string, amount: string, price: string, options: any) {
  const spinner = ora('Processing sell order...').start();
  
  try {
    // Validate inputs
    const numAmount = parseFloat(amount);
    const numPrice = parseFloat(price);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Invalid amount. Must be a positive number.');
    }
    
    if (isNaN(numPrice) || numPrice <= 0) {
      throw new Error('Invalid price. Must be a positive number.');
    }

    // Check if token is address or symbol
    let tokenAddress = token;
    let tokenSymbol = token;
    
    if (!options.symbol && !validateTokenAddress(token)) {
      spinner.text = 'Looking up token by symbol...';
      // TODO: Implement token lookup by symbol
      throw new Error('Please provide a valid token address or use -s flag for symbol lookup');
    }

    // Get current price
    spinner.text = 'Fetching current price...';
    const jupiterService = new JupiterService();
    const currentPrice = await jupiterService.getPrice(tokenAddress);
    
    // Create order
    spinner.text = 'Creating limit order...';
    const orderService = OrderService.getInstance();
    const order = await orderService.createOrder({
      token: tokenSymbol,
      tokenAddress,
      type: 'sell',
      amount: numAmount,
      targetPrice: numPrice,
    });

    spinner.succeed(chalk.green('Sell order created successfully!'));
    
    console.log(chalk.cyan('\n📋 Order Details:'));
    console.log(chalk.gray('─────────────────────────────'));
    console.log(`Order ID: ${chalk.white(order.id)}`);
    console.log(`Token: ${chalk.white(tokenSymbol)}`);
    console.log(`Amount: ${chalk.white(numAmount.toLocaleString())}`);
    console.log(`Target Price: ${chalk.white('$' + numPrice.toFixed(6))}`);
    console.log(`Current Price: ${chalk.yellow('$' + currentPrice.toFixed(6))}`);
    console.log(`Status: ${chalk.green('PENDING')}`);
    
    const priceDiff = ((numPrice - currentPrice) / currentPrice * 100).toFixed(2);
    console.log(`Price Difference: ${chalk.cyan(priceDiff + '%')}`);
    
    console.log(chalk.gray('\n💡 Your order will execute when the price rises to $' + numPrice.toFixed(6)));
    
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to create sell order'));
    console.error(chalk.red('\n❌ Error:'), error.message);
  }
}