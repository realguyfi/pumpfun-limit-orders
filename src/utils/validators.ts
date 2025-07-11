import { PublicKey } from '@solana/web3.js';

export function validateTokenAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function validateAmount(amount: string): number {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) {
    throw new Error('Amount must be a positive number');
  }
  return num;
}

export function validatePrice(price: string): number {
  const num = parseFloat(price);
  if (isNaN(num) || num <= 0) {
    throw new Error('Price must be a positive number');
  }
  return num;
}

export function formatTokenAmount(amount: number, decimals: number = 6): string {
  return (amount / Math.pow(10, decimals)).toLocaleString();
}

export function parseTokenAmount(amount: number, decimals: number = 6): number {
  return Math.floor(amount * Math.pow(10, decimals));
}