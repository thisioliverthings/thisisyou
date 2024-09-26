require('dotenv').config(); // لإدارة متغيرات البيئة
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator'); // لتحسين التحقق من صحة المدخلات
const cors = require('cors'); // لتفعيل CORS

const app = express();
const port = process.env.PORT || 3000;

// استخدام helmet للحماية
app.use(helmet());

// تفعيل CORS
app.use(cors());

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
app.set('views', __dirname); // استخدام المسار الحالي للعرض

// تقديم الملفات الثابتة من الجذر
app.use(express.static(__dirname));

// مسار الصفحة الرئيسية
app.get('/', (req, res) => {
  res.render('index', { title: 'الصفحة الرئيسية' });
});

// مسار البحث (مثال)
app.get('/search', [
  body('q').isString().notEmpty().withMessage('يرجى إدخال نص البحث')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const query = req.query.q;
  // منطق البحث الخاص بك هنا
  res.json({ message: `نتائج البحث عن: ${query}` }); // إرسال النتائج كـ JSON
});

// التعامل مع الأخطاء 404
app.use((req, res) => {
  res.status(404).send('<h1>404 - صفحة غير موجودة</h1>'); // عرض رسالة بسيطة بدلاً من عرض EJS
});

// التعامل مع الأخطاء
app.use((err, req, res) => {
  console.error(err.stack);
  res.status(500).send('<h1>500 - خطأ في الخادم</h1>'); // عرض رسالة بسيطة بدلاً من عرض EJS
});

// تشغيل الخادم
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});

// إغلاق الخادم عند الإنهاء
process.on('SIGINT', () => {
  console.log('\nإغلاق الخادم...');
  process.exit();
});