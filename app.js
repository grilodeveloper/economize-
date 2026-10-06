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
const monthLabel = document.querySelector("#monthLabel");
const prevMonth = document.querySelector("#prevMonth");
const nextMonth = document.querySelector("#nextMonth");
const form = document.querySelector("#entryForm");
const entryDialog = document.querySelector("#entryDialog");
const entryDialogTitle = document.querySelector("#entryDialogTitle");
const entryList = document.querySelector("#entryList");
const entryCount = document.querySelector("#entryCount");
const entryHint = document.querySelector("#entryHint");
const entryError = document.querySelector("#entryError");
const amountLabel = document.querySelector("#amountLabel");
const totalIncome = document.querySelector("#totalIncome");
const totalExpenses = document.querySelector("#totalExpenses");
const paidTotalText = document.querySelector("#paidTotal");
const pendingTotalText = document.querySelector("#pendingTotal");
const creditTotal = document.querySelector("#creditTotal");
const balance = document.querySelector("#balance");
const spentPercent = document.querySelector("#spentPercent");
const comparison = document.querySelector("#comparison");
const progressBar = document.querySelector("#progressBar");
const invoiceList = document.querySelector("#invoiceList");
const upcomingList = document.querySelector("#upcomingList");
const categoryList = document.querySelector("#categoryList");
const toggleCategories = document.querySelector("#toggleCategories");
const clearMonth = document.querySelector("#clearMonth");
const filterButtons = document.querySelectorAll("[data-filter]");
const activeFilters = document.querySelector("#activeFilters");
const installmentsRow = document.querySelector("#installmentsRow");
const installmentsInput = document.querySelector("#installments");
const currentInstallmentInput = document.querySelector("#currentInstallment");
const cardField = document.querySelector("#cardField");
const cardChoices = document.querySelector("#cardChoices");
const cardList = document.querySelector("#cardList");
const exportBackup = document.querySelector("#exportBackup");
const exportPdf = document.querySelector("#exportPdf");
const pdfMonthLabel = document.querySelector("#pdfMonthLabel");
const themeRadios = document.querySelectorAll('input[name="theme"]');
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
const searchInput = document.querySelector("#searchInput");
const submitEntry = document.querySelector("#submitEntry");
const categoryOptions = document.querySelector("#categoryOptions");
const addCard = document.querySelector("#addCard");
const actionDialog = document.querySelector("#actionDialog");
const cardDialog = document.querySelector("#cardDialog");
const cardForm = document.querySelector("#cardForm");
const cardError = document.querySelector("#cardError");
const limitDialog = document.querySelector("#limitDialog");
const limitForm = document.querySelector("#limitForm");
const limitInput = document.querySelector("#limitInput");
const limitError = document.querySelector("#limitError");
const confirmDialog = document.querySelector("#confirmDialog");
const toast = document.querySelector("#toast");
const goalCard = document.querySelector("#goalCard");
const goalDialog = document.querySelector("#goalDialog");
const goalForm = document.querySelector("#goalForm");
const goalInput = document.querySelector("#goalInput");
const goalReasonInput = document.querySelector("#goalReasonInput");
const goalError = document.querySelector("#goalError");
const goalHint = document.querySelector("#goalHint");
const toastText = document.querySelector("#toastText");
const toastAction = document.querySelector("#toastAction");

const views = ["mes", "lancamentos", "cartoes", "ajustes"];
const CATEGORY_PREVIEW = 5;

let entries = [];
let cardSettings = [];
let categoryLimits = {};
let activeFilter = "all";
let searchQuery = "";
let editEntryId = null;
let categoryFilter = "";
let cardFilter = "";
let showAllCategories = false;
let actionTarget = null;
let editingCardId = null;
let limitCategory = "";
let limitsInDatabase = false;
let settings = { savingsGoal: 0, savingsGoalReason: "" };
let settingsInDatabase = false;
let toastTimer = null;

async function initApp() {
  monthInput.value = getCurrentMonth();
  syncThemeRadios();
  categoryLimits = loadCategoryLimits();
  settings = loadLocalSettings();
  setView(getViewFromHash());

  entryList.setAttribute("aria-busy", "true");
  entryList.innerHTML = `<li class="empty">Carregando seus lançamentos…</li>`;

  const [loadedEntries, loadedCards, loadedLimits, loadedSettings] = await Promise.all([
    dbLoadEntries(),
    dbLoadCards(),
    dbLoadCategoryLimits(),
    dbLoadSettings(),
  ]);

  entries = normalizeEntries(loadedEntries);
  cardSettings = normalizeCardSettings(loadedCards.length ? loadedCards : defaultCards);
  categoryLimits = await syncCategoryLimits(loadedLimits);
  settings = await syncSettings(loadedSettings);
  await migrateCreditPaidKeys();

  entryList.removeAttribute("aria-busy");
  renderDatalists();
  render();
}

/* ---------- Navegação ---------- */

function getViewFromHash() {
  const view = location.hash.replace("#", "");
  return views.includes(view) ? view : "mes";
}

function setView(view) {
  document.querySelectorAll("[data-view]").forEach((section) => {
    section.hidden = section.dataset.view !== view;
  });
  document.querySelectorAll("[data-view-link]").forEach((link) => {
    if (link.dataset.viewLink === view) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
  window.scrollTo(0, 0);
}

function goTo(view) {
  if (location.hash === `#${view}`) {
    setView(view);
  } else {
    location.hash = view;
  }
}

window.addEventListener("hashchange", () => setView(getViewFromHash()));

prevMonth.addEventListener("click", () => {
  monthInput.value = shiftMonth(monthInput.value, -1);
  render();
});

nextMonth.addEventListener("click", () => {
  monthInput.value = shiftMonth(monthInput.value, 1);
  render();
});

monthInput.addEventListener("click", () => {
  try {
    monthInput.showPicker?.();
  } catch {
    // Alguns navegadores não permitem abrir o seletor por script
  }
});

monthInput.addEventListener("change", () => {
  if (!monthInput.value) {
    monthInput.value = getCurrentMonth();
  }
  render();
});

/* ---------- Diálogos genéricos ---------- */

document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-close-dialog]")) {
      dialog.close();
    }
  });
});

