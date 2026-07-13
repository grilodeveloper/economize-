const STORAGE_KEY = "economize.entries.v1";
const THEME_KEY = "economize.theme.v1";
const CARD_SETTINGS_KEY = "economize.cards.v1";
const CATEGORY_LIMITS_KEY = "economize.category-limits.v1";

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

const defaultCategories = [
  "Alimentação",
  "Assinaturas",
  "Carro",
  "Casa",
  "Educação",
  "Gasto",
  "Lazer",
  "Moradia",
  "Presente",
  "Salário",
  "Saúde",
];

const defaultCards = [
  { id: "card-1", name: "Nubank", closingDay: 25, dueDay: 5, color: "#7c3aed", active: true },
  { id: "card-2", name: "Nu Empresas", closingDay: 25, dueDay: 10, color: "#0f766e", active: true },
  {
    id: "card-3",
    name: "Mercado Pago",
    closingDay: 25,
    dueDay: 15,
    color: "#2563eb",
    active: true,
  },
];

const cardColorPalette = [
  "#7c3aed",
  "#0f766e",
  "#2563eb",
  "#b45309",
  "#be123c",
  "#1d4ed8",
  "#15803d",
];

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
const balanceCard = document.querySelector(".summary-card.balance");
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
const categoryBreakdown = document.querySelector("#categoryBreakdown");
const exportBackup = document.querySelector("#exportBackup");
const exportPdf = document.querySelector("#exportPdf");
const themeSelect = document.querySelector("#themeSelect");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
const searchInput = document.querySelector("#searchInput");
const submitEntry = document.querySelector("#submitEntry");
const cancelEdit = document.querySelector("#cancelEdit");
const cardSettingsList = document.querySelector("#cardSettingsList");
const dashboardPanel = document.querySelector("#dashboardPanel");
const categoryOptions = document.querySelector("#categoryOptions");
const cardOptions = document.querySelector("#cardOptions");
const addCard = document.querySelector("#addCard");

let entries = [];
let cardSettings = [];
let categoryLimits = {};
let activeFilter = "all";
let searchQuery = "";
let editEntryId = null;
let categoryFilter = "";
let cardFilter = "";

async function initApp() {
  monthInput.value = getCurrentMonth();
  themeSelect.value = loadTheme();
  applyTheme(themeSelect.value);
  syncInstallmentsField();
  syncCardField();
  categoryLimits = loadCategoryLimits();

  entryList.setAttribute("aria-busy", "true");
  entryList.innerHTML = `<li class="loading-state">Carregando seus lançamentos...</li>`;

  const [loadedEntries, loadedCards] = await Promise.all([dbLoadEntries(), dbLoadCards()]);

  entries = normalizeEntries(loadedEntries);
  cardSettings = normalizeCardSettings(loadedCards.length ? loadedCards : defaultCards);

  entryList.removeAttribute("aria-busy");
  renderCardSettings();
  renderDatalists();
  render();
}

initApp();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const entry = getEntryFromForm();

  if (!entry) {
    return;
  }

  const isEditing = Boolean(editEntryId);

  if (isEditing) {
    const existing = entries.find((item) => item.id === editEntryId);

    if (!existing) {
      alert("Não encontrei esse lançamento para editar. Tente recarregar a página.");
      resetForm();
      return;
    }

    entries = entries.map((item) =>
      item.id === editEntryId
        ? {
            ...entry,
            id: editEntryId,
            createdAt: existing.createdAt,
            paidMonths: existing.paidMonths || [],
          }
        : item,
    );
  } else {
    entries.push({
      ...entry,
      id: crypto.randomUUID(),
      paidMonths: [],
      createdAt: new Date().toISOString(),
    });
  }

  const entryToSave = entries.find((e) => e.id === (editEntryId || entries[entries.length - 1].id));
  await dbSaveEntry(entryToSave);
  renderDatalists();

  if (!isEditing) {
    const nextMonth = getNextMonthAfterCardDue(entry);

    if (nextMonth) {
      const confirmed = confirm(
        `Esse lançamento foi registrado após o vencimento do cartão ${entry.cardName}. Deseja avançar para ${getMonthLabel(nextMonth)}?`,
      );

      if (confirmed) {
        monthInput.value = nextMonth;
      }
    } else if (entry.startMonth && entry.startMonth !== monthInput.value) {
      monthInput.value = entry.startMonth;
    }
  }

  if (isEditing) {
    clearListFilters();
  }

  resetForm();
  render();
});

monthInput.addEventListener("change", render);
repeatSelect.addEventListener("change", syncInstallmentsField);
typeSelect.addEventListener("change", syncCardField);
exportBackup.addEventListener("click", downloadBackup);
exportPdf.addEventListener("click", exportMonthPdf);
cancelEdit.addEventListener("click", resetForm);
addCard.addEventListener("click", addNewCard);
searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  render();
});
themeSelect.addEventListener("change", () => {
  saveTheme(themeSelect.value);
  applyTheme(themeSelect.value);
});
systemTheme.addEventListener("change", () => {
  if (themeSelect.value === "system") {
    applyTheme("system");
  }
});

