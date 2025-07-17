const { ANT } = require('@ar.io/sdk');
const { TurboFactory, ARIOToTokenAmount } = require('@ardrive/turbo-sdk');
const fs = require('fs').promises;
const path = require('path');

class TopupService {
  constructor(processId = "qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE") {
    this.processId = processId;
    this.ant = ANT.init({ processId: this.processId });
    this.DECIMALS = 1e6;
  }

  async loadWallet(walletPath) {
    try {
      const walletJson = await fs.readFile(walletPath, 'utf8');
      const wallet = JSON.parse(walletJson);
      const publicKey = path.basename(walletPath, '.json');
      
      return { wallet, publicKey };
    } catch (error) {
      throw new Error(`Failed to load wallet: ${error.message}`);
    }
  }

  async getBalance(publicKey) {
    try {
      const balanceRaw = await this.ant.getBalance({ address: publicKey });
      const balanceNum = Number(balanceRaw);
      const balanceDecimal = balanceNum / this.DECIMALS;
      
      return {
        raw: balanceRaw,
        decimal: balanceDecimal,
        hasBalance: balanceNum > 0
      };
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  calculateTopupAmount(amountOrPercentage, balanceDecimal) {
    if (amountOrPercentage.endsWith('%')) {
      const percentage = parseFloat(amountOrPercentage.slice(0, -1));
      
      if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
        throw new Error('Invalid percentage. Must be between 0 and 100.');
      }
      
      return {
        amount: balanceDecimal * (percentage / 100),
        type: 'percentage',
        value: percentage
      };
    } else {
      const amount = parseFloat(amountOrPercentage);
      
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount. Must be a positive number.');
      }
      
      if (amount > balanceDecimal) {
        throw new Error(`Insufficient balance. Available: ${balanceDecimal} ARIO, Requested: ${amount} ARIO`);
      }
      
      return {
        amount: amount,
        type: 'absolute',
        value: amount
      };
    }
  }

  async performTopup(wallet, topupAmount) {
    try {
      const tokenAmount = ARIOToTokenAmount(topupAmount);
      
      const turbo = await TurboFactory.authenticated({
        signer: wallet,
        token: 'ario',
      });

      const result = await turbo.topUpWithTokens({
        tokenAmount,
      });

      return {
        status: result.status,
        transactionId: result.id,
        amount: topupAmount
      };
    } catch (error) {
      throw new Error(`Top-up failed: ${error.message}`);
    }
  }

  async executeTopup(walletPath, amountOrPercentage) {
    // Load wallet
    const { wallet, publicKey } = await this.loadWallet(walletPath);
    
    // Get balance
    const balance = await this.getBalance(publicKey);
    
    if (!balance.hasBalance) {
      throw new Error('No balance available to top up.');
    }
    
    // Calculate topup amount
    const topupCalculation = this.calculateTopupAmount(amountOrPercentage, balance.decimal);
    
    // Perform topup
    const result = await this.performTopup(wallet, topupCalculation.amount);
    
    return {
      publicKey,
      balance: balance.decimal,
      topupAmount: topupCalculation.amount,
      topupType: topupCalculation.type,
      topupValue: topupCalculation.value,
      status: result.status,
      transactionId: result.transactionId,
      remainingBalance: balance.decimal - topupCalculation.amount
    };
  }
}

module.exports = TopupService;