function askConfirm({ title, message = "", confirmLabel = "Confirmar", danger = false }) {
  document.querySelector("#confirmTitle").textContent = title;
  document.querySelector("#confirmMessage").textContent = message;
  const okButton = document.querySelector("#confirmOk");
  okButton.textContent = confirmLabel;
  okButton.classList.toggle("button-danger", danger);
  okButton.classList.toggle("button-primary", !danger);
  confirmDialog.returnValue = "";

  return new Promise((resolve) => {
    const onOk = () => confirmDialog.close("ok");
    const onCancel = () => confirmDialog.close("cancel");
    const onClose = () => {
      okButton.removeEventListener("click", onOk);
      document.querySelector("#confirmCancel").removeEventListener("click", onCancel);
      resolve(confirmDialog.returnValue === "ok");
    };

    okButton.addEventListener("click", onOk);
    document.querySelector("#confirmCancel").addEventListener("click", onCancel);
    confirmDialog.addEventListener("close", onClose, { once: true });
    confirmDialog.showModal();
  });
}

function showToast(text, action) {
  clearTimeout(toastTimer);
  toastText.textContent = text;
  toastAction.hidden = !action;
  toastAction.onclick = null;

  if (action) {
    toastAction.textContent = action.label;
    toastAction.onclick = () => {
      toast.hidden = true;
      action.onClick();
    };
  }

  toast.hidden = false;
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, action ? 7000 : 3500);
}

/* ---------- Formulário de lançamento ---------- */

document.querySelector("#openEntry").addEventListener("click", () => openEntryDialog());
document.querySelector("#openEntryDesktop").addEventListener("click", () => openEntryDialog());

function openEntryDialog() {
  resetForm();

  if (monthInput.value === getCurrentMonth()) {
    form.elements.dueDate.value = getToday();
  }

  updateEntryHint();
  entryDialog.showModal();
  form.elements.amount.focus();
}

form.addEventListener("change", (event) => {
  const { name } = event.target;

  if (name === "type") {
    syncCardField();
  }

  if (name === "repeat") {
    syncInstallmentsField();
  }

  updateEntryHint();
});

form.addEventListener("input", () => {
  entryError.hidden = true;
  updateEntryHint();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const entry = getEntryFromForm();

  if (!entry) {
    return;
  }

  const isEditing = Boolean(editEntryId);
  let savedId = editEntryId;

  if (isEditing) {
    const existing = entries.find((item) => item.id === editEntryId);

    if (!existing) {
      showFormError("Não encontrei esse lançamento para editar. Recarregue a página e tente de novo.");
      return;
    }

    entries = entries.map((item) =>
      item.id === editEntryId
        ? {
            ...entry,
            id: editEntryId,
            createdAt: existing.createdAt,
            paidMonths: withInvoiceMarker(entry, existing.paidMonths || []),
          }
        : item,
    );
  } else {
    savedId = crypto.randomUUID();
    entries.push({
      ...entry,
      id: savedId,
      paidMonths: withInvoiceMarker(entry, []),
      createdAt: new Date().toISOString(),
    });
  }

  submitEntry.disabled = true;
  await dbSaveEntry(entries.find((item) => item.id === savedId));
  submitEntry.disabled = false;
  entryDialog.close();
  renderDatalists();

  if (isEditing) {
    clearListFilters();
    showToast("Alterações salvas");
  } else {
    const referenceMonth = entry.dueDate ? entry.dueDate.slice(0, 7) : monthInput.value;
    const targetMonth = shiftMonth(referenceMonth, getCreditMonthShift(entry));

    if (targetMonth !== monthInput.value) {
      showToast(
        entry.type === "credit"
          ? `Entrou na fatura de ${getMonthName(targetMonth)}`
          : `Adicionado em ${getMonthName(targetMonth)}`,
        {
          label: "Ver",
          onClick: () => {
            monthInput.value = targetMonth;
            render();
          },
        },
      );
    } else {
      showToast("Lançamento adicionado");
    }
  }

  resetForm();
  render();
});

function getEntryFromForm() {
  const formData = new FormData(form);
  const amount = Number(formData.get("amount"));
  const description = String(formData.get("description") || "").trim();

  if (!amount || amount <= 0) {
    showFormError("Informe um valor maior que zero.");
    form.elements.amount.focus();
    return null;
  }

  if (!description) {
    showFormError("Dê um nome para o lançamento.");
    form.elements.description.focus();
    return null;
  }

  const repeat = formData.get("repeat");
  const installments = getInstallments(formData);
  const currentInstallment = getCurrentInstallment(formData);

  if (repeat === "installment" && currentInstallment > installments) {
    showFormError("A parcela atual não pode ser maior que o total de parcelas.");
    return null;
  }

  return {
    startMonth: getEntryStartMonth(formData.get("dueDate"), currentInstallment, repeat),
    description,
    amount,
    type: formData.get("type"),
    cardName: getCardName(formData),
    category: String(formData.get("category") || "").trim(),
    dueDate: formData.get("dueDate"),
    repeat,
    installments,
  };
}

function showFormError(message) {
  entryError.textContent = message;
  entryError.hidden = false;
}

function updateEntryHint() {
  const type = getRadioValue(form, "type");
  const repeat = getRadioValue(form, "repeat");
  const date = form.elements.dueDate.value;
  const cardName = getRadioValue(form, "cardName");
  const hints = [];

  amountLabel.textContent = repeat === "installment" ? "Valor da parcela" : "Valor";

  if (repeat === "installment") {
    const total = Math.max(Number(installmentsInput.value) || 2, 2);
    const current = Math.max(Number(currentInstallmentInput.value) || 1, 1);
    const amount = Number(form.elements.amount.value) || 0;
    const remaining = Math.max(total - current + 1, 0);
    hints.push(
      amount
        ? `Parcela ${current} de ${total}. Faltam ${remaining}, ${currency.format(amount * remaining)} no total.`
        : `Parcela ${current} de ${total}.`,
    );
  }

  if (repeat === "fixed") {
    const start = date ? date.slice(0, 7) : monthInput.value;
    hints.push(`Aparece todo mês a partir de ${getMonthName(start)}.`);
  }

  if (type === "credit" && cardName && date) {
    const card = getCardConfig(cardName);
    const dueMonth = shiftMonth(
      date.slice(0, 7),
      getCreditMonthShift({ type: "credit", cardName, dueDate: date }),
    );
    hints.push(`Vai para a fatura do ${cardName} que vence em ${card.dueDay} de ${getMonthName(dueMonth)}.`);
  }

  entryHint.textContent = hints.join(" ");
  entryHint.hidden = !hints.length;
  updateGoalHint(type, repeat, date, cardName);
}

