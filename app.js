const STORAGE_KEY = "economize.entries.v1";
const THEME_KEY = "economize.theme.v1";

const typeLabels = {
  income: "Entrada",
  bill: "Conta",
  expense: "Gasto",
  credit: "Cartão",
};

const repeatLabels = {
  once: "Único",
  fixed: "Fixo mensal",
  installment: "Parcelado",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const monthInput = document.querySelector("#monthInput");
const form = document.querySelector("#entryForm");
const entryList = document.querySelector("#entryList");
const entryCount = document.querySelector("#entryCount");
const totalIncome = document.querySelector("#totalIncome");
const totalExpenses = document.querySelector("#totalExpenses");
const creditTotal = document.querySelector("#creditTotal");
const balance = document.querySelector("#balance");
const spentPercent = document.querySelector("#spentPercent");
const availableText = document.querySelector("#availableText");
const progressBar = document.querySelector("#progressBar");
const clearMonth = document.querySelector("#clearMonth");
const emptyTemplate = document.querySelector("#emptyStateTemplate");
const filterButtons = document.querySelectorAll(".filter-button");
const repeatSelect = document.querySelector("#repeat");
const repeatRow = document.querySelector("#repeatRow");
const installmentsField = document.querySelector("#installmentsField");
const installmentsInput = document.querySelector("#installments");
const currentInstallmentField = document.querySelector("#currentInstallmentField");
const currentInstallmentInput = document.querySelector("#currentInstallment");
const typeSelect = document.querySelector("#type");
const cardField = document.querySelector("#cardField");
const cardNameInput = document.querySelector("#cardName");
const cardBreakdown = document.querySelector("#cardBreakdown");
const exportBackup = document.querySelector("#exportBackup");
const exportPdf = document.querySelector("#exportPdf");
const importBackup = document.querySelector("#importBackup");
const themeSelect = document.querySelector("#themeSelect");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

let entries = normalizeEntries(loadEntries());
let activeFilter = "all";

monthInput.value = getCurrentMonth();
themeSelect.value = loadTheme();
applyTheme(themeSelect.value);
syncInstallmentsField();
syncCardField();
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const amount = Number(formData.get("amount"));

  if (!amount || amount <= 0) {
    return;
  }

  const installments = getInstallments(formData);
  const currentInstallment = getCurrentInstallment(formData);

  if (formData.get("repeat") === "installment" && currentInstallment > installments) {
    alert("A parcela atual não pode ser maior que o total de parcelas.");
    return;
  }

  entries.push({
    id: crypto.randomUUID(),
    startMonth: getEntryStartMonth(formData.get("dueDate"), currentInstallment),
    description: formData.get("description").trim(),
    amount,
    type: formData.get("type"),
    cardName: getCardName(formData),
    category: formData.get("category").trim(),
    dueDate: formData.get("dueDate"),
    repeat: formData.get("repeat"),
    installments,
    createdAt: new Date().toISOString(),
  });

  saveEntries();
  form.reset();
  typeSelect.value = "income";
  repeatSelect.value = "once";
  installmentsInput.value = "2";
  currentInstallmentInput.value = "1";
  syncInstallmentsField();
  syncCardField();
  render();
});

monthInput.addEventListener("change", render);
repeatSelect.addEventListener("change", syncInstallmentsField);
typeSelect.addEventListener("change", syncCardField);
exportBackup.addEventListener("click", downloadBackup);
exportPdf.addEventListener("click", exportMonthPdf);
importBackup.addEventListener("change", importBackupFile);
themeSelect.addEventListener("change", () => {
  saveTheme(themeSelect.value);
  applyTheme(themeSelect.value);
});
systemTheme.addEventListener("change", () => {
  if (themeSelect.value === "system") {
    applyTheme("system");
  }
});

