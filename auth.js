// auth.js — login com Supabase e início do app

document.addEventListener("DOMContentLoaded", async () => {
  applyTheme(loadTheme());

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    mostrarTelaLogin();
    return;
  }

  iniciarApp(session.user);
});

function mostrarTelaLogin() {
  const screen = document.querySelector("#loginScreen");
  const loginForm = document.querySelector("#loginForm");
  const erro = document.querySelector("#loginError");
  const btn = document.querySelector("#loginButton");

  screen.hidden = false;
  document.querySelector("#loginEmail").focus();

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.querySelector("#loginEmail").value.trim();
    const senha = document.querySelector("#loginPassword").value;

    if (!email || !senha) {
      erro.textContent = "Preencha e-mail e senha.";
      erro.hidden = false;
      return;
    }

    btn.textContent = "Entrando…";
    btn.disabled = true;
    erro.hidden = true;

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      erro.textContent = "E-mail ou senha incorretos.";
      erro.hidden = false;
      btn.textContent = "Entrar";
      btn.disabled = false;
      return;
    }

    location.reload();
  });
}

function iniciarApp(user) {
  // Guarda o usuário atual numa variável global (usada por db.js)
  window.currentUser = user;
  document.querySelector("#appShell").hidden = false;
  document.querySelector("#userEmail").textContent = user.email || "";
  document.querySelector("#logoutButton").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    location.reload();
  });
  initApp();
}
