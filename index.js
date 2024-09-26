<!DOCTYPE html>
<html lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تطبيق مشاهدة الأنمي</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <h1>تطبيق مشاهدة الأنمي</h1>
        <nav>
            <a href="#home">الرئيسية</a>
            <a href="#favorites">المفضلة</a>
            <a href="#login">تسجيل الدخول</a>
        </nav>
        <input type="text" id="search" placeholder="ابحث عن أنمي..." oninput="searchAnime()">
    </header>

    <main>
        <!-- قسم عرض قائمة الأنمي -->
        <section id="anime-list-section">
            <h2>قائمة الأنمي</h2>
            <div id="anime-list"></div>
        </section>

        <!-- قسم تفاصيل الأنمي -->
        <section id="anime-details" style="display: none;">
            <h2 id="anime-title"></h2>
            <img id="anime-image" alt="صورة الأنمي">
            <p id="anime-description"></p>

            <!-- قائمة الحلقات المتوفرة -->
            <h3>الحلقات المتوفرة</h3>
            <div id="episode-list"></div>

            <button onclick="goBackToList()">العودة إلى القائمة</button>
        </section>
    </main>

    <footer>
        <p>حقوق النشر © 2024 تطبيق مشاهدة الأنمي</p>
    </footer>

    <script src="script.js"></script>
</body>
</html>