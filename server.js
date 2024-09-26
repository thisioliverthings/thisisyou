require('dotenv').config();  // لإدارة متغيرات البيئة
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
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
app.set('views', path.join(__dirname, 'views'));  // المسار سيكون مباشرة في نفس الدليل

// تقديم الملفات الثابتة من مجلد public
app.use(express.static(path.join(__dirname, 'public')));  // يمكن الإبقاء على مجلد 'public' للملفات الثابتة

// استيراد المسارات من ملف index.js (في نفس المسار)
const indexRouter = require('./index');
app.use('/', indexRouter);

// التعامل مع الأخطاء 404
app.use((req, res, next) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// التعامل مع الأخطاء
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { title: 'Server Error' });
});

// تشغيل الخادم
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});