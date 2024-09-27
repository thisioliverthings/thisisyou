const { Telegraf } = require('telegraf');
const Jimp = require('jimp');

const bot = new Telegraf('7739626112:AAHVJXMdorsiiyTsp9wtclsbnks84m4g8eI');

bot.on('photo', async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileId = photo.file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);

    console.log(fileLink); // طباعة الرابط للتأكد

    try {
        const image = await Jimp.read(fileLink);
        // معالجة الصورة هنا
    } catch (error) {
        console.error('Error processing image:', error);
        ctx.reply('حدث خطأ أثناء معالجة الصورة.');
    }
});

bot.launch();