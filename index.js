const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// توكن البوت
const token = '8119443898:AAFwm5E368v-Ov-M_XGBQYCJxj1vMDQbv-0';
const bot = new TelegramBot(token, { polling: true });

// رسالة البدء مع شرح الاستخدام (بسيطة وودية)
const messages = {
    arabic: `
<b>🎌 مرحبًا بك في بوت الأنمي!</b>

🔍 ابحث عن أنمي بسرعة وسهولة باستخدام الأزرار أدناه أو أحد الأوامر التالية:
- <code>بحث [اسم الأنمي]</code>
- <code>search [anime name]</code>

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

// دالة لتحديد اللغة بناءً على المستخدم
function getLanguage(text) {
    const arabicWords = ['بحث', 'بث'];
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
        const anime = response.data.data.Media;
        return anime;
    } catch (error) {
        console.error("Error fetching data from AniList API", error);
        throw new Error("لم نتمكن من العثور على الأنمي المطلوب، حاول لاحقًا.");
    }
}

// دالة لإنشاء رسالة رد متناسقة
function formatAnimeResponse(anime) {
    return `
<b>${anime.title.romaji || anime.title.english || anime.title.native}</b>
<a href="${anime.coverImage.large}">🖼️</a>
${anime.description ? anime.description.replace(/<\/?[^>]+(>|$)/g, "").slice(0, 500) + '...' : 'لا يوجد وصف متاح.'}
    `;
}

// التعامل مع الرسائل المختلفة
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.toLowerCase().trim();
    const language = getLanguage(text);

    if (text.startsWith('بحث') || text.startsWith('search') || text.startsWith('srch') || text.startsWith('بث')) {
        const query = text.split(' ').slice(1).join(' ');
        if (!query) {
            return bot.sendMessage(chatId, "❗ يرجى إدخال اسم الأنمي بعد الأمر.", { parse_mode: 'HTML' });
        }

        try {
            const anime = await searchAnime(query);
            const responseMessage = formatAnimeResponse(anime);
            bot.sendMessage(chatId, responseMessage, { parse_mode: 'HTML' });
        } catch (error) {
            bot.sendMessage(chatId, error.message, { parse_mode: 'HTML' });
        }

    } else if (text === '/start' || text === '/help') {
        // عرض رسالة الترحيب أو المساعدة مع أزرار للتفاعل
        bot.sendMessage(chatId, messages[language], {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔍 Search Anime', callback_data: 'search' }],
                    [{ text: '⚙️ Settings', callback_data: 'settings' }]
                ]
            }
        });
        
    } else if (text === '/settings') {
        // إعدادات المستخدم
        bot.sendMessage(chatId, "يمكنك تخصيص إعدادات البوت هنا:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🌐 Change Language', callback_data: 'change_language' }],
                    [{ text: '🔔 Notifications', callback_data: 'notifications' }]
                ]
            }
        });
    } else {
        // أمر غير معروف مع زرّ لعرض المساعدة
        bot.sendMessage(chatId, "❓ الأمر غير معروف. هل تحتاج إلى مساعدة؟", {
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
        bot.sendMessage(chatId, messages['arabic'], { parse_mode: 'HTML' });
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