clearMonth.addEventListener("click", async () => {
  const removableEntries = entries.filter(
    (entry) => entry.repeat === "once" && entry.startMonth === monthInput.value,
  );

  if (!removableEntries.length) {
    return;
  }

  const confirmed = confirm(
    "Apagar os lançamentos únicos deste mês? Contas fixas e parceladas serão mantidas.",
  );

  if (!confirmed) {
    return;
  }

  const removableIds = removableEntries.map((entry) => entry.id);
  entries = entries.filter((entry) => !removableIds.includes(entry.id));
  await Promise.all(removableIds.map((id) => dbDeleteEntry(id)));
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});

entryList.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-action]");

  if (!action) {
    return;
  }

  const { id, action: actionName, paidKey } = action.dataset;

  if (actionName === "delete") {
    entries = entries.filter((entry) => entry.id !== id);
    await dbDeleteEntry(id);
  }

  if (actionName === "paid") {
    entries = entries.map((entry) =>
      entry.id === id ? togglePaidOccurrence(entry, paidKey) : entry,
    );
    const updated = entries.find((e) => e.id === id);
    await dbSaveEntry(updated);
  }

  if (actionName === "edit") {
    startEdit(id);
    return;
  }

  if (actionName === "duplicate") {
    await duplicateEntry(id);
  }

  render();
});

cardSettingsList.addEventListener("input", async (event) => {
  const input = event.target.closest("[data-card-setting]");

  if (!input) {
    return;
  }

  const { cardId, cardSetting } = input.dataset;
  cardSettings = cardSettings.map((card) =>
    card.id === cardId
      ? {
          ...card,
          [cardSetting]: getCardSettingValue(cardSetting, input),
        }
      : card,
  );
  const updatedCard = cardSettings.find((c) => c.id === cardId);
  await dbSaveCard(updatedCard);
  renderCardSettings();
  renderDatalists();
  render();
});

cardSettingsList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-remove-card]");

  if (!button) {
    return;
  }

  const card = cardSettings.find((item) => item.id === button.dataset.removeCard);

  if (!card) {
    return;
  }

  const isUsed = entries.some((entry) => entry.cardName === card.name);

  if (isUsed) {
    alert("Esse cartão já tem lançamentos. Para manter seu histórico, ele não pode ser removido.");
    return;
  }

  cardSettings = cardSettings.filter((item) => item.id !== card.id);
  await dbDeleteCard(card.id);
  renderCardSettings();
  renderDatalists();
  render();
});

categoryBreakdown.addEventListener("click", (event) => {
  const limitButton = event.target.closest("[data-set-limit]");

  if (limitButton) {
    handleSetCategoryLimit(limitButton.dataset.setLimit);
    return;
  }

  const filterTarget = event.target.closest("[data-category-filter]");

  if (!filterTarget) {
    return;
  }

  categoryFilter =
    categoryFilter === filterTarget.dataset.categoryFilter
      ? ""
      : filterTarget.dataset.categoryFilter;
  render();
});

cardBreakdown.addEventListener("click", (event) => {
  const unpayButton = event.target.closest("[data-unpay-card]");

  if (unpayButton) {
    markCardEntriesAsUnpaid(unpayButton.dataset.unpayCard);
    return;
  }

  const payButton = event.target.closest("[data-pay-card]");

  if (payButton) {
    markCardEntriesAsPaid(payButton.dataset.payCard);
    return;
  }

  const clearButton = event.target.closest("[data-clear-card-filter]");

  if (clearButton) {
    cardFilter = "";
    render();
    return;
  }

  const filterTarget = event.target.closest("[data-card-filter]");

  if (!filterTarget) {
    return;
  }

  cardFilter =
    cardFilter === filterTarget.dataset.cardFilter ? "" : filterTarget.dataset.cardFilter;
  render();
});

function getEntryFromForm() {
  const formData = new FormData(form);
  const amount = Number(formData.get("amount"));

  if (!amount || amount <= 0) {
    return null;
  }

  const repeat = formData.get("repeat");
  const installments = getInstallments(formData);
  const currentInstallment = getCurrentInstallment(formData);

  if (repeat === "installment" && currentInstallment > installments) {
    alert("A parcela atual não pode ser maior que o total de parcelas.");
    return null;
  }

  return {
    startMonth: getEntryStartMonth(formData.get("dueDate"), currentInstallment, repeat),
    description: formData.get("description").trim(),
    amount,
    type: formData.get("type"),
    cardName: getCardName(formData),
    category: formData.get("category").trim(),
    dueDate: formData.get("dueDate"),
    repeat,
    installments,
  };
}

