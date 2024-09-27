const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// توكن البوت
const token = '8119443898:AAFwm5E368v-Ov-M_XGBQYCJxj1vMDQbv-0';

const bot = new TelegramBot(token, { polling: true });

// الرسائل متعددة اللغات
const messages = {
    arabic: {
        welcome: `
<b>🎌 مرحبًا بك في بوت الأنمي!</b>
🔍 ابحث عن أنمي بسهولة باستخدام الأزرار أدناه أو الأوامر التالية:
- <code>بحث [اسم الأنمي]</code>
🔧 أوامر أخرى:
- <code>/help</code> لعرض هذه الرسالة
- <code>/settings</code> لتخصيص تجربتك
        `,
        noResults: "❗ لم نتمكن من العثور على الأنمي المطلوب، حاول لاحقًا.",
        inputPrompt: "❗ يرجى إدخال اسم الأنمي بعد الأمر.",
        unknownCommand: "❓ الأمر غير معروف. هل تحتاج إلى مساعدة؟",
        settingsPrompt: "يمكنك تخصيص إعدادات البوت هنا:",
        errorFetching: "⚠️ حدث خطأ أثناء جلب المعلومات، يرجى التحقق من الاتصال.",
    },
    english: {
        welcome: `
<b>🎌 Welcome to the Anime Search Bot!</b>
🔍 Easily search for an anime using the buttons below or the following commands:
- <code>search [anime name]</code>
🔧 Other commands:
- <code>/help</code> to show this message
- <code>/settings</code> to customize your experience
        `,
        noResults: "❗ We couldn't find the requested anime, please try again later.",
        inputPrompt: "❗ Please enter the anime name after the command.",
        unknownCommand: "❓ Unknown command. Do you need help?",
        settingsPrompt: "You can customize the bot settings here:",
        errorFetching: "⚠️ An error occurred while fetching data, please check your connection.",
    }
};

// دالة لتحديد اللغة بناءً على المستخدم
function getLanguage(text) {
    const arabicWords = ['بحث', 'مساعدة'];
    return arabicWords.some(word => text.includes(word)) ? 'arabic' : 'english';
}

// دالة للبحث في AniList API
async function searchAnime(query) {
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
        if (!response.data.data.Media) {
            throw new Error("لا يوجد أنمي مطابق");
        }
        return response.data.data.Media;
    } catch (error) {
        console.error("Error fetching data from AniList API", error);
        throw new Error(error.message || "حدث خطأ أثناء جلب المعلومات.");
    }
}

// دالة لإنشاء رسالة رد متناسقة بناءً على لغة المستخدم
function formatAnimeResponse(anime, language) {
    const title = anime.title[language === 'arabic' ? 'native' : 'english'] || anime.title.romaji;
    return `
<b>${title}</b>
<a href="${anime.coverImage.large}">🖼️</a>
${anime.description ? anime.description.replace(/<\/?[^>]+(>|$)/g, "").slice(0, 500) + '...' : 'لا يوجد وصف متاح.'}
    `;
}

// تحسين الرد على الرسائل
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.toLowerCase().trim();
    const language = getLanguage(text);

    // الاعتراف بالتحيات
    if (['مرحبا', 'مساعدة', '/start', '/help'].includes(text)) {
        bot.sendMessage(chatId, messages[language].welcome, { parse_mode: 'HTML' });
    } else if (text.startsWith('بحث') || text.startsWith('search')) {
        const query = text.split(' ').slice(1).join(' ');
        if (!query) {
            return bot.sendMessage(chatId, messages[language].inputPrompt, { parse_mode: 'HTML' });
        }

        try {
            const anime = await searchAnime(query);
            if (!anime) {
                return bot.sendMessage(chatId, messages[language].noResults, { parse_mode: 'HTML' });
            }
            const responseMessage = formatAnimeResponse(anime, language);
            bot.sendMessage(chatId, responseMessage, { parse_mode: 'HTML' });
        } catch (error) {
            bot.sendMessage(chatId, messages[language].errorFetching, { parse_mode: 'HTML' });
        }

    } else if (text === '/settings') {
        // إعدادات المستخدم
        bot.sendMessage(chatId, messages[language].settingsPrompt, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🌐 تغيير اللغة', callback_data: 'change_language' }],
                    [{ text: '🔔 الإشعارات', callback_data: 'notifications' }]
                ]
            }
        });
    } else {
        // توجيه المستخدم إلى المساعدة بدل إظهار رسائل خطأ متكررة
        bot.sendMessage(chatId, messages[language].unknownCommand, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'عرض الأوامر', callback_data: 'help' }]
                ]
            }
        });
    }
});

// التعامل مع الأزرار (Callbacks)
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'search') {
        bot.sendMessage(chatId, "❗ أدخل اسم الأنمي الذي ترغب في البحث عنه:");
    } else if (data === 'settings') {
        bot.sendMessage(chatId, "⚙️ إعدادات البوت:");
    } else if (data === 'help') {
        bot.sendMessage(chatId, messages['arabic'].welcome, { parse_mode: 'HTML' });
    } else if (data === 'change_language') {
        bot.sendMessage(chatId, "🌐 يمكنك تغيير اللغة من هنا:");
    } else if (data === 'notifications') {
        bot.sendMessage(chatId, "🔔 إعدادات الإشعارات:");
    }
});

// معالجة الأخطاء العامة
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
    bot.sendMessage(chatId, "⚠️ حدث خطأ تقني. يرجى المحاولة لاحقاً.", { parse_mode: 'HTML' });
});