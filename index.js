const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// إعداد البوت
class BotCore {
    constructor(token) {
        this.bot = new TelegramBot(token, { polling: true });
        this.userManager = new UserManager();
        this.animeSearch = new AnimeSearch();
        this.settingsManager = new SettingsManager();
        this.initializeBot();
    }

    initializeBot() {
        this.bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const text = msg.text.toLowerCase().trim();
            const user = this.userManager.getUser(chatId);

            if (text === '/start' || text === '/help') {
                this.sendWelcomeMessage(chatId, user.language);
            } else if (text.startsWith('بحث') || text.startsWith('search')) {
                const query = text.split(' ').slice(1).join(' ');
                if (!query) {
                    return this.bot.sendMessage(chatId, "❗ يرجى إدخال اسم الأنمي بعد الأمر.", { parse_mode: 'HTML' });
                }
                try {
                    const anime = await this.animeSearch.searchAnime(query);
                    const responseMessage = this.animeSearch.formatAnimeResponse(anime);
                    this.bot.sendMessage(chatId, responseMessage.text, responseMessage.options);
                } catch (error) {
                    this.bot.sendMessage(chatId, error.message, { parse_mode: 'HTML' });
                }
            } else if (text === '/settings') {
                this.settingsManager.showSettings(chatId, user.language, this.bot);
            } else {
                this.bot.sendMessage(chatId, "❓ الأمر غير معروف. هل تحتاج إلى مساعدة؟", { parse_mode: 'HTML' });
            }
        });

        this.bot.on('callback_query', (query) => {
            const chatId = query.message.chat.id;
            const data = query.data;

            this.settingsManager.handleCallback(chatId, data, this.bot);
        });

        this.bot.on('polling_error', (error) => {
            console.error('Polling error:', error);
        });
    }

    sendWelcomeMessage(chatId, language) {
        const message = language === 'arabic' ? messages.arabic : messages.english;
        this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    }
}

// إدارة بيانات المستخدمين
class UserManager {
    constructor() {
        this.users = {};
    }

    getUser(chatId) {
        if (!this.users[chatId]) {
            this.users[chatId] = {
                language: 'arabic', // اللغة الافتراضية
                notifications: false
            };
        }
        return this.users[chatId];
    }

    setUserLanguage(chatId, language) {
        if (this.users[chatId]) {
            this.users[chatId].language = language;
        }
    }

    setUserNotifications(chatId, status) {
        if (this.users[chatId]) {
            this.users[chatId].notifications = status;
        }
    }
}

// البحث عن الأنمي باستخدام واجهة API
class AnimeSearch {
    async searchAnime(query) {
        const url = `https://graphql.anilist.co`;
        const queryData = {
            query: `
            query ($search: String) {
              Media(search: $search, type: ANIME) {
                title {
                  romaji
                  english
                  native
                }
                description
                coverImage {
                  large
                }
              }
            }`,
            variables: { search: query }
        };

        try {
            const response = await axios.post(url, queryData);
            const anime = response.data.data.Media;
            return anime;
        } catch (error) {
            console.error("Error fetching data from AniList API", error);
            throw new Error("لم نتمكن من العثور على الأنمي المطلوب، حاول لاحقًا.");
        }
    }

    formatAnimeResponse(anime) {
        return {
            text: `<b>${anime.title.romaji || anime.title.english || anime.title.native}</b>`,
            options: {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📖 عرض الوصف', callback_data: 'description' }],
                        [{ text: '📥 تحميل صورة الأنمي', callback_data: 'download_image' }]
                    ]
                }
            },
            imageUrl: anime.coverImage.large,
            description: anime.description ? anime.description.replace(/<\/?[^>]+(>|$)/g, "").slice(0, 500) + '...' : 'لا يوجد وصف متاح.'
        };
    }
}

// إدارة الإعدادات
class SettingsManager {
    showSettings(chatId, language, bot) {
        const settingsText = language === 'arabic' ? '🌐 يمكنك تعديل الإعدادات هنا:' : '🌐 You can change your settings here:';
        bot.sendMessage(chatId, settingsText, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🌐 تغيير اللغة', callback_data: 'change_language' }],
                    [{ text: '🔔 الإشعارات', callback_data: 'toggle_notifications' }]
                ]
            }
        });
    }

    handleCallback(chatId, data, bot) {
        if (data === 'change_language') {
            const newLang = this.userManager.getUser(chatId).language === 'arabic' ? 'english' : 'arabic';
            this.userManager.setUserLanguage(chatId, newLang);
            bot.sendMessage(chatId, `✅ تم تغيير اللغة إلى ${newLang === 'arabic' ? 'العربية' : 'الإنجليزية'}.`);
        } else if (data === 'toggle_notifications') {
            const user = this.userManager.getUser(chatId);
            const newStatus = !user.notifications;
            this.userManager.setUserNotifications(chatId, newStatus);
            bot.sendMessage(chatId, `🔔 ${newStatus ? 'تم تفعيل' : 'تم إيقاف'} الإشعارات.`);
        }
    }
}

// الرسائل الافتراضية
const messages = {
    arabic: `
<b>🎌 مرحبًا بك في بوت الأنمي!</b>

🔍 ابحث عن أنمي بسرعة وسهولة باستخدام الأزرار أدناه أو أحد الأوامر التالية:
- <code>بحث [اسم الأنمي]</code>

🔧 أوامر أخرى:
- /help لعرض هذه الرسالة
- /settings لتخصيص تجربتك
    `,
    english: `
<b>🎌 Welcome to the Anime Search Bot!</b>

🔍 Easily search for an anime using the buttons below or one of the following commands:
- <code>search [anime name]</code>

🔧 Other commands:
- /help to show this message
- /settings to customize your experience
    `
};

// إنشاء البوت
const token = '8119443898:AAFwm5E368v-Ov-M_XGBQYCJxj1vMDQbv-0';
new BotCore(token);