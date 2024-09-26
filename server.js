require('dotenv').config(); 
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch'); // لإرسال طلبات API

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: "تم تجاوز الحد الأقصى من الطلبات، الرجاء المحاولة لاحقًا"
});
app.use(limiter);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname));
app.use(express.static(path.join(__dirname)));

// استيراد بيانات أفضل 20 أنمي
async function fetchTopAnime() {
  const query = `
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
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  const data = await response.json();
  return data.data.Page.media;
}

// عرض الصفحة الرئيسية مع أفضل 20 أنمي
app.get('/', async (req, res) => {
  try {
    const topAnime = await fetchTopAnime();
    res.render('index', { title: 'الصفحة الرئيسية', topAnime });
  } catch (err) {
    console.error(err);
    res.status(500).send('خطأ في جلب الأنمي');
  }
});

// البحث عن الأنمي
app.get('/search', async (req, res) => {
  const query = req.query.q;
  const searchQuery = `
    query($search: String) {
      Media(search: $search, type: ANIME) {
        id
        title {
          romaji
        }
        coverImage {
          medium
        }
        description
        episodes
        genres
        averageScore
        status
      }
    }
  `;
  const variables = { search: query };
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ query: searchQuery, variables })
  });
  const data = await response.json();
  res.json(data.data.Media);
});

// تقديم اقتراحات البحث بناءً على إدخال المستخدم
app.get('/suggest', async (req, res) => {
  const query = req.query.q;
  const searchQuery = `
    query($search: String) {
      Page(perPage: 5) {
        media(search: $search, type: ANIME) {
          id
          title {
            romaji
          }
        }
      }
    }
  `;
  const variables = { search: query };
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ query: searchQuery, variables })
  });
  const data = await response.json();
  res.json(data.data.Page.media);
});

// تشغيل الخادم
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});