function render() {
  const monthEntries = getMonthEntries();
  const cards = getCreditCardTotals(monthEntries);

  if (cardFilter && !cards.some(([cardName]) => cardName === cardFilter)) {
    cardFilter = "";
  }

  const visibleEntries = getVisibleEntries(monthEntries);
  const income = sumByType(monthEntries, "income");
  const bills = sumByType(monthEntries, "bill");
  const expenses = sumByType(monthEntries, "expense");
  const credit = sumByType(monthEntries, "credit");
  const totalSpent = bills + expenses + credit;
  const paidTotal = monthEntries
    .filter((entry) => entry.type !== "income" && entry.isPaid)
    .reduce((total, entry) => total + Number(entry.amount), 0);
  const pendingTotal = Math.max(totalSpent - paidTotal, 0);
  const monthBalance = income - totalSpent;
  const percent = income > 0 ? Math.min((totalSpent / income) * 100, 100) : 0;

  totalIncome.textContent = currency.format(income);
  totalExpenses.textContent = currency.format(totalSpent);
  creditTotal.textContent = currency.format(credit);
  balance.textContent = currency.format(monthBalance);
  balanceCard.classList.toggle("is-negative", monthBalance < 0);
  balanceCard.classList.toggle("is-positive", monthBalance >= 0);
  spentPercent.textContent = `${Math.round(percent)}% usado`;
  availableText.textContent = `${currency.format(paidTotal)} pago · ${currency.format(pendingTotal)} pendente`;
  progressBar.style.width = `${percent}%`;
  progressBar.style.background =
    percent > 85 ? "var(--red)" : percent > 65 ? "var(--yellow)" : "var(--green)";
  entryCount.textContent = getEntryCountText(monthEntries.length, visibleEntries.length);

  renderDashboard(monthEntries);
  renderCardBreakdown(monthEntries, cards);
  renderCategoryBreakdown(monthEntries);
  renderEntries(visibleEntries);
}

function renderDashboard(monthEntries) {
  const previousMonth = shiftMonth(monthInput.value, -1);
  const previousEntries = getEntriesForMonth(previousMonth);
  const currentSpent = getTotalSpent(monthEntries);
  const previousSpent = getTotalSpent(previousEntries);
  const currentBalance = sumByType(monthEntries, "income") - currentSpent;
  const previousBalance = sumByType(previousEntries, "income") - previousSpent;
  const spentDiff = currentSpent - previousSpent;
  const balanceDiff = currentBalance - previousBalance;

  dashboardPanel.innerHTML = `
    <div class="insight-item">
      <span>Comparação com ${getMonthLabel(previousMonth)}</span>
      <strong>${formatDiff(spentDiff)} em gastos</strong>
    </div>
    <div class="insight-item">
      <span>Saldo vs. mês anterior</span>
      <strong>${formatDiff(balanceDiff)}</strong>
    </div>
  `;
}

function renderCardBreakdown(monthEntries, cards = getCreditCardTotals(monthEntries)) {
  const creditEntries = monthEntries.filter((entry) => entry.type === "credit");

  cardBreakdown.innerHTML = "";

  if (!cards.length) {
    cardBreakdown.classList.add("is-hidden");
    return;
  }

  cardBreakdown.classList.remove("is-hidden");
  cardBreakdown.innerHTML = `
    <div class="card-breakdown-title">
      <strong>Cartões do mês</strong>
      <span>${cardFilter ? `Filtro: ${escapeHtml(cardFilter)}` : `${creditEntries.length} lançamento${creditEntries.length === 1 ? "" : "s"}`}</span>
    </div>
  `;

  if (cardFilter) {
    const clear = document.createElement("button");
    clear.className = "tiny-button";
    clear.type = "button";
    clear.textContent = "Limpar filtro de cartão";
    clear.dataset.clearCardFilter = "true";
    cardBreakdown.append(clear);
  }

  cards.forEach(([cardName, total]) => {
    const card = getCardConfig(cardName);
    const unpaidCount = creditEntries.filter(
      (entry) => (entry.cardName || "Cartão não informado") === cardName && !entry.isPaid,
    ).length;
    const paidCount = creditEntries.filter(
      (entry) => (entry.cardName || "Cartão não informado") === cardName && entry.isPaid,
    ).length;
    const item = document.createElement("div");
    item.className = `card-breakdown-item ${cardFilter === cardName ? "is-active" : ""}`;
    item.dataset.cardFilter = cardName;
    item.style.setProperty("--card-accent", card.color || "#f2c15f");
    item.innerHTML = `
      <div class="card-breakdown-info">
        <span>${getCardVisualLabel(card)}</span>
        <strong>${currency.format(total)}</strong>
      </div>
      <div class="card-breakdown-actions">
        <button class="tiny-button" type="button" data-pay-card="${escapeHtml(cardName)}" ${unpaidCount ? "" : "disabled"}>
          ${unpaidCount ? `Pagar ${unpaidCount}` : "Tudo pago"}
        </button>
        <button class="tiny-button" type="button" data-unpay-card="${escapeHtml(cardName)}" ${paidCount ? "" : "disabled"}>
          ${paidCount ? `Desfazer ${paidCount}` : "Nada pago"}
        </button>
      </div>
    `;

    cardBreakdown.append(item);
  });
}

