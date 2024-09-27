const TelegramBot = require('node-telegram-bot-api');
const PDFDocument = require('pdfkit');
const fs = require('fs');

// Replace '7739626112:AAHVJXMdorsiiyTsp9wtclsbnks84m4g8eI' with your bot's API token
const bot = new TelegramBot('YOUR_BOT_API_KEY', { polling: true });

// Start command handler
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome! Send me the text you want to convert to PDF.');
});

// Message handler
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    // Ignore non-text messages and the /start command
    if (!msg.text || msg.text === '/start') return;

    const text = msg.text;
    const filePath = `./output_${chatId}.pdf`;

    // Notify user that the text is being processed
    bot.sendMessage(chatId, 'Processing your text into a PDF...');

    // Create PDF file
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));
    
    // Add text to the PDF
    doc.fontSize(12).text(text);
    doc.end();

    // After the file is finished, send the document to the user
    doc.on('finish', () => {
        bot.sendDocument(chatId, filePath, {}, { filename: 'document.pdf' })
            .then(() => {
                // Delete the file after sending
                fs.unlinkSync(filePath);
            })
            .catch(error => {
                console.error('Error while sending the file:', error);
                bot.sendMessage(chatId, 'An error occurred while sending your PDF. Please try again later.');
            });
    });

    // Error handling for PDF creation
    doc.on('error', (error) => {
        console.error('Error while creating the PDF:', error);
        bot.sendMessage(chatId, 'An error occurred while processing your text. Please try again.');
    });
});

// Start the bot
console.log('Telegram Bot is running...');