const demoData = {
  accounts: [
    { id: 'acc-1', bank_name: 'Bank Mandiri', account_name: 'Operasional', account_number: '1300001234', currency: 'IDR', is_active: true },
    { id: 'acc-2', bank_name: 'Bank BCA', account_name: 'Kas Umum', account_number: '5001001234', currency: 'IDR', is_active: true },
  ],
  transactions: [
    { id: 'txn-1', account_id: 'acc-1', description: 'Pembayaran tagihan listrik', transaction_date: '2026-10-01', amount: 2500000, direction: 'debit', reference: 'INV-PLN-01' },
    { id: 'txn-2', account_id: 'acc-1', description: 'Penjualan produk A', transaction_date: '2026-10-02', amount: 7500000, direction: 'credit', reference: 'SLS-204' },
    { id: 'txn-3', account_id: 'acc-2', description: 'Pembayaran gaji karyawan', transaction_date: '2026-10-04', amount: 4200000, direction: 'debit', reference: 'GAJI-10' },
  ],
  statement_lines: [
    { id: 'stmt-1', account_id: 'acc-1', description: 'PLN', transaction_date: '2026-10-01', amount: 2500000, direction: 'debit', reference: 'PLN-204' },
    { id: 'stmt-2', account_id: 'acc-1', description: 'Transfer pelanggan', transaction_date: '2026-10-02', amount: 7500000, direction: 'credit', reference: 'TRF-9001' },
    { id: 'stmt-3', account_id: 'acc-2', description: 'Pembayaran gaji', transaction_date: '2026-10-04', amount: 4200000, direction: 'debit', reference: 'PAYROLL-10' },
  ],
  reconciliation_matches: [
    { id: 'match-1', transaction_id: 'txn-1', statement_line_id: 'stmt-1', matched_at: '2026-10-05T08:00:00Z' },
  ],
};

const state = {
  user: { id: 'demo-user', email: 'demo@rekon.app' },
  loadedUserId: 'demo-user',
  accounts: demoData.accounts,
  transactions: demoData.transactions,
  statement_lines: demoData.statement_lines,
  reconciliation_matches: demoData.reconciliation_matches,
  selectedTransaction: null,
  selectedStatement: null,
  entryType: 'account',
  toastTimer: null,
};

const elements = Object.fromEntries([
  'app-shell', 'logout-button', 'user-email', 'profile-name',
  'connection-label', 'demo-notice', 'error-notice', 'today-label', 'account-filter', 'status-filter', 'search-filter',
  'books-rows', 'bank-rows', 'books-empty', 'bank-empty', 'books-total', 'bank-total', 'visible-count', 'nav-open-count',
  'metric-matched', 'metric-matched-count', 'metric-books', 'metric-books-count', 'metric-bank', 'metric-bank-count',
  'metric-rate', 'metric-rate-count', 'rate-track-fill', 'selection-copy', 'match-button', 'footer-account-label',
  'last-updated', 'refresh-button', 'entry-dialog', 'entry-form', 'dialog-title', 'account-fields', 'transaction-fields',
  'record-account', 'record-date', 'dialog-submit', 'dialog-error', 'dialog-close', 'dialog-cancel', 'toast', 'record-description',
].map((id) => [id, document.getElementById(id)]));

function formatCurrency(amount, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount) || 0);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }).format(new Date(`${date}T00:00:00`));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.classList.toggle('error', isError);
  elements.toast.classList.add('visible');
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => elements.toast.classList.remove('visible'), 3200);
}

function loadData() {
  elements['error-notice'].hidden = true;
  elements['connection-label'].textContent = 'Demo mode aktif';
  render();
}

function matchIndexes() {
  return {
    transactions: new Map(state.reconciliation_matches.map((match) => [match.transaction_id, match])),
    statements: new Map(state.reconciliation_matches.map((match) => [match.statement_line_id, match])),
  };
}

function updateAccountOptions() {
  const previous = elements['account-filter'].value || 'all';
  const options = ['<option value="all">Semua rekening</option>', ...state.accounts.map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.bank_name)} · ${escapeHtml(account.account_name)}</option>` )];
  elements['account-filter'].innerHTML = options.join('');
  elements['account-filter'].value = state.accounts.some((account) => account.id === previous) ? previous : 'all';
  elements['record-account'].innerHTML = state.accounts.map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.bank_name)} · ${escapeHtml(account.account_name)}</option>`).join('');
}