// Lembra da meta antes de salvar um gasto que deixa a sobra abaixo dela
function updateGoalHint(type, repeat, date, cardName) {
  const amount = Number(form.elements.amount.value) || 0;
  goalHint.hidden = true;

  if (!settings.savingsGoal || editEntryId || type === "income" || !amount) {
    return;
  }

  const shift = getCreditMonthShift({ type, cardName, dueDate: date });
  const month = shiftMonth(date ? date.slice(0, 7) : monthInput.value, shift);
  const before = getMonthBalance(month);
  const after = before - amount;

  if (after >= settings.savingsGoal) {
    return;
  }

  const monthName = getMonthName(month);
  goalHint.textContent =
    before >= settings.savingsGoal
      ? `Com esse gasto, ${monthName} fica ${currency.format(settings.savingsGoal - after)} abaixo da meta de guardar ${currency.format(settings.savingsGoal)}.`
      : `${capitalize(monthName)} já está abaixo da meta. Esse gasto aumenta a diferença para ${currency.format(settings.savingsGoal - after)}.`;
  if (repeat !== "once") {
    goalHint.textContent += " E ele se repete nos próximos meses.";
  }
  goalHint.hidden = false;
}

function getMonthBalance(month) {
  const monthEntries = getEntriesForMonth(month);
  return sumByType(monthEntries, "income") - getTotalSpent(monthEntries);
}

function renderCardChoices(selectedName = "") {
  const activeNames = getSortedCardSettings()
    .filter((card) => card.active)
    .map((card) => card.name);
  const names = [...new Set([...activeNames, selectedName].filter(Boolean))];
  const checkedName = selectedName || names[0] || "";

  if (!names.length) {
    cardChoices.innerHTML = `<p class="muted-text">Cadastre um cartão na aba Cartões.</p>`;
    return;
  }

  cardChoices.innerHTML = names
    .map((name) => {
      const card = getCardConfig(name);
      return `
        <label class="chip chip-radio">
          <input type="radio" name="cardName" value="${escapeHtml(name)}" ${name === checkedName ? "checked" : ""} />
          <span class="dot" style="--dot: ${escapeHtml(card.color)}"></span>${escapeHtml(name)}
        </label>`;
    })
    .join("");
}

/* ---------- Lista: filtros e ações ---------- */

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setFilter(button.dataset.filter);
    render();
  });
});

function setFilter(filter) {
  activeFilter = filter;
  filterButtons.forEach((item) =>
    item.classList.toggle("is-active", item.dataset.filter === filter),
  );
}

document.querySelectorAll("[data-quick-filter]").forEach((link) => {
  link.addEventListener("click", () => {
    setFilter(link.dataset.quickFilter);
    render();
  });
});

activeFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-clear]");

  if (!button) {
    return;
  }

  if (button.dataset.clear === "card") {
    cardFilter = "";
  } else {
    categoryFilter = "";
  }

  render();
});

document.querySelector(".views").addEventListener("click", async (event) => {
  const action = event.target.closest("[data-action]");

  if (!action) {
    return;
  }

  const { id, action: actionName, paidKey } = action.dataset;

  if (actionName === "paid") {
    await togglePaid(id, paidKey);
  }

  if (actionName === "open") {
    openActionDialog(id);
  }

  if (actionName === "pay-card") {
    await markCardEntriesAsPaid(action.dataset.card);
  }

  if (actionName === "unpay-card") {
    await markCardEntriesAsUnpaid(action.dataset.card);
  }

  if (actionName === "card-entries") {
    cardFilter = action.dataset.card;
    categoryFilter = "";
    setFilter("all");
    render();
    goTo("lancamentos");
  }

  if (actionName === "category") {
    openLimitDialog(action.dataset.category);
  }

  if (actionName === "edit-card") {
    openCardDialog(action.dataset.cardId);
  }

  if (actionName === "goal") {
    openGoalDialog();
  }
});

async function togglePaid(id, paidKey) {
  entries = entries.map((entry) => (entry.id === id ? togglePaidOccurrence(entry, paidKey) : entry));
  render();
  await dbSaveEntry(entries.find((entry) => entry.id === id));
}

function openActionDialog(id) {
  const entry = entries.find((item) => item.id === id);
  const occurrence = entry && getOccurrenceForMonth(entry, monthInput.value)[0];

  if (!occurrence) {
    return;
  }

  actionTarget = occurrence;
  document.querySelector("#actionTitle").textContent = occurrence.description;
  document.querySelector("#actionMeta").textContent = [
    occurrence.occurrenceDate ? formatDate(occurrence.occurrenceDate) : "",
    getEntryMeta(occurrence),
  ]
    .filter(Boolean)
    .join(" · ");
  document.querySelector("#actionAmount").textContent =
    `${occurrence.type === "income" ? "+ " : ""}${currency.format(occurrence.amount)}`;

  const paidButton = document.querySelector("#actionPaid");
  paidButton.hidden = occurrence.type === "income";
  paidButton.textContent = occurrence.isPaid ? "Desfazer pagamento" : "Marcar como pago";
  actionDialog.showModal();
}

document.querySelector("#actionPaid").addEventListener("click", async () => {
  actionDialog.close();
  await togglePaid(actionTarget.id, actionTarget.paidKey);
});

document.querySelector("#actionEdit").addEventListener("click", () => {
  actionDialog.close();
  startEdit(actionTarget.id);
});

document.querySelector("#actionDuplicate").addEventListener("click", async () => {
  actionDialog.close();
  await duplicateEntry(actionTarget.id);
  render();
  showToast("Lançamento duplicado");
});

document.querySelector("#actionDelete").addEventListener("click", async () => {
  const target = actionTarget;
  actionDialog.close();

  const isRecurring = target.repeat === "fixed" || target.repeat === "installment";
  const confirmed = await askConfirm({
    title: `Excluir "${target.description}"?`,
    message: isRecurring
      ? "Isso remove o lançamento de todos os meses, não só deste."
      : "Essa ação não pode ser desfeita.",
    confirmLabel: "Excluir",
    danger: true,
  });

  if (!confirmed) {
    return;
  }

  entries = entries.filter((entry) => entry.id !== target.id);
  render();
  await dbDeleteEntry(target.id);
  showToast("Lançamento excluído");
});

/* ---------- Categorias ---------- */

toggleCategories.addEventListener("click", () => {
  showAllCategories = !showAllCategories;
  render();
});

