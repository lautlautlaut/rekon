const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const port = Number(process.env.PORT || 3000);
const frontendRoot = path.resolve(__dirname, '..', 'frontend');
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const useSupabase = Boolean(supabaseUrl && supabaseKey);
const today = new Date();
const dateOffset = (days) => {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};
const demoAccountId = '8d7f026a-c3b2-4683-9185-57e00dcb0001';
const demoData = {
  accounts: [
    { id: demoAccountId, account_name: 'Operasional Utama', bank_name: 'Bank Mandiri', account_number: '•••• 4821', currency: 'IDR', is_active: true },
    { id: '8d7f026a-c3b2-4683-9185-57e00dcb0002', account_name: 'Cadangan Bisnis', bank_name: 'BCA', account_number: '•••• 1097', currency: 'IDR', is_active: true },
  ],
  transactions: [
    { id: '9d7f026a-c3b2-4683-9185-57e00dcb0001', account_id: demoAccountId, transaction_date: dateOffset(0), description: 'Pembayaran invoice INV-2408', reference: 'INV-2408', direction: 'credit', amount: 18500000 },
    { id: '9d7f026a-c3b2-4683-9185-57e00dcb0002', account_id: demoAccountId, transaction_date: dateOffset(1), description: 'Pembelian perlengkapan kantor', reference: 'PO-884', direction: 'debit', amount: 2750000 },
    { id: '9d7f026a-c3b2-4683-9185-57e00dcb0003', account_id: demoAccountId, transaction_date: dateOffset(2), description: 'Pembayaran gaji tim', reference: 'PAY-OCT', direction: 'debit', amount: 12400000 },
    { id: '9d7f026a-c3b2-4683-9185-57e00dcb0004', account_id: demoAccountId, transaction_date: dateOffset(3), description: 'Pelunasan pelanggan PT Arunika', reference: 'INV-2391', direction: 'credit', amount: 8200000 },
    { id: '9d7f026a-c3b2-4683-9185-57e00dcb0005', account_id: demoAccountId, transaction_date: dateOffset(4), description: 'Biaya langganan perangkat lunak', reference: 'SUB-108', direction: 'debit', amount: 899000 },
    { id: '9d7f026a-c3b2-4683-9185-57e00dcb0006', account_id: demoAccountId, transaction_date: dateOffset(5), description: 'Pendapatan proyek Aksara', reference: 'INV-2412', direction: 'credit', amount: 15750000 },
    { id: '9d7f026a-c3b2-4683-9185-57e00dcb0007', account_id: demoAccountId, transaction_date: dateOffset(6), description: 'Pembayaran sewa kantor', reference: 'RENT-10', direction: 'debit', amount: 6500000 },
  ],
  statement_lines: [
    { id: 'ad7f026a-c3b2-4683-9185-57e00dcb0001', account_id: demoAccountId, transaction_date: dateOffset(0), description: 'TRANSFER MASUK INV-2408', reference: 'TRX-7612', direction: 'credit', amount: 18500000 },
    { id: 'ad7f026a-c3b2-4683-9185-57e00dcb0002', account_id: demoAccountId, transaction_date: dateOffset(1), description: 'KARTU DEBIT TOKO ATK', reference: 'DB-4381', direction: 'debit', amount: 2750000 },
    { id: 'ad7f026a-c3b2-4683-9185-57e00dcb0003', account_id: demoAccountId, transaction_date: dateOffset(2), description: 'TRANSFER KELUAR PAYROLL', reference: 'TRX-7590', direction: 'debit', amount: 12400000 },
    { id: 'ad7f026a-c3b2-4683-9185-57e00dcb0004', account_id: demoAccountId, transaction_date: dateOffset(3), description: 'TRANSFER MASUK PT ARUNIKA', reference: 'TRX-7521', direction: 'credit', amount: 8200000 },
    { id: 'ad7f026a-c3b2-4683-9185-57e00dcb0005', account_id: demoAccountId, transaction_date: dateOffset(4), description: 'AUTODEBIT LANGGANAN SAAS', reference: 'AD-0182', direction: 'debit', amount: 899000 },
    { id: 'ad7f026a-c3b2-4683-9185-57e00dcb0006', account_id: demoAccountId, transaction_date: dateOffset(5), description: 'KREDIT TRANSFER AKSARA', reference: 'TRX-7488', direction: 'credit', amount: 15750000 },
  ],
  reconciliation_matches: [
    { id: 'bd7f026a-c3b2-4683-9185-57e00dcb0001', transaction_id: '9d7f026a-c3b2-4683-9185-57e00dcb0001', statement_line_id: 'ad7f026a-c3b2-4683-9185-57e00dcb0001', matched_at: new Date().toISOString() },
    { id: 'bd7f026a-c3b2-4683-9185-57e00dcb0002', transaction_id: '9d7f026a-c3b2-4683-9185-57e00dcb0002', statement_line_id: 'ad7f026a-c3b2-4683-9185-57e00dcb0002', matched_at: new Date().toISOString() },
    { id: 'bd7f026a-c3b2-4683-9185-57e00dcb0003', transaction_id: '9d7f026a-c3b2-4683-9185-57e00dcb0003', statement_line_id: 'ad7f026a-c3b2-4683-9185-57e00dcb0003', matched_at: new Date().toISOString() },
    { id: 'bd7f026a-c3b2-4683-9185-57e00dcb0004', transaction_id: '9d7f026a-c3b2-4683-9185-57e00dcb0004', statement_line_id: 'ad7f026a-c3b2-4683-9185-57e00dcb0004', matched_at: new Date().toISOString() },
    { id: 'bd7f026a-c3b2-4683-9185-57e00dcb0005', transaction_id: '9d7f026a-c3b2-4683-9185-57e00dcb0005', statement_line_id: 'ad7f026a-c3b2-4683-9185-57e00dcb0005', matched_at: new Date().toISOString() },
  ],
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

async function readJson(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new HttpError(413, 'Ukuran permintaan terlalu besar.');
  }
  try {
    return JSON.parse(raw || '{}');
  } catch {
    throw new HttpError(400, 'Format JSON tidak valid.');
  }
}

