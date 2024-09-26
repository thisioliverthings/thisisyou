const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// استخدام helmet للحماية
app.use(helmet());

// ضغط الاستجابات
app.use(compression());

// استخدام body-parser لتحليل طلبات POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// تسجيل الطلبات باستخدام morgan
app.use(morgan('dev'));

// تقييد عدد الطلبات لكل IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // الحد الأقصى للطلبات
  message: "تم تجاوز الحد الأقصى من الطلبات، الرجاء المحاولة لاحقًا"
});
app.use(limiter);

// إعداد EJS كقالب العرض
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname)); // استخدام المسار الحالي للعرض

// تقديم الملفات الثابتة من المجلد الحالي
app.use(express.static(path.join(__dirname)));

// استعلام GraphQL لجلب أفضل 20 أنمي
const topAnimeQuery = `
  query {
    Page(perPage: 20) {
      media(sort: POPULARITY_DESC, type: ANIME) {
        id
        title {
          romaji
        }
        coverImage {
          medium
        }
        description
      }
    }
  }
`;

// استعلام البحث عن أنمي بناءً على الإدخال
const searchAnimeQuery = (searchTerm) => `
  query {
    Page(perPage: 5) {
      media(search: "${searchTerm}", type: ANIME) {
        id
        title {
          romaji
        }
        coverImage {
          medium
        }
        description
      }
    }
  }
`;

// جلب أفضل 20 أنمي
async function fetchTopAnime() {
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ query: topAnimeQuery })
  });
  const data = await response.json();
  return data.data.Page.media;
}

// جلب نتائج البحث بناءً على الإدخال
async function searchAnime(searchTerm) {
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ query: searchAnimeQuery(searchTerm) })
  });
  const data = await response.json();
  return data.data.Page.media;
}

// المسار الرئيسي لعرض قائمة أفضل 20 أنمي
app.get('/', async (req, res) => {
  try {
    const topAnime = await fetchTopAnime();
    res.render('index', { title: 'الصفحة الرئيسية', topAnime });
  } catch (err) {
    console.error(err);
    res.status(500).send('خطأ في جلب الأنمي');
  }
});

// مسار البحث عن أنمي
app.get('/search', async (req, res) => {
  try {
    const searchTerm = req.query.q || '';
    const searchResults = await searchAnime(searchTerm);
    res.render('search', { title: 'نتائج البحث', searchResults });
  } catch (err) {
    console.error(err);
    res.status(500).send('خطأ في البحث');
  }
});

// التعامل مع الأخطاء 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'صفحة غير موجودة' });
});

// التعامل مع الأخطاء
app.use((err, req, res) => {
  console.error(err.stack);
  res.status(500).render('error', { title: 'خطأ في الخادم' });
});

// تشغيل الخادم
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});