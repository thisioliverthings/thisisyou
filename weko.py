import os
from telegram import Update
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters, CallbackContext
from fpdf import FPDF

# دالة لتحويل النص إلى PDF
def text_to_pdf(text, pdf_filename):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_font("Arial", size=12)
    
    # إضافة النص إلى ملف الـ PDF
    for line in text.split('\n'):
        pdf.cell(200, 10, txt=line, ln=True)
    
    # حفظ ملف PDF
    pdf.output(pdf_filename)

# دالة الاستجابة عند بدء البوت
def start(update: Update, context: CallbackContext):
    update.message.reply_text("مرحبًا! أرسل لي نصًا أو ملف .txt لأحوله إلى PDF.")

# دالة لاستقبال الرسائل النصية
def handle_message(update: Update, context: CallbackContext):
    # استلام النص المرسل
    text = update.message.text
    pdf_filename = "message.pdf"
    
    # تحويل النص إلى PDF
    text_to_pdf(text, pdf_filename)
    
    # إرسال ملف PDF
    with open(pdf_filename, 'rb') as pdf_file:
        update.message.reply_document(pdf_file)
    
    # حذف الملف بعد إرساله
    os.remove(pdf_filename)

# دالة لاستقبال الملفات النصية
def handle_document(update: Update, context: CallbackContext):
    file = update.message.document
    
    # تأكد أن الملف هو ملف نصي بصيغة .txt
    if file.file_name.endswith(".txt"):
        file_path = file.get_file().download()
        
        # قراءة محتوى ملف .txt
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        
        pdf_filename = "document.pdf"
        
        # تحويل النص إلى PDF
        text_to_pdf(text, pdf_filename)
        
        # إرسال ملف PDF
        with open(pdf_filename, 'rb') as pdf_file:
            update.message.reply_document(pdf_file)
        
        # حذف الملفات بعد الإرسال
        os.remove(pdf_filename)
        os.remove(file_path)
    else:
        update.message.reply_text("يرجى إرسال ملف نصي بصيغة .txt فقط!")

# الوظيفة الرئيسية لتشغيل البوت
def main():
    # ضع التوكن الخاص بالبوت هنا
    TOKEN = "7739626112:AAHVJXMdorsiiyTsp9wtclsbnks84m4g8eI"
    
    updater = Updater(TOKEN, use_context=True)
    dp = updater.dispatcher
    
    # أوامر البوت
    dp.add_handler(CommandHandler("start", start))
    
    # استقبال الرسائل النصية
    dp.add_handler(MessageHandler(Filters.text & ~Filters.command, handle_message))
    
    # استقبال الملفات
    dp.add_handler(MessageHandler(Filters.document.mime_type("text/plain"), handle_document))
    
    # بدء تشغيل البوت
    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    main()