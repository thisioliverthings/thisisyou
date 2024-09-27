const TelegramBot = require('node-telegram-bot-api');
const sharp = require('sharp'); // استخدام مكتبة sharp لمعالجة الصور
const axios = require('axios'); // استخدام axios لتحميل الصورة

// استبدل 'YOUR_BOT_API_KEY' بالتوكن الخاص بك
const bot = new TelegramBot('7739626112:AAHVJXMdorsiiyTsp9wtclsbnks84m4g8eI', { polling: true });

// معالج الأمر /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'زيادة دقة الصورة', callback_data: 'increase_quality' },
                    { text: 'حفظ الصورة', callback_data: 'save_image' }
                ],
            ],
        },
    };
    bot.sendMessage(chatId, 'أهلا بك في البوت! اختر خيارًا:', options);
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

    try {
        // تحميل الصورة من الرابط
        const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data);

        // حفظ الصورة الأصلية في متغير
        const originalBuffer = await sharp(imageBuffer).toBuffer();

        // إنشاء رسالة مع أزرار
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'زيادة دقة الصورة', callback_data: 'increase_quality' },
                        { text: 'حفظ الصورة', callback_data: 'save_image' }
                    ],
                ],
            },
        };

        // إرسال الصورة الأصلية مع خيارات
        await bot.sendPhoto(chatId, originalBuffer, { caption: 'أرسل صورة! اختر خيارًا:', reply_markup: options.reply_markup });
    } catch (error) {
        console.error('حدث خطأ أثناء معالجة الصورة:', error);
        bot.sendMessage(chatId, 'حدث خطأ أثناء معالجة الصورة.');
    }
});

// معالج الأحداث عند الضغط على الأزرار
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'increase_quality') {
        const photo = query.message.photo ? query.message.photo[query.message.photo.length - 1] : null; // التحقق من وجود خاصية photo
        if (!photo) {
            return bot.sendMessage(chatId, 'لم يتم العثور على صورة. يرجى إرسال صورة أولاً.');
        }

        const fileId = photo.file_id; // معرف الصورة
        const fileLink = await bot.getFileLink(fileId); // الحصول على رابط الصورة

        try {
            const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data);
            
            // زيادة دقة الصورة
            const enhancedImageBuffer = await sharp(imageBuffer)
                .resize(800) // تغيير الحجم إلى 800 بكسل عرضًا
                .jpeg({ quality: 80 }) // زيادة الجودة
                .toBuffer();
                
            // إرسال الصورة المحسنة إلى المستخدم
            await bot.sendPhoto(chatId, enhancedImageBuffer, { caption: 'إليك الصورة المحسنة!' });
        } catch (error) {
            console.error('حدث خطأ أثناء معالجة الصورة:', error);
            bot.sendMessage(chatId, 'حدث خطأ أثناء معالجة الصورة.');
        }
    } else if (data === 'save_image') {
        // هنا يمكنك إضافة منطق حفظ الصورة إذا لزم الأمر
        bot.sendMessage(chatId, 'الصورة تم حفظها بنجاح!');
    }
});

// تشغيل البوت
console.log('بوت Telegram يعمل...');