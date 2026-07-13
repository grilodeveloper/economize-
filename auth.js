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
      <h1 style="margin-bottom: 2rem;">💰 Economize!</h1>
      <div style="
        background: white;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        width: 100%;
        max-width: 360px;
      ">
        <h2 style="margin: 0 0 1.5rem; font-size: 1.25rem;">Entrar</h2>
        <input
          id="login-email"
          type="email"
          placeholder="Email"
          style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size: 1rem;"
        />
        <input
          id="login-senha"
          type="password"
          placeholder="Senha"
          style="width: 100%; padding: 0.75rem; margin-bottom: 1.5rem; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size: 1rem;"
        />
        <button
          id="login-btn"
          style="width: 100%; padding: 0.75rem; background: #16a34a; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;"
        >
          Entrar
        </button>
        <p id="login-erro" style="color: red; margin-top: 1rem; display: none;"></p>
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
}
