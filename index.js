// استيراد المكتبات المطلوبة
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// استبدل YOUR_BOT_TOKEN برمز التوكن الخاص بك
const token = '8119443898:AAFwm5E368v-Ov-M_XGBQYCJxj1vMDQbv-0';

// فئة الرسائل
class Messages {
    constructor() {
        this.welcome = "مرحبًا بك في بوت الأنمي! يمكنك البحث عن أي أنمي هنا.";
        this.inputPrompt = "يرجى إدخال اسم الأنمي الذي ترغب في البحث عنه.";
        this.noResults = "لم يتم العثور على أي نتائج.";
        this.errorFetching = "حدث خطأ أثناء جلب المعلومات. تأكد من أنك قمت بإدخال اسم أنمي صحيح.";
        this.unknownCommand = "لا أفهم هذه الرسالة. يرجى استخدام الأوامر المعروفة.";
    }
}

// فئة البوت
class AnimeBot {
    
        constructor(token) {
                this.bot = new TelegramBot(token, { polling: true });
                this.messages = new Messages();
                
                // التعامل مع الرسائل
                this.bot.on('message', this.handleMessage.bind(this));
        }

        // دالة للبحث عن الأنمي باستخدام AniList API
        async searchAnime(query) {
                const url = 'https://graphql.anilist.co';
                const queryData = {
                        query: `
                        query ($search: String) {
                                Page {
                                        media(search: $search, type: ANIME) {
                                                id
                                                title {
                                                        romaji
                                                        native
                                                }
                                                description
                                                coverImage {
                                                        large
                                                }
                                        }
                                }
                        }`,
                        variables: { search: query }
                };

                try {
                        const response = await axios.post(url, queryData);
                        return response.data.data.Page.media; // استرجاع قائمة الأنمي
                } catch (error) {
                        console.error("Error fetching anime from AniList API", error);
                        throw new Error(this.messages.errorFetching);
                }
        }

        // دالة لتحميل بيانات الأنمي مع إضافة الأزرار
        async sendAnimeResponse(chatId, animeList) {
                const anime = animeList[0]; // الحصول على أول أنمي من القائمة
                const title = anime.title.native || anime.title.romaji;
                const responseMessage = `
                <b>${title}</b>
                <a href="${anime.coverImage.large}">🖼️</a>
                ${anime.description ? anime.description.replace(/<\/?[^>]+(>|$)/g, "").slice(0, 500) + '...' : 'لا يوجد وصف متاح.'}
                `;

                this.bot.sendMessage(chatId, responseMessage, {
                        parse_mode: 'HTML'
                });
        }

        // التعامل مع استجابة الرسائل
        async handleMessage(msg) {
                const chatId = msg.chat.id;

                // التحقق مما إذا كانت الرسالة تحتوي على خاصية النص
                if (!msg.text) return;

                const text = msg.text.toLowerCase().trim(); // تحويل النص إلى أحرف صغيرة وإزالة المسافات

                // التعامل مع التحيات والأوامر
                if (['مرحبا', 'مساعدة', '/start', '/help'].includes(text)) {
                        this.bot.sendMessage(chatId, this.messages.welcome, { parse_mode: 'HTML' }); // إرسال رسالة الترحيب
                } else if (text.startsWith('بحث')) {
                        const query = text.split(' ').slice(1).join(' '); // استخراج اسم الأنمي من الرسالة
                        if (!query) {
                                return this.bot.sendMessage(chatId, this.messages.inputPrompt, { parse_mode: 'HTML' });
                        }

                        try {
                                const animeList = await this.searchAnime(query); // البحث عن الأنمي باستخدام الدالة
                                if (!animeList.length) {
                                        return this.bot.sendMessage(chatId, this.messages.noResults, { parse_mode: 'HTML' });
                                }
                                await this.sendAnimeResponse(chatId, animeList); // إرسال رد الأنمي مع الأزرار
                        } catch (error) {
                                this.bot.sendMessage(chatId, this.messages.errorFetching, { parse_mode: 'HTML' });
                        }
                } else {
                        this.bot.sendMessage(chatId, this.messages.unknownCommand, { parse_mode: 'HTML' });
                }
        }
}

// بدء تشغيل البوت
const animeBot = new AnimeBot(token);

// معالجة الأخطاء العامة
animeBot.bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});