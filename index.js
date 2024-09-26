<!DOCTYPE html>
<html lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>بحث الأنمي</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>بحث الأنمي</h1>
        </header>
        <main>
            <form id="searchForm">
                <input type="text" id="animeName" placeholder="أدخل اسم الأنمي" required>
                <button type="submit">ابحث</button>
            </form>
            <div id="animeResult" class="anime-result">
                <!-- نتائج البحث ستظهر هنا -->
            </div>
        </main>
        <footer>
            <p>© 2024 - منصتك المفضلة للأنمي</p>
        </footer>
    </div>

    <script>
        document.getElementById('searchForm').addEventListener('submit', async function(event) {
            event.preventDefault();
            const animeName = document.getElementById('animeName').value;
            const response = await fetch(`/search?q=${animeName}`);
            const data = await response.json();

            document.getElementById('animeResult').innerHTML = `
                <div class="anime-card">
                    <img src="${data.coverImage}" alt="${data.title}">
                    <div class="anime-info">
                        <h2>${data.title}</h2>
                        <p>${data.description}</p>
                        <p>عدد الحلقات: ${data.episodes}</p>
                        <p>التصنيف: ${data.genres.join(', ')}</p>
                        <p>التقييم: ${data.averageScore}%</p>
                        <p>الحالة: ${data.status}</p>
                    </div>
                </div>
            `;
        });
    </script>
</body>
</html>