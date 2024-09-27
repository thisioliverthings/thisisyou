// استيراد المكتبات المطلوبة
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// استبدل YOUR_BOT_TOKEN برمز التوكن الخاص بك
const token = '8119443898:AAFwm5E368v-Ov-M_XGBQYCJxj1vMDQbv-0';
const bot = new TelegramBot(token, { polling: true });

// نصوص الرسائل المختلفة
const messages = {
    arabic: {
        welcome: "مرحبًا بك في بوت الأنمي! يمكنك البحث عن أي أنمي هنا.",
        inputPrompt: "يرجى إدخال اسم الأنمي الذي ترغب في البحث عنه.",
        noResults: "لم يتم العثور على أي نتائج.",
        errorFetching: "حدث خطأ أثناء جلب المعلومات.",
        settingsPrompt: "إعدادات المستخدم:",
        unknownCommand: "لا أفهم هذه الرسالة. يرجى استخدام الأوامر المعروفة.",
    },
    english: {
        welcome: "Welcome to the Anime Bot! You can search for any anime here.",
        inputPrompt: "Please enter the name of the anime you want to search for.",
        noResults: "No results found.",
        errorFetching: "An error occurred while fetching information.",
        settingsPrompt: "User settings:",
        unknownCommand: "I don't understand this message. Please use recognized commands.",
    }
};

// دالة لتحديد اللغة بناءً على نص الرسالة
function getLanguage(text) {
    return text.includes('بحث') ? 'arabic' : 'english';
}

// دالة للبحث عن الأنمي باستخدام AniList API
async function searchAnime(query) {
    const url = 'https://graphql.anilist.co';
    const queryData = {
        query: `
        query ($search: String) {
            Page {
                media(search: $search, type: ANIME) {
                    id
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
            }
        }`,
        variables: { search: query }
    };

    try {
        const response = await axios.post(url, queryData);
        const animeList = response.data.data.Page.media;
        return animeList; // استرجاع قائمة الأنمي
    } catch (error) {
        console.error("Error fetching anime from AniList API", error);
        throw new Error("حدث خطأ أثناء البحث عن الأنمي.");
    }
}

// تابع لتحميل الأخبار من AniList API
async function fetchAnimeNews(animeId) {
    const url = `https://graphql.anilist.co`;
    const queryData = {
        query: `
        query ($id: Int) {
          Media(id: $id) {
            title {
              romaji
              english
              native
            }
            siteUrl
          }
        }`,
        variables: { id: animeId }
    };

    try {
        const response = await axios.post(url, queryData);
        return response.data.data.Media;
    } catch (error) {
        console.error("Error fetching anime news from AniList API", error);
        throw new Error("حدث خطأ أثناء جلب الأخبار.");
    }
}

// دالة لتحميل بيانات الأنمي مع إضافة الأزرار
async function sendAnimeResponse(chatId, animeList, language) {
    const anime = animeList[0]; // الحصول على أول أنمي من القائمة
    const title = anime.title[language === 'arabic' ? 'native' : 'english'] || anime.title.romaji;
    const animeId = anime.id; // استخدم معرف الأنمي

    const responseMessage = `
<b>${title}</b>
<a href="${anime.coverImage.large}">🖼️</a>
${anime.description ? anime.description.replace(/<\/?[^>]+(>|$)/g, "").slice(0, 500) + '...' : 'لا يوجد وصف متاح.'}
`;

    const newsButton = { text: language === 'arabic' ? 'آخر الأخبار' : 'Latest News', callback_data: `fetch_news_${animeId}` };
    const episodesButton = { text: language === 'arabic' ? 'الحلقات' : 'Episodes', callback_data: `fetch_episodes_${animeId}` };
    const fullDescriptionButton = { text: language === 'arabic' ? 'الوصف كامل' : 'Full Description', callback_data: `full_description_${animeId}` };

    bot.sendMessage(chatId, responseMessage, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [fullDescriptionButton],
                [episodesButton],
                [newsButton]
            ]
        }
    });
}

// التعامل مع استجابة الرسائل
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // التحقق مما إذا كانت الرسالة تحتوي على خاصية النص
    if (!msg.text) {
        return; // الخروج إذا لم تكن هناك خاصية نص (مثل الرسائل غير النصية)
    }

    const text = msg.text.toLowerCase().trim(); // تحويل النص إلى أحرف صغيرة وإزالة المسافات
    const language = getLanguage(text); // تحديد لغة الرسالة

    // التعامل مع التحيات والأوامر
    if (['مرحبا', 'مساعدة', '/start', '/help'].includes(text)) {
        bot.sendMessage(chatId, messages[language].welcome, { parse_mode: 'HTML' }); // إرسال رسالة الترحيب
    } else if (text.startsWith('بحث') || text.startsWith('search')) {
        const query = text.split(' ').slice(1).join(' '); // استخراج اسم الأنمي من الرسالة
        if (!query) {
            return bot.sendMessage(chatId, messages[language].inputPrompt, { parse_mode: 'HTML' }); // تذكير المستخدم بإدخال اسم الأنمي
        }

        try {
            const animeList = await searchAnime(query); // البحث عن الأنمي باستخدام الدالة
            if (!animeList.length) {
                return bot.sendMessage(chatId, messages[language].noResults, { parse_mode: 'HTML' }); // إبلاغ المستخدم بعدم العثور على النتائج
            }
            await sendAnimeResponse(chatId, animeList, language); // إرسال رد الأنمي مع الأزرار
        } catch (error) {
            bot.sendMessage(chatId, messages[language].errorFetching, { parse_mode: 'HTML' }); // إبلاغ المستخدم بحدوث خطأ
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
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith('fetch_news_')) {
        const animeId = data.split('_')[2]; // استخدم معرف الأنمي
        try {
            const news = await fetchAnimeNews(animeId);
            const newsMessage = `📰 أخبار الأنمي:\n${news.title.romaji} - ${news.siteUrl}`;
            bot.sendMessage(chatId, newsMessage, { parse_mode: 'HTML' });
        } catch (error) {
            bot.sendMessage(chatId, "⚠️ حدث خطأ أثناء جلب الأخبار.", { parse_mode: 'HTML' });
        }
    } else if (data.startsWith('fetch_episodes_')) {
        const animeId = data.split('_')[2]; // استخدم معرف الأنمي
        // هنا يمكنك إضافة الكود لجلب الحلقات
        bot.sendMessage(chatId, `📺 الحلقات الخاصة بـ ${animeId}`);
    } else if (data.startsWith('full_description_')) {
        const animeId = data.split('_')[2]; // استخدم معرف الأنمي
        // هنا يمكنك إضافة الكود لجلب الوصف الكامل
        bot.sendMessage(chatId, `📝 الوصف الكامل للأنمي ${animeId}`);
    }
});

// معالجة الأخطاء العامة
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
    bot.sendMessage(chatId, "⚠️ حدث خطأ تقني. يرجى المحاولة لاحقاً.", { parse_mode: 'HTML' });
});