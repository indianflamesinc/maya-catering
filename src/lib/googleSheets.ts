import { google } from 'googleapis';

export interface TrayItem {
  dish_name: string;
  category: string;
  tray_size: string;
  tray_quantity: number;
  pricing_type: string;
  unit_price_cents: number;
  total_price_cents: number;
  customer_comments?: string;
}

export interface SessionDish {
  session_name: string;
  category: string;
  dish_name: string;
  guest_count: number;
  price_per_person_cents: number;
  total_price_cents: number;
}

export interface QuoteSheetData {
  enquiry_id: string;
  customer_name: string;
  customer_email: string;
  event_type: string;
  event_date: string;
  venue: string;
  guest_count: number;
  catering_type: 'tray' | 'per_person' | 'hybrid';
  tray_items?: TrayItem[];
  session_dishes?: SessionDish[];
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  deposit_cents: number;
  balance_cents: number;
  round_number: number;
  webhook_url: string;
}

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
}

export async function createQuoteReviewSheet(
  data: QuoteSheetData
): Promise<{ sheetId: string; sheetUrl: string }> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  // 1. Create spreadsheet
  const title = `Maya Quote Review — ${data.customer_name} — ${data.event_date} (Round ${data.round_number})`;
  const createRes = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: [{ properties: { title: 'Quote Review' } }],
    },
  });

  const sheetId = createRes.data.spreadsheetId!;
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

  // 2. Build rows
  const rows = buildSheetRows(data);

  // 3. Write data
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'Quote Review!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });

  // 4. Apply formatting
  await applyFormatting(sheets, sheetId, rows.length);

  // 5. Apps Script — optional, skip if it fails
  try {
    await injectAppsScript(sheetId, data.webhook_url, data.enquiry_id, auth);
  } catch (e) {
    console.warn('Apps Script skipped — customer can use Extensions menu instead:', e);
  }

  // 6. Share with customer as Editor
  try {
    await drive.permissions.create({
      fileId: sheetId,
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: data.customer_email,
      },
      sendNotificationEmail: false,
    });
  } catch (e) {
    console.warn('Could not share with customer email:', e);
  }

  return { sheetId, sheetUrl };
}

function buildSheetRows(data: QuoteSheetData): any[][] {
  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const rows: any[][] = [];

  rows.push(['MAYA INDIAN CATERING', '', '', '', '', '', '']);
  rows.push(['33 Tuttle St, Wakefield MA  |  mayacater.com']);
  rows.push([]);
  rows.push(['QUOTE REVIEW', '', '', '', '', `Round ${data.round_number}`, '']);
  rows.push([]);
  rows.push(['Customer', data.customer_name, '', 'Event Type', data.event_type]);
  rows.push(['Email', data.customer_email, '', 'Event Date', data.event_date]);
  rows.push(['Venue', data.venue, '', 'Guests', data.guest_count]);
  rows.push([]);
  rows.push(['HOW TO REVIEW']);
  rows.push(['You can edit the QUANTITY and COMMENTS columns for each dish.']);
  rows.push(['Do NOT edit dish names or prices.']);
  rows.push(['Add notes in the COMMENTS column.']);
  rows.push(['When done — email or WhatsApp Maya directly to notify us.']);
  rows.push([]);

  if (data.catering_type === 'tray' || data.catering_type === 'hybrid') {
    rows.push(['DISH / ITEM', 'CATEGORY', 'TRAY SIZE', 'QUANTITY', 'PRICING TYPE', 'UNIT PRICE', 'TOTAL', 'YOUR COMMENTS']);
    for (const item of data.tray_items ?? []) {
      rows.push([
        item.dish_name,
        item.category,
        item.tray_size,
        item.tray_quantity,
        item.pricing_type,
        fmt(item.unit_price_cents),
        fmt(item.total_price_cents),
        item.customer_comments ?? '',
      ]);
    }
    rows.push([]);
  }

  if (data.catering_type === 'per_person' || data.catering_type === 'hybrid') {
    rows.push(['SESSION', 'CATEGORY', 'DISH', 'GUESTS', '', 'PRICE/PERSON', 'TOTAL', 'YOUR COMMENTS']);
    let currentSession = '';
    for (const dish of data.session_dishes ?? []) {
      rows.push([
        dish.session_name !== currentSession ? dish.session_name : '',
        dish.category,
        dish.dish_name,
        dish.guest_count,
        '',
        fmt(dish.price_per_person_cents),
        fmt(dish.total_price_cents),
        '',
      ]);
      currentSession = dish.session_name;
    }
    rows.push([]);
  }

  rows.push(['', '', '', '', '', 'SUBTOTAL', fmt(data.subtotal_cents), '']);
  if (data.discount_cents > 0) {
    rows.push(['', '', '', '', '', 'DISCOUNT', `-${fmt(data.discount_cents)}`, '']);
  }
  rows.push(['', '', '', '', '', 'TAX (7%)', fmt(data.tax_cents), '']);
  rows.push(['', '', '', '', '', 'TOTAL', fmt(data.total_cents), '']);
  rows.push(['', '', '', '', '', '20% DEPOSIT', fmt(data.deposit_cents), '']);
  rows.push(['', '', '', '', '', 'BALANCE DUE', fmt(data.balance_cents), '']);
  rows.push([]);
  rows.push(['Questions? Email catering@mayacater.com or WhatsApp us directly.']);
  rows.push(['Balance due by cashier check, cash, or Zelle: indianflamesinc@gmail.com (3 days before event)']);

  return rows;
}

