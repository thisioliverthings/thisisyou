from fpdf import FPDF

def text_to_pdf(text, pdf_filename):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_font("Arial", size=12)
    
    # إضافة النص
    for line in text.split('\n'):
        pdf.cell(200, 10, txt=line, ln=True)
    
    # حفظ الملف بصيغة PDF
    pdf.output(pdf_filename)

# لتحويل نص من رسالة إلى PDF
message_text = """هذا نص يتم تحويله إلى PDF.
يمكنك إضافة أي نص هنا.
"""
text_to_pdf(message_text, "output_message.pdf")

# لتحويل محتوى ملف نصي إلى PDF
with open("input_text.txt", "r", encoding="utf-8") as file:
    file_text = file.read()
text_to_pdf(file_text, "output_file.pdf")