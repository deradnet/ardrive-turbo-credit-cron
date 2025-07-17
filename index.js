const TopupService = require('./src/topup-service');
const NotificationService = require('./src/notification');
const { ParameterParser, Logger, TelegramHelper } = require('./src/utils');

async function main() {
  try {
    // Parse arguments
    const args = process.argv.slice(2);
    
    // Special command to get chat ID
    if (args.includes('--get-chat-id')) {
      const tokenIndex = args.indexOf('--telegram-bot-token');
      if (tokenIndex === -1 || !args[tokenIndex + 1]) {
        Logger.error('--telegram-bot-token is required with --get-chat-id');
        process.exit(1);
      }
      
      const botToken = args[tokenIndex + 1];
      await TelegramHelper.getChatId(botToken);
      process.exit(0);
    }
    
    const params = ParameterParser.extractParameters(args);
    
    if (!params.success) {
      if (params.errors) {
        params.errors.forEach(error => Logger.error(error));
      }
      ParameterParser.showUsage();
      process.exit(1);
    }
    
    // Initialize services
    const topupService = new TopupService();
    const notificationService = new NotificationService();
    
    if (params.telegramEnabled) {
      notificationService.initialize(params.telegramBotToken, params.telegramUsername);
    }
    
    // Execute topup
    Logger.info(`Starting ARIO top-up: ${params.amount} from ${params.walletPath}`);
    const result = await topupService.executeTopup(params.walletPath, params.amount);
    
    // Log success
    Logger.success(`Top-up completed! Status: ${result.status}, TX: ${result.transactionId}`);
    Logger.info(`Used: ${result.topupAmount} ARIO, Remaining: ${result.remainingBalance.toFixed(6)} ARIO`);
    
    // Send notification
    if (params.telegramEnabled) {
      await notificationService.notifySuccess(
        result.publicKey,
        result.topupAmount,
        result.status,
        result.transactionId,
        result.remainingBalance
      );
    }
    
  } catch (error) {
    Logger.error(`Failed: ${error.message}`);
    
    // Send error notification if telegram is enabled
    const args = process.argv.slice(2);
    const params = ParameterParser.extractParameters(args);
    
    if (params.success && params.telegramEnabled) {
      const notificationService = new NotificationService();
      await notificationService.initialize(params.telegramBotToken, params.telegramUsername);
      
      const publicKey = params.walletPath ? 
        require('path').basename(params.walletPath, '.json') : 'Unknown';
      
      await notificationService.notifyError(publicKey, error.message, params.amount);
    }
    
    process.exit(1);
  }
}

main();