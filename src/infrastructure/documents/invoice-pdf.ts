import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export interface PdfLineItem {
  description: string;
  quantity: string;
  amount: string;
}

export interface InvoicePdfData {
  title: "Draft invoice" | "Invoice" | "Tax invoice" | "Receipt" | "Credit note";
  number: string;
  issueDate: string;
  dueDate?: string;
  supplierName: string;
  supplierAbn: string;
  customerName: string;
  customerDetails?: string;
  lines: readonly PdfLineItem[];
  subtotal: string;
  gst?: string;
  total: string;
  amountPaid?: string;
  balance?: string;
  terms: string;
  paymentReference?: string;
}

const A4: [number, number] = [595.28, 841.89];
const margin = 48;

const wrap = (text: string, font: PDFFont, size: number, width: number): string[] => {
  const paragraphs = text.replaceAll("\r", "").split("\n");
  const result: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
      } else {
        if (line) result.push(line);
        line = word;
      }
    }
    result.push(line);
  }
  return result;
};

const drawWrapped = (
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  x: number,
  y: number,
  width: number,
  colour = rgb(0.09, 0.13, 0.17),
): number => {
  const lineHeight = size * 1.35;
  for (const line of wrap(text, font, size, width)) {
    page.drawText(line, { x, y, size, font, color: colour });
    y -= lineHeight;
  }
  return y;
};

export async function createInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage(A4);
  let y = A4[1] - margin;

  const newPage = () => {
    page = document.addPage(A4);
    y = A4[1] - margin;
  };

  page.drawText("SAJ SERVICE DESK", { x: margin, y, size: 11, font: bold, color: rgb(0.03, 0.35, 0.52) });
  page.drawText(data.title.toUpperCase(), { x: 390, y, size: 16, font: bold });
  y -= 30;
  y = drawWrapped(page, data.supplierName, bold, 12, margin, y, 250);
  y = drawWrapped(page, `ABN ${data.supplierAbn}`, regular, 9, margin, y - 2, 250);
  page.drawText(data.number, { x: 390, y: A4[1] - 78, size: 11, font: bold });
  page.drawText(`Issued ${data.issueDate}`, { x: 390, y: A4[1] - 94, size: 9, font: regular });
  if (data.dueDate) page.drawText(`Due ${data.dueDate}`, { x: 390, y: A4[1] - 108, size: 9, font: regular });

  y -= 24;
  page.drawText("BILL TO", { x: margin, y, size: 8, font: bold, color: rgb(0.35, 0.42, 0.47) });
  y = drawWrapped(page, data.customerName, bold, 11, margin, y - 17, 480);
  if (data.customerDetails) y = drawWrapped(page, data.customerDetails, regular, 9, margin, y, 480);
  y -= 18;

  for (const item of data.lines) {
    const descriptionLines = wrap(item.description, regular, 9, 350);
    const required = Math.max(1, descriptionLines.length) * 13 + 22;
    if (y - required < 90) newPage();
    page.drawLine({ start: { x: margin, y }, end: { x: A4[0] - margin, y }, thickness: 0.6, color: rgb(0.82, 0.86, 0.88) });
    y -= 17;
    for (const line of descriptionLines) {
      page.drawText(line, { x: margin, y, size: 9, font: regular });
      y -= 13;
    }
    page.drawText(item.quantity, { x: 420, y: y + 13 * descriptionLines.length, size: 9, font: regular });
    page.drawText(item.amount, { x: 486, y: y + 13 * descriptionLines.length, size: 9, font: bold });
    y -= 5;
  }

  if (y < 210) newPage();
  y -= 20;
  const totals: Array<[string, string | undefined]> = [
    ["Subtotal", data.subtotal], ["GST", data.gst], ["Total", data.total],
    ["Paid", data.amountPaid], ["Balance", data.balance],
  ];
  for (const [label, value] of totals) {
    if (!value) continue;
    page.drawText(label, { x: 390, y, size: label === "Total" ? 11 : 9, font: label === "Total" ? bold : regular });
    page.drawText(value, { x: 486, y, size: label === "Total" ? 11 : 9, font: bold });
    y -= label === "Total" ? 22 : 16;
  }

  y -= 10;
  page.drawText("TERMS", { x: margin, y, size: 8, font: bold, color: rgb(0.35, 0.42, 0.47) });
  y = drawWrapped(page, data.terms, regular, 9, margin, y - 16, 500);
  if (data.paymentReference) drawWrapped(page, `Payment reference: ${data.paymentReference}`, bold, 9, margin, y - 8, 500);

  const pages = document.getPages();
  pages.forEach((current, index) => {
    const footer = `Page ${index + 1} of ${pages.length}`;
    const footerX = A4[0] - margin - regular.widthOfTextAtSize(footer, 8);
    current.drawText(footer, { x: footerX, y: 28, size: 8, font: regular, color: rgb(0.35, 0.42, 0.47) });
  });
  document.setTitle(`${data.title} ${data.number}`);
  document.setAuthor("Saj Service Desk");
  document.setCreator("Saj Service Desk");
  return document.save();
}
