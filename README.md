# Economize!

Um controle financeiro pessoal simples para substituir a planilha do mês.

## Como usar

Abra o arquivo `index.html` no navegador.

Os dados ficam salvos no próprio navegador usando `localStorage`, então não precisa instalar nada nem criar conta.

## O que já faz

- Seleciona o mês de controle
- Cadastra entradas, contas, gastos e compras no cartão
- Informa qual cartão foi usado em cada compra
- Cadastra contas fixas mensais, como aluguel, internet e salário
- Cadastra contas parceladas, como compras no cartão ou financiamentos
- Mostra total de entradas, gastos, cartão e saldo previsto
- Mostra um resumo de gastos separado por cartão
- Filtra os lançamentos por tipo
- Remove lançamentos individuais
- Limpa os lançamentos únicos do mês atual sem apagar fixos e parcelados
- Exporta e importa backup dos dados em arquivo `.json`
- Alterna o tema entre sistema, escuro e claro

## Como lançar contas automáticas

Use o campo `Recorrência`:

- `Único`: aparece somente no mês da data inicial.
- `Fixo mensal`: aparece automaticamente em todos os meses a partir da data inicial.
- `Parcelado`: aparece automaticamente pelo número de parcelas informado.

Para compras parceladas, informe o valor de cada parcela no campo `Valor`, o total de parcelas no campo `Total` e em qual parcela a cobrança está no campo `Parcela atual`.

Exemplo: se uma compra está na terceira parcela de doze, preencha `Total` como `12` e `Parcela atual` como `3`. O mês atual aparecerá como `Parcelado 3/12`.

## Como usar cartões

Ao escolher o tipo `Cartão`, o campo `Cartão usado` aparece automaticamente.

Você pode usar as sugestões `Cartão 1`, `Cartão 2` e `Cartão 3`, ou digitar nomes reais como `Nubank`, `Inter` e `Itaú`.

## Backup

Use `Exportar backup` para baixar um arquivo `.json` com todos os lançamentos salvos no navegador.

Use `Importar backup` para carregar esse arquivo depois. A importação substitui os dados atuais do navegador pelo conteúdo do backup.

## Próximos passos possíveis

- Exportar/importar dados
- Marcar contas como pagas
- Separar cartão por fatura
- Criar metas por categoria
- Gerar gráfico mensal
