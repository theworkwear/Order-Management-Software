// ============================================
// Google Sheets API Service
// ============================================
import { google, sheets_v4 } from 'googleapis';
import { Order, OrderStatus, Product, COLUMN_MAP, getProductColumnIndex } from '@/lib/types/order';

function getAuth(accessToken?: string) {
  // 1. If explicit access token provided
  if (accessToken) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ access_token: accessToken });
    return auth;
  }

  // 2. Full Service Account Credentials JSON string
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      const keys = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      return google.auth.fromJSON(keys);
    } catch (e) {
      console.error('Failed to parse GOOGLE_CREDENTIALS_JSON:', e);
    }
  }

  // 3. Individual Service Account Email & Private Key
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    let key = process.env.GOOGLE_PRIVATE_KEY.trim();
    
    // Strip accidental wrapping quotes from Vercel UI copy/paste
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1).trim();
    }
    
    // Replace escaped newlines with actual newlines
    key = key.replace(/\\n/g, '\n');

    return new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.trim(),
      key,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    });
  }

  // 4. Server OAuth2 Refresh Token (if configured)
  if (process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    return auth;
  }

  // 5. Default OAuth2 Client
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
}

function getSheetsClient(accessToken?: string): sheets_v4.Sheets {
  if (process.env.GOOGLE_API_KEY && !accessToken && !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && !process.env.GOOGLE_CREDENTIALS_JSON && !process.env.GOOGLE_REFRESH_TOKEN) {
    return google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });
  }
  return google.sheets({ version: 'v4', auth: getAuth(accessToken) as any });
}

// Convert column index (0-based) to A1 notation letter
function columnToLetter(col: number): string {
  let letter = '';
  let c = col;
  while (c >= 0) {
    letter = String.fromCharCode((c % 26) + 65) + letter;
    c = Math.floor(c / 26) - 1;
  }
  return letter;
}

// ============================================
// Read Operations
// ============================================

export async function getSpreadsheetInfo(accessToken: string | undefined, spreadsheetId: string) {
  const sheets = getSheetsClient(accessToken);
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  return response.data;
}

export async function getHeaders(accessToken: string | undefined, spreadsheetId: string, sheetName: string): Promise<string[]> {
  const sheets = getSheetsClient(accessToken);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!1:1`,
  });
  return (response.data.values?.[0] as string[]) || [];
}

export async function getAllRows(accessToken: string | undefined, spreadsheetId: string, sheetName: string): Promise<string[][]> {
  const sheets = getSheetsClient(accessToken);
  const maxColIndex = COLUMN_MAP.productsStart + COLUMN_MAP.maxProducts * COLUMN_MAP.fieldsPerProduct - 1;
  const maxColLetter = columnToLetter(maxColIndex);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A2:${maxColLetter}`,  // Row 2 onwards, fetching all columns dynamically up to maxProducts (KZ for 50 products)
    valueRenderOption: 'FORMATTED_VALUE',
  });
  return (response.data.values as string[][]) || [];
}

// Helper to extract URL from cell in Google Sheets API (formula, hyperlink property, rich text, or raw text)
function extractUrlFromCell(cell: any): string {
  if (!cell) return '';

  // 1. Direct hyperlink property
  if (cell.hyperlink) return cell.hyperlink;

  // 2. Hyperlink in formula =HYPERLINK("url", "label")
  const formula = cell.userEnteredValue?.formulaValue || '';
  if (formula) {
    const match = formula.match(/HYPERLINK\(\s*["']([^"']+)["']/i);
    if (match && match[1]) return match[1];
  }

  // 3. Rich text formatted link
  if (cell.textFormatRuns && Array.isArray(cell.textFormatRuns)) {
    for (const run of cell.textFormatRuns) {
      if (run.format?.link?.uri) {
        return run.format.link.uri;
      }
    }
  }

  // 4. Raw text string if it is a valid URL
  const str = cell.userEnteredValue?.stringValue || cell.formattedValue || '';
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str.trim();
  }

  return '';
}

// Fetch hyperlink URLs from Order Folder column (Column I)
export async function getHyperlinks(
  accessToken: string | undefined,
  spreadsheetId: string,
  sheetName: string
): Promise<Map<string, { orderFolderUrl: string }>> {
  const sheets = getSheetsClient(accessToken);
  const folderCol = columnToLetter(COLUMN_MAP.orderFolder); // Column I

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [`'${sheetName}'!${folderCol}2:${folderCol}`],
      fields: 'sheets.data.rowData.values(hyperlink,userEnteredValue,formattedValue,textFormatRuns)',
      includeGridData: true,
    });

    const linksMap = new Map<string, { orderFolderUrl: string }>();
    const rowData = response.data.sheets?.[0]?.data?.[0]?.rowData || [];

    for (let i = 0; i < rowData.length; i++) {
      const values = rowData[i]?.values || [];
      const orderFolderUrl = extractUrlFromCell(values[0]);

      if (orderFolderUrl) {
        linksMap.set(i.toString(), { orderFolderUrl });
      }
    }
    return linksMap;
  } catch (err) {
    console.error('Failed to fetch hyperlinks:', err);
    return new Map();
  }
}

