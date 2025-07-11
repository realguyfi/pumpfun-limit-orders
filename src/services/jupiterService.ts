import axios from 'axios';
import { JupiterPriceResponse } from '../types';

export class JupiterService {
  private priceUrl = 'https://api.jup.ag/price/v2';
  
  async getPrice(tokenAddress: string): Promise<number> {
    try {
      // First try the main price endpoint
      console.log(`Fetching price for token: ${tokenAddress}`);
      
      const response = await axios.get(
        `${this.priceUrl}?ids=${tokenAddress}`,
        {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'pump-limit-order-bot/1.0'
          }
        }
      );
      
      console.log('Jupiter response:', JSON.stringify(response.data, null, 2));
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response from Jupiter API');
      }
      
      const priceData = response.data.data[tokenAddress];
      
      if (!priceData || !priceData.price) {
        throw new Error(`No price data found for token: ${tokenAddress}`);
      }
      
      return priceData.price;
    } catch (error: any) {
      console.error('Jupiter API error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.code === 'ENOTFOUND') {
        throw new Error('Cannot connect to Jupiter API. Please check your internet connection.');
      }
      
      if (error.response?.status === 404) {
        throw new Error('Token not found. Make sure the token is listed on Jupiter.');
      }
      
      throw new Error(`Failed to fetch price: ${error.message}`);
    }
  }
  
  async getTokenBasicInfo(tokenAddress: string): Promise<any> {
    try {
      console.log(`Fetching basic info for token: ${tokenAddress}`);
      
      // Try to get basic token info from Jupiter
      const response = await axios.get(
        `https://api.jup.ag/tokens/v1/${tokenAddress}`,
        {
          timeout: 10000,
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.log('Could not fetch token metadata from Jupiter');
      return null;
    }
  }
  
  async getPrices(tokenAddresses: string[]): Promise<Map<string, number>> {
    try {
      const ids = tokenAddresses.join(',');
      const response = await axios.get(
        `${this.priceUrl}?ids=${ids}`,
        {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'pump-limit-order-bot/1.0'
          }
        }
      );
      
      const prices = new Map<string, number>();
      
      if (response.data && response.data.data) {
        for (const address of tokenAddresses) {
          const priceData = response.data.data[address];
          if (priceData && priceData.price) {
            prices.set(address, priceData.price);
          }
        }
      }
      
      return prices;
    } catch (error: any) {
      console.error('Failed to fetch prices:', error.message);
      throw new Error(`Failed to fetch prices: ${error.message}`);
    }
  }
}