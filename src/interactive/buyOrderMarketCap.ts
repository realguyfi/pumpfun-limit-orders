import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { OrderService } from '../services/orderService';
import { MarketCapService } from '../services/marketCapService';
import { validateTokenAddress } from '../utils/validators';
import { formatPrice, formatNumber, showSuccess, showError, showWarning, clearScreen } from '../utils/display';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { config } from '../config';

export async function createBuyOrderMarketCap() {
  clearScreen();
  console.log(chalk.cyan('\n📈 Create Buy Order (Market Cap)\n'));

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

    // Step 2: Ask how to set the limit order
    const { orderMethod } = await inquirer.prompt([
      {
        type: 'list',
        name: 'orderMethod',
        message: 'How would you like to set your buy order?',
        choices: [
          { name: 'By Market Cap (e.g., buy when MC drops to $100K)', value: 'marketcap' },
          { name: 'By Price (e.g., buy when price drops to $0.001)', value: 'price' }
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
          default: Math.round(tokenInfo.marketCap * 0.8).toString(),
          validate: (input) => {
            const num = parseFloat(input);
            return (!isNaN(num) && num > 0) || 'Please enter a valid market cap';
          }
        }
      ]);
      
      const numTargetMC = parseFloat(targetMarketCap);
      targetPrice = marketCapService.calculatePriceFromMarketCap(numTargetMC, tokenInfo.marketCap, tokenInfo.price);
      
      console.log(chalk.gray(`\nWhen market cap drops to $${numTargetMC.toLocaleString()}, price will be ~${formatPrice(targetPrice)}`));
      
    } else {
      // Get target price directly
      const { inputPrice } = await inquirer.prompt([
        {
          type: 'input',
          name: 'inputPrice',
          message: `Enter target price (current: ${formatPrice(tokenInfo.price)}):`,
          default: (tokenInfo.price * 0.9).toFixed(6),
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

    // Step 3: Get SOL amount to spend
    const { solAmountInput } = await inquirer.prompt([
      {
        type: 'input',
        name: 'solAmountInput',
        message: 'How much SOL to spend?',
        default: '0.1',
        validate: (input) => {
          const num = parseFloat(input);
          return (!isNaN(num) && num > 0) || 'Please enter a valid SOL amount';
        }
      }
    ]);

    const solAmount = parseFloat(solAmountInput);
    const SOL_PRICE = parseFloat(process.env.SOL_PRICE_USD || '150');
    const numUsdAmount = solAmount * SOL_PRICE;
    const estimatedTokens = numUsdAmount / targetPrice;
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
        console.log(chalk.yellow('\n⚠️  High slippage! You may receive significantly fewer tokens than expected.'));
      }
    } else {
      slippage = slippageChoice;
    }
    
    // Check wallet balance
    let walletBalance = 0;
    let hasBalance = false;
    try {
      const connection = new Connection(config.getRpcEndpoint(), 'confirmed');
      const balance = await connection.getBalance(config.getKeypair().publicKey);
      walletBalance = balance / LAMPORTS_PER_SOL;
      hasBalance = true;
    } catch (error) {
      console.log(chalk.yellow('\n⚠️  Could not fetch wallet balance'));
    }
    
    // Check if user has enough balance
    const requiredSol = solAmount + 0.01; // Add 0.01 SOL for fees
    if (hasBalance && walletBalance < requiredSol) {
      showError(`Insufficient balance! You have ${walletBalance.toFixed(4)} SOL but need ~${requiredSol.toFixed(4)} SOL`);
      return;
    }

    // Step 5: Show confirmation
    console.log(chalk.cyan('\n📋 Order Summary:'));
    console.log(chalk.gray('─────────────────────────────'));
    console.log(`Token: ${chalk.white(tokenInfo.symbol)} - ${tokenInfo.name}`);
    console.log(`SOL Amount: ${chalk.white(solAmount.toFixed(4) + ' SOL')} ${chalk.gray(`(~$${numUsdAmount.toFixed(2)} at $${SOL_PRICE}/SOL)`)}`);
    console.log(`Est. Tokens: ${chalk.white('~' + formatNumber(Math.floor(estimatedTokens)))}`);
    console.log(`Target Price: ${chalk.white(formatPrice(targetPrice))}`);
    console.log(`Current Price: ${chalk.yellow(formatPrice(tokenInfo.price))}`);
    console.log(`Current Market Cap: ${chalk.yellow('$' + tokenInfo.marketCap.toLocaleString())}`);
    console.log(`Price Difference: ${priceDiff < 0 ? chalk.green(priceDiff.toFixed(2) + '%') : chalk.red('+' + priceDiff.toFixed(2) + '%')}`);
    console.log(`Slippage: ${chalk.white(slippage + '%')}`);
    
    if (hasBalance) {
      console.log(`\nWallet Balance: ${chalk.white(walletBalance.toFixed(4) + ' SOL')} (~$${(walletBalance * SOL_PRICE).toFixed(2)})`);
      const balanceUsage = (requiredSol / walletBalance) * 100;
      if (balanceUsage > 50) {
        console.log(chalk.yellow(`⚠️  This order will use ${balanceUsage.toFixed(0)}% of your balance!`));
      }
    }

    if (priceDiff > 0) {
      console.log(chalk.yellow('\n⚠️  Warning: Your buy price is above the current market price!'));
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Create this buy order?',
        default: true
      }
    ]);

    if (!confirm) {
      console.log(chalk.gray('Order cancelled'));
      return;
    }

    // Create the order
    const createSpinner = ora('Creating order...').start();
    const orderService = OrderService.getInstance();
    const order = await orderService.createOrder({
      token: tokenInfo.symbol,
      tokenAddress,
      type: 'buy',
      amount: 0,  // Not used for buy orders anymore
      usdAmount: numUsdAmount,
      solAmount: solAmount,
      targetPrice: targetPrice,
      slippage: slippage
    });

    createSpinner.succeed('Order created successfully!');
    
    showSuccess(`Buy order created with ID: ${order.id}`);
    console.log(chalk.gray(`Your order will execute when the price drops to ${formatPrice(targetPrice)}`));
    console.log(chalk.gray(`${solAmount.toFixed(4)} SOL (~$${numUsdAmount.toFixed(2)}) will be spent`));
    
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