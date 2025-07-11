import axios from 'axios';
import { config } from '../config';
import { PumpPortalTradeRequest, PumpPortalTradeResponse } from '../types';

export class TradeService {
  private apiKey: string;
  private baseUrl: string = 'https://pumpportal.fun/api';
  
  constructor() {
    this.apiKey = config.getPumpPortalApiKey();
  }
  
  async executeTrade(params: {
    action: 'buy' | 'sell';
    tokenAddress: string;
    amount: number;
    isAmountInSol: boolean;
    slippage?: number;
  }): Promise<PumpPortalTradeResponse> {
    try {
      const tradeRequest: PumpPortalTradeRequest = {
        action: params.action,
        mint: params.tokenAddress,
        amount: params.amount,
        denominatedInSol: params.isAmountInSol ? 'true' : 'false',
        slippage: params.slippage || 10, // 10% default
        priorityFee: 0.00005, // Standard priority fee
        pool: 'auto' // Let PumpPortal choose the best pool
      };
      
      console.log('\n📤 Sending trade request to PumpPortal:');
      console.log(`  Action: ${tradeRequest.action}`);
      console.log(`  Token: ${tradeRequest.mint}`);
      console.log(`  Amount: ${tradeRequest.amount} ${params.isAmountInSol ? 'SOL' : 'tokens'}`);
      console.log(`  Slippage: ${tradeRequest.slippage}%`);
      console.log(`  Pool: ${tradeRequest.pool}`);
      
      const response = await axios.post(
        `${this.baseUrl}/trade?api-key=${this.apiKey}`,
        tradeRequest,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      if (response.status === 200) {
        console.log('✅ Trade request successful!');
        return {
          success: true,
          signature: response.data.signature || response.data.tx
        };
      } else {
        console.error('❌ Trade request failed:', response.data);
        return {
          success: false,
          error: response.data.error || 'Unknown error'
        };
      }
    } catch (error: any) {
      console.error('❌ Trade execution error:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        // Check for specific error messages
        if (error.response.data?.error) {
          const errorMsg = error.response.data.error;
          
          // Check for common errors
          if (errorMsg.includes('insufficient')) {
            return {
              success: false,
              error: `Insufficient balance: ${errorMsg}`
            };
          } else if (errorMsg.includes('slippage')) {
            return {
              success: false,
              error: `Slippage too high. Try increasing slippage tolerance.`
            };
          }
        }
        
        return {
          success: false,
          error: error.response.data?.error || error.response.statusText
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to execute trade'
      };
    }
  }
  
  async simulateTrade(params: {
    action: 'buy' | 'sell';
    tokenAddress: string;
    amount: number;
    isAmountInSol: boolean;
  }): Promise<{
    estimatedOutput: number;
    priceImpact: number;
    fee: number;
  }> {
    // For now, return estimates
    // In production, you'd call a simulation endpoint
    return {
      estimatedOutput: params.amount * 0.99, // 1% slippage estimate
      priceImpact: 0.01,
      fee: params.amount * 0.005 // 0.5% fee
    };
  }
  
  async checkTransactionStatus(signature: string): Promise<{
    confirmed: boolean;
    error?: string;
  }> {
    try {
      // Check transaction status on Solana
      // For now, we'll assume it's confirmed
      // In production, use Connection.getSignatureStatus
      return { confirmed: true };
    } catch (error: any) {
      return {
        confirmed: false,
        error: error.message
      };
    }
  }
}