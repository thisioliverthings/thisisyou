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
    const arabicWords = ['بحث', 'بث', 'مساعدة'];
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

// دالة لإنشاء رسالة عرض الأنمي مع الأزرار
function formatAnimeResponse(anime) {
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

// تحسين الرد على الرسائل
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.toLowerCase().trim();
    const language = getLanguage(text);

    // الاعتراف بالتحيات مثل "مرحبا" أو أوامر غير مباشرة
    if (['مرحبا', 'مساعدة', '/start', '/help'].includes(text)) {
        bot.sendMessage(chatId, messages[language], { parse_mode: 'HTML' });
    } else if (text.startsWith('بحث') || text.startsWith('search') || text.startsWith('srch')) {
        const query = text.split(' ').slice(1).join(' ');
        if (!query) {
            return bot.sendMessage(chatId, "❗ يرجى إدخال اسم الأنمي بعد الأمر.", { parse_mode: 'HTML' });
        }

        try {
            const anime = await searchAnime(query);
            const responseMessage = formatAnimeResponse(anime);
            bot.sendMessage(chatId, responseMessage.text, responseMessage.options);
        } catch (error) {
            bot.sendMessage(chatId, error.message, { parse_mode: 'HTML' });
        }

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
        // توجيه المستخدم إلى المساعدة بدل إظهار رسائل خطأ متكررة
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

// التعامل مع الأزرار لعرض الوصف وتحميل الصورة
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'description') {
        bot.sendMessage(chatId, query.message.text + '\n' + query.message.options.description, { parse_mode: 'HTML' });
    } else if (data === 'download_image') {
        const imageUrl = query.message.options.imageUrl;
        bot.sendPhoto(chatId, imageUrl);
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
});