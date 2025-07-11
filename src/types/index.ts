export interface Order {
  id: string;
  token: string;
  tokenAddress: string;
  type: 'buy' | 'sell';
  amount: number;  // For buy: not used, for sell: token amount
  usdAmount?: number;  // For buy orders: USD amount to spend
  solAmount?: number;  // For buy orders: SOL amount to spend
  targetPrice: number;
  slippage?: number;  // Slippage tolerance percentage
  status: 'pending' | 'executing' | 'executed' | 'cancelled' | 'failed';
  createdAt: Date;
  executedAt?: Date;
  txSignature?: string;
}

export interface TokenPrice {
  tokenAddress: string;
  symbol: string;
  price: number;
  timestamp: Date;
}

export interface JupiterPriceResponse {
  data: {
    [key: string]: {
      id: string;
      mintSymbol: string;
      vsToken: string;
      vsTokenSymbol: string;
      price: number;
    };
  };
}

export interface PumpPortalTradeRequest {
  action: 'buy' | 'sell';
  mint: string;
  amount: number;
  denominatedInSol: 'true' | 'false';
  slippage: number;
  priorityFee: number;
  pool: 'pump' | 'raydium' | 'auto';
}

export interface PumpPortalTradeResponse {
  success: boolean;
  signature?: string;
  error?: string;
}