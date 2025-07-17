const { Telegraf } = require('telegraf');

class NotificationService {
  constructor() {
    this.bot = null;
    this.telegramUsername = null;
    this.chatId = null;
    this.enabled = false;
  }

  async initialize(botToken, username) {
    if (botToken && username) {
      this.bot = new Telegraf(botToken);
      this.telegramUsername = username;
      
      // Try to get chat ID from username
      await this.getChatId();
      
      this.enabled = true;
      console.log(`Telegram notifications enabled for ${username}`);
    } else {
      this.enabled = false;
      console.log('Telegram notifications disabled');
    }
  }

  async telegramRequest(method, params = {}) {
    try {
      const result = await this.bot.telegram.callApi(method, params);
      return result;
    } catch (error) {
      throw new Error(error.description || error.message || 'Unknown error');
    }
  }

  async getChatId() {
    try {
      // If it's already a numeric chat ID, use it
      if (!isNaN(this.telegramUsername)) {
        this.chatId = parseInt(this.telegramUsername);
        return;
      }

      // Try to get chat info from username
      const cleanUsername = this.telegramUsername.replace('@', '');
      
      // Try to get chat by username - first try with @
      try {
        const chat = await this.telegramRequest('getChat', { chat_id: `@${cleanUsername}` });
        this.chatId = chat.id;
        console.log(`Found chat ID: ${this.chatId} for @${cleanUsername}`);
        return;
      } catch (error) {
        console.log(`Could not get chat ID for @${cleanUsername}: ${error.message}`);
      }

      // Try without @ prefix
      try {
        const chat = await this.telegramRequest('getChat', { chat_id: cleanUsername });
        this.chatId = chat.id;
        console.log(`Found chat ID: ${this.chatId} for ${cleanUsername}`);
        return;
      } catch (error) {
        console.log(`Could not get chat ID for ${cleanUsername}: ${error.message}`);
      }

      // If both fail, use username as fallback but warn user
      console.warn(`⚠️  Could not resolve chat ID for ${this.telegramUsername}. Using username as fallback.`);
      console.warn(`💡 To fix this: Start a conversation with your bot by sending /start to it first.`);
      this.chatId = `@${cleanUsername}`;
      
    } catch (error) {
      console.error('Error getting chat ID:', error.message);
      // Fallback to username
      this.chatId = this.telegramUsername.startsWith('@') ? this.telegramUsername : `@${this.telegramUsername}`;
    }
  }

  async sendTelegramMessage(message) {
    if (!this.enabled || !this.bot) {
      return;
    }

    if (!message || message.trim() === '') {
      console.error('Cannot send empty message to Telegram');
      return;
    }

    try {
      // Use the resolved chat ID from getChatId()
      const chatId = this.chatId || this.telegramUsername;
      
      console.log(`📤 Sending Telegram notification to ${chatId}...`);
      
      // Send as plain text using Telegraf
      await this.bot.telegram.sendMessage(chatId, message);
      console.log(`✅ Telegram notification sent successfully to ${this.telegramUsername}`);
    } catch (error) {
      console.error('❌ Failed to send Telegram notification:', error.message);
      
      // Provide helpful error messages based on error type
      if (error.message.includes('chat not found')) {
        console.error('💡 Chat not found. Please:');
        console.error('   1. Start a conversation with your bot by sending /start');
        console.error('   2. Make sure the bot token is correct');
        console.error('   3. Verify your username is correct');
      } else if (error.message.includes('bot was blocked')) {
        console.error('💡 Bot was blocked by user. Please unblock the bot and try again.');
      } else if (error.message.includes('Unauthorized')) {
        console.error('💡 Bot token is invalid. Please check your bot token.');
      } else if (error.message.includes('message text is empty')) {
        console.error('💡 Message text is empty. This is likely a bug in the code.');
      } else {
        console.error('💡 Make sure you have started a conversation with your bot by sending /start');
      }
    }
  }

  async notifySuccess(publicKey, amount, status, transactionId, remainingBalance) {
    // Validate parameters and provide defaults
    const safePublicKey = publicKey || 'Unknown';
    const safeAmount = amount || 0;
    const safeStatus = status || 'unknown';
    const safeTransactionId = transactionId || 'unknown';
    const safeRemainingBalance = remainingBalance !== undefined ? remainingBalance : 0;

    const message = 
      `✅ ARIO Top-up Successful\n\n` +
      `Wallet: ${safePublicKey}\n` +
      `Amount: ${safeAmount} ARIO\n` +
      `Status: ${safeStatus}\n` +
      `Transaction ID: ${safeTransactionId}\n` +
      `Remaining Balance: ${safeRemainingBalance.toFixed(6)} ARIO`;

    await this.sendTelegramMessage(message);
  }

  async notifyError(publicKey, errorMessage, requestedAmount = null) {
    let message = 
      `❌ ARIO Top-up Error\n\n` +
      `Wallet: ${publicKey || 'Unknown'}\n` +
      `Error: ${errorMessage}`;

    if (requestedAmount) {
      message += `\nRequested: ${requestedAmount}`;
    }

    await this.sendTelegramMessage(message);
  }

  async notifyInsufficientBalance(publicKey, available, requested) {
    const message = 
      `❌ ARIO Top-up Failed\n\n` +
      `Wallet: ${publicKey}\n` +
      `Reason: Insufficient balance\n` +
      `Available: ${available} ARIO\n` +
      `Requested: ${requested} ARIO`;

    await this.sendTelegramMessage(message);
  }

  async notifyNoBalance(publicKey) {
    const message = 
      `❌ ARIO Top-up Failed\n\n` +
      `Wallet: ${publicKey}\n` +
      `Reason: No balance available\n` +
      `Balance: 0 ARIO`;

    await this.sendTelegramMessage(message);
  }

  async notifyInvalidParameter(publicKey, reason, requestedValue) {
    const message = 
      `❌ ARIO Top-up Failed\n\n` +
      `Wallet: ${publicKey}\n` +
      `Reason: ${reason}\n` +
      `Requested: ${requestedValue}`;

    await this.sendTelegramMessage(message);
  }
}

module.exports = NotificationService;