import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { OrderService } from '../services/orderService';
import { MarketCapService } from '../services/marketCapService';
import { validateTokenAddress } from '../utils/validators';
import { formatPrice, formatNumber, showSuccess, showError, clearScreen } from '../utils/display';
import { Connection, PublicKey, ParsedAccountData } from '@solana/web3.js';
import { config } from '../config';

export async function createSellOrderMarketCap() {
  clearScreen();
  console.log(chalk.cyan('\n📉 Create Sell Order (Market Cap)\n'));

  try {
    // Step 1: Get token address
    const { tokenAddress } = await inquirer.prompt([
      {
        type: 'input',
        name: 'tokenAddress',
        message: 'Enter token address:',
        validate: (input) => {
          if (!input) return 'Please enter a token address';
          if (!validateTokenAddress(input)) return 'Invalid token address format';
          return true;
        }
      }
    ]);

    // Get token info including market cap
    const spinner = ora('Fetching token information...').start();
    const marketCapService = new MarketCapService();
    
    const tokenInfo = await marketCapService.getTokenInfo(tokenAddress);
    
    if (!tokenInfo) {
      spinner.fail('Could not fetch token information');
      return;
    }
    
    spinner.succeed(`Found ${tokenInfo.symbol}: MC $${tokenInfo.marketCap.toLocaleString()} | Price ${formatPrice(tokenInfo.price)}`);
    
    // Get token balance
    let tokenBalance = 0;
    try {
      const connection = new Connection(config.getRpcEndpoint(), 'confirmed');
      const walletPubkey = config.getKeypair().publicKey;
      const tokenMint = new PublicKey(tokenAddress);
      
      // Get token accounts for this mint
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        walletPubkey,
        { mint: tokenMint }
      );
      
      if (tokenAccounts.value.length > 0) {
        const accountInfo = tokenAccounts.value[0].account.data as ParsedAccountData;
        tokenBalance = accountInfo.parsed.info.tokenAmount.uiAmount || 0;
      }
      
      if (tokenBalance === 0) {
        console.log(chalk.yellow(`\n⚠️  You don't have any ${tokenInfo.symbol} tokens`));
        showError('Cannot create sell order without tokens');
        return;
      }
    } catch (error) {
      console.log(chalk.yellow('\n⚠️  Could not fetch token balance'));
      tokenBalance = 0;
    }
    
    // Check existing sell orders for this token
    const orderService = OrderService.getInstance();
    const existingOrders = await orderService.getOrdersByToken(tokenAddress);
    const pendingSellOrders = existingOrders.filter(o => o.type === 'sell' && o.status === 'pending');
    
    let committedAmount = 0;
    for (const order of pendingSellOrders) {
      committedAmount += order.amount;
    }
    
    const availableBalance = Math.max(0, tokenBalance - committedAmount);
    
    // Show balance information
    console.log(chalk.green(`\n💰 Your balance: ${formatNumber(tokenBalance)} ${tokenInfo.symbol}`));
    if (committedAmount > 0) {
      console.log(chalk.yellow(`📋 Committed in orders: ${formatNumber(committedAmount)} ${tokenInfo.symbol} (${pendingSellOrders.length} order${pendingSellOrders.length !== 1 ? 's' : ''})`));
      console.log(chalk.white(`✅ Available to sell: ${formatNumber(availableBalance)} ${tokenInfo.symbol}`));
    }
    
    if (availableBalance === 0) {
      console.log(chalk.red('\n❌ All tokens are already committed in existing sell orders!'));
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '📋 View/Cancel existing orders', value: 'manage' },
            { name: '↩️  Return to main menu', value: 'return' }
          ]
        }
      ]);
      
      if (action === 'manage') {
        const { manageOrders } = await import('./manageOrders');
        await manageOrders();
      }
      return;
    }

    // Step 2: Ask how to set the limit order
    const { orderMethod } = await inquirer.prompt([
      {
        type: 'list',
        name: 'orderMethod',
        message: 'How would you like to set your sell order?',
        choices: [
          { name: 'By Market Cap (e.g., sell when MC rises to $1M)', value: 'marketcap' },
          { name: 'By Price (e.g., sell when price rises to $0.01)', value: 'price' }
        ]
      }
    ]);

    let targetPrice: number;
    
    if (orderMethod === 'marketcap') {
      // Get target market cap
      const { targetMarketCap } = await inquirer.prompt([
        {
          type: 'input',
          name: 'targetMarketCap',
          message: `Enter target market cap in USD (current: $${tokenInfo.marketCap.toLocaleString()}):`,
          default: Math.round(tokenInfo.marketCap * 1.5).toString(),
          validate: (input) => {
            const num = parseFloat(input);
            return (!isNaN(num) && num > 0) || 'Please enter a valid market cap';
          }
        }
      ]);
      
      const numTargetMC = parseFloat(targetMarketCap);
      targetPrice = marketCapService.calculatePriceFromMarketCap(numTargetMC, tokenInfo.marketCap, tokenInfo.price);
      
      console.log(chalk.gray(`\nWhen market cap rises to $${numTargetMC.toLocaleString()}, price will be ~${formatPrice(targetPrice)}`));
      
    } else {
      // Get target price directly
      const { inputPrice } = await inquirer.prompt([
        {
          type: 'input',
          name: 'inputPrice',
          message: `Enter target price (current: ${formatPrice(tokenInfo.price)}):`,
          default: (tokenInfo.price * 1.5).toFixed(6),
          validate: (input) => {
            const num = parseFloat(input);
            return (!isNaN(num) && num > 0) || 'Please enter a valid price';
          }
        }
      ]);
      
      targetPrice = parseFloat(inputPrice);
      const targetMC = marketCapService.calculateMarketCapFromPrice(targetPrice, tokenInfo.price, tokenInfo.marketCap);
      
      console.log(chalk.gray(`\nAt price ${formatPrice(targetPrice)}, market cap will be ~$${targetMC.toLocaleString()}`));
    }

    // Step 3: Get amount
    const message = availableBalance < tokenBalance 
      ? `How many ${tokenInfo.symbol} tokens to sell? (Available: ${formatNumber(availableBalance)})`
      : `How many ${tokenInfo.symbol} tokens to sell?`;
      
    const { amountChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'amountChoice',
        message: message,
        choices: [
          { name: `🔹 25% (${formatNumber(Math.floor(availableBalance * 0.25))})`, value: 0.25 },
          { name: `🔸 50% (${formatNumber(Math.floor(availableBalance * 0.5))})`, value: 0.5 },
          { name: `🔶 75% (${formatNumber(Math.floor(availableBalance * 0.75))})`, value: 0.75 },
          { name: `💯 100% (${formatNumber(Math.floor(availableBalance))})`, value: 1 },
          { name: '✏️  Custom amount', value: 'custom' }
        ]
      }
    ]);

    let numAmount: number;
    
    if (amountChoice === 'custom') {
      const { amount } = await inquirer.prompt([
        {
          type: 'input',
          name: 'amount',
          message: `Enter custom amount (Available: ${formatNumber(availableBalance)}):`,
          validate: (input) => {
            const num = parseFloat(input);
            if (isNaN(num) || num <= 0) {
              return 'Please enter a valid amount';
            }
            if (num > availableBalance) {
              return `You only have ${formatNumber(availableBalance)} ${tokenInfo.symbol} available`;
            }
            return true;
          }
        }
      ]);
      numAmount = parseFloat(amount);
    } else {
      numAmount = Math.floor(availableBalance * amountChoice);
    }

    const totalValue = numAmount * targetPrice;
    const priceDiff = ((targetPrice - tokenInfo.price) / tokenInfo.price * 100);
    
    // Step 4: Get slippage preference
    const { slippageChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'slippageChoice',
        message: 'Select slippage tolerance:',
        choices: [
          { name: '🟢 5% - Low slippage (stable tokens)', value: 5 },
          { name: '🟡 10% - Standard slippage (most tokens)', value: 10 },
          { name: '🔴 15% - High slippage (volatile tokens)', value: 15 },
          { name: '✏️  Custom (1-50%)', value: 'custom' }
        ],
        default: 10
      }
    ]);

    let slippage: number;
    
    if (slippageChoice === 'custom') {
      const { customSlippage } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customSlippage',
          message: 'Enter custom slippage percentage (1-50):',
          validate: (input) => {
            const num = parseFloat(input);
            if (isNaN(num) || num < 1 || num > 50) {
              return 'Slippage must be between 1% and 50%';
            }
            return true;
          }
        }
      ]);
      
      slippage = parseFloat(customSlippage);
      
      if (slippage > 15) {
        console.log(chalk.yellow('\n⚠️  High slippage! You may receive significantly less SOL than expected.'));
      }
    } else {
      slippage = slippageChoice;
    }

    // Step 5: Show confirmation
    console.log(chalk.cyan('\n📋 Order Summary:'));
    console.log(chalk.gray('─────────────────────────────'));
    console.log(`Token: ${chalk.white(tokenInfo.symbol)} - ${tokenInfo.name}`);
    console.log(`Amount: ${chalk.white(formatNumber(numAmount))} tokens`);
    console.log(`Target Price: ${chalk.white(formatPrice(targetPrice))}`);
    console.log(`Current Price: ${chalk.yellow(formatPrice(tokenInfo.price))}`);
    console.log(`Current Market Cap: ${chalk.yellow('$' + tokenInfo.marketCap.toLocaleString())}`);
    console.log(`Total Value: ${chalk.green(formatPrice(totalValue))} ${chalk.gray('(minus fees)')}`);
    console.log(`Price Difference: ${priceDiff > 0 ? chalk.green('+' + priceDiff.toFixed(2) + '%') : chalk.red(priceDiff.toFixed(2) + '%')}`);
    console.log(`Slippage: ${chalk.white(slippage + '%')}`);

    if (priceDiff < 0) {
      console.log(chalk.yellow('\n⚠️  Warning: Your sell price is below the current market price!'));
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Create this sell order?',
        default: true
      }
    ]);

    if (!confirm) {
      console.log(chalk.gray('Order cancelled'));
      return;
    }

    // Create the order
    const createSpinner = ora('Creating order...').start();
    const order = await orderService.createOrder({
      token: tokenInfo.symbol,
      tokenAddress,
      type: 'sell',
      amount: numAmount,
      targetPrice: targetPrice,
      slippage: slippage
    });

    createSpinner.succeed('Order created successfully!');
    
    showSuccess(`Sell order created with ID: ${order.id}`);
    console.log(chalk.gray(`Your order will execute when the price rises to ${formatPrice(targetPrice)}`));
    
    // Auto-start monitoring
    const { MonitorService } = await import('../services/monitorService');
    const monitor = MonitorService.getInstance();
    if (!monitor.isRunning()) {
      await monitor.start();
      console.log(chalk.green('\n✅ Monitoring started in background'));
      console.log(chalk.gray('Your orders will execute automatically when prices reach their targets'));
    }

  } catch (error: any) {
    showError(error.message);
  }
}