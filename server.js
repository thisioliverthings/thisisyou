const { Telegraf } = require('telegraf');

// استبدل '8119443898:AAFwm5E368v-Ov-M_XGBQYCJxj1vMDQbv-0' بالتوكن الخاص بك
const bot = new Telegraf('YOUR_BOT_API_KEY');

// معالج الأمر /start
bot.start((ctx) => {
    ctx.reply('أهلا بك في البوت! كيف يمكنني مساعدتك؟');
});

// معالج الرسائل النصية
bot.on('text', (ctx) => {
    console.log('Received a message:', ctx.message.text); // طباعة الرسالة المستلمة في السجل
    ctx.reply('شكرا على رسالتك!'); // رد على المستخدم
});

// معالج الصور
bot.on('photo', async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1]; // الحصول على أكبر صورة
    const fileId = photo.file_id; // معرف الصورة
    const fileLink = await ctx.telegram.getFileLink(fileId); // الحصول على رابط الصورة

    console.log('Received photo link:', fileLink); // طباعة رابط الصورة
    ctx.reply('لقد تلقيت صورة!'); // رد على المستخدم
});

// تشغيل البوت
bot.launch()
    .then(() => {
        console.log('بوت Telegram يعمل...');
    })
    .catch((err) => {
        console.error('حدث خطأ أثناء تشغيل البوت:', err);
    });