function openLimitDialog(category) {
  const total = getCategoryTotals(getMonthEntries()).find(([name]) => name === category)?.[1] || 0;
  const limit = categoryLimits[category];

  limitCategory = category;
  limitError.hidden = true;
  document.querySelector("#limitTitle").textContent = category;
  document.querySelector("#limitMeta").textContent =
    `${currency.format(total)} em ${getMonthName(monthInput.value)}`;
  limitInput.value = limit ? String(limit) : "";
  limitDialog.showModal();
}

limitForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const trimmed = limitInput.value.trim();
  const category = limitCategory;
  const value = trimmed ? Number(trimmed.replace(",", ".")) : null;

  if (value !== null && (!Number.isFinite(value) || value <= 0)) {
    limitError.textContent = "Informe um valor maior que zero, ou deixe vazio para tirar o limite.";
    limitError.hidden = false;
    return;
  }

  if (value === null) {
    delete categoryLimits[category];
  } else {
    categoryLimits[category] = value;
  }

  limitDialog.close();
  render();

  if (!limitsInDatabase) {
    saveCategoryLimits();
    return;
  }

  const saved =
    value === null ? await dbDeleteCategoryLimit(category) : await dbSaveCategoryLimit(category, value);

  if (!saved) {
    showToast("Não consegui salvar o limite. Confira a conexão e tente de novo.");
  }
});

document.querySelector("#showCategoryEntries").addEventListener("click", () => {
  limitDialog.close();
  categoryFilter = limitCategory;
  cardFilter = "";
  setFilter("all");
  render();
  goTo("lancamentos");
});

/* ---------- Cartões ---------- */

addCard.addEventListener("click", () => openCardDialog(null));

function openCardDialog(cardId) {
  const card = cardSettings.find((item) => item.id === cardId);
  const nextNumber = cardSettings.length + 1;

  editingCardId = card ? card.id : null;
  cardError.hidden = true;
  document.querySelector("#cardDialogTitle").textContent = card ? "Editar cartão" : "Novo cartão";
  document.querySelector("#cardNameInput").value = card ? card.name : "";
  document.querySelector("#cardColorInput").value = card
    ? card.color
    : cardColorPalette[(nextNumber - 1) % cardColorPalette.length];
  document.querySelector("#cardClosingInput").value = card ? card.closingDay : 25;
  document.querySelector("#cardDueInput").value = card ? card.dueDay : 5;
  document.querySelector("#cardActiveInput").checked = card ? card.active : true;
  document.querySelector("#removeCard").hidden = !card;
  cardDialog.showModal();
}

cardForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.querySelector("#cardNameInput").value.trim();
  const previous = cardSettings.find((card) => card.id === editingCardId);

  if (!name) {
    showCardError("Dê um nome para o cartão.");
    return;
  }

  if (cardSettings.some((card) => card.id !== editingCardId && card.name === name)) {
    showCardError("Já existe um cartão com esse nome.");
    return;
  }

  const card = {
    id: editingCardId || crypto.randomUUID(),
    name,
    color: normalizeCardColor(document.querySelector("#cardColorInput").value),
    closingDay: clampDay(document.querySelector("#cardClosingInput").value),
    dueDay: clampDay(document.querySelector("#cardDueInput").value),
    active: document.querySelector("#cardActiveInput").checked,
  };

  cardSettings = previous
    ? cardSettings.map((item) => (item.id === card.id ? card : item))
    : [...cardSettings, card];

  // Lançamentos guardam o nome do cartão: ao renomear, leva o histórico junto
  const renamedEntries =
    previous && previous.name !== name
      ? entries.filter((entry) => entry.cardName === previous.name)
      : [];

  if (renamedEntries.length) {
    entries = entries.map((entry) =>
      entry.cardName === previous.name ? { ...entry, cardName: name } : entry,
    );
  }

  cardDialog.close();
  renderDatalists();
  render();

  await dbSaveCard(card);
  await saveEntries(entries.filter((entry) => renamedEntries.some((old) => old.id === entry.id)));
  showToast(previous ? "Cartão atualizado" : "Cartão adicionado");
});

document.querySelector("#removeCard").addEventListener("click", async () => {
  const card = cardSettings.find((item) => item.id === editingCardId);

  if (!card) {
    return;
  }

  if (entries.some((entry) => entry.cardName === card.name)) {
    showCardError(
      "Esse cartão tem lançamentos. Para manter o histórico, desmarque “Em uso” em vez de remover.",
    );
    return;
  }

  cardDialog.close();

  const confirmed = await askConfirm({
    title: `Remover ${card.name}?`,
    confirmLabel: "Remover",
    danger: true,
  });

  if (!confirmed) {
    return;
  }

  cardSettings = cardSettings.filter((item) => item.id !== card.id);
  renderDatalists();
  render();
  await dbDeleteCard(card.id);
  showToast("Cartão removido");
});

function showCardError(message) {
  cardError.textContent = message;
  cardError.hidden = false;
}

/* ---------- Meta de economia ---------- */

function openGoalDialog() {
  goalError.hidden = true;
  goalInput.value = settings.savingsGoal ? String(settings.savingsGoal) : "";
  goalReasonInput.value = settings.savingsGoalReason || "";
  document.querySelector("#removeGoal").hidden = !settings.savingsGoal;
  goalDialog.showModal();
  goalInput.focus();
}

goalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = Number(goalInput.value.trim().replace(",", "."));

  if (!Number.isFinite(value) || value <= 0) {
    goalError.textContent = "Informe quanto querem guardar por mês, maior que zero.";
    goalError.hidden = false;
    return;
  }

  await saveSettings({ savingsGoal: value, savingsGoalReason: goalReasonInput.value.trim() });
  goalDialog.close();
  showToast("Meta salva");
});

document.querySelector("#removeGoal").addEventListener("click", async () => {
  goalDialog.close();
  await saveSettings({ savingsGoal: 0, savingsGoalReason: "" });
  showToast("Meta removida");
});

async function saveSettings(nextSettings) {
  settings = nextSettings;
  render();

  if (!settingsInDatabase) {
    saveLocalSettings();
    return;
  }

  if (!(await dbSaveSettings(settings))) {
    showToast("Não consegui salvar a meta. Confira a conexão e tente de novo.");
  }
}

/* ---------- Ajustes ---------- */

exportBackup.addEventListener("click", downloadBackup);
exportPdf.addEventListener("click", exportMonthPdf);

themeRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    saveTheme(radio.value);
    applyTheme(radio.value);
  });
});

systemTheme.addEventListener("change", () => {
  if (loadTheme() === "system") {
    applyTheme("system");
  }
});

