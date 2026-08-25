import ExcelJS from 'exceljs';
import { Resvg } from '@resvg/resvg-js';
import { mkdir, writeFile } from 'node:fs/promises';

const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const categories = ['Maaş', 'Ek Gelir', 'Kira Geliri', 'Konut', 'Faturalar', 'Market', 'Ulaşım', 'Sağlık', 'Eğitim', 'Borç Ödemesi', 'Kişisel Harcama', 'Tasarruf', 'Diğer'];

await mkdir('public/downloads', { recursive: true });
await mkdir('public/og', { recursive: true });

const workbook = new ExcelJS.Workbook();
workbook.creator = 'Bütçe Pusulası';
workbook.created = new Date('2026-08-25T00:00:00Z');
workbook.modified = new Date('2026-08-25T00:00:00Z');

const summary = workbook.addWorksheet('Yıllık Özet', { views: [{ state: 'frozen', ySplit: 3 }] });
summary.columns = [
  { key: 'month', width: 18 }, { key: 'income', width: 18 }, { key: 'expense', width: 18 }, { key: 'difference', width: 18 },
];
summary.mergeCells('A1:D1');
summary.getCell('A1').value = 'Bütçe Pusulası — Yıllık Gelir Gider Özeti';
summary.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
summary.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C4A' } };
summary.getRow(3).values = ['Ay', 'Toplam Gelir', 'Toplam Gider', 'Net Fark'];

months.forEach((month, monthIndex) => {
  const sheet = workbook.addWorksheet(month, { views: [{ state: 'frozen', ySplit: 4 }] });
  sheet.columns = [
    { key: 'date', width: 14 }, { key: 'type', width: 14 }, { key: 'category', width: 22 },
    { key: 'description', width: 38 }, { key: 'planned', width: 18 }, { key: 'actual', width: 18 },
  ];
  sheet.mergeCells('A1:F1');
  sheet.getCell('A1').value = `${month} 2026 — Gelir Gider Tablosu`;
  sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C4A' } };
  sheet.getRow(3).values = ['Tarih', 'Tür', 'Kategori', 'Açıklama', 'Planlanan (₺)', 'Gerçekleşen (₺)'];
  sheet.getRow(3).font = { bold: true };
  sheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0ED' } };

  for (let row = 4; row <= 103; row += 1) {
    sheet.getCell(`B${row}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Gelir,Gider"'] };
    sheet.getCell(`C${row}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${categories.join(',')}"`] };
    sheet.getCell(`A${row}`).numFmt = 'dd.mm.yyyy';
    sheet.getCell(`E${row}`).numFmt = '₺#,##0.00';
    sheet.getCell(`F${row}`).numFmt = '₺#,##0.00';
  }
  sheet.getCell('D105').value = 'Toplam Gelir';
  sheet.getCell('F105').value = { formula: 'SUMIF(B4:B103,"Gelir",F4:F103)' };
  sheet.getCell('D106').value = 'Toplam Gider';
  sheet.getCell('F106').value = { formula: 'SUMIF(B4:B103,"Gider",F4:F103)' };
  sheet.getCell('D107').value = 'Net Fark';
  sheet.getCell('F107').value = { formula: 'F105-F106' };
  ['D105', 'D106', 'D107', 'F105', 'F106', 'F107'].forEach((cell) => { sheet.getCell(cell).font = { bold: true }; });
  ['F105', 'F106', 'F107'].forEach((cell) => { sheet.getCell(cell).numFmt = '₺#,##0.00'; });
  sheet.autoFilter = 'A3:F103';

  const summaryRow = monthIndex + 4;
  summary.getCell(`A${summaryRow}`).value = month;
  summary.getCell(`B${summaryRow}`).value = { formula: `'${month}'!F105` };
  summary.getCell(`C${summaryRow}`).value = { formula: `'${month}'!F106` };
  summary.getCell(`D${summaryRow}`).value = { formula: `'${month}'!F107` };
  ['B', 'C', 'D'].forEach((column) => { summary.getCell(`${column}${summaryRow}`).numFmt = '₺#,##0.00'; });
});

summary.getCell('A17').value = 'Yıllık Toplam';
summary.getCell('B17').value = { formula: 'SUM(B4:B15)' };
summary.getCell('C17').value = { formula: 'SUM(C4:C15)' };
summary.getCell('D17').value = { formula: 'SUM(D4:D15)' };
summary.getRow(17).font = { bold: true };
['B17', 'C17', 'D17'].forEach((cell) => { summary.getCell(cell).numFmt = '₺#,##0.00'; });

await workbook.xlsx.writeFile('public/downloads/gelir-gider-tablosu.xlsx');

const mark = '<path d="M22 18h20v28H22zM48 10h20v36H48zM74 25h20v21H74z" fill="#0F4C4A"/><circle cx="91" cy="16" r="6" fill="none" stroke="#3E7F76" stroke-width="3"/>';
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 56"><rect width="112" height="56" fill="#FCFCFA"/>${mark}</svg>`;
await writeFile('public/favicon.svg', faviconSvg);

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 112"><rect width="112" height="112" rx="14" fill="#FCFCFA"/><g transform="translate(0 28)">${mark}</g></svg>`;
const icon32 = new Resvg(iconSvg, { fitTo: { mode: 'width', value: 32 } }).render().asPng();
const icon180 = new Resvg(iconSvg, { fitTo: { mode: 'width', value: 180 } }).render().asPng();
await writeFile('public/apple-touch-icon.png', icon180);

const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader.writeUInt8(32, 6);
icoHeader.writeUInt8(32, 7);
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(icon32.length, 14);
icoHeader.writeUInt32LE(22, 18);
await writeFile('public/favicon.ico', Buffer.concat([icoHeader, icon32]));

await writeFile('public/site.webmanifest', JSON.stringify({
  name: 'Bütçe Pusulası', short_name: 'Bütçe Pusulası', lang: 'tr', start_url: '/', display: 'standalone',
  background_color: '#FCFCFA', theme_color: '#0F4C4A', icons: [{ src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
}, null, 2));

const defaultOg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#FCFCFA"/><g transform="translate(72 80) scale(3)">${mark}</g><text x="72" y="430" font-family="sans-serif" font-size="76" font-weight="700" fill="#0F4C4A">Bütçe Pusulası</text><text x="72" y="500" font-family="sans-serif" font-size="34" fill="#1A1A1A">Sade ve bağımsız finansal eğitim</text></svg>`;
await writeFile('public/og/default.png', new Resvg(defaultOg).render().asPng());
