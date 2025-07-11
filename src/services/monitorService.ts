import chalk from 'chalk';
import { OrderService } from './orderService';
import { PriceService } from './priceService';
import { TradeService } from './tradeService';
import { Order } from '../types';

export class MonitorService {
  private static instance: MonitorService;
  private orderService: OrderService;
  private priceService: PriceService;
  private tradeService: TradeService;
  private isMonitoring: boolean = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private checkIntervalMs: number = 5000; // 5 seconds
  private lastCheckTime: Date | null = null;
  
  private constructor() {
    this.orderService = OrderService.getInstance();
    this.priceService = new PriceService();
    this.tradeService = new TradeService();
  }
  
  static getInstance(): MonitorService {
    if (!MonitorService.instance) {
      MonitorService.instance = new MonitorService();
    }
    return MonitorService.instance;
  }
  
  async start(): Promise<void> {
    if (this.isMonitoring) {
      console.log(chalk.yellow('Monitor is already running'));
      return;
    }
    
    this.isMonitoring = true;
    console.log(chalk.green('✓ Price monitor started'));
    console.log(chalk.gray(`Checking prices every ${this.checkIntervalMs / 1000} seconds...`));
    
    // Run immediately
    await this.checkOrders();
    
    // Then run on interval
    this.monitorInterval = setInterval(async () => {
      await this.checkOrders();
    }, this.checkIntervalMs);
  }
  
  stop(): void {
    if (!this.isMonitoring) {
      console.log(chalk.yellow('Monitor is not running'));
      return;
    }
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    this.isMonitoring = false;
    console.log(chalk.red('✗ Price monitor stopped'));
  }
  
  isRunning(): boolean {
    return this.isMonitoring;
  }
  
  getLastCheckTime(): string | null {
    return this.lastCheckTime ? this.lastCheckTime.toLocaleString() : null;
  }
  
  async getMonitoredTokens(): Promise<string[]> {
    const orders = await this.orderService.getActiveOrders();
    const uniqueTokens = [...new Set(orders.map(o => o.tokenAddress))];
    return uniqueTokens;
  }
  
  private async checkOrders(): Promise<void> {
    this.lastCheckTime = new Date();
    
    try {
      const orders = await this.orderService.getActiveOrders();
      
      // Filter out orders that are already being executed
      const pendingOrders = orders.filter(o => o.status === 'pending');
      
      if (pendingOrders.length === 0) {
        return;
      }
      
      // Get unique token addresses
      const tokenAddresses = [...new Set(pendingOrders.map(o => o.tokenAddress))];
      
      // Fetch current prices
      const prices = new Map<string, number>();
      for (const address of tokenAddresses) {
        const price = await this.priceService.getPrice(address);
        if (price !== null) {
          prices.set(address, price);
        }
      }
      
      // Check each order
      for (const order of pendingOrders) {
        const currentPrice = prices.get(order.tokenAddress);
        
        if (!currentPrice) {
          console.log(chalk.yellow(`⚠️  Could not fetch price for ${order.token}`));
          continue;
        }
        
        const shouldExecute = this.shouldExecuteOrder(order, currentPrice);
        
        if (shouldExecute) {
          console.log(chalk.cyan(`\n🎯 Executing ${order.type} order for ${order.token}`));
          console.log(chalk.gray(`Target: $${order.targetPrice}, Current: $${currentPrice}`));
          
          // Immediately mark order as executing to prevent duplicate executions
          await this.orderService.updateOrderStatus(order.id, 'executing');
          await this.executeOrder(order, currentPrice);
        }
      }
    } catch (error: any) {
      console.error(chalk.red('Error in monitor loop:'), error.message);
    }
  }
  
  private shouldExecuteOrder(order: Order, currentPrice: number): boolean {
    if (order.type === 'buy') {
      // Execute buy order if current price is at or below target
      return currentPrice <= order.targetPrice;
    } else {
      // Execute sell order if current price is at or above target
      return currentPrice >= order.targetPrice;
    }
  }
  
  private async executeOrder(order: Order, currentPrice: number): Promise<void> {
    try {
      console.log(chalk.blue(`Executing ${order.type} order ${order.id}...`));
      
      // Calculate amounts for the trade
      let tradeAmount: number;
      let isAmountInSol: boolean;
      
      if (order.type === 'buy') {
        // For buy orders: use SOL amount directly if available, otherwise convert from USD
        if (order.solAmount) {
          tradeAmount = order.solAmount;
          isAmountInSol = true;
          const SOL_PRICE = parseFloat(process.env.SOL_PRICE_USD || '150');
          const usdValue = order.solAmount * SOL_PRICE;
          console.log(chalk.gray(`Buying ${tradeAmount.toFixed(4)} SOL (~$${usdValue.toFixed(2)} at $${SOL_PRICE}/SOL)`));
        } else if (order.usdAmount) {
          // Backward compatibility for old orders
          const SOL_PRICE = parseFloat(process.env.SOL_PRICE_USD || '150');
          tradeAmount = order.usdAmount / SOL_PRICE;
          isAmountInSol = true;
          console.log(chalk.gray(`Buying $${order.usdAmount.toFixed(2)} worth (~${tradeAmount.toFixed(4)} SOL at ~$${SOL_PRICE}/SOL)`));
        } else {
          console.error('Buy order missing amount information');
          return;
        }
      } else {
        // For sell orders: order.amount is the number of tokens to sell
        tradeAmount = order.amount;
        isAmountInSol = false;
        
        console.log(chalk.gray(`Selling ${order.amount.toLocaleString()} tokens`));
      }
      
      const result = await this.tradeService.executeTrade({
        action: order.type,
        tokenAddress: order.tokenAddress,
        amount: tradeAmount,
        isAmountInSol: isAmountInSol,
        slippage: order.slippage || 10 // Use order's slippage or default to 10%
      });
      
      if (result.success) {
        await this.orderService.updateOrderStatus(order.id, 'executed', result.signature);
        
        console.log(chalk.green(`✓ Order executed successfully!`));
        console.log(chalk.gray(`Transaction: ${result.signature}`));
        console.log(chalk.gray(`Solscan: https://solscan.io/tx/${result.signature}`));
      } else {
        await this.orderService.updateOrderStatus(order.id, 'failed');
        console.error(chalk.red(`✗ Order execution failed: ${result.error}`));
      }
    } catch (error: any) {
      await this.orderService.updateOrderStatus(order.id, 'failed');
      console.error(chalk.red(`✗ Order execution error: ${error.message}`));
    }
  }
}