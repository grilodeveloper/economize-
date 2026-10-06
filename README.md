# Economize!

Controle financeiro do casal, feito para substituir a planilha do mês. Mostra quanto entra, quanto sai, quanto sobra e se dá para guardar a meta do mês, considerando cartões de crédito, parcelas e contas fixas.

Roda direto no navegador, sem build e sem dependências para instalar. Os dados ficam no [Supabase](https://supabase.com), então o mesmo login vê as mesmas informações no celular e no computador.

## Funcionalidades

### Mês
- **Sobra prevista**: entradas menos saídas do mês, com o quanto das entradas já tem destino.
- **Meta de economia**: valor para guardar todo mês, com um motivo opcional ("Reserva de emergência"). Mostra se a meta cabe no mês e quanto ainda fica livre para gastar.
- **Faturas do mês**: total de cada cartão, com o dia de vencimento e o botão para marcar a fatura inteira como paga.
- **Próximas contas**: contas e gastos ainda não pagos, em ordem de vencimento.
- **Categorias**: para onde o dinheiro foi, com limite mensal opcional por categoria.
- Comparação com os gastos do mês anterior.

### Lançamentos
- Quatro tipos: **entrada**, **conta**, **gasto** e **cartão**.
- Recorrência: **só uma vez**, **todo mês** ou **parcelado** (com parcela atual e total).
- Marcação de pago por ocorrência: pagar a parcela de outubro não marca a de novembro.
- Busca e filtros por tipo, por "a pagar", por cartão e por categoria.
- Editar, duplicar e excluir.
- Aviso antes de salvar um gasto que deixa o mês abaixo da meta de economia.

### Cartões de crédito
- Cada cartão tem dia de fechamento, dia de vencimento e cor.
- **A compra conta no mês em que a fatura vence**, e não no mês em que foi feita. Uma compra no dia 6 num cartão que fecha no dia 28 e vence no dia 5 aparece no mês seguinte, quando o dinheiro de fato sai da conta.
- O formulário mostra em qual fatura a compra vai cair antes de salvar.
- Cartões podem ser marcados como "fora de uso": o histórico fica e eles somem do formulário.

### Ajustes
- Tema claro, escuro ou automático (segue o sistema).
- Relatório do mês em PDF, pela impressão do navegador.
- Backup completo em `.json`.
- Limpeza dos lançamentos únicos do mês, mantendo os fixos e os parcelados.

## Tecnologias

| Parte | Escolha |
| --- | --- |
| Interface | HTML, CSS e JavaScript puros, sem framework e sem build |
| Dados e login | Supabase (Postgres, Auth e Row Level Security) |
| Cliente Supabase | `@supabase/supabase-js` v2, carregado por CDN |
| Fontes | Bricolage Grotesque e Figtree (Google Fonts) |

O layout é pensado primeiro para o celular: no celular, as abas ficam numa barra inferior e, no computador, no topo.

## Estrutura

```
.
├── index.html        # Telas, abas e diálogos
├── styles.css        # Tema "Papel e tinta" (claro e escuro) e layout responsivo
├── app.js            # Regras de negócio, renderização e eventos
├── auth.js           # Login, sessão e início do app
├── db.js             # Acesso ao Supabase (leitura e escrita das tabelas)
├── supabase.js       # URL do projeto e chave pública do Supabase
├── manifest.webmanifest  # Dados para instalar como app no celular (PWA)
├── icons/            # Logo em SVG e ícones PNG (192, 512, maskable, Apple, favicon)
└── supabase/
    ├── category_limits.sql   # Tabela de limites por categoria
    └── user_settings.sql     # Tabela da meta de economia
```

## Como rodar

### 1. Configurar o Supabase

1. Crie um projeto no Supabase.
2. Em **Authentication → Users**, crie o usuário que vai usar o app. Não há tela de cadastro: o acesso é só por login.
3. Crie as tabelas `entries` e `cards` (veja [Banco de dados](#banco-de-dados)).
4. No **SQL Editor**, rode os arquivos da pasta [`supabase/`](supabase/).
5. Coloque a URL do projeto e a chave pública (*publishable key*) em [`supabase.js`](supabase.js).

### 2. Abrir o app

Abra o `index.html` no navegador. Para servir localmente:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.

Para publicar, qualquer hospedagem de site estático funciona (GitHub Pages, Netlify, Vercel), sem nenhuma etapa de build.

### 3. Instalar no celular

- **iPhone**: no Safari, toque em Compartilhar → **Adicionar à Tela de Início**.
- **Android**: no Chrome, toque no menu ⋮ → **Instalar app**.

O app abre em tela cheia, com o ícone do Economize!. Se já houver um atalho antigo, apague-o e instale de novo, porque o celular não atualiza o ícone de um atalho existente.

## Banco de dados

Todas as tabelas têm a coluna `user_id` e usam Row Level Security: cada login só lê e altera os próprios dados.

| Tabela | Para que serve | Criação |
| --- | --- | --- |
| `entries` | Lançamentos | Manual (colunas abaixo) |
| `cards` | Cartões de crédito | Manual (colunas abaixo) |
| `category_limits` | Limite mensal por categoria | [`supabase/category_limits.sql`](supabase/category_limits.sql) |
| `user_settings` | Meta de economia | [`supabase/user_settings.sql`](supabase/user_settings.sql) |

**`entries`**: `id`, `user_id`, `description`, `amount`, `type` (`income`, `bill`, `expense` ou `credit`), `category`, `due_date`, `start_month` (`AAAA-MM`), `repeat` (`once`, `fixed` ou `installment`), `installments`, `card_name`, `paid_months` (array de texto) e `created_at`.

**`cards`**: `id`, `user_id`, `name`, `closing_day`, `due_day`, `color`, `active` e `created_at`.

### Como os pagamentos são guardados

Cada lançamento guarda em `paid_months` as ocorrências já pagas, no formato `AAAA-MM::parcela` (por exemplo, `2026-11::2` para a segunda parcela paga em novembro). Nas compras no cartão, o mês é o do vencimento da fatura. O valor `invoice-month-v1` dentro do array indica que o lançamento já usa essa regra, e serve para que a migração dos dados antigos rode uma única vez.

## Segurança

- A chave em `supabase.js` é a chave **pública** do Supabase, feita para ficar no navegador. Quem protege os dados é o **Row Level Security**, então ele precisa estar ativo em **todas** as tabelas, inclusive `entries` e `cards`.
- Nunca coloque a chave `service_role` neste projeto.

## Licença

Projeto pessoal, de uso privado.
