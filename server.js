// استيراد المكتبات المطلوبة
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
        this.currentFormatIndex = {}; // لتخزين فهرس التنسيق الحالي لكل مستخدم
        this.init();
    }

    // تهيئة البوت
    init() {
        this.bot.onText(/\/start/, (msg) => this.sendWelcomeMessage(msg.chat.id));
        this.bot.on('callback_query', (query) => this.handleCallbackQuery(query));
        this.bot.on('message', (msg) => this.handleUserInput(msg));
    }

    // إرسال رسالة الترحيب
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
        await this.bot.sendMessage(chatId, welcomeText, { parse_mode: 'HTML', reply_markup: options.reply_markup });
    }

    // إرسال رسالة التعليمات
    async sendHelpMessage(chatId) {
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
        await this.bot.sendMessage(chatId, helpText, { parse_mode: 'HTML', reply_markup: options.reply_markup });
    }

    // سؤال المستخدم عن الإدخال
    askForInput(chatId) {
        const askText = '📝 من فضلك، أرسل لي النص الذي ترغب في تحويله إلى PDF.';
        this.cache.set(chatId, { waitingForInput: true }); // الاحتفاظ بالحالة
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "رجوع", callback_data: "back_to_welcome" }]
                ]
            }
        };
        this.bot.sendMessage(chatId, askText, { reply_markup: options.reply_markup });
    }

    // التعامل مع النقرات على الأزرار
    handleCallbackQuery(query) {
        const chatId = query.message.chat.id;

        switch (query.data) {
            case "convert_text":
                this.askForInput(chatId);
                break;
            case "convert_file":
                this.askForFileInput(chatId);
                break;
            case "help":
                this.sendHelpMessage(chatId);
                break;
            case "back_to_welcome":
                this.sendWelcomeMessage(chatId);
                break;
            case "next_format":
                this.showNextFormat(chatId);
                break;
            case "previous_format":
                this.showPreviousFormat(chatId);
                break;
        }

        this.bot.answerCallbackQuery(query.id);
    }

    // سؤال المستخدم عن ملف
    async askForFileInput(chatId) {
        const askText = '📂 من فضلك، أرسل لي الملف الذي ترغب في تحويله إلى PDF.';
        this.cache.set(chatId, { waitingForFile: true });
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "رجوع", callback_data: "back_to_welcome" }]
                ]
            }
        };
        await this.bot.sendMessage(chatId, askText, { reply_markup: options.reply_markup });
    }

    // التعامل مع مدخلات المستخدم
    handleUserInput(msg) {
        const chatId = msg.chat.id;

        if (this.cache.get(chatId)?.waitingForInput) {
            if (msg.text) {
                this.showFormatOptions(chatId, msg.text);
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

    // عرض خيارات التنسيق
    showFormatOptions(chatId, text) {
        const formats = [
            'تنسيق 1: نص عادي',
            'تنسيق 2: نص مع عنوان',
            'تنسيق 3: نص مع ترقيم'
        ];
        
        this.currentFormatIndex[chatId] = 0; // تعيين الفهرس الحالي
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: formats[this.currentFormatIndex[chatId]], callback_data: "current_format" }],
                    [{ text: "التالي", callback_data: "next_format" }, { text: "رجوع", callback_data: "previous_format" }]
                ]
            }
        };

        const formatMessage = `📝 <b>اختر تنسيق:</b>\n${formats[this.currentFormatIndex[chatId]]}`;
        this.bot.sendMessage(chatId, formatMessage, { parse_mode: 'HTML', reply_markup: options.reply_markup });
        this.cache.set(chatId, { waitingForFormat: true, text }); // تخزين النص المدخل
    }

    // عرض التنسيق التالي
    showNextFormat(chatId) {
        const formats = [
            'تنسيق 1: نص عادي',
            'تنسيق 2: نص مع عنوان',
            'تنسيق 3: نص مع ترقيم'
        ];

        this.currentFormatIndex[chatId] = (this.currentFormatIndex[chatId] + 1) % formats.length; // الانتقال إلى التنسيق التالي
        const formatMessage = `📝 <b>اختر تنسيق:</b>\n${formats[this.currentFormatIndex[chatId]]}`;
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: formats[this.currentFormatIndex[chatId]], callback_data: "current_format" }],
                    [{ text: "التالي", callback_data: "next_format" }, { text: "رجوع", callback_data: "previous_format" }]
                ]
            }
        };

        this.bot.editMessageText(formatMessage, { chat_id: chatId, parse_mode: 'HTML', reply_markup: options.reply_markup });
    }

    // عرض التنسيق السابق
    showPreviousFormat(chatId) {
        const formats = [
            'تنسيق 1: نص عادي',
            'تنسيق 2: نص مع عنوان',
            'تنسيق 3: نص مع ترقيم'
        ];

        this.currentFormatIndex[chatId] = (this.currentFormatIndex[chatId] - 1 + formats.length) % formats.length; // الانتقال إلى التنسيق السابق
        const formatMessage = `📝 <b>اختر تنسيق:</b>\n${formats[this.currentFormatIndex[chatId]]}`;
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "التالي", callback: "next_format" }, { text: "رجوع", callback_data: "previous_format" }]
                ]
            }
        };

        this.bot.editMessageText(formatMessage, { chat_id: chatId, parse_mode: 'HTML', reply_markup: options.reply_markup });
    }

    // معالجة رسالة الملف المرفق
    async handleDocumentMessage(msg) {
        const chatId = msg.chat.id;
        const fileId = msg.document.file_id;
        const filePath = await this.bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${this.bot.token}/${filePath.file_path}`;

        try {
            // تحميل الملف
            const outputFilePath = `./${msg.document.file_name}`;
            await PDFConverter.downloadFile(fileUrl, outputFilePath);
            await this.bot.sendMessage(chatId, `✅ تم تحميل الملف بنجاح: ${msg.document.file_name}`);
            // هنا يمكن إضافة المزيد من المعالجة للملف المحمّل
        } catch (error) {
            ErrorHandler.handleError(this.bot, chatId, error.message);
        }
    }

    // تحويل النص إلى PDF
    async convertTextToPDF(chatId, text) {
        const formats = [
            { title: 'تنسيق 1: نص عادي', formatFunction: (doc) => doc.text(text) },
            { title: 'تنسيق 2: نص مع عنوان', formatFunction: (doc) => {
                doc.fontSize(20).text('عنوان PDF', { align: 'center' });
                doc.moveDown();
                doc.fontSize(12).text(text);
            }},
            { title: 'تنسيق 3: نص مع ترقيم', formatFunction: (doc) => {
                const lines = text.split('\n');
                lines.forEach((line, index) => {
                    doc.text(`${index + 1}. ${line}`);
                });
            }}
        ];

        const currentFormat = formats[this.currentFormatIndex[chatId]];
        const outputFilePath = `./output_${chatId}.pdf`;

        try {
            await PDFConverter.textToPDF(text, outputFilePath, currentFormat.formatFunction);
            await this.bot.sendDocument(chatId, outputFilePath);
            fs.unlinkSync(outputFilePath); // حذف الملف بعد الإرسال
        } catch (error) {
            ErrorHandler.handleError(this.bot, chatId, error.message);
        }
    }
}

// إنشاء بوت تليجرام وتشغيله
const token = '8062134382:AAGaHawjiD48hprrTw7egO2ehjPgkgNo_OY';
const telegramPDFBot = new TelegramPDFBot(token);