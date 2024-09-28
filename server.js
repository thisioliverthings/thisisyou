const TelegramBot = require('node-telegram-bot-api');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const https = require('https');

class ErrorHandler {
    static handleError(bot, chatId, message) {
        console.error(message);
        bot.sendMessage(chatId, '❌ حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.');
    }
}

class PDFConverter {
    static async textToPDF(text, outputFilePath) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument();
                const writeStream = fs.createWriteStream(outputFilePath);

                doc.pipe(writeStream);
                doc.font('Times-Roman').fontSize(12).text(text, { align: 'left' });
                doc.end();

                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            } catch (err) {
                reject(err);
            }
        });
    }

    static downloadFile(fileUrl, outputPath) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(outputPath);
            https.get(fileUrl, (response) => {
                response.pipe(file);
                file.on('finish', () => resolve(outputPath));
                file.on('error', (err) => {
                    fs.unlinkSync(outputPath); 
                    reject(err);
                });
            }).on('error', (err) => {
                fs.unlinkSync(outputPath); 
                reject(err);
            });
        });
    }
}

class TelegramPDFBot {
    constructor(token) {
        this.bot = new TelegramBot(token, { polling: true });
        this.cache = new Map(); 
        this.init();
    }

    init() {
        this.bot.onText(/\/start/, (msg) => this.sendWelcomeMessage(msg.chat.id));
        this.bot.on('callback_query', (query) => this.handleCallbackQuery(query));
        this.bot.on('message', (msg) => this.handleUserInput(msg));
    }

    async sendWelcomeMessage(chatId) {
        const welcomeText = `
🌟 <b>مرحبًا بك في بوت تحويل النصوص إلى PDF!</b>\n
يمكنك استخدام الأزرار أدناه للتفاعل مع البوت.\n
إذا كنت بحاجة للمساعدة، استخدم الزر <b>تعليمات</b>.
`;
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "تحويل نص", callback_data: "convert_text" }],
                    [{ text: "تحويل ملف", callback_data: "convert_file" }],
                    [{ text: "تعليمات", callback_data: "help" }]
                ]
            }
        };
        this.bot.sendMessage(chatId, welcomeText, { parse_mode: 'HTML', reply_markup: options.reply_markup });
    }

    async sendHelpMessage(chatId, messageId) {
        const helpText = `
📚 <b>تعليمات الاستخدام:</b>\n
1. استخدم زر <b>تحويل نص</b> لإرسال نصوص.\n
2. استخدم زر <b>تحويل ملف</b> لإرسال ملفات نصية (مثل .txt أو .docx).\n
3. إذا كنت بحاجة لمساعدة إضافية، يمكنك دائمًا استخدام زر <b>تعليمات</b>.
`;
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "رجوع", callback_data: "back_to_welcome" }]
                ]
            }
        };
        this.bot.editMessageText(helpText, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML', reply_markup: options.reply_markup });
    }

    askForInput(chatId, messageId) {
        const askText = '📝 من فضلك، أرسل لي النص الذي ترغب في تحويله إلى PDF.';
        this.cache.set(chatId, { waitingForInput: true }); 
        this.bot.editMessageText(askText, { chat_id: chatId, message_id: messageId });
    }

    handleCallbackQuery(query) {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;

        if (query.data === "convert_text") {
            this.askForInput(chatId, messageId);
        } else if (query.data === "convert_file") {
            const askText = '📂 من فضلك، أرسل لي الملف الذي ترغب في تحويله إلى PDF.';
            this.cache.set(chatId, { waitingForFile: true });
            this.bot.editMessageText(askText, { chat_id: chatId, message_id: messageId });
        } else if (query.data === "help") {
            this.sendHelpMessage(chatId, messageId);
        } else if (query.data === "back_to_welcome") {
            this.sendWelcomeMessage(chatId);
        }

        this.bot.answerCallbackQuery(query.id);
    }

    handleUserInput(msg) {
        const chatId = msg.chat.id;

        if (this.cache.get(chatId)?.waitingForInput) {
            if (msg.text) {
                this.convertTextToPDF(chatId, msg.text);
            } else {
                this.bot.sendMessage(chatId, '❌ يرجى إرسال نص.');
            }
            return;
        }

        if (this.cache.get(chatId)?.waitingForFile && msg.document) {
            this.handleDocumentMessage(msg);
            return;
        }
    }

    async convertTextToPDF(chatId, text) {
        const outputPath = `output_${chatId}.pdf`;

        try {
            await PDFConverter.textToPDF(text, outputPath);
            await this.bot.sendDocument(chatId, outputPath);
            fs.unlinkSync(outputPath);
            this.cache.delete(chatId);
        } catch (err) {
            ErrorHandler.handleError(this.bot, chatId, err.message);
        }
    }

    handleDocumentMessage(msg) {
        const chatId = msg.chat.id;
        const fileId = msg.document.file_id;

        this.bot.getFile(fileId).then((file) => {
            const fileUrl = `https://api.telegram.org/file/bot${this.bot.token}/${file.file_path}`;
            const outputPath = `document_${chatId}.pdf`;

            PDFConverter.downloadFile(fileUrl, outputPath)
                .then(() => {
                    this.bot.sendMessage(chatId, '✅ تم تحميل الملف بنجاح. سأقوم بتحويله إلى PDF...');
                    this.convertFileToPDF(chatId, outputPath);
                })
                .catch((err) => ErrorHandler.handleError(this.bot, chatId, err.message));
        });
    }

    async convertFileToPDF(chatId, filePath) {
        const outputPath = `output_${chatId}.pdf`;
        try {
            const text = fs.readFileSync(filePath, 'utf-8');
            await PDFConverter.textToPDF(text, outputPath);
            await this.bot.sendDocument(chatId, outputPath);
            fs.unlinkSync(filePath);
            fs.unlinkSync(outputPath);
            this.cache.delete(chatId);
        } catch (err) {
            ErrorHandler.handleError(this.bot, chatId, err.message);
        }
    }
}

// استبدل 'YOUR_TELEGRAM_BOT_TOKEN' برمز البوت الخاص بك
const token = '8062134382:AAGaHawjiD48hprrTw7egO2ehjPgkgNo_OY';
const pdfBot = new TelegramPDFBot(token);