function syncThemeRadios() {
  const theme = loadTheme();
  themeRadios.forEach((radio) => {
    radio.checked = radio.value === theme;
  });
}

clearMonth.addEventListener("click", async () => {
  const removableEntries = entries.filter(
    (entry) => entry.repeat === "once" && getOccurrenceForMonth(entry, monthInput.value).length,
  );

  if (!removableEntries.length) {
    showToast(`Não há lançamentos únicos em ${getMonthName(monthInput.value)}`);
    return;
  }

  const confirmed = await askConfirm({
    title: `Apagar ${removableEntries.length} lançamento${removableEntries.length === 1 ? "" : "s"} único${removableEntries.length === 1 ? "" : "s"}?`,
    message: `Só os lançamentos de ${getMonthName(monthInput.value)} que não se repetem. Contas fixas e parceladas ficam.`,
    confirmLabel: "Apagar",
    danger: true,
  });

  if (!confirmed) {
    return;
  }

  const removableIds = removableEntries.map((entry) => entry.id);
  entries = entries.filter((entry) => !removableIds.includes(entry.id));
  render();
  await Promise.all(removableIds.map((id) => dbDeleteEntry(id)));
  showToast("Lançamentos apagados");
});

/* ---------- Renderização ---------- */

function render() {
  const monthEntries = getMonthEntries();
  const income = sumByType(monthEntries, "income");
  const totalSpent = getTotalSpent(monthEntries);
  const paidTotal = monthEntries
    .filter((entry) => entry.type !== "income" && entry.isPaid)
    .reduce((total, entry) => total + Number(entry.amount), 0);
  const pendingTotal = Math.max(totalSpent - paidTotal, 0);
  const monthBalance = income - totalSpent;
  const percent = income > 0 ? Math.min((totalSpent / income) * 100, 100) : 0;

  monthLabel.textContent = capitalize(getMonthLabel(monthInput.value));
  pdfMonthLabel.textContent = capitalize(getMonthLabel(monthInput.value));

  balance.textContent = currency.format(monthBalance);
  balance.classList.toggle("is-negative", monthBalance < 0);
  totalIncome.textContent = currency.format(income);
  totalExpenses.textContent = currency.format(totalSpent);
  paidTotalText.textContent = currency.format(paidTotal);
  pendingTotalText.textContent = currency.format(pendingTotal);
  progressBar.style.width = `${percent}%`;
  progressBar.dataset.level = percent > 90 ? "high" : percent > 70 ? "mid" : "low";
  spentPercent.textContent =
    income > 0
      ? `${Math.round((totalSpent / income) * 100)}% das entradas já tem destino`
      : "Lance as entradas do mês para ver quanto sobra";

  renderGoal(monthBalance, income);
  renderComparison(monthEntries);
  renderInvoices(monthEntries);
  renderUpcoming(monthEntries);
  renderCategories(monthEntries);
  renderEntries(monthEntries);
  renderCards(monthEntries);
}

function renderGoal(monthBalance, income) {
  const goal = settings.savingsGoal;
  const reason = settings.savingsGoalReason;
  const settingsTitle = document.querySelector("#goalSettingsTitle");
  const settingsMeta = document.querySelector("#goalSettingsMeta");
  const goalBar = document.querySelector("#goalBar");
  const goalStatus = document.querySelector("#goalStatus");

  settingsTitle.textContent = goal ? `Guardar ${currency.format(goal)} por mês` : "Definir meta";
  settingsMeta.textContent = goal
    ? reason || "Sem motivo definido"
    : "Um valor para guardar todo mês, lembrado na tela Mês";

  if (!goal) {
    goalCard.dataset.state = "empty";
    document.querySelector("#goalTitle").textContent = "Quanto vocês querem guardar por mês?";
    document.querySelector("#goalAmount").textContent = "Definir meta";
    goalBar.style.width = "0%";
    goalStatus.textContent = "Uma meta ajuda a lembrar de guardar antes de gastar.";
    return;
  }

  const ratio = Math.max(monthBalance, 0) / goal;
  const free = monthBalance - goal;

  document.querySelector("#goalTitle").textContent = reason || "Meta de economia";
  document.querySelector("#goalAmount").textContent = `${currency.format(goal)}/mês`;
  goalBar.style.width = `${Math.min(ratio * 100, 100)}%`;

  if (!income) {
    goalCard.dataset.state = "pending";
    goalBar.dataset.level = "none";
    goalStatus.textContent = "Lance as entradas do mês para ver se a meta cabe.";
  } else if (free >= 0) {
    goalCard.dataset.state = "ok";
    goalBar.dataset.level = "ok";
    goalStatus.textContent = `Dá para guardar a meta. Depois disso, ainda ficam ${currency.format(free)} livres para gastar.`;
  } else if (monthBalance > 0) {
    goalCard.dataset.state = "short";
    goalBar.dataset.level = "mid";
    goalStatus.textContent = `Faltam ${currency.format(-free)} para guardar a meta este mês.`;
  } else {
    goalCard.dataset.state = "miss";
    goalBar.dataset.level = "high";
    goalStatus.textContent = `Este mês não sobra nada para guardar. A meta precisa de ${currency.format(goal)}.`;
  }
}

function renderComparison(monthEntries) {
  const previousMonth = shiftMonth(monthInput.value, -1);
  const previousSpent = getTotalSpent(getEntriesForMonth(previousMonth));
  const spentDiff = getTotalSpent(monthEntries) - previousSpent;
  const previousName = getMonthName(previousMonth);

  if (!previousSpent) {
    comparison.textContent = "";
    return;
  }

  comparison.textContent =
    spentDiff === 0
      ? `Mesmo gasto de ${previousName}`
      : `Gastos ${currency.format(Math.abs(spentDiff))} ${spentDiff > 0 ? "acima" : "abaixo"} de ${previousName}`;
  comparison.dataset.trend = spentDiff > 0 ? "up" : "down";
}

