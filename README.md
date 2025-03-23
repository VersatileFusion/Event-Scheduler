# Event Scheduler with Time Zone Support

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-v14+-green.svg)
![Express](https://img.shields.io/badge/Express-v4.18+-blue.svg)

> A comprehensive event scheduling system with time zone support, RSVP management, and bilingual interface (English/Persian)
>
> سیستم جامع زمان‌بندی رویدادها با پشتیبانی از منطقه زمانی، مدیریت دعوت‌نامه، و رابط دوزبانه (انگلیسی/فارسی)

## 🌟 Features | ویژگی‌ها

### Core Features | ویژگی‌های اصلی
- ✅ **User Authentication** - Secure registration, login, email verification | **احراز هویت کاربر** - ثبت نام امن، ورود، تأیید ایمیل
- ✅ **Event Management** - Complete CRUD operations for events | **مدیریت رویداد** - عملیات کامل CRUD برای رویدادها
- ✅ **Time Zone Conversion** - Events displayed in user's local time | **تبدیل منطقه زمانی** - نمایش رویدادها در زمان محلی کاربر
- ✅ **Email Notifications** - Invitations, reminders, and updates | **اطلاع‌رسانی از طریق ایمیل** - دعوت‌نامه‌ها، یادآوری‌ها و به‌روزرسانی‌ها
- ✅ **RSVP System** - Accept, decline, or tentatively accept invitations | **سیستم RSVP** - پذیرش، رد یا پذیرش موقت دعوت‌نامه‌ها
- ✅ **Calendar Export** - ICS file generation for calendar applications | **خروجی تقویم** - تولید فایل ICS برای برنامه‌های تقویم
- ✅ **Bilingual Support** - Complete English and Persian translations | **پشتیبانی دوزبانه** - ترجمه‌های کامل انگلیسی و فارسی
- ✅ **Recurring Events** - Schedule repeating events (daily, weekly, monthly) | **رویدادهای تکراری** - زمان‌بندی رویدادهای تکراری (روزانه، هفتگی، ماهانه)

### Enhanced Features | ویژگی‌های پیشرفته
- 🔄 **Background Jobs** - Automated reminders and maintenance tasks via Agenda.js | **کارهای پس‌زمینه** - یادآوری‌های خودکار و وظایف نگهداری از طریق Agenda.js
- 🔒 **Rate Limiting** - Protection against abuse and brute force attacks | **محدودیت نرخ** - محافظت در برابر سوء استفاده و حملات بروت فورس
- ✅ **Request Validation** - Comprehensive input validation with bilingual error messages | **اعتبارسنجی درخواست** - اعتبارسنجی جامع ورودی با پیام‌های خطای دوزبانه
- 🔍 **Advanced Search & Filtering** - Find events by text, date, category, status | **جستجو و فیلتر پیشرفته** - یافتن رویدادها با متن، تاریخ، دسته، وضعیت
- 📄 **Pagination** - Efficient loading of large result sets | **صفحه‌بندی** - بارگذاری کارآمد مجموعه‌های نتایج بزرگ
- 💾 **Redis Caching** - Optimized performance for frequently accessed data | **کش Redis** - عملکرد بهینه‌سازی شده برای داده‌های با دسترسی مکرر
- 🔐 **Social Authentication** - Login via Google and GitHub | **احراز هویت اجتماعی** - ورود از طریق گوگل و گیت‌هاب
- 📁 **File Uploads** - Attach files to events with validation and security | **آپلود فایل** - پیوست فایل‌ها به رویدادها با اعتبارسنجی و امنیت
- 📊 **Metrics & Monitoring** - Prometheus metrics for application health | **متریک‌ها و نظارت** - متریک‌های Prometheus برای سلامت برنامه
- 🧪 **Testing** - Comprehensive test suite with Jest | **تست** - مجموعه تست جامع با Jest

## 🧰 Technologies | فناوری‌ها

### Backend | بک‌اند
- **Node.js & Express.js** - Fast, unopinionated web framework
- **MongoDB & Mongoose** - Flexible document database
- **JWT** - Secure authentication
- **Moment-timezone** - Time zone handling
- **Nodemailer** - Email notifications
- **ICS** - Calendar file generation
- **Agenda.js** - Distributed job scheduling
- **Redis** - In-memory data store for caching
- **Passport.js** - Authentication middleware for OAuth
- **Multer** - File upload handling
- **Express-validator** - Input validation
- **Winston** - Logging
- **Prometheus** - Metrics collection
- **Jest** - Testing framework

### Security | امنیت
- **Helmet** - HTTP security headers
- **CORS** - Cross-Origin Resource Sharing
- **Rate Limiting** - Request throttling
- **Input Validation** - Protection against injection
- **File Type Validation** - Safe file uploads

## 🚀 Getting Started | شروع به کار

### Prerequisites | پیش‌نیازها
- Node.js (v14+)
- MongoDB (v4+)
- Redis (v6+)
- npm or yarn

### Installation | نصب
1. Clone the repository | کلون کردن مخزن
   ```bash
   git clone https://github.com/yourusername/event-scheduler.git
   cd event-scheduler
   ```

2. Install dependencies | نصب وابستگی‌ها
   ```bash
   npm install
   ```

3. Create .env file from example | ایجاد فایل .env از نمونه
   ```bash
   cp .env.example .env
   ```

4. Edit .env with your configuration | ویرایش .env با پیکربندی شما
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/event-scheduler
   JWT_SECRET=your_jwt_secret_key
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your_email@example.com
   SMTP_PASS=your_email_password
   EMAIL_FROM=no-reply@eventscheduler.com
   LOG_LEVEL=info
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   REDIS_URL=redis://localhost:6379
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   ```

5. Start the server | شروع سرور
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. The server will be running at [http://localhost:5000](http://localhost:5000)

### API Documentation | مستندات API
Access the Swagger API documentation at [http://localhost:5000/api-docs](http://localhost:5000/api-docs) when the server is running.

## 📝 API Endpoints | نقاط پایانی API

### Authentication | احراز هویت
- **POST /api/users/register** - Register a new user | ثبت‌نام کاربر جدید
- **POST /api/users/login** - Login | ورود
- **POST /api/users/refresh-token** - Refresh authentication token | بازسازی توکن احراز هویت
- **POST /api/users/verify-email/:token** - Verify email address | تایید آدرس ایمیل
- **POST /api/users/reset-password-request** - Request password reset | درخواست بازنشانی رمز عبور
- **POST /api/users/reset-password** - Reset password | بازنشانی رمز عبور
- **POST /api/users/logout** - Logout | خروج

### OAuth | احراز هویت اجتماعی
- **GET /api/users/auth/google** - Login with Google | ورود با گوگل
- **GET /api/users/auth/github** - Login with GitHub | ورود با گیت‌هاب

### User Management | مدیریت کاربر
- **GET /api/users/me** - Get current user profile | دریافت پروفایل کاربر فعلی
- **PUT /api/users/me** - Update user profile | به‌روزرسانی پروفایل کاربر
- **POST /api/users/change-password** - Change password | تغییر رمز عبور
- **POST /api/users/profile-picture** - Upload profile picture | آپلود تصویر پروفایل
- **DELETE /api/users/profile-picture** - Delete profile picture | حذف تصویر پروفایل
- **PUT /api/users/notification-preferences** - Update notification preferences | به‌روزرسانی ترجیحات اطلاع‌رسانی

### Events | رویدادها
- **POST /api/events** - Create a new event | ایجاد رویداد جدید
- **GET /api/events** - Get events with search and filtering | دریافت رویدادها با جستجو و فیلتر
- **GET /api/events/:id** - Get event by ID | دریافت رویداد با شناسه
- **PUT /api/events/:id** - Update event | به‌روزرسانی رویداد
- **DELETE /api/events/:id** - Delete event | حذف رویداد
- **POST /api/events/:id/rsvp** - Respond to invitation | پاسخ به دعوت‌نامه
- **GET /api/events/:id/calendar** - Download event ICS file | دانلود فایل ICS رویداد
- **POST /api/events/:id/attachments** - Upload attachments | آپلود پیوست‌ها
- **DELETE /api/events/:id/attachments/:attachmentId** - Delete attachment | حذف پیوست
- **GET /api/events/:id/attendees** - List event attendees | لیست شرکت‌کنندگان رویداد
- **GET /api/events/calendar/view** - Get events for calendar view | دریافت رویدادها برای نمای تقویم

## 💻 Development | توسعه

### Directory Structure | ساختار دایرکتوری
```
event-scheduler/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Express middleware
│   ├── models/         # Mongoose models
│   ├── routes/         # Express routes
│   ├── utils/          # Utility functions
│   └── server.js       # Express app setup
├── uploads/            # Uploaded files
├── tests/              # Jest tests
├── .env.example        # Example environment variables
├── package.json        # Project dependencies
└── README.md           # Project documentation
```

### Testing | تست‌ها
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Monitoring | نظارت
Access Prometheus metrics at [http://localhost:5000/metrics](http://localhost:5000/metrics) for monitoring application performance and usage statistics.

## 📈 Performance Optimizations | بهینه‌سازی‌های عملکرد

The application includes several performance optimizations:

1. **Redis Caching** - Frequently accessed data is cached to reduce database load
2. **Database Indexing** - Optimized MongoDB queries with proper indexes
3. **Compression** - HTTP response compression for faster delivery
4. **Rate Limiting** - Prevents abuse and ensures fair resource allocation
5. **Pagination** - Efficient loading of large result sets

## 🔐 Security Features | ویژگی‌های امنیتی

1. **JWT Authentication** - Secure, stateless authentication
2. **Password Hashing** - bcrypt for secure password storage
3. **Input Validation** - Prevents injection attacks
4. **Rate Limiting** - Protection against brute force attacks
5. **CORS Protection** - Controlled cross-origin resource sharing
6. **Helmet Headers** - Secure HTTP headers
7. **File Upload Validation** - MIME type checking and file size limits

## 🌐 Internationalization | بین‌المللی‌سازی

The application fully supports both English and Persian languages:

- Server responses in both languages
- Error messages in both languages
- Logging in both languages
- Email templates in both languages

Users can set their preferred language in their profile.

## 📦 Additional Resources | منابع اضافی

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [JWT Documentation](https://jwt.io/introduction)
- [Redis Documentation](https://redis.io/documentation)
- [Agenda.js Documentation](https://github.com/agenda/agenda)

## 📝 License | مجوز

This project is licensed under the MIT License - see the LICENSE file for details.

## 📧 Contact | تماس

For questions or support, please contact [your-email@example.com](mailto:your-email@example.com).

---

<p align="center">Made with ❤️ for better event scheduling | ساخته شده با ❤️ برای زمان‌بندی بهتر رویدادها</p> 