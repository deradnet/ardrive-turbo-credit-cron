class ParameterParser {
  static showUsage() {
    console.error('Usage: node topup.js --wallet <path> --amount <amount|percentage%> [--telegram-bot-token <token>] [--telegram-username <username>]');
    console.error('');
    console.error('Required parameters:');
    console.error('  --wallet <path>              Path to wallet JSON file');
    console.error('  --amount <amount|percentage> Amount to top up (e.g., 10 or 50%)');
    console.error('');
    console.error('Optional parameters:');
    console.error('  --telegram-bot-token <token> Telegram bot token for notifications');
    console.error('  --telegram-username <username> Telegram username to send notifications to');
    console.error('');
    console.error('Examples:');
    console.error('  node topup.js --wallet /wallets/wallet.json --amount 10');
    console.error('  node topup.js --wallet /wallets/wallet.json --amount 50%');
    console.error('  node topup.js --wallet /wallets/wallet.json --amount 100% --telegram-bot-token 123456:ABC --telegram-username @username');
  }

  static parseArguments(args) {
    const params = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg.startsWith('--')) {
        const paramName = arg.substring(2);
        const paramValue = args[i + 1];
        
        if (!paramValue || paramValue.startsWith('--')) {
          console.error(`Missing value for parameter: ${arg}`);
          return null;
        }
        
        params[paramName] = paramValue;
        i++; // Skip the next argument as it's the value
      }
    }
    
    return params;
  }

  static validateParameters(params) {
    const errors = [];
    
    // Check required parameters
    if (!params.wallet) {
      errors.push('--wallet parameter is required');
    }
    
    if (!params.amount) {
      errors.push('--amount parameter is required');
    }
    
    // Check optional Telegram parameters (both must be provided if using Telegram)
    const telegramEnabled = params['telegram-bot-token'] || params['telegram-username'];
    if (telegramEnabled && (!params['telegram-bot-token'] || !params['telegram-username'])) {
      errors.push('Both --telegram-bot-token and --telegram-username must be provided for Telegram notifications');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      telegramEnabled: telegramEnabled && params['telegram-bot-token'] && params['telegram-username']
    };
  }

  static extractParameters(args) {
    const params = this.parseArguments(args);
    
    if (!params) {
      return { success: false, showUsage: true };
    }
    
    const validation = this.validateParameters(params);
    
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        showUsage: true
      };
    }
    
    return {
      success: true,
      walletPath: params.wallet,
      amount: params.amount,
      telegramEnabled: validation.telegramEnabled,
      telegramBotToken: params['telegram-bot-token'],
      telegramUsername: params['telegram-username']
    };
  }
}

class Logger {
  static info(message) {
    console.log(`[INFO] ${message}`);
  }
  
  static error(message) {
    console.error(`[ERROR] ${message}`);
  }
  
  static success(message) {
    console.log(`[SUCCESS] ${message}`);
  }
}

class TelegramHelper {
  static async telegramRequest(botToken, method, params = {}) {
    const https = require('https');
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(params);
      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${botToken}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            if (result.ok) {
              resolve(result.result);
            } else {
              reject(new Error(result.description || 'Unknown error'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  static async getChatId(botToken) {
    try {
      console.log('\n🔍 Getting recent updates to find your chat ID...');
      const updates = await this.telegramRequest(botToken, 'getUpdates');
      
      if (updates.length === 0) {
        console.log('❌ No recent messages found.');
        console.log('💡 Please send any message to your bot first, then run this command again.');
        return null;
      }
      
      const lastUpdate = updates[updates.length - 1];
      const chatId = lastUpdate.message.chat.id;
      const username = lastUpdate.message.from.username;
      
      console.log(`✅ Found chat ID: ${chatId}`);
      console.log(`👤 Username: @${username}`);
      console.log(`\n💡 Use this chat ID instead of username: --telegram-username "${chatId}"`);
      
      return chatId;
    } catch (error) {
      console.error('❌ Error getting chat ID:', error.message);
      return null;
    }
  }
}

module.exports = {
  ParameterParser,
  Logger,
  TelegramHelper
};