function renderInvoices(monthEntries) {
  const cards = getCreditCardTotals(monthEntries);
  const creditEntries = monthEntries.filter((entry) => entry.type === "credit");

  creditTotal.textContent = cards.length ? currency.format(sumByType(monthEntries, "credit")) : "";

  if (!cards.length) {
    invoiceList.innerHTML = `<li class="empty">Nenhuma compra no cartão em ${getMonthName(monthInput.value)}.</li>`;
    return;
  }

  invoiceList.innerHTML = cards
    .map(([cardName, total]) => {
      const card = getCardConfig(cardName);
      const cardEntries = creditEntries.filter(
        (entry) => (entry.cardName || "Cartão não informado") === cardName,
      );
      const unpaidCount = cardEntries.filter((entry) => !entry.isPaid).length;
      const isPaid = unpaidCount === 0;

      return `
        <li class="row">
          <button class="row-main row-link" type="button" data-action="card-entries" data-card="${escapeHtml(cardName)}">
            <strong><span class="dot" style="--dot: ${escapeHtml(card.color)}"></span>${escapeHtml(cardName)}</strong>
            <small>Vence dia ${card.dueDay} · ${cardEntries.length} compra${cardEntries.length === 1 ? "" : "s"}</small>
          </button>
          <span class="row-value">${currency.format(total)}</span>
          ${
            isPaid
              ? `<button class="pill pill-paid" type="button" data-action="unpay-card" data-card="${escapeHtml(cardName)}" title="Desfazer pagamento">Paga</button>`
              : `<button class="pill" type="button" data-action="pay-card" data-card="${escapeHtml(cardName)}">Pagar</button>`
          }
        </li>`;
    })
    .join("");
}

function renderUpcoming(monthEntries) {
  const pending = monthEntries
    .filter((entry) => entry.type !== "income" && entry.type !== "credit" && !entry.isPaid)
    .sort((a, b) =>
      (a.occurrenceDate || "9999-12-31").localeCompare(b.occurrenceDate || "9999-12-31"),
    );

  if (!pending.length) {
    const hasBills = monthEntries.some((entry) => entry.type === "bill" || entry.type === "expense");
    upcomingList.innerHTML = `<li class="empty">${hasBills ? "Tudo pago neste mês." : "Nenhuma conta lançada neste mês."}</li>`;
    return;
  }

  upcomingList.innerHTML = pending
    .slice(0, 4)
    .map(
      (entry) => `
        <li class="row">
          ${getCheckButton(entry)}
          <button class="row-main row-link" type="button" data-action="open" data-id="${entry.id}">
            <strong>${escapeHtml(entry.description)}</strong>
            <small>${entry.occurrenceDate ? `Vence ${formatShortDate(entry.occurrenceDate)}` : "Sem data"}${entry.category ? ` · ${escapeHtml(entry.category)}` : ""}</small>
          </button>
          <span class="row-value">${currency.format(entry.amount)}</span>
        </li>`,
    )
    .join("");

  if (pending.length > 4) {
    upcomingList.innerHTML += `<li class="row-more">e mais ${pending.length - 4}</li>`;
  }
}

function renderCategories(monthEntries) {
  const categories = getCategoryTotals(monthEntries);

  if (!categories.length) {
    categoryList.innerHTML = `<li class="empty">Os gastos do mês aparecem aqui, separados por categoria.</li>`;
    toggleCategories.hidden = true;
    return;
  }

  const maxTotal = categories[0][1] || 1;
  const visible = showAllCategories ? categories : categories.slice(0, CATEGORY_PREVIEW);

  categoryList.innerHTML = visible
    .map(([category, total]) => {
      const limit = categoryLimits[category];
      const hasLimit = typeof limit === "number" && limit > 0;
      const ratio = hasLimit ? total / limit : total / maxTotal;
      const level = hasLimit ? (ratio > 1 ? "high" : ratio >= 0.8 ? "mid" : "low") : "none";

      return `
        <li>
          <button class="category" type="button" data-action="category" data-category="${escapeHtml(category)}">
            <span class="category-head">
              <span>${escapeHtml(category)}</span>
              <span class="category-value">
                ${currency.format(total)}${hasLimit ? `<small> / ${currency.format(limit)}</small>` : ""}
              </span>
            </span>
            <span class="bar"><span class="bar-fill" data-level="${level}" style="width: ${Math.min(ratio * 100, 100)}%"></span></span>
            ${hasLimit && ratio > 1 ? `<small class="danger-text">Passou ${currency.format(total - limit)} do limite</small>` : ""}
          </button>
        </li>`;
    })
    .join("");

  toggleCategories.hidden = categories.length <= CATEGORY_PREVIEW;
  toggleCategories.textContent = showAllCategories
    ? "Mostrar menos"
    : `Ver todas as ${categories.length} categorias`;
}

function renderEntries(monthEntries) {
  if (cardFilter && !monthEntries.some((entry) => entry.cardName === cardFilter)) {
    cardFilter = "";
  }

  const visibleEntries = getVisibleEntries(monthEntries);
  renderActiveFilters();
  entryCount.textContent = getEntryCountText(monthEntries.length, visibleEntries.length);

  if (!visibleEntries.length) {
    entryList.innerHTML = monthEntries.length
      ? `<li class="empty">Nada encontrado com esses filtros.</li>`
      : `<li class="empty"><strong>Seu mês está em branco.</strong> Comece pelas entradas e pelas contas fixas, no botão +.</li>`;
    return;
  }

  const sortedEntries = [...visibleEntries].sort((a, b) =>
    (a.occurrenceDate || "9999-12-31").localeCompare(b.occurrenceDate || "9999-12-31"),
  );

  let lastDateKey = null;
  let html = "";

  sortedEntries.forEach((entry) => {
    const dateKey = entry.occurrenceDate || "sem-data";

    if (dateKey !== lastDateKey) {
      lastDateKey = dateKey;
      html += `<li class="entry-date">${entry.occurrenceDate ? formatLongDate(entry.occurrenceDate) : "Sem data"}</li>`;
    }

    html += `
      <li class="entry ${entry.isPaid ? "is-paid" : ""}">
        ${getCheckButton(entry)}
        <button class="entry-main" type="button" data-action="open" data-id="${entry.id}">
          <strong>${escapeHtml(entry.description)}</strong>
          <small>${getEntryMetaHtml(entry)}</small>
        </button>
        <span class="entry-amount ${entry.type === "income" ? "is-income" : ""}">
          ${entry.type === "income" ? "+ " : ""}${currency.format(entry.amount)}
        </span>
      </li>`;
  });

  entryList.innerHTML = html;
}

function renderActiveFilters() {
  const chips = [];

  if (cardFilter) {
    chips.push(
      `<button class="chip is-active" type="button" data-clear="card">${escapeHtml(cardFilter)}<svg class="icon icon-sm"><use href="#i-x" /></svg></button>`,
    );
  }

  if (categoryFilter) {
    chips.push(
      `<button class="chip is-active" type="button" data-clear="category">${escapeHtml(categoryFilter)}<svg class="icon icon-sm"><use href="#i-x" /></svg></button>`,
    );
  }

  activeFilters.innerHTML = chips.join("");
  activeFilters.hidden = !chips.length;
}

