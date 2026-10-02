#!/usr/bin/env python3
"""Render the repository's German dev8 report as a paginated PDF."""
from pathlib import Path
import re
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, LongTable, TableStyle, KeepTogether, PageBreak

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/security/ADAPTER_CHANNEL_DEV8_DE.md'
OUTPUT = ROOT / 'reports/integration/adapter-channel/EOS_Adapterkommunikation_Dev8_Bericht.pdf'
FONT = Path('/usr/share/fonts/truetype/dejavu')
for name, filename in [('EOS', 'DejaVuSans.ttf'), ('EOS-Bold', 'DejaVuSans-Bold.ttf'), ('EOS-Mono', 'DejaVuSansMono.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONT / filename)))
pdfmetrics.registerFontFamily('EOS', normal='EOS', bold='EOS-Bold', italic='EOS', boldItalic='EOS-Bold')
ink, teal, muted = colors.HexColor('#17303C'), colors.HexColor('#007E83'), colors.HexColor('#536975')
styles = {
    'body': ParagraphStyle('body', fontName='EOS', fontSize=9.2, leading=13.4, textColor=ink, spaceAfter=7, splitLongWords=True),
    'title': ParagraphStyle('title', fontName='EOS-Bold', fontSize=22, leading=28, textColor=ink, spaceAfter=14),
    'h2': ParagraphStyle('h2', fontName='EOS-Bold', fontSize=13, leading=17, textColor=teal, spaceBefore=14, spaceAfter=8, keepWithNext=True),
    'table': ParagraphStyle('table', fontName='EOS', fontSize=8, leading=11.1, textColor=ink, spaceAfter=0, splitLongWords=True),
    'th': ParagraphStyle('th', fontName='EOS-Bold', fontSize=8.1, leading=11.4, textColor=colors.white, spaceAfter=0),
    'item': ParagraphStyle('item', fontName='EOS', fontSize=9.2, leading=13.4, leftIndent=12, firstLineIndent=-9, textColor=ink, spaceAfter=6),
}
def inline(text):
    text = text.replace('\u2013', '-').replace('\u2014', '-').replace('\u2011', '-')
    text = escape(text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'`([^`]+)`', r'<font name="EOS-Mono" size="8.1">\1</font>', text)
    return text

def furniture(canvas, doc):
    width, height = A4
    canvas.saveState(); canvas.setFillColor(teal); canvas.rect(0, height - 10, width, 10, fill=1, stroke=0)
    canvas.setFont('EOS-Bold', 9); canvas.drawString(43, height - 35, 'NexoWatt EOS')
    canvas.setFont('EOS', 8); canvas.setFillColor(muted); canvas.drawRightString(width - 43, height - 35, 'Entwicklungs- und Sicherheitsbericht | dev8')
    canvas.setStrokeColor(colors.HexColor('#DCE5E9')); canvas.line(43, 38, width - 43, 38)
    canvas.setFont('EOS', 7.5); canvas.drawString(43, 25, '02.10.2026 | Keine Produkt- oder Anlagenfreigabe')
    canvas.drawRightString(width - 43, 25, str(doc.page)); canvas.restoreState()

def render():
    lines = SOURCE.read_text().splitlines(); flow = []; i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line: i += 1; continue
        if line.startswith('# '): flow.append(Paragraph(inline(line[2:]), styles['title'])); i += 1; continue
        if line.startswith('## '):
            if line == '## Offizielle Quellen': flow.append(PageBreak())
            flow.append(Paragraph(inline(line[3:]), styles['h2'])); i += 1; continue
        if line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                raw = [x.strip() for x in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[-: ]+', x) for x in raw): rows.append(raw)
                i += 1
            widths = [154, 355] if len(rows[0]) == 2 else [116, 194, 199]
            data = [[Paragraph(inline(cell), styles['th' if row == 0 else 'table']) for cell in values] for row, values in enumerate(rows)]
            table = LongTable(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
            table.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), ink), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#F0F5F6'), colors.white]),
                ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7),
                ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
                ('LINEBELOW', (0, 0), (-1, 0), 0.5, teal), ('LINEBELOW', (0, 1), (-1, -1), 0.3, colors.HexColor('#DAE4E7'))]))
            flow += [table, Spacer(1, 10)]; continue
        paragraph = [line]; i += 1
        while i < len(lines) and lines[i].strip() and not lines[i].lstrip().startswith(('#', '|', '- ')) and not re.match(r'^\d+\. ', lines[i].strip()):
            paragraph.append(lines[i].strip()); i += 1
        text = ' '.join(paragraph)
        style = styles['item'] if text.startswith('- ') or re.match(r'^\d+\. ', text) else styles['body']
        flow.append(Paragraph(inline(text), style))
    SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=43, leftMargin=43, topMargin=58, bottomMargin=51,
        title='NexoWatt EOS dev8 - Adapterkommunikation und sichere Logiken', author='NexoWatt',
        subject='Entwicklungsstand, Prüfbelege und externe Adapterintegration').build(flow, onFirstPage=furniture, onLaterPages=furniture)
    print(OUTPUT)

if __name__ == '__main__': render()