async function applyFormatting(sheets: any, sheetId: string, totalRows: number) {
  const INK  = { red: 0.020, green: 0.035, blue: 0.102 };
  const GOLD = { red: 0.788, green: 0.659, blue: 0.298 };
  const CREAM = { red: 0.965, green: 0.929, blue: 0.847 };
  const sid = 0;

  const requests: any[] = [
    colWidth(sid, 0, 220),
    colWidth(sid, 1, 130),
    colWidth(sid, 2, 100),
    colWidth(sid, 3, 80),
    colWidth(sid, 4, 110),
    colWidth(sid, 5, 100),
    colWidth(sid, 6, 100),
    colWidth(sid, 7, 260),
    cellFormat(sid, 0, 1, 0, 8, { backgroundColor: INK, textFormat: { foregroundColor: GOLD, fontSize: 16, bold: true }, horizontalAlignment: 'CENTER' }),
    cellFormat(sid, 1, 2, 0, 8, { backgroundColor: INK, textFormat: { foregroundColor: CREAM, fontSize: 9 }, horizontalAlignment: 'CENTER' }),
    cellFormat(sid, 3, 4, 0, 8, { backgroundColor: { red: 0.039, green: 0.118, blue: 0.251 }, textFormat: { foregroundColor: GOLD, fontSize: 13, bold: true } }),
    cellFormat(sid, 9, 14, 0, 8, { backgroundColor: { red: 1, green: 0.973, blue: 0.882 }, textFormat: { fontSize: 9, italic: true } }),
    { updateSheetProperties: { properties: { sheetId: sid, gridProperties: { frozenRowCount: 5 } }, fields: 'gridProperties.frozenRowCount' } },
  ];

  await sheets.spreadsheets.batchUpdate({ spreadsheetId: sheetId, requestBody: { requests } });
}

function colWidth(sheetId: number, col: number, pixels: number) {
  return { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: col, endIndex: col + 1 }, properties: { pixelSize: pixels }, fields: 'pixelSize' } };
}

function cellFormat(sheetId: number, startRow: number, endRow: number, startCol: number, endCol: number, fmt: any) {
  return { repeatCell: { range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol }, cell: { userEnteredFormat: fmt }, fields: 'userEnteredFormat(' + Object.keys(fmt).join(',') + ')' } };
}

async function injectAppsScript(sheetId: string, webhookUrl: string, enquiryId: string, auth: any) {
  const script = google.script({ version: 'v1', auth });
  const scriptCode = `
function notifyMaya() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Quote Review');
  var data = sheet.getDataRange().getValues();
  var changes = [];
  for (var i = 16; i < data.length; i++) {
    var row = data[i];
    if (!row[0] && !row[1]) break;
    if (row[0]) { changes.push({ dish: row[0], category: row[1], tray_size: row[2], quantity: row[3], pricing_type: row[4], unit_price: row[5], total: row[6], comments: row[7] }); }
  }
  var payload = JSON.stringify({ enquiry_id: '${enquiryId}', sheet_id: '${sheetId}', changes: changes, submitted_at: new Date().toISOString() });
  try {
    var response = UrlFetchApp.fetch('${webhookUrl}', { method: 'post', contentType: 'application/json', payload: payload, muteHttpExceptions: true });
    if (response.getResponseCode() === 200) { SpreadsheetApp.getUi().alert('Sent to Maya!', 'We will get back to you within 24 hours.', SpreadsheetApp.getUi().ButtonSet.OK); }
    else { SpreadsheetApp.getUi().alert('Error — please email catering@mayacater.com directly.'); }
  } catch(e) { SpreadsheetApp.getUi().alert('Could not connect. Please email catering@mayacater.com.'); }
}
function onOpen() { SpreadsheetApp.getUi().createMenu('Maya Review').addItem('Notify Maya — Done Reviewing', 'notifyMaya').addToUi(); }
`;
  const project = await script.projects.create({ requestBody: { title: 'Maya Notify Button', parentId: sheetId } });
  await script.projects.updateContent({ scriptId: project.data.scriptId!, requestBody: { files: [{ name: 'Code', type: 'SERVER_JS', source: scriptCode }, { name: 'appsscript', type: 'JSON', source: JSON.stringify({ timeZone: 'America/New_York', dependencies: {}, exceptionLogging: 'STACKDRIVER', runtimeVersion: 'V8' }) }] } });
}