function renderCards(monthEntries) {
  const creditEntries = monthEntries.filter((entry) => entry.type === "credit");
  const cards = getSortedCardSettings();

  if (!cards.length) {
    cardList.innerHTML = `<p class="empty">Cadastre seus cartões com o dia de fechamento e de vencimento para o app calcular cada fatura.</p>`;
    return;
  }

  cardList.innerHTML = cards
    .map((card) => {
      const cardEntries = creditEntries.filter((entry) => entry.cardName === card.name);
      const total = cardEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
      const unpaidCount = cardEntries.filter((entry) => !entry.isPaid).length;
      const status = !cardEntries.length
        ? `<span class="pill pill-muted">Sem compras</span>`
        : unpaidCount
          ? `<button class="pill" type="button" data-action="pay-card" data-card="${escapeHtml(card.name)}">Pagar fatura</button>`
          : `<button class="pill pill-paid" type="button" data-action="unpay-card" data-card="${escapeHtml(card.name)}">Paga</button>`;

      return `
        <article class="credit-card ${card.active ? "" : "is-inactive"}" style="--card: ${escapeHtml(card.color)}">
          <div class="credit-card-top">
            <div>
              <h3>${escapeHtml(card.name)}</h3>
              <p>Fecha dia ${card.closingDay} · vence dia ${card.dueDay}${card.active ? "" : " · fora de uso"}</p>
            </div>
            <button class="button button-ghost button-small" type="button" data-action="edit-card" data-card-id="${card.id}">Editar</button>
          </div>
          <div class="credit-card-bottom">
            <div>
              <small>${capitalize(getMonthName(monthInput.value))}</small>
              <strong>${currency.format(total)}</strong>
            </div>
            <div class="credit-card-actions">
              ${cardEntries.length ? `<button class="link-button" type="button" data-action="card-entries" data-card="${escapeHtml(card.name)}">Ver compras</button>` : ""}
              ${status}
            </div>
          </div>
        </article>`;
    })
    .join("");
}

function getCheckButton(entry) {
  if (entry.type === "income") {
    return `<span class="check check-income" aria-hidden="true"><svg class="icon icon-sm"><use href="#i-in" /></svg></span>`;
  }

  const label = entry.isPaid ? "Desfazer pagamento" : "Marcar como pago";

  return `
    <button class="check ${entry.isPaid ? "is-checked" : ""}" type="button" data-action="paid" data-id="${entry.id}" data-paid-key="${entry.paidKey}" aria-label="${label}: ${escapeHtml(entry.description)}" title="${label}">
      <svg class="icon icon-sm"><use href="#i-check" /></svg>
    </button>`;
}

function getEntryMeta(entry) {
  const parts = [entry.type === "credit" ? entry.cardName || "Cartão" : typeLabels[entry.type]];

  if (entry.category) {
    parts.push(entry.category);
  }

  if (entry.repeat === "installment") {
    parts.push(`${entry.installmentNumber}/${entry.installments}`);
  } else if (entry.repeat === "fixed") {
    parts.push("todo mês");
  }

  if (entry.purchaseDate) {
    parts.push(`compra ${formatShortDate(entry.purchaseDate)}`);
  }

  return parts.join(" · ");
}

function getEntryMetaHtml(entry) {
  const meta = escapeHtml(getEntryMeta(entry));

  if (entry.type !== "credit") {
    return meta;
  }

  const card = getCardConfig(entry.cardName || "Cartão não informado");

  return `<span class="dot" style="--dot: ${escapeHtml(card.color)}"></span>${meta}`;
}

function renderDatalists() {
  const categories = [
    ...new Set([...defaultCategories, ...entries.map((entry) => entry.category).filter(Boolean)]),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  categoryOptions.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}"></option>`)
    .join("");
}

function getRadioValue(container, name) {
  return container.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function setRadioValue(container, name, value) {
  container.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.checked = input.value === value;
  });
}

function getToday() {
  const now = new Date();
  return `${getCurrentMonth()}-${String(now.getDate()).padStart(2, "0")}`;
}

function getMonthName(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const name = new Date(year, monthNumber - 1, 1).toLocaleDateString("pt-BR", { month: "long" });

  return year === new Date().getFullYear() ? name : `${name} de ${year}`;
}

function formatShortDate(date) {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

function formatLongDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  const label = new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  return capitalize(label.replaceAll(".", ""));
}

function capitalize(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
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
    showToast("O navegador bloqueou a janela do relatório. Libere pop-ups para este site.");
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
      : activeFilter === "pending"
        ? monthEntries.filter((entry) => entry.type !== "income" && !entry.isPaid)
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
  // Compras no cartão contam no mês em que a fatura vence, não no mês da compra
  const shift = entry.startMonth ? getCreditMonthShift(entry) : 0;
  const startMonth = shiftMonth(entry.startMonth || entry.month || selectedMonth, shift);
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

  const isCredit = entry.type === "credit";
  const monthDate = getOccurrenceDate(entry, shiftMonth(selectedMonth, -shift));
  // Parcelado ou à vista: a compra foi uma só; fixo: uma compra por mês
  const purchaseDate =
    repeat === "fixed" || !entry.startMonth ? monthDate : getOccurrenceDate(entry, entry.startMonth);
  const occurrenceDate = isCredit && entry.dueDate ? getCardDueDate(entry.cardName, selectedMonth) : monthDate;
  const installmentNumber = repeat === "installment" ? monthOffset + 1 : null;
  const paidKey = getPaidKey(selectedMonth, installmentNumber, repeat);

  return [
    {
      ...entry,
      occurrenceMonth: selectedMonth,
      occurrenceDate,
      purchaseDate: isCredit ? purchaseDate : "",
      installmentNumber,
      paidKey,
      isPaid: isEntryPaid(entry, paidKey),
      invoiceMonth: isCredit ? selectedMonth : "",
    },
  ];
}

// Quantos meses depois da compra a fatura vence: 0, 1 ou 2
function getCreditMonthShift(entry) {
  if (entry.type !== "credit" || !entry.dueDate) {
    return 0;
  }

  const card = getCardConfig(entry.cardName || "Cartão não informado");
  const day = Number(entry.dueDate.split("-")[2]);
  const closesNextMonth = day > card.closingDay ? 1 : 0;
  const dueAfterClosingMonth = card.dueDay <= card.closingDay ? 1 : 0;

  return closesNextMonth + dueAfterClosingMonth;
}