clearMonth.addEventListener("click", () => {
  const removableEntries = entries.filter((entry) => entry.repeat === "once" && entry.startMonth === monthInput.value);

  if (!removableEntries.length) {
    return;
  }

  const confirmed = confirm("Apagar os lançamentos únicos deste mês? Contas fixas e parceladas serão mantidas.");

  if (!confirmed) {
    return;
  }

  const removableIds = removableEntries.map((entry) => entry.id);
  entries = entries.filter((entry) => !removableIds.includes(entry.id));
  saveEntries();
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});

entryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete]");

  if (!button) {
    return;
  }

  entries = entries.filter((entry) => entry.id !== button.dataset.delete);
  saveEntries();
  render();
});

function render() {
  const monthEntries = getMonthEntries();
  const visibleEntries = getVisibleEntries(monthEntries);
  const income = sumByType(monthEntries, "income");
  const bills = sumByType(monthEntries, "bill");
  const expenses = sumByType(monthEntries, "expense");
  const credit = sumByType(monthEntries, "credit");
  const totalSpent = bills + expenses + credit;
  const monthBalance = income - totalSpent;
  const percent = income > 0 ? Math.min((totalSpent / income) * 100, 100) : 0;

  totalIncome.textContent = currency.format(income);
  totalExpenses.textContent = currency.format(totalSpent);
  creditTotal.textContent = currency.format(credit);
  balance.textContent = currency.format(monthBalance);
  spentPercent.textContent = `${Math.round(percent)}% usado`;
  availableText.textContent = `${currency.format(monthBalance)} disponível`;
  progressBar.style.width = `${percent}%`;
  progressBar.style.background = percent > 85 ? "var(--red)" : percent > 65 ? "var(--yellow)" : "var(--green)";
  entryCount.textContent = getEntryCountText(monthEntries.length);

  renderCardBreakdown(monthEntries);
  renderEntries(visibleEntries);
}

function renderCardBreakdown(monthEntries) {
  const creditEntries = monthEntries.filter((entry) => entry.type === "credit");
  const totalsByCard = creditEntries.reduce((totals, entry) => {
    const cardName = entry.cardName || "Cartão não informado";
    totals[cardName] = (totals[cardName] || 0) + Number(entry.amount);

    return totals;
  }, {});
  const cards = Object.entries(totalsByCard).sort((a, b) => b[1] - a[1]);

  cardBreakdown.innerHTML = "";

  if (!cards.length) {
    cardBreakdown.classList.add("is-hidden");
    return;
  }

  cardBreakdown.classList.remove("is-hidden");
  cardBreakdown.innerHTML = `
    <div class="card-breakdown-title">
      <strong>Cartões do mês</strong>
      <span>${creditEntries.length} lançamento${creditEntries.length === 1 ? "" : "s"}</span>
    </div>
  `;

  cards.forEach(([cardName, total]) => {
    const item = document.createElement("div");
    item.className = "card-breakdown-item";
    item.innerHTML = `
      <span>${escapeHtml(cardName)}</span>
      <strong>${currency.format(total)}</strong>
    `;

    cardBreakdown.append(item);
  });
}

function renderEntries(visibleEntries) {
  entryList.innerHTML = "";

  if (!visibleEntries.length) {
    entryList.append(emptyTemplate.content.cloneNode(true));
    return;
  }

  visibleEntries
    .sort((a, b) => (a.occurrenceDate || "9999-12-31").localeCompare(b.occurrenceDate || "9999-12-31"))
    .forEach((entry) => {
      const item = document.createElement("li");
      item.className = "entry-item";

      const signal = entry.type === "income" ? "+" : "-";
      const dateLabel = entry.occurrenceDate ? formatDate(entry.occurrenceDate) : "Sem data";
      const category = entry.category || "Sem categoria";
      const repeatLabel = getRepeatLabel(entry);
      const cardTag = entry.type === "credit" ? `<span class="entry-tag">${escapeHtml(entry.cardName || "Cartão não informado")}</span>` : "";

      item.innerHTML = `
        <div class="entry-main">
          <strong>${escapeHtml(entry.description)}</strong>
          <div class="entry-meta">
            <span class="entry-tag">${typeLabels[entry.type]}</span>
            ${cardTag}
            <span class="entry-tag">${repeatLabel}</span>
            <span class="entry-tag">${escapeHtml(category)}</span>
            <span class="entry-tag">${dateLabel}</span>
          </div>
        </div>
        <span class="entry-value">${signal} ${currency.format(entry.amount)}</span>
        <button class="delete-button" type="button" data-delete="${entry.id}" aria-label="Remover lançamento">×</button>
      `;

      entryList.append(item);
    });
}

