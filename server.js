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
🌟 مرحبًا بك في بوت تحويل النصوص إلى PDF!<n>
يمكنك استخدام الأمر <b>/تحويل</b> لإرسال نص أو ملف وسأقوم بتحويله إلى ملف PDF لك بشكل تلقائي.<n>
إذا كنت بحاجة للمساعدة، استخدم الأمر <b>/help</b>.
`;
        this.bot.sendMessage(chatId, welcomeText, { parse_mode: 'HTML' });
    }

    sendHelpMessage(chatId) {
        const helpText = `
📚 <b>تعليمات الاستخدام:</b><n>
1. استخدم الأمر <b>/تحويل</b> لإرسال نصوص أو ملفات نصية (مثل .txt أو .docx).<n>
2. سأقوم بتحويلها إلى ملف PDF تلقائيًا.<n>
3. إذا كنت بحاجة لمساعدة إضافية، يمكنك دائمًا استخدام الأمر <b>/help</b>.
`;
        this.bot.sendMessage(chatId, helpText, { parse_mode: 'HTML' });
    }

    askForInput(chatId) {
        const askText = '📝 من فضلك، أرسل لي النص أو الملف الذي ترغب في تحويله إلى PDF.';
        this.bot.sendMessage(chatId, askText);
    }

    async handleUserInput(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;

        // تحقق من أن الرسالة ليست أمرًا
        if (!msg.document && !text.startsWith('/')) {
            const pdfFilename = `output_${chatId}.pdf`;

            // إضافة ذكاء اصطناعي بسيط لتقديم ردود ذكية
            const responseText = this.getAIResponse(text);

            try {
                // تحويل النص إلى PDF
                await PDFConverter.textToPDF(responseText, pdfFilename);
                this.cache.set(responseText, pdfFilename); // إضافة الملف إلى الكاش

                // إرسال ملف PDF
                await this.bot.sendDocument(chatId, pdfFilename, {}, {
                    caption: '📄 إليك ملف PDF الخاص بك!'
                });

                // حذف الملف بعد 5 دقائق
                setTimeout(() => {
                    fs.unlinkSync(pdfFilename);
                    this.cache.delete(responseText);
                }, 300000);
            } catch (err) {
                ErrorHandler.handleError(this.bot, chatId, err);
            }
        }
    }

    getAIResponse(inputText) {
        // هنا يمكنك استخدام نموذج ذكاء اصطناعي لتحليل النص وتقديم ردود ذكية.
        // سنقوم بإنشاء ردود بسيطة بناءً على مدخلات المستخدم.

        if (inputText.toLowerCase().includes('مرحبا')) {
            return 'أهلاً! كيف يمكنني مساعدتك اليوم؟';
        } else if (inputText.toLowerCase().includes('كيف حالك')) {
            return 'أنا بخير، شكرًا! ماذا عنك؟';
        } else {
            return inputText; // إذا لم يكن هناك استجابة خاصة، نعيد النص كما هو
        }
    }

    async handleDocumentMessage(msg) {
        const chatId = msg.chat.id;
        const fileId = msg.document.file_id;
        const fileType = msg.document.mime_type;
        const allowedFileTypes = [
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        // التأكد من نوع الملف
        if (!allowedFileTypes.includes(fileType)) {
            return this.bot.sendMessage(chatId, '🚫 يرجى إرسال ملف نصي أو .docx فقط.');
        }

        try {
            const fileUrl = await this.bot.getFileLink(fileId);
            const txtFilename = `input_${chatId}.txt`;

            // تحميل الملف
            const downloadedFile = await PDFConverter.downloadFile(fileUrl, txtFilename);
            const text = fs.readFileSync(downloadedFile, 'utf8');
            const pdfFilename = `output_${chatId}.pdf`;

            // تحويل النص من الملف إلى PDF
            await PDFConverter.textToPDF(text, pdfFilename);

            // إرسال ملف PDF
            await this.bot.sendDocument(chatId, pdfFilename, {}, {
                caption: '📄 إليك ملف PDF الخاص بك!'
            });

            // حذف الملفات بعد الإرسال
            fs.unlinkSync(pdfFilename);
            fs.unlinkSync(txtFilename);
        } catch (err) {
            ErrorHandler.handleError(this.bot, chatId, err);
        }
    }
}

// استبدل التوكن بالتوكن الخاص بك
const token = '8062134382:AAGaHawjiD48hprrTw7egO2ehjPgkgNo_OY';
const pdfBot = new TelegramPDFBot(token);