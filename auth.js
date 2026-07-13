// Aguarda o DOM estar pronto
document.addEventListener("DOMContentLoaded", async () => {
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
  // Esconde o app inteiro
  document.body.innerHTML = `
    <div id="login-container" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: sans-serif;
      background: var(--bg, #f5f5f5);
    ">
      <h1 style="margin-bottom: 2rem; color: var(--text, #1a1a1a);">💰 Economize!</h1>
      <div style="
        background: var(--surface, #ffffff);
        color: var(--text, #1a1a1a);
        padding: 2rem;
        border-radius: 12px;
        box-shadow: var(--shadow, 0 2px 12px rgba(0,0,0,0.1));
        width: 100%;
        max-width: 360px;
        box-sizing: border-box;
      ">
        <h2 style="margin: 0 0 1.5rem; font-size: 1.25rem;">Entrar</h2>
        <input
          id="login-email"
          type="email"
          placeholder="Email"
          style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid var(--line, #ddd); border-radius: 8px; background: var(--surface-deep, #f3f4f6); color: var(--text, #1a1a1a); box-sizing: border-box; font-size: 1rem;"
        />
        <input
          id="login-senha"
          type="password"
          placeholder="Senha"
          style="width: 100%; padding: 0.75rem; margin-bottom: 1.5rem; border: 1px solid var(--line, #ddd); border-radius: 8px; background: var(--surface-deep, #f3f4f6); color: var(--text, #1a1a1a); box-sizing: border-box; font-size: 1rem;"
        />
        <button
          id="login-btn"
          style="width: 100%; padding: 0.75rem; background: var(--green, #16a34a); color: var(--button-text, white); border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;"
        >
          Entrar
        </button>
        <p id="login-erro" style="color: var(--red, red); margin-top: 1rem; display: none;"></p>
      </div>
    </div>
  `;

  document.getElementById("login-btn").addEventListener("click", async () => {
    const email = document.getElementById("login-email").value;
    const senha = document.getElementById("login-senha").value;
    const erro = document.getElementById("login-erro");
    const btn = document.getElementById("login-btn");

    btn.textContent = "Entrando...";
    btn.disabled = true;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      erro.textContent = "Email ou senha incorretos.";
      erro.style.display = "block";
      btn.textContent = "Entrar";
      btn.disabled = false;
      return;
    }

    location.reload();
  });
}

function iniciarApp(user) {
  // Guarda o usuário atual numa variável global
  window.currentUser = user;
  // O app.js vai rodar normalmente a partir daqui
  adicionarBotaoLogout();
}

function adicionarBotaoLogout() {
  const btn = document.createElement("button");
  btn.textContent = "Sair";
  btn.style.cssText = `
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    padding: 0.5rem 1rem;
    background: transparent;
    color: var(--text, #1a1a1a);
    border: 1px solid var(--line, #ccc);
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    opacity: 0.6;
    z-index: 999;
  `;
  btn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    location.reload();
  });
  document.body.appendChild(btn);
}
