import axios from 'axios';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export async function updateSolPrice(): Promise<void> {
  try {
    // Try to fetch from CoinGecko API (free tier)
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { timeout: 5000 }
    );
    
    const solPrice = response.data.solana.usd;
    
    if (solPrice && solPrice > 0) {
      // Update .env file
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }
      
      // Update or add SOL_PRICE_USD
      if (envContent.includes('SOL_PRICE_USD=')) {
        envContent = envContent.replace(/SOL_PRICE_USD=.*/g, `SOL_PRICE_USD=${solPrice}`);
      } else {
        envContent += `\n# SOL Price in USD (auto-updated)\nSOL_PRICE_USD=${solPrice}\n`;
      }
      
      fs.writeFileSync(envPath, envContent.trim() + '\n');
      
      // Update process.env for current session
      process.env.SOL_PRICE_USD = solPrice.toString();
      
      console.log(chalk.gray(`Updated SOL price: $${solPrice.toFixed(2)}`));
    }
  } catch (error) {
    // Silently fail - will use default or existing price
    console.log(chalk.gray('Using default SOL price: $150'));
  }
}