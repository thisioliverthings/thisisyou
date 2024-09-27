const TelegramBot = require('node-telegram-bot-api');

// استبدل 'YOUR_BOT_API_KEY' بالتوكن الخاص بك
const bot = new TelegramBot('7739626112:AAHVJXMdorsiiyTsp9wtclsbnks84m4g8eI', { polling: true });

// معالج الأمر /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'أهلا بك في البوت! كيف يمكنني مساعدتك؟');
});

// معالج الرسائل النصية
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    if (msg.text && msg.text !== '/start') {
        console.log('Received a message:', msg.text); // طباعة الرسالة المستلمة في السجل
        bot.sendMessage(chatId, 'شكرا على رسالتك!'); // رد على المستخدم
    }
});

// معالج الصور
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const photo = msg.photo[msg.photo.length - 1]; // الحصول على أكبر صورة
    const fileId = photo.file_id; // معرف الصورة
    const fileLink = await bot.getFileLink(fileId); // الحصول على رابط الصورة

    console.log('Received photo link:', fileLink); // طباعة رابط الصورة
    bot.sendMessage(chatId, 'لقد تلقيت صورة!'); // رد على المستخدم
});

// تشغيل البوت
console.log('بوت Telegram يعمل...');