// ============================================
// Parse row data into Order object
// ============================================

export function parseRowToOrder(row: string[], rowIndex: number): Order {
  // Pad the row to ensure all product columns and logoDetails are accessible.
  const expectedLength = Math.max(
    COLUMN_MAP.productsStart + COLUMN_MAP.maxProducts * COLUMN_MAP.fieldsPerProduct,
    COLUMN_MAP.logoDetails + 1
  );
  const paddedRow = [...row];
  while (paddedRow.length < expectedLength) {
    paddedRow.push('');
  }

  const products: Product[] = [];

  for (let i = 1; i <= COLUMN_MAP.maxProducts; i++) {
    const nameIdx = getProductColumnIndex(i, 0);
    const name = paddedRow[nameIdx] || '';
    if (name.trim()) {
      products.push({
        index: i,
        name,
        productCode: paddedRow[getProductColumnIndex(i, 1)] || '',
        qty: paddedRow[getProductColumnIndex(i, 2)] || '',
        size: paddedRow[getProductColumnIndex(i, 3)] || '',
        colour: paddedRow[getProductColumnIndex(i, 4)] || '',
        emb: paddedRow[getProductColumnIndex(i, 5)] || '',
      });
    }
  }

  const rawStatus = (paddedRow[COLUMN_MAP.status] || '').trim();
  let status: OrderStatus = 'Pending';
  if (/^cancelled$/i.test(rawStatus)) {
    status = 'Cancelled';
  } else if (/^digitized$/i.test(rawStatus)) {
    status = 'Digitized';
  } else if (/^being made$/i.test(rawStatus)) {
    status = 'Being Made';
  } else if (/^done$/i.test(rawStatus)) {
    status = 'Done';
  } else if (/^pending$/i.test(rawStatus)) {
    status = 'Pending';
  }

  return {
    rowIndex: rowIndex + 2, // +2 because row 1 is header, data starts row 2, and rowIndex is 0-based
    orderNumber: paddedRow[COLUMN_MAP.orderNumber] || '',
    orderDate: paddedRow[COLUMN_MAP.orderDate] || '',
    status,
    customerName: paddedRow[COLUMN_MAP.customerName] || '',
    customerEmail: paddedRow[COLUMN_MAP.customerEmail] || '',
    customerPhone: paddedRow[COLUMN_MAP.customerPhone] || '',
    shippingAddress: paddedRow[COLUMN_MAP.shippingAddress] || '',
    total: paddedRow[COLUMN_MAP.total] || '',
    orderFolder: paddedRow[COLUMN_MAP.orderFolder] || '',
    logoDetails: (paddedRow[COLUMN_MAP.logoDetails] || '').trim().toLowerCase() === 'open digitized' ? '' : (paddedRow[COLUMN_MAP.logoDetails] || ''),
    orderEmail: paddedRow[COLUMN_MAP.orderEmail] || '',
    processedAt: paddedRow[COLUMN_MAP.processedAt] || '',
    products,
    rawRow: paddedRow,
  };
}

// ============================================
// Fetch all orders
// ============================================

export async function fetchAllOrders(accessToken: string | undefined, spreadsheetId: string, sheetName: string): Promise<Order[]> {
  // Fetch rows and hyperlinks in parallel
  const [rows, hyperlinks] = await Promise.all([
    getAllRows(accessToken, spreadsheetId, sheetName),
    getHyperlinks(accessToken, spreadsheetId, sheetName),
  ]);

  return rows
    .map((row, idx) => {
      const order = parseRowToOrder(row, idx);
      // Replace display text with actual hyperlink URLs
      const links = hyperlinks.get(idx.toString());
      if (links && links.orderFolderUrl) {
        order.orderFolder = links.orderFolderUrl;
      }
      return order;
    })
    .filter(order => order.orderNumber.trim() !== '');
}

// ============================================
// Write Operations
// ============================================

export async function updateCell(
  accessToken: string | undefined,
  spreadsheetId: string,
  sheetName: string,
  row: number,
  col: number,
  value: string
): Promise<void> {
  const sheets = getSheetsClient(accessToken);
  const cellRef = `'${sheetName}'!${columnToLetter(col)}${row}`;
  
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: cellRef,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[value]],
    },
  });
}

export async function batchUpdateCells(
  accessToken: string | undefined,
  spreadsheetId: string,
  sheetName: string,
  updates: { row: number; col: number; value: string }[]
): Promise<void> {
  const sheets = getSheetsClient(accessToken);
  
  const data = updates.map(u => ({
    range: `'${sheetName}'!${columnToLetter(u.col)}${u.row}`,
    values: [[u.value]],
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data,
    },
  });
}

