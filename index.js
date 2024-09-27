const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// توكن البوت
const token = '8119443898:AAFwm5E368v-Ov-M_XGBQYCJxj1vMDQbv-0';
const bot = new TelegramBot(token, { polling: true });

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

// التعامل مع الرسائل
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.toLowerCase().trim();

    // معالجة البحث عن الأنمي
    if (text.startsWith('بحث') || text.startsWith('search')) {
        const query = text.split(' ').slice(1).join(' ');
        if (!query) {
            return bot.sendMessage(chatId, "❗ يرجى إدخال اسم الأنمي بعد الأمر.");
        }

        try {
            const anime = await searchAnime(query);
            const animeTitle = anime.title.romaji || anime.title.english || anime.title.native;

            // عرض عنوان الأنمي مع الأزرار للتحكم بالعرض
            bot.sendMessage(chatId, `🎌 <b>${animeTitle}</b>`, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📖 عرض الوصف', callback_data: `desc_${anime.title.romaji}` }],
                        [{ text: '📥 تحميل صورة الأنمي', callback_data: `image_${anime.coverImage.large}` }]
                    ]
                }
            });
        } catch (error) {
            bot.sendMessage(chatId, error.message);
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
        bot.sendMessage(chatId, "❓ الأمر غير معروف. هل تحتاج إلى مساعدة؟");
    }
});

// التعامل مع الأزرار (Callbacks)
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith('desc_')) {
        // عرض الوصف عند طلبه
        const animeName = data.split('_')[1];
        try {
            const anime = await searchAnime(animeName);
            const description = anime.description ? anime.description.replace(/<\/?[^>]+(>|$)/g, "").slice(0, 500) + '...' : 'لا يوجد وصف متاح.';
            bot.sendMessage(chatId, `<b>📖 الوصف:</b>\n\n${description}`, { parse_mode: 'HTML' });
        } catch (error) {
            bot.sendMessage(chatId, "حدث خطأ أثناء جلب الوصف.");
        }

    } else if (data.startsWith('image_')) {
        // إرسال صورة الأنمي عند طلبها
        const imageUrl = data.split('_')[1];
        bot.sendPhoto(chatId, imageUrl, { caption: "📥 تم تحميل صورة الأنمي." });
    }
});

// معالجة الأخطاء العامة
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
    bot.sendMessage(chatId, "⚠️ حدث خطأ تقني. يرجى المحاولة لاحقاً.");
});