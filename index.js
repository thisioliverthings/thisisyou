<!DOCTYPE html>
<html lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %></title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>أشهر 20 أنمي</h1>
    <div class="anime-list">
        <% topAnime.forEach(anime => { %>
            <div class="anime-item">
                <img src="<%= anime.coverImage.medium %>" alt="<%= anime.title.romaji %>">
                <h2><%= anime.title.romaji %></h2>
                <p><%= anime.description ? anime.description.substring(0, 100) + '...' : 'لا يوجد وصف.' %></p>
            </div>
        <% }); %>
    </div>
    <form action="/search" method="get">
        <input type="text" name="q" placeholder="ابحث عن أنمي">
        <button type="submit">بحث</button>
    </form>
</body>
</html>