export async function updateOrderStatus(
  accessToken: string | undefined,
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  newStatus: OrderStatus
): Promise<void> {
  const updates: { row: number; col: number; value: string }[] = [
    { row: rowNumber, col: COLUMN_MAP.status, value: newStatus },
  ];

  // If status is "Digitized", also update Processed At
  if (newStatus === 'Digitized') {
    const now = new Date().toLocaleString('en-AU', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    updates.push({ row: rowNumber, col: COLUMN_MAP.processedAt, value: now });
  }

  await batchUpdateCells(accessToken, spreadsheetId, sheetName, updates);
}

export async function updateOrderFields(
  accessToken: string | undefined,
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  fields: Record<string, string>
): Promise<void> {
  const fieldToCol: Record<string, number> = {
    orderNumber: COLUMN_MAP.orderNumber,
    orderDate: COLUMN_MAP.orderDate,
    status: COLUMN_MAP.status,
    customerName: COLUMN_MAP.customerName,
    customerEmail: COLUMN_MAP.customerEmail,
    customerPhone: COLUMN_MAP.customerPhone,
    shippingAddress: COLUMN_MAP.shippingAddress,
    total: COLUMN_MAP.total,
    orderFolder: COLUMN_MAP.orderFolder,
    logoDetails: COLUMN_MAP.logoDetails,
    orderEmail: COLUMN_MAP.orderEmail,
    processedAt: COLUMN_MAP.processedAt,
  };

  const updates: { row: number; col: number; value: string }[] = [];

  for (const [field, value] of Object.entries(fields)) {
    if (field in fieldToCol) {
      updates.push({ row: rowNumber, col: fieldToCol[field], value });
    }
  }

  if (updates.length > 0) {
    await batchUpdateCells(accessToken, spreadsheetId, sheetName, updates);
  }
}

export interface NewOrderData {
  orderNumber: string;
  orderDate?: string;
  status?: OrderStatus;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  total?: string;
  orderFolder?: string;
  logoDetails?: string;
  orderEmail?: string;
  processedAt?: string;
  products?: {
    name: string;
    productCode?: string;
    qty?: string;
    size?: string;
    colour?: string;
    emb?: string;
  }[];
}

export async function appendOrderRow(
  accessToken: string | undefined,
  spreadsheetId: string,
  sheetName: string,
  orderData: NewOrderData
): Promise<void> {
  const sheets = getSheetsClient(accessToken);
  const totalCols = Math.max(
    COLUMN_MAP.productsStart + COLUMN_MAP.maxProducts * COLUMN_MAP.fieldsPerProduct,
    COLUMN_MAP.logoDetails + 1
  );
  const rowValues: string[] = new Array(totalCols).fill('');

  rowValues[COLUMN_MAP.orderNumber] = orderData.orderNumber || '';
  rowValues[COLUMN_MAP.orderDate] = orderData.orderDate || new Date().toISOString().split('T')[0];
  rowValues[COLUMN_MAP.status] = orderData.status || 'Pending';
  rowValues[COLUMN_MAP.customerName] = orderData.customerName || '';
  rowValues[COLUMN_MAP.customerEmail] = orderData.customerEmail || '';
  rowValues[COLUMN_MAP.customerPhone] = orderData.customerPhone || '';
  rowValues[COLUMN_MAP.shippingAddress] = orderData.shippingAddress || '';
  rowValues[COLUMN_MAP.total] = orderData.total || '';
  rowValues[COLUMN_MAP.orderFolder] = orderData.orderFolder || '';
  rowValues[COLUMN_MAP.logoDetails] = orderData.logoDetails || '';
  rowValues[COLUMN_MAP.orderEmail] = orderData.orderEmail || '';
  rowValues[COLUMN_MAP.processedAt] = orderData.processedAt || '';

  if (orderData.products && Array.isArray(orderData.products)) {
    orderData.products.slice(0, COLUMN_MAP.maxProducts).forEach((p, idx) => {
      const prodIndex = idx + 1;
      rowValues[getProductColumnIndex(prodIndex, 0)] = p.name || '';
      rowValues[getProductColumnIndex(prodIndex, 1)] = p.productCode || '';
      rowValues[getProductColumnIndex(prodIndex, 2)] = p.qty || '';
      rowValues[getProductColumnIndex(prodIndex, 3)] = p.size || '';
      rowValues[getProductColumnIndex(prodIndex, 4)] = p.colour || '';
      rowValues[getProductColumnIndex(prodIndex, 5)] = p.emb || '';
    });
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A:A`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [rowValues],
    },
  });
}

// ============================================
// Delete Order Row
// ============================================

export async function deleteOrderRow(
  accessToken: string | undefined,
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number
): Promise<void> {
  const sheets = getSheetsClient(accessToken);

  // Fetch sheet properties to obtain numeric sheetId
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(sheetId,title))',
  });

  const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName) || spreadsheet.data.sheets?.[0];
  const sheetId = sheet?.properties?.sheetId ?? 0;

  // Google Sheets deleteDimension uses 0-based indices.
  // rowNumber is 1-based (e.g. row 2 is index 1)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
}