function downloadBackup() {
  const backup = {
    app: "Economize!",
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
  };
  const file = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = `economize-backup-${getCurrentMonth()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportMonthPdf() {
  const monthEntries = getMonthEntries();
  const reportWindow = window.open("", "_blank");

  if (!reportWindow) {
    alert("Não consegui abrir a janela do relatório. Verifique se o navegador bloqueou pop-ups.");
    return;
  }

  reportWindow.document.write(getPdfReportHtml(monthEntries));
  reportWindow.document.close();
  reportWindow.focus();

  reportWindow.addEventListener("load", () => {
    reportWindow.print();
  });
}

function getPdfReportHtml(monthEntries) {
  const income = sumByType(monthEntries, "income");
  const bills = sumByType(monthEntries, "bill");
  const expenses = sumByType(monthEntries, "expense");
  const credit = sumByType(monthEntries, "credit");
  const totalSpent = bills + expenses + credit;
  const monthBalance = income - totalSpent;
  const creditCards = getCreditCardTotals(monthEntries);
  const rows = [...monthEntries]
    .sort((a, b) => (a.occurrenceDate || "9999-12-31").localeCompare(b.occurrenceDate || "9999-12-31"))
    .map(getPdfEntryRow)
    .join("");
  const cardRows = creditCards.map(([cardName, total]) => `<li><span>${escapeHtml(cardName)}</span><strong>${currency.format(total)}</strong></li>`).join("");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Economize - ${getMonthLabel(monthInput.value)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #1f241f;
            background: #fff;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          main { max-width: 960px; margin: 0 auto; padding: 32px; }
          header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #d9dfd6; padding-bottom: 20px; margin-bottom: 22px; }
          h1 { margin: 0 0 6px; font-size: 28px; }
          p { margin: 0; color: #687066; }
          .date { text-align: right; font-size: 13px; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
          .card { border: 1px solid #d9dfd6; border-radius: 8px; padding: 12px; }
          .card span { display: block; color: #687066; font-size: 12px; font-weight: 700; margin-bottom: 8px; }
          .card strong { font-size: 18px; overflow-wrap: anywhere; }
          .income { color: #2f7d54; }
          .expense { color: #b94f49; }
          .balance { color: #356f9f; }
          .credit { color: #ad812b; }
          section { margin-top: 22px; }
          h2 { margin: 0 0 10px; font-size: 16px; }
          ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
          li { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #edf1ea; padding: 7px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { border-bottom: 1px solid #edf1ea; padding: 9px 8px; text-align: left; vertical-align: top; }
          th { color: #687066; font-size: 11px; text-transform: uppercase; }
          td:last-child, th:last-child { text-align: right; white-space: nowrap; }
          .empty { border: 1px solid #d9dfd6; border-radius: 8px; padding: 16px; color: #687066; text-align: center; }
          @page { margin: 16mm; }
          @media print {
            main { padding: 0; }
            header { break-after: avoid; }
            section, table { break-inside: avoid; }
          }
          @media (max-width: 720px) {
            main { padding: 20px; }
            header, li { flex-direction: column; }
            .date { text-align: left; }
            .summary { grid-template-columns: 1fr 1fr; }
          }
        </style>
      </head>
      <body>
        <main>
          <header>
            <div>
              <h1>Economize!</h1>
              <p>Relatório financeiro de ${getMonthLabel(monthInput.value)}</p>
            </div>
            <p class="date">Gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
          </header>

          <div class="summary">
            <div class="card"><span>Entradas</span><strong class="income">${currency.format(income)}</strong></div>
            <div class="card"><span>Gastos</span><strong class="expense">${currency.format(totalSpent)}</strong></div>
            <div class="card"><span>Saldo previsto</span><strong class="balance">${currency.format(monthBalance)}</strong></div>
            <div class="card"><span>Cartão</span><strong class="credit">${currency.format(credit)}</strong></div>
          </div>

          <section>
            <h2>Cartões</h2>
            ${cardRows ? `<ul>${cardRows}</ul>` : `<div class="empty">Nenhum gasto de cartão neste mês.</div>`}
          </section>

          <section>
            <h2>Lançamentos</h2>
            ${
              rows
                ? `<table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th>Tipo</th>
                        <th>Categoria</th>
                        <th>Cartão</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                  </table>`
                : `<div class="empty">Nenhum lançamento neste mês.</div>`
            }
          </section>
        </main>
      </body>
    </html>
  `;
}