function getFilteredRecords(records, matches) {
  const accountId = elements['account-filter'].value;
  const status = elements['status-filter'].value;
  const query = elements['search-filter'].value.trim().toLocaleLowerCase();
  return records.filter((record) => {
    const isMatched = matches.has(record.id);
    if (accountId !== 'all' && record.account_id !== accountId) return false;
    if (status === 'matched' && !isMatched) return false;
    if (status === 'unmatched' && isMatched) return false;
    return !query || `${record.description} ${record.reference || ''}`.toLocaleLowerCase().includes(query);
  }).sort((first, second) => second.transaction_date.localeCompare(first.transaction_date));
}

function buildRow(record, kind, matchedMap) {
  const isBook = kind === 'book';
  const isMatched = matchedMap.has(record.id);
  const selected = isBook ? state.selectedTransaction === record.id : state.selectedStatement === record.id;
  const account = state.accounts.find((item) => item.id === record.account_id);
  const currency = account?.currency || 'IDR';
  const amountPrefix = record.direction === 'credit' ? '+' : '−';
  const entryDescription = escapeHtml(record.description);
  const reference = escapeHtml(record.reference || (isBook ? 'Tanpa referensi' : account?.bank_name || 'Mutasi rekening'));
  const action = isMatched
    ? `<button class="unmatch-button" type="button" data-unmatch="${escapeHtml(matchedMap.get(record.id).id)}" aria-label="Lepas pasangan">Lepas</button>`
    : `<span class="row-status ${selected ? 'selected-mark' : ''}" aria-label="${selected ? 'Dipilih' : 'Belum cocok'}">${selected ? '✓' : ''}</span>`;

  return `<tr class="${isMatched ? 'is-matched' : ''} ${selected ? 'selected' : ''}" data-kind="${kind}" data-id="${escapeHtml(record.id)}" ${isMatched ? '' : 'tabindex="0" role="button"'}>
    <td><div class="transaction-cell"><strong title="${entryDescription}">${entryDescription}</strong><span>${reference}</span></div></td>
    <td class="date-cell">${escapeHtml(formatDate(record.transaction_date))}</td>
    <td class="amount-cell"><span class="amount-value ${record.direction}">${amountPrefix}${escapeHtml(formatCurrency(record.amount, currency))}</span></td>
    <td>${action}</td>
  </tr>`;
}

function renderRecords(kind, records, matches) {
  const rows = kind === 'book' ? elements['books-rows'] : elements['bank-rows'];
  const empty = kind === 'book' ? elements['books-empty'] : elements['bank-empty'];
  const total = kind === 'book' ? elements['books-total'] : elements['bank-total'];
  const matchMap = kind === 'book' ? matches.transactions : matches.statements;
  rows.innerHTML = records.map((record) => buildRow(record, kind, matchMap)).join('');
  empty.hidden = records.length > 0;
  total.textContent = `${records.length} baris`;
}

function renderMetrics(matches) {
  const accountId = elements['account-filter'].value;
  const transactions = state.transactions.filter((entry) => accountId === 'all' || entry.account_id === accountId);
  const statements = state.statement_lines.filter((entry) => accountId === 'all' || entry.account_id === accountId);
  const matchList = state.reconciliation_matches.filter((match) => transactions.some((item) => item.id === match.transaction_id));
  const matchedAmount = matchList.reduce((sum, match) => sum + (Number(transactions.find((item) => item.id === match.transaction_id)?.amount) || 0), 0);
  const unmatchedBooks = transactions.filter((entry) => !matches.transactions.has(entry.id));
  const unmatchedBank = statements.filter((entry) => !matches.statements.has(entry.id));
  const totalRecords = transactions.length + statements.length;
  const rate = totalRecords ? Math.round((matchList.length * 2 / totalRecords) * 100) : 0;
  const currency = state.accounts.find((account) => account.id === accountId)?.currency || 'IDR';

  elements['metric-matched'].textContent = formatCurrency(matchedAmount, currency);
  elements['metric-matched-count'].textContent = `${matchList.length} pasangan`;
  elements['metric-books'].textContent = formatCurrency(unmatchedBooks.reduce((sum, item) => sum + Number(item.amount), 0), currency);
  elements['metric-books-count'].textContent = `${unmatchedBooks.length} transaksi`;
  elements['metric-bank'].textContent = formatCurrency(unmatchedBank.reduce((sum, item) => sum + Number(item.amount), 0), currency);
  elements['metric-bank-count'].textContent = `${unmatchedBank.length} mutasi`;
  elements['metric-rate'].textContent = `${rate}%`;
  elements['metric-rate-count'].textContent = `${matchList.length * 2} dari ${totalRecords} baris`;
  elements['rate-track-fill'].style.width = `${rate}%`;
  elements['nav-open-count'].textContent = String(unmatchedBooks.length + unmatchedBank.length);
}