async function supabaseRequest(table, query = '', options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${query ? `?${query}` : ''}`, {
    method: options.method || 'GET',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let result;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = null;
  }
  if (!response.ok) throw new HttpError(response.status, result?.message || 'Permintaan ke Supabase gagal.');
  return result;
}

function makeRecord(body, includeAccountDetails = false) {
  const record = {
    account_id: body.account_id,
    transaction_date: body.transaction_date,
    description: typeof body.description === 'string' ? body.description.trim() : '',
    reference: typeof body.reference === 'string' ? body.reference.trim() : '',
    direction: body.direction,
    amount: Number(body.amount),
  };
  if (includeAccountDetails) {
    return {
      account_name: typeof body.account_name === 'string' ? body.account_name.trim() : '',
      bank_name: typeof body.bank_name === 'string' ? body.bank_name.trim() : '',
      account_number: typeof body.account_number === 'string' ? body.account_number.trim() : '',
      currency: typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : 'IDR',
      is_active: true,
    };
  }
  if (!record.account_id || !/^\d{4}-\d{2}-\d{2}$/.test(record.transaction_date || '') || !record.description || !['debit', 'credit'].includes(record.direction) || !Number.isFinite(record.amount) || record.amount <= 0) {
    throw new HttpError(400, 'Lengkapi rekening, tanggal, deskripsi, arah, dan nominal yang valid.');
  }
  return record;
}

async function getData() {
  if (!useSupabase) return { mode: 'demo', ...demoData };
  const [accounts, transactions, statementLines, matches] = await Promise.all([
    supabaseRequest('bank_accounts', 'select=*&is_active=eq.true&order=created_at.asc'),
    supabaseRequest('bank_transactions', 'select=*&order=transaction_date.desc'),
    supabaseRequest('bank_statement_lines', 'select=*&order=transaction_date.desc'),
    supabaseRequest('reconciliation_matches', 'select=*&order=matched_at.desc'),
  ]);
  return { mode: 'supabase', accounts, transactions, statement_lines: statementLines, reconciliation_matches: matches };
}

async function createAccount(body) {
  const record = makeRecord(body, true);
  if (!record.account_name || !record.bank_name || !/^[A-Z]{3}$/.test(record.currency)) {
    throw new HttpError(400, 'Nama rekening, nama bank, dan kode mata uang tiga huruf wajib diisi.');
  }
  if (useSupabase) return (await supabaseRequest('bank_accounts', '', { method: 'POST', body: record }))[0];
  const account = { id: randomUUID(), ...record, created_at: new Date().toISOString() };
  demoData.accounts.push(account);
  return account;
}

async function createEntry(table, body) {
  const record = makeRecord(body);
  if (useSupabase) return (await supabaseRequest(table, '', { method: 'POST', body: record }))[0];
  if (!demoData.accounts.some((account) => account.id === record.account_id)) throw new HttpError(400, 'Rekening tidak ditemukan.');
  const entry = { id: randomUUID(), ...record, created_at: new Date().toISOString() };
  const collection = { bank_transactions: 'transactions', bank_statement_lines: 'statement_lines' }[table];
  demoData[collection].push(entry);
  return entry;
}

async function createMatch(body) {
  if (typeof body.transaction_id !== 'string' || typeof body.statement_line_id !== 'string') {
    throw new HttpError(400, 'Pilih satu transaksi buku dan satu mutasi bank.');
  }
  let transaction;
  let statementLine;
  let matches;
  if (useSupabase) {
    const [transactions, statementLines, existingMatches] = await Promise.all([
      supabaseRequest('bank_transactions', `select=*&id=eq.${encodeURIComponent(body.transaction_id)}`),
      supabaseRequest('bank_statement_lines', `select=*&id=eq.${encodeURIComponent(body.statement_line_id)}`),
      supabaseRequest('reconciliation_matches', 'select=transaction_id,statement_line_id'),
    ]);
    [transaction] = transactions;
    [statementLine] = statementLines;
    matches = existingMatches;
  } else {
    transaction = demoData.transactions.find((entry) => entry.id === body.transaction_id);
    statementLine = demoData.statement_lines.find((entry) => entry.id === body.statement_line_id);
    matches = demoData.reconciliation_matches;
  }
  if (!transaction || !statementLine) throw new HttpError(404, 'Transaksi tidak ditemukan.');
  if (matches.some((match) => match.transaction_id === transaction.id || match.statement_line_id === statementLine.id)) {
    throw new HttpError(409, 'Salah satu transaksi sudah dipasangkan.');
  }
  if (transaction.account_id !== statementLine.account_id || transaction.direction !== statementLine.direction || Number(transaction.amount) !== Number(statementLine.amount)) {
    throw new HttpError(422, 'Pasangan harus dari rekening yang sama dengan nominal dan arah yang identik.');
  }
  const record = { transaction_id: transaction.id, statement_line_id: statementLine.id };
  if (useSupabase) return (await supabaseRequest('reconciliation_matches', '', { method: 'POST', body: record }))[0];
  const match = { id: randomUUID(), ...record, matched_at: new Date().toISOString() };
  demoData.reconciliation_matches.push(match);
  return match;
}

async function deleteMatch(id) {
  if (useSupabase) {
    await supabaseRequest('reconciliation_matches', `id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', prefer: 'return=minimal' });
    return;
  }
  const index = demoData.reconciliation_matches.findIndex((match) => match.id === id);
  if (index < 0) throw new HttpError(404, 'Pasangan tidak ditemukan.');
  demoData.reconciliation_matches.splice(index, 1);
}

