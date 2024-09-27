const TelegramBot = require('node-telegram-bot-api');
const PDFDocument = require('pdfkit');
const fs = require('fs');

// استبدل 'YOUR_BOT_API_KEY' بالتوكن الخاص بك
const bot = new TelegramBot('7739626112:AAHVJXMdorsiiyTsp9wtclsbnks84m4g8eI', { polling: true });

// معالج الأمر /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'مرحبًا! أرسل لي النص الذي تريد تحويله إلى PDF.');
});

// معالج الرسائل النصية
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    // تجاهل الرسائل التي لا تحتوي على نصوص
    if (!msg.text || msg.text === '/start') return;

    const text = msg.text;
    const filePath = `./output_${chatId}.pdf`;

    // إنشاء ملف PDF
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));
    doc.fontSize(12).text(text);
    doc.end();

    // بعد الانتهاء من إنشاء الملف، أرسل الملف إلى المستخدم
    doc.on('finish', () => {
        bot.sendDocument(chatId, filePath, {}, { filename: 'document.pdf' })
            .then(() => {
                // حذف الملف بعد إرساله
                fs.unlinkSync(filePath);
            })
            .catch(error => {
                console.error('حدث خطأ أثناء إرسال الملف:', error);
            });
    });
});

// تشغيل البوت
console.log('بوت Telegram يعمل...');