function getPdfEntryRow(entry) {
  const signal = entry.type === "income" ? "" : "-";
  const cardName = entry.type === "credit" ? entry.cardName || "Cartão não informado" : "";

  return `
    <tr>
      <td>${entry.occurrenceDate ? formatDate(entry.occurrenceDate) : "Sem data"}</td>
      <td>${escapeHtml(entry.description)}<br><small>${getRepeatLabel(entry)}</small></td>
      <td>${typeLabels[entry.type]}</td>
      <td>${escapeHtml(entry.category || "Sem categoria")}</td>
      <td>${escapeHtml(cardName)}</td>
      <td>${signal}${currency.format(entry.amount)}</td>
    </tr>
  `;
}

function getCreditCardTotals(monthEntries) {
  const totals = monthEntries
    .filter((entry) => entry.type === "credit")
    .reduce((cards, entry) => {
      const cardName = entry.cardName || "Cartão não informado";
      cards[cardName] = (cards[cardName] || 0) + Number(entry.amount);

      return cards;
    }, {});

  return Object.entries(totals).sort((a, b) => b[1] - a[1]);
}

function importBackupFile(event) {
  const [file] = event.target.files;

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", () => {
    try {
      const importedEntries = getEntriesFromBackup(reader.result);
      const confirmed = confirm("Importar este backup vai substituir os dados salvos neste navegador. Continuar?");

      if (!confirmed) {
        return;
      }

      entries = normalizeEntries(importedEntries);
      saveEntries();
      render();
      alert("Backup importado com sucesso.");
    } catch {
      alert("Não consegui importar esse arquivo. Verifique se ele é um backup válido do Economize!.");
    } finally {
      importBackup.value = "";
    }
  });

  reader.readAsText(file);
}

function getMonthEntries() {
  return entries.flatMap((entry) => getOccurrenceForMonth(entry, monthInput.value));
}

function getVisibleEntries(monthEntries) {
  if (activeFilter === "all") {
    return [...monthEntries];
  }

  return monthEntries.filter((entry) => entry.type === activeFilter);
}

function sumByType(monthEntries, type) {
  return monthEntries
    .filter((entry) => entry.type === type)
    .reduce((total, entry) => total + Number(entry.amount), 0);
}

function getOccurrenceForMonth(entry, selectedMonth) {
  const repeat = entry.repeat || "once";
  const startMonth = entry.startMonth || entry.month || selectedMonth;
  const monthOffset = getMonthOffset(startMonth, selectedMonth);

  if (monthOffset < 0) {
    return [];
  }

  if (repeat === "once" && monthOffset !== 0) {
    return [];
  }

  if (repeat === "installment" && monthOffset >= Number(entry.installments || 1)) {
    return [];
  }

  return [
    {
      ...entry,
      occurrenceMonth: selectedMonth,
      occurrenceDate: getOccurrenceDate(entry, selectedMonth),
      installmentNumber: repeat === "installment" ? monthOffset + 1 : null,
    },
  ];
}

function getRepeatLabel(entry) {
  if (entry.repeat === "installment") {
    return `${repeatLabels.installment} ${entry.installmentNumber}/${entry.installments}`;
  }

  return repeatLabels[entry.repeat] || repeatLabels.once;
}

