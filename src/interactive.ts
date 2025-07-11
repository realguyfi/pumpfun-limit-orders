#!/usr/bin/env node

import 'dotenv/config';
import inquirer from 'inquirer';
import chalk from 'chalk';
import figlet from 'figlet';
import ora from 'ora';
import { 
  createBuyOrder, 
  createSellOrder
} from './interactive/actions';
import { manageOrders } from './interactive/manageOrders';
import { showDashboard } from './interactive/dashboard';
import { clearScreen } from './utils/display';
import { MonitorService } from './services/monitorService';
import { OrderService } from './services/orderService';
import { checkFirstRun, runSetupWizard } from './setup/firstRun';
import { updateSolPrice } from './utils/solPrice';

enum MenuOption {
  BUY = 'buy',
  SELL = 'sell',
  ORDERS = 'orders',
  DASHBOARD = 'dashboard',
  EXIT = 'exit'
}

async function showWelcome() {
  clearScreen();
  console.log(
    chalk.cyan(
      figlet.textSync('Pump Bot', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default'
      })
    )
  );
  console.log(chalk.gray('Simple limit orders for pump.fun tokens\n'));
}

async function mainMenu(): Promise<void> {
  // Check monitoring status
  const monitor = MonitorService.getInstance();
  const orderService = OrderService.getInstance();
  const isMonitoring = monitor.isRunning();
  const activeOrders = await orderService.getActiveOrders();
  const monitoredTokens = await monitor.getMonitoredTokens();
  
  // Show monitoring status in menu header
  if (isMonitoring && activeOrders.length > 0) {
    console.log(chalk.green(`🟢 Monitoring ${monitoredTokens.length} token${monitoredTokens.length !== 1 ? 's' : ''} | ${activeOrders.length} active order${activeOrders.length !== 1 ? 's' : ''}\n`));
  } else if (activeOrders.length > 0 && !isMonitoring) {
    console.log(chalk.yellow(`⚠️  ${activeOrders.length} active order${activeOrders.length !== 1 ? 's' : ''} not being monitored\n`));
  }
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      loop: false, // Prevent cycling through options
      choices: [
        { name: '📈 Create Buy Order', value: MenuOption.BUY },
        { name: '📉 Create Sell Order', value: MenuOption.SELL },
        { name: '📋 Manage Orders', value: MenuOption.ORDERS },
        { name: '📊 Dashboard', value: MenuOption.DASHBOARD },
        new inquirer.Separator(),
        { name: '🚪 Exit', value: MenuOption.EXIT }
      ]
    }
  ]);

  switch (action) {
    case MenuOption.BUY:
      await createBuyOrder();
      break;
    case MenuOption.SELL:
      await createSellOrder();
      break;
    case MenuOption.ORDERS:
      await manageOrders();
      break;
    case MenuOption.DASHBOARD:
      await showDashboard();
      break;
    case MenuOption.EXIT:
      console.log(chalk.cyan('\n👋 Thanks for using Pump Bot! Goodbye!\n'));
      process.exit(0);
  }

  // Return to main menu after action
  await continuePrompt();
  await mainMenu();
}

async function continuePrompt() {
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: chalk.gray('Press Enter to continue...')
    }
  ]);
}

async function main() {
  try {
    // Check if this is first run
    const isFirstRun = await checkFirstRun();
    if (isFirstRun) {
      await runSetupWizard();
    }
    
    // Update SOL price on startup
    await updateSolPrice();
    
    await showWelcome();
    await mainMenu();
  } catch (error: any) {
    if (error.isTtyError) {
      console.error(chalk.red('This app requires an interactive terminal'));
    } else {
      console.error(chalk.red('An error occurred:'), error.message);
    }
    process.exit(1);
  }
}

// Start the interactive CLI
main();