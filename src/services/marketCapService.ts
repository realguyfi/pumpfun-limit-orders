import axios from 'axios';

export class MarketCapService {
  private dexScreenerUrl = 'https://api.dexscreener.com/latest/dex/tokens';
  
  async getTokenInfo(tokenAddress: string): Promise<{
    price: number;
    marketCap: number;
    symbol: string;
    name: string;
  } | null> {
    try {
      console.log('Fetching token data from DexScreener...');
      const response = await axios.get(
        `${this.dexScreenerUrl}/${tokenAddress}`,
        {
          timeout: 5000,
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (response.data?.pairs?.[0]) {
        const pair = response.data.pairs[0];
        const price = parseFloat(pair.priceUsd);
        const marketCap = pair.marketCap || pair.fdv || 0;
        const symbol = pair.baseToken.symbol;
        const name = pair.baseToken.name;
        
        console.log(`Found ${symbol}: Price $${price}, Market Cap $${marketCap.toLocaleString()}`);
        
        return {
          price,
          marketCap,
          symbol,
          name
        };
      }
    } catch (error: any) {
      console.log('DexScreener failed:', error.message);
    }
    return null;
  }
  
  calculatePriceFromMarketCap(targetMarketCap: number, currentMarketCap: number, currentPrice: number): number {
    // Price = (Target Market Cap / Current Market Cap) * Current Price
    return (targetMarketCap / currentMarketCap) * currentPrice;
  }
  
  calculateMarketCapFromPrice(targetPrice: number, currentPrice: number, currentMarketCap: number): number {
    // Market Cap = (Target Price / Current Price) * Current Market Cap
    return (targetPrice / currentPrice) * currentMarketCap;
  }
}