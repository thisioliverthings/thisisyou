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
        this.viewMore = "هل ترغب في عرض الوصف الكامل؟";
        this.watchLinks = "اختر منصة المشاهدة:";
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

    // دالة لتحميل بيانات الأنمي
    async sendAnimeResponse(chatId, animeList) {
        const anime = animeList[0]; // الحصول على أول أنمي من القائمة
        const title = anime.title.native || anime.title.romaji;
        const shortDescription = anime.description ? anime.description.replace(/<\/?[^>]+(>|$)/g, "").slice(0, 200) + '...' : 'لا يوجد وصف متاح.';

        const responseMessage = `
        <b>${title}</b>
        <a href="${anime.coverImage.large}">🖼️</a>
        ${shortDescription}
        `;

        const replyMarkup = {
            inline_keyboard: [
                [{ text: "عرض الوصف الكامل", callback_data: `full_description:${anime.id}` }],
                [{ text: "روابط المشاهدة", callback_data: `watch_links:${anime.id}` }]
            ]
        };

        this.bot.sendMessage(chatId, responseMessage, {
            parse_mode: 'HTML',
            reply_markup: replyMarkup
        });
    }

    // دالة لجلب الوصف الكامل
    async getFullDescription(chatId, animeId) {
        const url = 'https://graphql.anilist.co';
        const queryData = {
            query: `
            query ($id: Int) {
                Media(id: $id) {
                    description
                }
            }`,
            variables: { id: animeId }
        };

        try {
            const response = await axios.post(url, queryData);
            const fullDescription = response.data.data.Media.description.replace(/<\/?[^>]+(>|$)/g, ""); // إزالة العلامات
            return fullDescription;
        } catch (error) {
            console.error("Error fetching full description from AniList API", error);
            throw new Error(this.messages.errorFetching);
        }
    }

    // دالة لعرض روابط المشاهدة
    async sendWatchLinks(chatId) {
        const watchLinks = `
        اختر منصة المشاهدة:
        - [Netflix](https://www.netflix.com)
        - [سينمانا](https://www.cinemana.com)
        - [فودو](https://www.vudu.com)
        - [انمي سلاير](https://www.anime-slayer.com)
        - [انمي كلاود](https://www.animecloud.com)
        `;

        const replyMarkup = {
            inline_keyboard: [
                [{ text: "عودة", callback_data: 'return_to_anime' }]
            ]
        };

        this.bot.sendMessage(chatId, watchLinks, {
            parse_mode: 'Markdown',
            reply_markup: replyMarkup
        });
    }

    // دالة لمعالجة ردود الأزرار
    async handleCallbackQuery(callbackQuery) {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

        if (data.startsWith('full_description:')) {
            const animeId = data.split(':')[1];
            const fullDescription = await this.getFullDescription(chatId, animeId);
            this.bot.editMessageText(fullDescription, {
                chat_id: chatId,
                message_id: callbackQuery.message.message_id,
                reply_markup: {
                    inline_keyboard: [[
                        { text: "عودة", callback_data: 'return_to_anime' }
                    ]]
                }
            });
        } else if (data.startsWith('watch_links:')) {
            await this.sendWatchLinks(chatId);
        } else if (data === 'return_to_anime') {
            await this.sendAnimeResponse(chatId, this.animeList); // قم بتخزين animeList في حالة عدم توفره
        }
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
                this.animeList = await this.searchAnime(query); // البحث عن الأنمي باستخدام الدالة
                if (!this.animeList.length) {
                    return this.bot.sendMessage(chatId, this.messages.noResults, { parse_mode: 'HTML' });
                }
                await this.sendAnimeResponse(chatId, this.animeList); // إرسال رد الأنمي مع الأزرار
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

// التعامل مع ردود الأزرار
animeBot.bot.on('callback_query', animeBot.handleCallbackQuery.bind(animeBot));