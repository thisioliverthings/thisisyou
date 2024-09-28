const TelegramBot = require('node-telegram-bot-api');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const https = require('https');

// كلاس للتعامل مع الأخطاء
class ErrorHandler {
    static handleError(bot, chatId, message) {
        console.error(message);
        bot.sendMessage(chatId, '❌ حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.');
    }
}

// كلاس لتحويل النص إلى PDF
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
                    fs.unlinkSync(outputPath); // حذف الملف في حال الخطأ
                    reject(err);
                });
            }).on('error', (err) => {
                fs.unlinkSync(outputPath); // حذف الملف في حال الخطأ
                reject(err);
            });
        });
    }
}

// كلاس لتمثيل بوت تليجرام
class TelegramPDFBot {
    constructor(token) {
        this.bot = new TelegramBot(token, { polling: true });
        this.cache = new Map(); // كاش الملفات المؤقت
        this.init();
    }

    init() {
        this.bot.onText(/\/start/, (msg) => this.sendWelcomeMessage(msg.chat.id));
        this.bot.onText(/\/help/, (msg) => this.sendHelpMessage(msg.chat.id));
        this.bot.onText(/\/تحويل/, (msg) => this.askForInput(msg.chat.id));
        this.bot.on('message', (msg) => this.handleUserInput(msg));
        this.bot.on('document', (msg) => this.handleDocumentMessage(msg));
    }

    sendWelcomeMessage(chatId) {
        const welcomeText = `
🌟 <b>مرحبًا بك في بوت تحويل النصوص إلى PDF!</b> \n
يمكنك استخدام الأمر <b>/تحويل</b> لإرسال نص أو ملف وسأقوم بتحويله إلى ملف PDF لك بشكل تلقائي. \n
إذا كنت بحاجة للمساعدة، استخدم الأمر <b>/help</b>.
`;
        this.bot.sendMessage(chatId, welcomeText, { parse_mode: 'HTML' });
    }

    sendHelpMessage(chatId) {
        const helpText = `
📚 <b>تعليمات الاستخدام:</b> \n
1. استخدم الأمر <b>/تحويل</b> لإرسال نصوص أو ملفات نصية (مثل .txt أو .docx). \n
2. سأقوم بتحويلها إلى ملف PDF تلقائيًا. \n
3. إذا كنت بحاجة لمساعدة إضافية، يمكنك دائمًا استخدام الأمر <b>/help</b>.
`;
        this.bot.sendMessage(chatId, helpText, { parse_mode: 'HTML' });
    }

    askForInput(chatId) {
        const askText = '📝 من فضلك، أرسل لي النص أو الملف الذي ترغب في تحويله إلى PDF.';
        this.bot.sendMessage(chatId, askText);
    }

    handleUserInput(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (this.cache.has(chatId)) {
            this.convertTextToPDF(chatId, text);
        } else if (text) {
            this.cache.set(chatId, text);
            this.askForInput(chatId);
        }
    }

    async convertTextToPDF(chatId, text) {
        const outputPath = `output_${chatId}.pdf`;

        try {
            await PDFConverter.textToPDF(text, outputPath);
            await this.bot.sendDocument(chatId, outputPath);
            fs.unlinkSync(outputPath); // حذف الملف بعد إرساله
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
            fs.unlinkSync(filePath); // حذف الملف الأصلي
            fs.unlinkSync(outputPath); // حذف الملف بعد إرساله
        } catch (err) {
            ErrorHandler.handleError(this.bot, chatId, err.message);
        }
    }
}

// استبدل 'YOUR_TELEGRAM_BOT_TOKEN' برمز البوت الخاص بك
const token = '8062134382:AAGaHawjiD48hprrTw7egO2ehjPgkgNo_OY';
const pdfBot = new TelegramPDFBot(token);