function serveFrontend(request, response, pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const filePath = path.resolve(frontendRoot, `.${requestedPath}`);
  if (!filePath.startsWith(`${frontendRoot}${path.sep}`)) throw new HttpError(403, 'Akses ditolak.');
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Halaman tidak ditemukan.');
      return;
    }
    const extension = path.extname(filePath);
    const contentType = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' }[extension] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff' });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/api/data' && request.method === 'GET') {
      sendJson(response, 200, await getData());
      return;
    }
    if (url.pathname === '/api/accounts' && request.method === 'POST') {
      sendJson(response, 201, await createAccount(await readJson(request)));
      return;
    }
    if (url.pathname === '/api/transactions' && request.method === 'POST') {
      sendJson(response, 201, await createEntry('bank_transactions', await readJson(request)));
      return;
    }
    if (url.pathname === '/api/statement-lines' && request.method === 'POST') {
      sendJson(response, 201, await createEntry('bank_statement_lines', await readJson(request)));
      return;
    }
    if (url.pathname === '/api/matches' && request.method === 'POST') {
      sendJson(response, 201, await createMatch(await readJson(request)));
      return;
    }
    const matchRoute = url.pathname.match(/^\/api\/matches\/([\w-]+)$/);
    if (matchRoute && request.method === 'DELETE') {
      await deleteMatch(matchRoute[1]);
      sendJson(response, 200, { ok: true });
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      sendJson(response, 404, { error: 'Rute API tidak ditemukan.' });
      return;
    }
    if (request.method !== 'GET') throw new HttpError(405, 'Metode tidak diizinkan.');
    serveFrontend(request, response, url.pathname);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) console.error(error);
    sendJson(response, status, { error: status === 500 ? 'Terjadi kesalahan pada server.' : error.message });
  }
});

server.listen(port, () => {
  console.log(`Rekon berjalan di http://localhost:${port} (${useSupabase ? 'Supabase' : 'mode demo'})`);
});