function updateSelection() {
  const transaction = state.transactions.find((entry) => entry.id === state.selectedTransaction);
  const statement = state.statement_lines.find((entry) => entry.id === state.selectedStatement);
  const selected = [transaction && 'buku', statement && 'mutasi'].filter(Boolean);
  elements['selection-copy'].textContent = selected.length === 2 ? 'Siap dicocokkan' : selected.length === 1 ? `Pilihan ${selected[0]} tersimpan · pilih ${selected[0] === 'buku' ? 'mutasi bank' : 'transaksi buku'}` : 'Pilih transaksi buku dan mutasi bank';
  const canMatch = Boolean(transaction && statement && transaction.account_id === statement.account_id && transaction.direction === statement.direction && Number(transaction.amount) === Number(statement.amount));
  elements['match-button'].disabled = !canMatch;
  if (transaction && statement && !canMatch) elements['selection-copy'].textContent = 'Rekening, nominal, atau arah transaksi tidak sama';
}

function render() {
  updateAccountOptions();
  const matches = matchIndexes();
  const books = getFilteredRecords(state.transactions, matches.transactions);
  const statements = getFilteredRecords(state.statement_lines, matches.statements);
  renderRecords('book', books, matches);
  renderRecords('bank', statements, matches);
  renderMetrics(matches);
  updateSelection();
  elements['visible-count'].textContent = `${books.length + statements.length} baris`;
  const selectedAccount = state.accounts.find((account) => account.id === elements['account-filter'].value);
  elements['footer-account-label'].textContent = selectedAccount ? `${selectedAccount.bank_name} · ${selectedAccount.account_name}` : 'Menampilkan semua rekening';
  elements['last-updated'].textContent = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date());
}

function setTodayLabel() {
  elements['today-label'].textContent = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
}

function openEntryDialog(type) {
  state.entryType = type;
  elements['entry-form'].reset();
  elements['dialog-error'].hidden = true;
  const isAccount = type === 'account';
  elements['account-fields'].hidden = !isAccount;
  elements['transaction-fields'].hidden = isAccount;
  elements['account-fields'].querySelectorAll('input, select').forEach((field) => {
    field.required = isAccount && ['bank_name', 'account_name', 'currency'].includes(field.name);
  });
  elements['transaction-fields'].querySelectorAll('input, select').forEach((field) => {
    field.required = !isAccount && ['account_id', 'description', 'transaction_date', 'amount', 'direction'].includes(field.name);
  });
  elements['dialog-title'].textContent = isAccount ? 'Tambah rekening' : type === 'statement' ? 'Tambah mutasi bank' : 'Tambah transaksi buku';
  elements['dialog-submit'].innerHTML = `${isAccount ? 'Simpan rekening' : 'Simpan transaksi'} <span aria-hidden="true">→</span>`;
  if (!isAccount) {
    elements['record-date'].value = new Date().toISOString().slice(0, 10);
    elements['record-account'].value = elements['account-filter'].value === 'all' ? state.accounts[0]?.id : elements['account-filter'].value;
  }
  elements['entry-dialog'].showModal();
  const target = isAccount ? document.getElementById('bank-name') : elements['record-description'];
  target.focus();
}

