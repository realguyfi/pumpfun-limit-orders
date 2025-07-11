import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';

interface WalletConfig {
  publicKey: string;
  privateKey: string;
  pumpPortalApiKey: string;
}

class ConfigManager {
  private walletConfig: WalletConfig | null = null;
  private keypair: Keypair | null = null;
  private configPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), 'dist', 'config', 'wallet.json');
  }

  private ensureConfigLoaded(): void {
    if (this.walletConfig && this.keypair) return;
    
    if (!fs.existsSync(this.configPath)) {
      throw new Error('Wallet configuration not found. Please run the setup wizard.');
    }

    this.walletConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
    this.keypair = Keypair.fromSecretKey(bs58.decode(this.walletConfig!.privateKey));
  }

  getPublicKey(): string {
    this.ensureConfigLoaded();
    return this.walletConfig!.publicKey;
  }

  getKeypair(): Keypair {
    this.ensureConfigLoaded();
    return this.keypair!;
  }

  getPumpPortalApiKey(): string {
    this.ensureConfigLoaded();
    return this.walletConfig!.pumpPortalApiKey;
  }

  hasConfig(): boolean {
    return fs.existsSync(this.configPath);
  }

  getRpcEndpoint(): string {
    return process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
  }
}

export const config = new ConfigManager();