function renderCategoryBreakdown(monthEntries) {
  const categories = getCategoryTotals(monthEntries);

  categoryBreakdown.innerHTML = "";

  if (!categories.length) {
    categoryBreakdown.classList.add("is-hidden");
    return;
  }

  categoryBreakdown.classList.remove("is-hidden");
  categoryBreakdown.innerHTML = `
    <div class="card-breakdown-title">
      <strong>Categorias</strong>
      <span>${categoryFilter ? `Filtro: ${escapeHtml(categoryFilter)}` : "Clique para filtrar"}</span>
    </div>
  `;

  if (categoryFilter) {
    const clear = document.createElement("button");
    clear.className = "tiny-button";
    clear.type = "button";
    clear.textContent = "Limpar filtro de categoria";
    clear.addEventListener("click", () => {
      categoryFilter = "";
      render();
    });
    categoryBreakdown.append(clear);
  }

  const maxTotal = categories[0]?.[1] || 1;

  categories.forEach(([category, total]) => {
    const limit = categoryLimits[category];
    const hasLimit = typeof limit === "number" && limit > 0;
    const overLimit = hasLimit && total > limit;
    const percent = hasLimit
      ? Math.min(Math.round((total / limit) * 100), 100)
      : Math.round((total / maxTotal) * 100);
    const level = overLimit ? "high" : percent >= 75 ? "mid" : "low";
    const item = document.createElement("div");
    item.className = `category-row ${categoryFilter === category ? "is-active" : ""}`;
    item.dataset.categoryFilter = category;
    item.innerHTML = `
      <div class="category-row-header">
        <span>${escapeHtml(category)}</span>
        <div class="category-row-value">
          ${overLimit ? `<span class="entry-tag category-over-tag">Estourou o limite</span>` : ""}
          <strong>${currency.format(total)}${hasLimit ? `<span class="category-limit-text"> / ${currency.format(limit)}</span>` : ""}</strong>
          <button class="tiny-button" type="button" data-set-limit="${escapeHtml(category)}">${hasLimit ? "Editar limite" : "Definir limite"}</button>
        </div>
      </div>
      <div class="category-bar-track">
        <div class="category-bar-fill category-bar-fill--${level}" style="width: ${percent}%"></div>
      </div>
    `;
    categoryBreakdown.append(item);
  });
}

function handleSetCategoryLimit(category) {
  const current = categoryLimits[category];
  const input = prompt(
    `Limite mensal para "${category}" (em R$, deixe vazio para remover):`,
    current ? String(current) : "",
  );

  if (input === null) {
    return;
  }

  const trimmed = input.trim();

  if (!trimmed) {
    delete categoryLimits[category];
  } else {
    const value = Number(trimmed.replace(",", "."));

    if (!Number.isFinite(value) || value <= 0) {
      alert("Informe um valor numérico maior que zero.");
      return;
    }

    categoryLimits[category] = value;
  }

  saveCategoryLimits();
  render();
}

function renderEntries(visibleEntries) {
  entryList.innerHTML = "";

  if (!visibleEntries.length) {
    entryList.append(emptyTemplate.content.cloneNode(true));
    return;
  }

  const sortedEntries = [...visibleEntries].sort((a, b) =>
    (a.occurrenceDate || "9999-12-31").localeCompare(b.occurrenceDate || "9999-12-31"),
  );

  let lastDateKey = null;

  sortedEntries.forEach((entry) => {
    const dateKey = entry.occurrenceDate || "sem-data";

    if (dateKey !== lastDateKey) {
      lastDateKey = dateKey;
      const dateGroup = document.createElement("li");
      dateGroup.className = "entry-date-group";
      dateGroup.textContent = entry.occurrenceDate ? formatDate(entry.occurrenceDate) : "Sem data";
      entryList.append(dateGroup);
    }

    const item = document.createElement("li");
    item.className = `entry-item ${entry.isPaid ? "is-paid" : ""}`;

    const signal = entry.type === "income" ? "+" : "-";
    const category = entry.category || "Sem categoria";
    const repeatLabel = getRepeatLabel(entry);
    const cardTag = entry.type === "credit" ? getCardTag(entry.cardName) : "";
    const invoiceTag =
      entry.type === "credit" ? `<span class="entry-tag">${getInvoiceLabel(entry)}</span>` : "";
    const paidLabel =
      entry.type === "income"
        ? ""
        : `<span class="entry-tag ${entry.isPaid ? "paid-tag" : ""}">${entry.isPaid ? "Pago" : "Pendente"}</span>`;

    item.innerHTML = `
      <div class="entry-main">
        <div class="entry-title-row">
          <strong>${escapeHtml(entry.description)}</strong>
          <span class="entry-value entry-value--${entry.type}">${signal} ${currency.format(entry.amount)}</span>
        </div>
        <div class="entry-meta">
          <span class="entry-tag">${typeLabels[entry.type]}</span>
          ${paidLabel}
          ${cardTag}
          ${invoiceTag}
          <span class="entry-tag">${repeatLabel}</span>
          ${escapeHtml(category) !== "Sem categoria" ? `<span class="entry-tag">${escapeHtml(category)}</span>` : ""}
        </div>
      </div>
      <div class="entry-actions">
        <div class="entry-actions-main">
          ${entry.type === "income" ? "" : `<button class="action-button" type="button" data-action="paid" data-id="${entry.id}" data-paid-key="${entry.paidKey}" aria-label="${entry.isPaid ? "Desfazer pagamento" : "Marcar como pago"}" title="${entry.isPaid ? "Desfazer pagamento" : "Marcar como pago"}">${entry.isPaid ? "↺" : "✓"}</button>`}
          <button class="action-button" type="button" data-action="edit" data-id="${entry.id}" aria-label="Editar lançamento" title="Editar">✎</button>
          <button class="action-button" type="button" data-action="duplicate" data-id="${entry.id}" aria-label="Duplicar lançamento" title="Duplicar">⧉</button>
        </div>
        <button class="delete-button" type="button" data-action="delete" data-id="${entry.id}" aria-label="Remover lançamento" title="Remover">×</button>
      </div>
    `;

    entryList.append(item);
  });
}