function getCardDueDate(cardName, month) {
  const card = getCardConfig(cardName || "Cartão não informado");
  const day = Math.min(card.dueDay, getLastDayOfMonth(month));

  return `${month}-${String(day).padStart(2, "0")}`;
}

// Marcador gravado em paidMonths: as chaves de pago dessa compra já usam o mês da fatura
const INVOICE_MONTH_MARKER = "invoice-month-v1";

function withInvoiceMarker(entry, paidMonths) {
  if (entry.type !== "credit" || paidMonths.includes(INVOICE_MONTH_MARKER)) {
    return paidMonths;
  }

  return [...paidMonths, INVOICE_MONTH_MARKER];
}

// Uma única vez por compra: leva as marcações de pago (que usavam o mês da compra)
// para o mês da fatura, e grava o marcador para não migrar de novo em outro aparelho
async function migrateCreditPaidKeys() {
  const pending = entries.filter(
    (entry) => entry.type === "credit" && !entry.paidMonths.includes(INVOICE_MONTH_MARKER),
  );

  if (!pending.length) {
    return;
  }

  const migrated = pending.map((entry) => {
    const shift = getCreditMonthShift(entry);
    const paidMonths = entry.paidMonths.map((key) => {
      const [month, ...rest] = key.split("::");

      return /^\d{4}-\d{2}$/.test(month) ? [shiftMonth(month, shift), ...rest].join("::") : key;
    });

    return { ...entry, paidMonths: [...paidMonths, INVOICE_MONTH_MARKER] };
  });

  entries = entries.map((entry) => migrated.find((item) => item.id === entry.id) || entry);
  await saveEntries(migrated);
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

  return String(formData.get("cardName") || "").trim() || "Cartão não informado";
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

  const count = `${targetEntries.length} lançamento${targetEntries.length === 1 ? "" : "s"}`;
  const confirmed = await askConfirm({
    title: shouldPay ? `Marcar fatura ${confirmLabel} como paga?` : `Desfazer pagamento ${confirmLabel}?`,
    message: shouldPay
      ? `${count} de ${getMonthName(monthInput.value)} ficam como pagos.`
      : `${count} de ${getMonthName(monthInput.value)} voltam para "a pagar".`,
    confirmLabel: shouldPay ? "Marcar como paga" : "Desfazer",
  });

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

  resetForm();
  editEntryId = id;
  form.elements.description.value = entry.description;
  form.elements.amount.value = entry.amount;
  setRadioValue(form, "type", entry.type);
  form.elements.category.value = entry.category || "";
  form.elements.dueDate.value = entry.dueDate || "";
  setRadioValue(form, "repeat", entry.repeat || "once");
  installmentsInput.value = entry.installments || 2;
  currentInstallmentInput.value =
    entry.repeat === "installment" && entry.dueDate
      ? Math.min(
          Math.max(getMonthOffset(entry.startMonth, entry.dueDate.slice(0, 7)) + 1, 1),
          entry.installments,
        )
      : occurrence?.installmentNumber || 1;
  renderCardChoices(entry.cardName || "");
  entryDialogTitle.textContent = "Editar lançamento";
  submitEntry.textContent = "Salvar";
  syncCardField();
  syncInstallmentsField();
  updateEntryHint();
  entryDialog.showModal();
}

async function duplicateEntry(id) {
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;
  const newEntry = {
    ...entry,
    id: crypto.randomUUID(),
    description: `${entry.description} (cópia)`,
    paidMonths: withInvoiceMarker(entry, []),
    createdAt: new Date().toISOString(),
  };
  entries.push(newEntry);
  await dbSaveEntry(newEntry);
}

function resetForm() {
  editEntryId = null;
  form.reset();
  setRadioValue(form, "type", "credit");
  setRadioValue(form, "repeat", "once");
  installmentsInput.value = "2";
  currentInstallmentInput.value = "1";
  entryDialogTitle.textContent = "Novo lançamento";
  submitEntry.textContent = "Adicionar";
  entryError.hidden = true;
  renderCardChoices();
  syncInstallmentsField();
  syncCardField();
}

function clearListFilters() {
  setFilter("all");
  cardFilter = "";
  categoryFilter = "";
  searchQuery = "";
  searchInput.value = "";
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
  installmentsRow.hidden = getRadioValue(form, "repeat") !== "installment";
}

function syncCardField() {
  cardField.hidden = getRadioValue(form, "type") !== "credit";
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

// Usa a tabela category_limits quando ela existe. Na primeira vez, leva para lá
// os limites que estavam salvos só neste aparelho.
async function syncCategoryLimits(remoteLimits) {
  const localLimits = loadCategoryLimits();

  if (remoteLimits === null) {
    limitsInDatabase = false;
    return localLimits;
  }

  limitsInDatabase = true;
  const missing = Object.entries(localLimits).filter(
    ([category, amount]) => !(category in remoteLimits) && Number(amount) > 0,
  );

  if (!missing.length) {
    localStorage.removeItem(CATEGORY_LIMITS_KEY);
    return remoteLimits;
  }

  const results = await Promise.all(
    missing.map(([category, amount]) => dbSaveCategoryLimit(category, Number(amount))),
  );

  if (results.every(Boolean)) {
    localStorage.removeItem(CATEGORY_LIMITS_KEY);
  }

  return { ...Object.fromEntries(missing.map(([c, a]) => [c, Number(a)])), ...remoteLimits };
}

const SETTINGS_KEY = "economize.settings.v1";

function loadLocalSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return {
      savingsGoal: Number(saved.savingsGoal) || 0,
      savingsGoalReason: String(saved.savingsGoalReason || ""),
    };
  } catch {
    return { savingsGoal: 0, savingsGoalReason: "" };
  }
}

function saveLocalSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Usa a tabela user_settings quando ela existe. Se a meta foi definida antes
// da tabela existir, leva ela para lá na primeira vez.
async function syncSettings(remoteSettings) {
  const localSettings = loadLocalSettings();

  if (remoteSettings === null) {
    settingsInDatabase = false;
    return localSettings;
  }

  settingsInDatabase = true;

  if (!remoteSettings.savingsGoal && localSettings.savingsGoal) {
    if (await dbSaveSettings(localSettings)) {
      localStorage.removeItem(SETTINGS_KEY);
    }
    return localSettings;
  }

  localStorage.removeItem(SETTINGS_KEY);
  return { savingsGoal: 0, savingsGoalReason: "", ...remoteSettings };
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
