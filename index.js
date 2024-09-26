const express = require('express');
const router = express.Router();
const axios = require('axios');

// الصفحة الرئيسية
router.get('/', (req, res) => {
  res.render('index', { title: 'Anime Streaming Platform' });
});

// البحث عن الأنمي باستخدام Anilist API
router.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).send('Query is required');
  }

  try {
    const response = await axios.post('https://graphql.anilist.co', {
      query: `
        query ($search: String) {
          Media(search: $search, type: ANIME) {
            id
            title {
              romaji
              english
              native
            }
            description
            episodes
            coverImage {
              large
            }
          }
        }
      `,
      variables: { search: query },
    });

    const anime = response.data.data.Media;
    res.render('anime', { anime });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching anime data');
  }
});

module.exports = router;