function renderCardSettings() {
  cardSettingsList.innerHTML = getSortedCardSettings()
    .map(
      (card) => `
        <div class="card-setting-row">
          <label class="card-setting-preview" style="--card-accent: ${escapeHtml(card.color)}" aria-label="Cor do cartão">
            <span class="card-chip">${getCardBadgeLabel(card.name)}</span>
            <input class="card-color-input" data-card-setting="color" data-card-id="${card.id}" type="color" value="${escapeHtml(card.color)}" aria-label="Cor do cartão" />
          </label>
          <div class="card-setting-main">
            <input
              class="card-name-input"
              data-card-setting="name"
              data-card-id="${card.id}"
              type="text"
              value="${escapeHtml(card.name)}"
              placeholder="Nome do cartão"
              aria-label="Nome do cartão"
            />
            <div class="card-setting-meta">
              <label class="card-close-field">
                <span>Fecha</span>
                <input data-card-setting="closingDay" data-card-id="${card.id}" type="number" min="1" max="31" value="${card.closingDay}" />
              </label>
              <label class="card-due-field">
                <span>Vence</span>
                <input data-card-setting="dueDay" data-card-id="${card.id}" type="number" min="1" max="31" value="${card.dueDay}" />
              </label>
              <label class="toggle-label card-active-field">
                <span>Ativo</span>
                <input data-card-setting="active" data-card-id="${card.id}" type="checkbox" ${card.active ? "checked" : ""} />
              </label>
            </div>
          </div>
          <details class="card-actions-menu">
            <summary class="tiny-button card-actions-trigger" aria-label="Ações do cartão">•••</summary>
            <div class="card-actions-popover">
              <button class="tiny-button danger-button" type="button" data-remove-card="${card.id}">Remover</button>
            </div>
          </details>
        </div>
      `,
    )
    .join("");
}

function renderDatalists() {
  const categories = [
    ...new Set([...defaultCategories, ...entries.map((entry) => entry.category).filter(Boolean)]),
  ].sort();
  const activeCardNames = getSortedCardSettings()
    .filter((card) => card.active)
    .map((card) => card.name)
    .filter(Boolean);
  const unknownEntryCards = entries
    .map((entry) => entry.cardName)
    .filter((cardName) => cardName && !cardSettings.some((card) => card.name === cardName));
  const cards = [...new Set([...activeCardNames, ...unknownEntryCards])];

  categoryOptions.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}"></option>`)
    .join("");
  cardOptions.innerHTML = cards
    .map((card) => `<option value="${escapeHtml(card)}"></option>`)
    .join("");
}

