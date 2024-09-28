const TelegramBot = require('node-telegram-bot-api');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const https = require('https');

// كلاس لتعامل مع الأخطاء
class ErrorHandler {
    static handleError(chatId, message) {
        console.error(message);
        bot.sendMessage(chatId, 'حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.');
    }
}

// كلاس لتمثيل بوت تليجرام
class TelegramPDFBot {
    constructor(token) {
        this.bot = new TelegramBot(token, { polling: true });
        this.cache = new Map(); // كاش الملفات المؤقت
        this.init();
    }

    // تهيئة أوامر البوت
    init() {
        this.bot.on('message', (msg) => this.handleTextMessage(msg));
        this.bot.on('document', (msg) => this.handleDocumentMessage(msg));
    }

    // دالة لتحويل النص إلى PDF
    async textToPDF(text, outputFilePath) {
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

    // دالة لتحميل الملف من التليجرام
    downloadFile(fileUrl, outputPath) {
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

    // دالة لمعالجة الرسائل النصية
    async handleTextMessage(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;

        // تحقق من وجود النص في الكاش
        if (this.cache.has(text)) {
            await this.bot.sendDocument(chatId, this.cache.get(text));
            return;
        }

        if (text) {
            const pdfFilename = `output_${chatId}.pdf`;

            try {
                // تحويل النص إلى PDF
                await this.textToPDF(text, pdfFilename);
                this.cache.set(text, pdfFilename); // إضافة الملف إلى الكاش

                // إرسال ملف PDF
                await this.bot.sendDocument(chatId, pdfFilename);

                // حذف الملف بعد 5 دقائق
                setTimeout(() => {
                    fs.unlinkSync(pdfFilename);
                    this.cache.delete(text);
                }, 300000);
            } catch (err) {
                ErrorHandler.handleError(chatId, err);
            }
        }
    }

    // دالة لمعالجة الملفات النصية
    async handleDocumentMessage(msg) {
        const chatId = msg.chat.id;
        const fileId = msg.document.file_id;
        const fileType = msg.document.mime_type;
        const allowedFileTypes = ['text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

        // التأكد من نوع الملف
        if (!allowedFileTypes.includes(fileType)) {
            return this.bot.sendMessage(chatId, 'يرجى إرسال ملف نصي أو .docx فقط.');
        }

        try {
            const fileUrl = await this.bot.getFileLink(fileId);
            const txtFilename = `input_${chatId}.txt`;

            // تحميل الملف
            const downloadedFile = await this.downloadFile(fileUrl, txtFilename);

            // قراءة محتوى الملف
            const text = fs.readFileSync(downloadedFile, 'utf8');
            const pdfFilename = `output_${chatId}.pdf`;

            // تحويل النص من الملف إلى PDF
            await this.textToPDF(text, pdfFilename);

            // إرسال ملف PDF
            await this.bot.sendDocument(chatId, pdfFilename);

            // حذف الملفات بعد الإرسال
            fs.unlinkSync(pdfFilename);
            fs.unlinkSync(txtFilename);
        } catch (err) {
            ErrorHandler.handleError(chatId, err);
        }
    }
}

// استبدل التوكن بالتوكن الخاص بك
const token = '7739626112:AAHVJXMdorsiiyTsp9wtclsbnks84m4g8eI';
const pdfBot = new TelegramPDFBot(token);