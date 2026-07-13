// db.js — camada de acesso a dados via Supabase

async function dbLoadEntries() {
  const { data, error } = await supabaseClient
    .from("entries")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar entries:", error);
    return [];
  }

  // Converte snake_case do banco para camelCase do app
  return data.map(dbEntryToApp);
}

async function dbSaveEntry(entry) {
  const row = appEntryToDb(entry);
  const { error } = await supabaseClient.from("entries").upsert(row, { onConflict: "id" });

  if (error) console.error("Erro ao salvar entry:", error);
}

async function dbDeleteEntry(id) {
  const { error } = await supabaseClient.from("entries").delete().eq("id", id);

  if (error) console.error("Erro ao deletar entry:", error);
}

async function dbLoadCards() {
  const { data, error } = await supabaseClient
    .from("cards")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar cards:", error);
    return [];
  }

  return data.map(dbCardToApp);
}

async function dbSaveCard(card) {
  const row = appCardToDb(card);
  const { error } = await supabaseClient.from("cards").upsert(row, { onConflict: "id" });

  if (error) console.error("Erro ao salvar card:", error);
}

async function dbDeleteCard(id) {
  const { error } = await supabaseClient.from("cards").delete().eq("id", id);

  if (error) console.error("Erro ao deletar card:", error);
}

// Conversores banco → app (snake_case → camelCase)
function dbEntryToApp(row) {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    type: row.type,
    category: row.category || "",
    dueDate: row.due_date || "",
    startMonth: row.start_month,
    repeat: row.repeat,
    installments: Number(row.installments || 1),
    cardName: row.card_name || "",
    paidMonths: Array.isArray(row.paid_months) ? row.paid_months : [],
    createdAt: row.created_at,
  };
}

function dbCardToApp(row) {
  return {
    id: row.id,
    name: row.name,
    closingDay: row.closing_day,
    dueDay: row.due_day,
    color: row.color || "#6b7280",
    active: row.active,
  };
}

// Conversores app → banco (camelCase → snake_case)
function appEntryToDb(entry) {
  return {
    id: entry.id,
    user_id: window.currentUser.id,
    description: entry.description,
    amount: entry.amount,
    type: entry.type,
    category: entry.category || null,
    due_date: entry.dueDate || null,
    start_month: entry.startMonth,
    repeat: entry.repeat,
    installments: entry.installments,
    card_name: entry.cardName || null,
    paid_months: entry.paidMonths || [],
  };
}

function appCardToDb(card) {
  return {
    id: card.id,
    user_id: window.currentUser.id,
    name: card.name,
    closing_day: card.closingDay,
    due_day: card.dueDay,
    color: card.color,
    active: card.active,
  };
}