function downloadBackup() {
  const backup = {
    app: "Economize!",
    version: 2,
    exportedAt: new Date().toISOString(),
    entries,
    cardSettings,
    categoryLimits,
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
  const totalSpent = getTotalSpent(monthEntries);
  const credit = sumByType(monthEntries, "credit");
  const monthBalance = income - totalSpent;
  const creditCards = getCreditCardTotals(monthEntries);
  const categoryRows = getCategoryTotals(monthEntries)
    .map(
      ([category, total]) =>
        `<li><span>${escapeHtml(category)}</span><strong>${currency.format(total)}</strong></li>`,
    )
    .join("");
  const rows = [...monthEntries]
    .sort((a, b) =>
      (a.occurrenceDate || "9999-12-31").localeCompare(b.occurrenceDate || "9999-12-31"),
    )
    .map(getPdfEntryRow)
    .join("");
  const cardRows = creditCards
    .map(
      ([cardName, total]) =>
        `<li><span>${escapeHtml(cardName)}</span><strong>${currency.format(total)}</strong></li>`,
    )
    .join("");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Economize - ${getMonthLabel(monthInput.value)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; color: #1f241f; background: #fff; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
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
          @media print { main { padding: 0; } header { break-after: avoid; } section, table { break-inside: avoid; } }
          @media (max-width: 720px) { main { padding: 20px; } header, li { flex-direction: column; } .date { text-align: left; } .summary { grid-template-columns: 1fr 1fr; } }
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
            <h2>Categorias</h2>
            ${categoryRows ? `<ul>${categoryRows}</ul>` : `<div class="empty">Nenhum gasto categorizado neste mês.</div>`}
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
                        <th>Status</th>
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
      <td>${escapeHtml(entry.description)}<br><small>${getRepeatLabel(entry)}${entry.type === "credit" ? ` · ${getInvoiceLabel(entry)}` : ""}</small></td>
      <td>${entry.type === "income" ? "" : entry.isPaid ? "Pago" : "Pendente"}</td>
      <td>${typeLabels[entry.type]}</td>
      <td>${escapeHtml(entry.category || "Sem categoria")}</td>
      <td>${escapeHtml(cardName)}</td>
      <td>${signal}${currency.format(entry.amount)}</td>
    </tr>
  `;
}

function getMonthEntries() {
  return getEntriesForMonth(monthInput.value);
}

function getEntriesForMonth(month) {
  return entries.flatMap((entry) => getOccurrenceForMonth(entry, month));
}

function getVisibleEntries(monthEntries) {
  let visibleEntries =
    activeFilter === "all"
      ? [...monthEntries]
      : monthEntries.filter((entry) => entry.type === activeFilter);

  if (cardFilter) {
    visibleEntries = visibleEntries.filter(
      (entry) => (entry.cardName || "Cartão não informado") === cardFilter,
    );
  }

  if (categoryFilter) {
    visibleEntries = visibleEntries.filter(
      (entry) => (entry.category || "Sem categoria") === categoryFilter,
    );
  }

  if (searchQuery) {
    visibleEntries = visibleEntries.filter((entry) =>
      [
        entry.description,
        entry.category,
        entry.cardName,
        typeLabels[entry.type],
        getRepeatLabel(entry),
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(searchQuery)),
    );
  }

  return visibleEntries;
}

function sumByType(monthEntries, type) {
  return monthEntries
    .filter((entry) => entry.type === type)
    .reduce((total, entry) => total + Number(entry.amount), 0);
}

function getTotalSpent(monthEntries) {
  return (
    sumByType(monthEntries, "bill") +
    sumByType(monthEntries, "expense") +
    sumByType(monthEntries, "credit")
  );
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

  const occurrenceDate = getOccurrenceDate(entry, selectedMonth);
  const installmentNumber = repeat === "installment" ? monthOffset + 1 : null;
  const paidKey = getPaidKey(selectedMonth, installmentNumber, repeat);

  return [
    {
      ...entry,
      occurrenceMonth: selectedMonth,
      occurrenceDate,
      installmentNumber,
      paidKey,
      isPaid: isEntryPaid(entry, paidKey),
      invoiceMonth:
        entry.type === "credit"
          ? getInvoiceMonth(entry.cardName, occurrenceDate || `${selectedMonth}-01`)
          : "",
    },
  ];
}

function getRepeatLabel(entry) {
  if (entry.repeat === "installment") {
    return `${repeatLabels.installment} ${entry.installmentNumber || 1}/${entry.installments}`;
  }

  return repeatLabels[entry.repeat] || repeatLabels.once;
}

function getInvoiceLabel(entry) {
  if (!entry.invoiceMonth) {
    return "Fatura sem data";
  }

  return `Fatura ${getMonthLabel(entry.invoiceMonth)}`;
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

function getEntryStartMonth(dueDate, currentInstallment, repeat) {
  const referenceMonth = dueDate ? dueDate.slice(0, 7) : monthInput.value;

  if (repeat !== "installment") {
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

function getNextMonthAfterCardDue(entry) {
  if (entry.type !== "credit") {
    return "";
  }

  const referenceDate = getEntryReferenceDate(entry);

  if (!referenceDate) {
    return "";
  }

  const card = getCardConfig(entry.cardName);
  const [year, month, day] = referenceDate.split("-").map(Number);
  const referenceMonth = `${year}-${String(month).padStart(2, "0")}`;

  if (day <= card.dueDay) {
    return "";
  }

  return shiftMonth(referenceMonth, 1);
}

function getEntryReferenceDate(entry) {
  if (entry.dueDate) {
    return entry.dueDate;
  }

  if (monthInput.value !== getCurrentMonth()) {
    return "";
  }

  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");

  return `${monthInput.value}-${day}`;
}

function togglePaidOccurrence(entry, paidKey) {
  const paidMonths = new Set(entry.paidMonths || []);

  if (paidMonths.has(paidKey)) {
    paidMonths.delete(paidKey);
  } else {
    paidMonths.add(paidKey);
  }

  return {
    ...entry,
    paidMonths: [...paidMonths],
  };
}

function markCardEntriesAsPaid(cardName) {
  setEntriesPaidState({
    targetName: cardName,
    shouldPay: true,
    entryFilter: (entry) =>
      entry.type === "credit" && (entry.cardName || "Cartão não informado") === cardName,
    confirmLabel: `do cartão ${cardName}`,
  });
}

function markCardEntriesAsUnpaid(cardName) {
  setEntriesPaidState({
    targetName: cardName,
    shouldPay: false,
    entryFilter: (entry) =>
      entry.type === "credit" && (entry.cardName || "Cartão não informado") === cardName,
    confirmLabel: `do cartão ${cardName}`,
  });
}

async function setEntriesPaidState({ targetName, shouldPay, entryFilter, confirmLabel }) {
  if (!targetName) {
    return;
  }

  const monthEntries = getMonthEntries();
  const targetEntries = monthEntries.filter(
    (entry) => entryFilter(entry) && entry.isPaid !== shouldPay,
  );

  if (!targetEntries.length) {
    return;
  }

  const actionLabel = shouldPay ? "marcar como pagos" : "desfazer o pagamento de";
  const confirmed = confirm(
    `Deseja ${actionLabel} ${targetEntries.length} lançamento${targetEntries.length === 1 ? "" : "s"} ${confirmLabel}?`,
  );

  if (!confirmed) {
    return;
  }

  const paidKeysByEntry = targetEntries.reduce((map, entry) => {
    map[entry.id] = [...(map[entry.id] || []), entry.paidKey];
    return map;
  }, {});

  entries = entries.map((entry) => {
    const paidKeys = paidKeysByEntry[entry.id];

    if (!paidKeys?.length) {
      return entry;
    }

    const paidMonths = new Set(entry.paidMonths || []);

    paidKeys.forEach((paidKey) => {
      if (shouldPay) {
        paidMonths.add(paidKey);
      } else {
        paidMonths.delete(paidKey);
      }
    });

    return {
      ...entry,
      paidMonths: [...paidMonths],
    };
  });

  const modifiedIds = Object.keys(paidKeysByEntry);
  const modifiedEntries = entries.filter((e) => modifiedIds.includes(e.id));
  await Promise.all(modifiedEntries.map((entry) => dbSaveEntry(entry)));
  render();
}

function isEntryPaid(entry, paidKey) {
  const legacyMonth = paidKey.split("::")[0];

  return (
    (entry.paidMonths || []).includes(paidKey) || (entry.paidMonths || []).includes(legacyMonth)
  );
}

function getPaidKey(month, installmentNumber, repeat) {
  if (repeat === "installment") {
    return `${month}::${installmentNumber}`;
  }

  if (repeat === "fixed") {
    return `${month}::fixed`;
  }

  return `${month}::once`;
}

function startEdit(id) {
  const entry = entries.find((item) => item.id === id);

  if (!entry) {
    return;
  }

  const occurrence = getOccurrenceForMonth(entry, monthInput.value)[0];

  editEntryId = id;
  form.elements.description.value = entry.description;
  form.elements.amount.value = entry.amount;
  typeSelect.value = entry.type;
  cardNameInput.value = entry.cardName || "";
  form.elements.category.value = entry.category || "";
  form.elements.dueDate.value = entry.dueDate || "";
  repeatSelect.value = entry.repeat || "once";
  installmentsInput.value = entry.installments || 2;
  currentInstallmentInput.value = occurrence?.installmentNumber || 1;
  submitEntry.textContent = "Salvar";
  cancelEdit.classList.remove("is-hidden");
  syncCardField();
  syncInstallmentsField();
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function duplicateEntry(id) {
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;
  const newEntry = {
    ...entry,
    id: crypto.randomUUID(),
    description: `${entry.description} cópia`,
    paidMonths: [],
    createdAt: new Date().toISOString(),
  };
  entries.push(newEntry);
  await dbSaveEntry(newEntry);
}

function resetForm() {
  editEntryId = null;
  form.reset();
  typeSelect.value = "income";
  repeatSelect.value = "once";
  installmentsInput.value = "2";
  currentInstallmentInput.value = "1";
  submitEntry.textContent = "Adicionar";
  cancelEdit.classList.add("is-hidden");
  syncInstallmentsField();
  syncCardField();
}

function clearListFilters() {
  activeFilter = "all";
  cardFilter = "";
  categoryFilter = "";
  searchQuery = "";
  searchInput.value = "";
  filterButtons.forEach((button) =>
    button.classList.toggle("active", button.dataset.filter === "all"),
  );
}

async function addNewCard() {
  const nextNumber = cardSettings.length + 1;

  cardSettings = [
    ...cardSettings,
    {
      id: crypto.randomUUID(),
      name: `Novo cartão ${nextNumber}`,
      closingDay: 25,
      dueDay: 10,
      color: cardColorPalette[(nextNumber - 1) % cardColorPalette.length],
      active: true,
    },
  ];
  const newCard = cardSettings[cardSettings.length - 1];
  await dbSaveCard(newCard);
  renderCardSettings();
  renderDatalists();
  render();
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

function getCategoryTotals(monthEntries) {
  const totals = monthEntries
    .filter((entry) => entry.type !== "income")
    .reduce((categories, entry) => {
      const category = entry.category || "Sem categoria";
      categories[category] = (categories[category] || 0) + Number(entry.amount);

      return categories;
    }, {});

  return Object.entries(totals).sort((a, b) => b[1] - a[1]);
}

function getCardConfig(cardName) {
  return (
    cardSettings.find((card) => card.name === cardName) || {
      name: cardName,
      closingDay: 25,
      dueDay: 10,
      color: "#b45309",
      active: true,
    }
  );
}

function getInvoiceMonth(cardName, date) {
  const card = getCardConfig(cardName);
  const [year, month, day] = date.split("-").map(Number);
  const baseMonth = `${year}-${String(month).padStart(2, "0")}`;

  if (day > card.closingDay) {
    return shiftMonth(baseMonth, 1);
  }

  return baseMonth;
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

function getEntryCountText(totalCount, visibleCount) {
  if (totalCount === 0) {
    return "Nenhum lançamento neste mês.";
  }

  const totalText = totalCount === 1 ? "1 lançamento" : `${totalCount} lançamentos`;

  if (visibleCount !== totalCount) {
    return `${visibleCount} de ${totalText} neste mês.`;
  }

  return `${totalText} neste mês.`;
}

function formatDiff(value) {
  if (value === 0) {
    return currency.format(0);
  }

  return `${value > 0 ? "+" : "-"} ${currency.format(Math.abs(value))}`;
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

function getEntriesFromBackup(backup) {
  const importedEntries = Array.isArray(backup) ? backup : backup.entries;

  if (!Array.isArray(importedEntries)) {
    throw new Error("Invalid backup");
  }

  return importedEntries.filter(isValidEntry);
}

function isValidEntry(entry) {
  return (
    entry &&
    typeof entry === "object" &&
    typeof entry.description === "string" &&
    Number(entry.amount) > 0
  );
}

function normalizeEntries(savedEntries) {
  return savedEntries.map((entry) => ({
    ...entry,
    startMonth: entry.startMonth || entry.month || getCurrentMonth(),
    repeat: entry.repeat || "once",
    installments: Number(entry.installments || 1),
    cardName: entry.cardName || "",
    paidMonths: Array.isArray(entry.paidMonths) ? entry.paidMonths : [],
  }));
}

function normalizeCardSettings(savedCards) {
  const cards = Array.isArray(savedCards) && savedCards.length ? savedCards : defaultCards;

  return cards.map((card, index) => ({
    id: card.id || `card-${index + 1}`,
    name: getCardDisplayName(card.name, index),
    closingDay: clampDay(card.closingDay || 25),
    dueDay: clampDay(card.dueDay || 10),
    color: normalizeCardColor(card.color, index),
    active: card.active !== false,
  }));
}

function getCardDisplayName(name, index) {
  const genericName = `Cartão ${index + 1}`;

  if (!name || name === genericName) {
    return defaultCards[index]?.name || genericName;
  }

  return name;
}

function clampDay(value) {
  return Math.min(Math.max(Number(value) || 1, 1), 31);
}

function getCardSettingValue(cardSetting, input) {
  if (cardSetting === "name") {
    return input.value.trim();
  }

  if (cardSetting === "color") {
    return normalizeCardColor(input.value);
  }

  if (cardSetting === "active") {
    return input.checked;
  }

  return clampDay(input.value);
}

function normalizeCardColor(value, index = 0) {
  if (/^#[0-9a-f]{6}$/i.test(String(value || "").trim())) {
    return String(value).trim();
  }

  return cardColorPalette[index % cardColorPalette.length];
}

function getSortedCardSettings() {
  return [...cardSettings].sort((a, b) => {
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }

    return a.name.localeCompare(b.name, "pt-BR");
  });
}

function getCardBadgeLabel(name) {
  const initials = String(name || "Cartão")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return initials || "CT";
}

function getCardVisualLabel(card) {
  const status = card.active ? "" : " · inativo";

  return `${escapeHtml(card.name)} · fecha ${card.closingDay} · vence ${card.dueDay}${status}`;
}

function getCardTag(cardName) {
  const card = getCardConfig(cardName || "Cartão não informado");
  const inactiveLabel = card.active ? "" : " · inativo";

  return `<span class="entry-tag card-entry-tag" style="--card-accent: ${escapeHtml(card.color)}">${escapeHtml(card.name)}${inactiveLabel}</span>`;
}

async function saveEntries(modifiedEntries = []) {
  await Promise.all(modifiedEntries.map((entry) => dbSaveEntry(entry)));
}

async function saveCardSettings(modifiedCards = []) {
  await Promise.all(modifiedCards.map((card) => dbSaveCard(card)));
}

function saveCategoryLimits() {
  localStorage.setItem(CATEGORY_LIMITS_KEY, JSON.stringify(categoryLimits));
}

function loadCategoryLimits() {
  try {
    const saved = JSON.parse(localStorage.getItem(CATEGORY_LIMITS_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
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
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
