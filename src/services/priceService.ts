import axios from 'axios';
import { config } from '../config';

export class PriceService {
  private jupiterUrl = 'https://api.jup.ag/price/v2';
  private pumpPortalUrl = 'https://pumpportal.fun/api';
  
  async getPrice(tokenAddress: string): Promise<number | null> {
    // Try DexScreener only since it's most reliable for pump.fun tokens
    const price = await this.tryDexscreenerPrice(tokenAddress);
    
    if (!price) {
      console.log('Could not fetch price from DexScreener');
    }
    
    return price;
  }
  
  private async tryJupiterPrice(tokenAddress: string): Promise<number | null> {
    try {
      console.log('Trying Jupiter API...');
      const response = await axios.get(
        `${this.jupiterUrl}?ids=${tokenAddress}`,
        {
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          }
        }
      );
      
      if (response.data?.data?.[tokenAddress]?.price) {
        const price = response.data.data[tokenAddress].price;
        console.log(`Jupiter price: $${price}`);
        return price;
      }
    } catch (error: any) {
      console.log('Jupiter failed:', error.message);
    }
    return null;
  }
  
  private async tryBirdeyePrice(tokenAddress: string): Promise<number | null> {
    try {
      console.log('Trying Birdeye API...');
      const response = await axios.get(
        `https://public-api.birdeye.so/defi/price?address=${tokenAddress}`,
        {
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
            'x-chain': 'solana'
          }
        }
      );
      
      if (response.data?.data?.value) {
        const price = response.data.data.value;
        console.log(`Birdeye price: $${price}`);
        return price;
      }
    } catch (error: any) {
      console.log('Birdeye failed:', error.message);
    }
    return null;
  }
  
  private async tryDexscreenerPrice(tokenAddress: string): Promise<number | null> {
    try {
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
        {
          timeout: 5000,
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (response.data?.pairs?.[0]?.priceUsd) {
        const price = parseFloat(response.data.pairs[0].priceUsd);
        return price;
      }
    } catch (error: any) {
      console.log('DexScreener failed:', error.message);
    }
    return null;
  }
  
  async validateTokenExists(tokenAddress: string): Promise<boolean> {
    // Simple validation - just check if we can get any data about it
    const price = await this.getPrice(tokenAddress);
    return price !== null;
  }
}