# 🚀 Pump.fun Limit Order Bot

An intuitive limit order bot for pump.fun tokens with a user-friendly interactive interface. Perfect for both beginners and experienced traders.

## ✨ Features

- 📈 **Market Cap-Based Orders** - Set buy orders based on market cap targets
- 💵 **USD-Based Trading** - Specify orders in USD amounts, not token counts
- 🔄 **Auto-Monitoring** - Orders execute automatically when targets are reached
- 📊 **Unified Dashboard** - See all your orders, balances, and monitoring status
- 🎯 **All Pump.fun Tokens** - Works with any token on pump.fun
- 🛡️ **Built-in Safety** - Balance checks and smart warnings before trades

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- Some SOL for trading (the bot will create a wallet for you)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/realguyfi/pumpfun-limit-orders.git
cd pumpfun-limit-orders
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. (Optional) Configure environment:
```bash
cp .env.example .env
# Edit .env to customize SOL price, slippage, etc.
```

5. Start the bot:
```bash
npm start
```

The bot will guide you through wallet setup on first run! 🎉

## 📱 How to Use

### Main Menu

The simplified menu has just 5 options:

1. **📈 Create Buy Order** - Buy when price/market cap drops
2. **📉 Create Sell Order** - Sell when price/market cap rises  
3. **📋 Manage Orders** - View and cancel orders
4. **📊 Dashboard** - See everything at a glance
5. **🚪 Exit** - Close the bot

### Creating Orders

When creating buy orders:
- Enter token address
- Choose to set target by market cap or price
- Enter USD amount to spend (e.g., $10)
- Confirm the order

The bot automatically:
- Starts monitoring after order creation
- Shows current prices and distances to targets
- Executes when targets are reached
- Sends transaction confirmations

### Dashboard View

The dashboard shows:
- 💰 Wallet balance in SOL and USD
- 🔄 Monitoring status (active/inactive)
- 📈 Order statistics and history
- 🎯 Active orders with current prices
- ⚡ Quick monitoring controls

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# Pricing
SOL_PRICE_USD=150          # Current SOL price
DEFAULT_BUY_AMOUNT_USD=5    # Default buy amount

# Trading
DEFAULT_SLIPPAGE=10         # Slippage tolerance %

# Network
RPC_ENDPOINT=https://api.mainnet-beta.solana.com
```

### Wallet Setup

On first run, the bot will help you:
1. Import an existing wallet OR
2. Generate a new wallet OR  
3. Create a wallet.json template

Your wallet configuration is stored in `dist/config/wallet.json`:
```json
{
  "publicKey": "7AAKA7M4...", 
  "privateKey": "3ifUr2dZ...",
  "pumpPortalApiKey": "auto-generated-by-pumpportal"
}
```

⚠️ **Security**: Never share your private key with anyone!

## 📖 Examples

### Example: Buy 0.1 SOL worth when fartcoin drops 10%

1. Select "📈 Create Buy Order"
2. Enter fartcoin's token address: `9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump`
3. Choose "By Market Cap"
4. Enter target market cap (10% lower than current)
5. Enter amount: `0.1`
6. Confirm order

The bot will buy 0.1 SOL worth of fartcoin when the market cap target is reached.

### Example: Take profits on fartcoin

1. Select "📉 Create Sell Order"
2. Enter fartcoin's token address: `9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump`
3. Enter amount of fartcoin to sell
4. Set target price (e.g., 20% higher)
5. Confirm order

## 🛠️ Troubleshooting

**"Token not found" error**
- Verify you're using the correct token address
- Check that the token exists on pump.fun

**"Insufficient balance" error**
- Check your SOL balance in the Dashboard
- Each trade needs ~0.01 SOL for network fees
- Buy orders need the SOL amount you want to spend
- Remember: PumpPortal charges 1% fee on all trades

**Orders not executing**
- Check monitoring is active (green dot in menu)
- Verify your target prices are realistic
- Ensure you have sufficient balance

**First run issues**
- Delete `dist/config/wallet.json` to restart setup
- Make sure Node.js 16+ is installed
- Run `npm install` if dependencies are missing

## 🔒 Security Best Practices

1. **Never share your private key**
2. **Keep wallet.json secure** - it's in .gitignore by default
3. **Start with small amounts** to test the bot
4. **Monitor your first few trades** to ensure everything works
5. **Use a dedicated trading wallet**, not your main wallet

## 📊 How It Works

1. **Price Monitoring**: Checks DexScreener every 5 seconds
2. **Order Execution**: Uses PumpPortal Lightning API (1% fee)
3. **Token Support**: Works with all pump.fun tokens
4. **Slippage Protection**: Default 10% to prevent failed trades

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## 📜 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This bot is for educational purposes. Trading cryptocurrency carries risk. Only trade what you can afford to lose. The authors are not responsible for any losses incurred while using this software.

---

Made with ❤️ for the pump.fun community

Need help? Open an issue on GitHub!