function getOccurrenceDate(entry, selectedMonth) {
  if (!entry.dueDate) {
    return "";
  }

  const day = Number(entry.dueDate.split("-")[2]);
  const lastDay = getLastDayOfMonth(selectedMonth);
  const safeDay = String(Math.min(day, lastDay)).padStart(2, "0");

  return `${selectedMonth}-${safeDay}`;
}

function getEntryStartMonth(dueDate, currentInstallment) {
  const referenceMonth = dueDate ? dueDate.slice(0, 7) : monthInput.value;

  if (repeatSelect.value !== "installment") {
    return referenceMonth;
  }

  return shiftMonth(referenceMonth, -(currentInstallment - 1));
}

function getInstallments(formData) {
  if (formData.get("repeat") !== "installment") {
    return 1;
  }

  return Math.max(Number(formData.get("installments")) || 2, 2);
}

function getCurrentInstallment(formData) {
  if (formData.get("repeat") !== "installment") {
    return 1;
  }

  return Math.max(Number(formData.get("currentInstallment")) || 1, 1);
}

function getCardName(formData) {
  if (formData.get("type") !== "credit") {
    return "";
  }

  return formData.get("cardName").trim() || "Cartão não informado";
}

function getMonthOffset(startMonth, selectedMonth) {
  const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
  const [selectedYear, selectedMonthNumber] = selectedMonth.split("-").map(Number);

  return (selectedYear - startYear) * 12 + selectedMonthNumber - startMonthNumber;
}

function getLastDayOfMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Date(year, monthNumber, 0).getDate();
}

function shiftMonth(month, offset) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  const shiftedYear = date.getFullYear();
  const shiftedMonth = String(date.getMonth() + 1).padStart(2, "0");

  return `${shiftedYear}-${shiftedMonth}`;
}

function syncInstallmentsField() {
  const isInstallment = repeatSelect.value === "installment";

  installmentsField.classList.toggle("is-hidden", !isInstallment);
  currentInstallmentField.classList.toggle("is-hidden", !isInstallment);
  repeatRow.classList.toggle("single-field", !isInstallment);
  installmentsInput.required = isInstallment;
  currentInstallmentInput.required = isInstallment;
}

function syncCardField() {
  const isCredit = typeSelect.value === "credit";

  cardField.classList.toggle("is-hidden", !isCredit);
  cardNameInput.required = isCredit;

  if (!isCredit) {
    cardNameInput.value = "";
  }
}

function getEntryCountText(count) {
  if (count === 0) {
    return "Nenhum lançamento neste mês.";
  }

  if (count === 1) {
    return "1 lançamento neste mês.";
  }

  return `${count} lançamentos neste mês.`;
}

function getCurrentMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${now.getFullYear()}-${month}`;
}

function formatDate(date) {
  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
}

function getMonthLabel(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1, 1);

  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function loadEntries() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function getEntriesFromBackup(content) {
  const backup = JSON.parse(content);
  const importedEntries = Array.isArray(backup) ? backup : backup.entries;

  if (!Array.isArray(importedEntries)) {
    throw new Error("Invalid backup");
  }

  return importedEntries.filter(isValidEntry);
}

function isValidEntry(entry) {
  return entry && typeof entry === "object" && typeof entry.description === "string" && Number(entry.amount) > 0;
}

function normalizeEntries(savedEntries) {
  return savedEntries.map((entry) => ({
    ...entry,
    startMonth: entry.startMonth || entry.month || getCurrentMonth(),
    repeat: entry.repeat || "once",
    installments: Number(entry.installments || 1),
    cardName: entry.cardName || "",
  }));
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (["system", "dark", "light"].includes(savedTheme)) {
    return savedTheme;
  }

  return "dark";
}

function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

function applyTheme(theme) {
  const resolvedTheme = theme === "system" ? (systemTheme.matches ? "dark" : "light") : theme;

  document.documentElement.dataset.theme = resolvedTheme;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