function submitEntry(event) {
  event.preventDefault();
  const submit = elements['dialog-submit'];
  submit.disabled = true;
  elements['dialog-error'].hidden = true;
  try {
    const fields = new FormData(elements['entry-form']);
    const isAccount = state.entryType === 'account';
    if (isAccount) {
      const accountId = `acc-${Date.now()}`;
      state.accounts.push({
        id: accountId,
        bank_name: String(fields.get('bank_name') || '').trim(),
        account_name: String(fields.get('account_name') || '').trim(),
        account_number: String(fields.get('account_number') || '').trim(),
        currency: String(fields.get('currency') || 'IDR').trim().toUpperCase(),
        is_active: true,
      });
      elements['entry-dialog'].close();
      showToast('Rekening berhasil ditambahkan.');
    } else {
      const accountId = String(fields.get('account_id') || state.accounts[0]?.id);
      const record = {
        id: `entry-${Date.now()}`,
        account_id: accountId,
        description: String(fields.get('description') || '').trim(),
        transaction_date: String(fields.get('transaction_date') || new Date().toISOString().slice(0, 10)),
        amount: Number(fields.get('amount') || 0),
        direction: String(fields.get('direction') || 'debit'),
        reference: String(fields.get('reference') || '').trim(),
      };
      if (state.entryType === 'statement') {
        state.statement_lines.unshift(record);
      } else {
        state.transactions.unshift(record);
      }
      elements['entry-dialog'].close();
      showToast('Transaksi berhasil ditambahkan.');
    }
    loadData();
  } catch (error) {
    elements['dialog-error'].textContent = error.message;
    elements['dialog-error'].hidden = false;
  } finally {
    submit.disabled = false;
  }
}

function matchSelection() {
  elements['match-button'].disabled = true;
  try {
    const transaction = state.transactions.find((entry) => entry.id === state.selectedTransaction);
    const statement = state.statement_lines.find((entry) => entry.id === state.selectedStatement);
    if (!transaction || !statement || transaction.account_id !== statement.account_id || transaction.direction !== statement.direction || Number(transaction.amount) !== Number(statement.amount)) {
      throw new Error('Pasangan harus dari rekening yang sama dengan nominal dan arah identik.');
    }
    state.reconciliation_matches.push({
      id: `match-${Date.now()}`,
      transaction_id: transaction.id,
      statement_line_id: statement.id,
      matched_at: new Date().toISOString(),
    });
    state.selectedTransaction = null;
    state.selectedStatement = null;
    showToast('Transaksi berhasil dicocokkan.');
    loadData();
  } catch (error) {
    showToast(error.message, true);
    updateSelection();
  }
}

function unmatch(matchId) {
  if (!window.confirm('Lepaskan pasangan transaksi ini?')) return;
  state.reconciliation_matches = state.reconciliation_matches.filter((match) => match.id !== matchId);
  loadData();
  showToast('Pasangan transaksi dilepaskan.');
}

function toggleSelection(row) {
  if (!row || row.classList.contains('is-matched')) return;
  const kind = row.dataset.kind;
  const id = row.dataset.id;
  if (kind === 'book') state.selectedTransaction = state.selectedTransaction === id ? null : id;
  else state.selectedStatement = state.selectedStatement === id ? null : id;
  render();
}

document.querySelectorAll('[data-entry]').forEach((button) => button.addEventListener('click', () => openEntryDialog(button.dataset.entry)));
document.querySelectorAll('#account-filter, #status-filter, #search-filter').forEach((control) => control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', () => {
  state.selectedTransaction = null;
  state.selectedStatement = null;
  render();
}));
document.querySelector('.ledger-grid').addEventListener('click', (event) => {
  const unmatchButton = event.target.closest('[data-unmatch]');
  if (unmatchButton) {
    event.stopPropagation();
    unmatch(unmatchButton.dataset.unmatch);
    return;
  }
  toggleSelection(event.target.closest('tr[data-kind]'));
});
document.querySelector('.ledger-grid').addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('tr[data-kind]')) {
    event.preventDefault();
    toggleSelection(event.target);
  }
});
elements['match-button'].addEventListener('click', matchSelection);
elements['refresh-button'].addEventListener('click', loadData);
elements['entry-form'].addEventListener('submit', submitEntry);
elements['dialog-close'].addEventListener('click', () => elements['entry-dialog'].close());
elements['dialog-cancel'].addEventListener('click', () => elements['entry-dialog'].close());
elements['entry-dialog'].addEventListener('click', (event) => {
  if (event.target === elements['entry-dialog']) elements['entry-dialog'].close();
});
elements['logout-button'].addEventListener('click', () => {
  showToast('Demo mode aktif. Tidak ada login yang diperlukan.');
});

function initDashboard() {
  elements['user-email'].textContent = 'demo@rekon.app';
  elements['profile-name'].textContent = 'Demo User';
  elements['connection-label'].textContent = 'Demo mode aktif';
  setTodayLabel();
  loadData();
}

initDashboard();