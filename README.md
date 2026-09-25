# Precifica Meli — central de decisão para produtos de marketplace

Calcula custo real, taxas, lucro, margem, ROI, preço de equilíbrio e preço ideal no
**Mercado Livre**, **Shopee** e **TikTok Shop**. Roda 100% no navegador (LocalStorage), sem banco de dados.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # testes do motor de cálculo
npm run build    # gera o site estático em out/
```

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui (Base UI) · Lucide · decimal.js · Vitest.

## Deploy

O site é estático (`output: "export"`) e publicado no GitHub Pages pelo workflow
`.github/workflows/deploy.yml` a cada push na branch `main` (roda os testes antes do build).

## Estrutura

```
src/
  config/
    marketplaces.ts   ÚNICO lugar com percentuais/tarifas (referência inicial + fontes)
    defaults.ts       configurações padrão e análise em branco
  lib/
    money.ts          aritmética monetária em centavos inteiros (decimal.js)
    format.ts         formatação pt-BR (R$ 59,90) e leitura de números digitados
    calc/             motor de cálculo puro, sem React
      cost.ts         custo real por unidade
      fees.ts         resolução de regras (faixa de preço, peso, teto, overrides)
      sale.ts         venda: taxas, líquido recebido, imposto, publicidade, lucro, margem, ROI
      solver.ts       cálculo inverso: equilíbrio, margem desejada, lucro desejado
      lot.ts          análise de lote
      status.ts       classificação por metas configuráveis
      analyze.ts      orquestra os três marketplaces + destaques
      calc.test.ts    testes (inclui teste de propriedade com 400 configurações aleatórias)
    storage.ts        LocalStorage tolerante a falhas + migração de configurações
    products.ts       snapshot, recálculo e agregados do dashboard
    fee-providers.ts  ponto de extensão para futuras integrações oficiais de taxas
  components/
    analysis/         formulário, cards, "Ver cálculo", comparação, preço ideal, simulador, cenários
    settings/         editor de taxas por marketplace e configurações gerais
    app/              shell, campos numéricos BR, badges e utilitários visuais
  app/                rotas: / · /analise · /produtos · /comparar · /lote · /configuracoes
```

## Fórmulas

Todos os valores monetários são **centavos inteiros**. Cada cobrança percentual é
arredondada ao centavo (meio para cima) **uma vez**, na própria linha; somas são exatas.

| Grandeza | Fórmula |
|---|---|
| Frete rateado | frete total ÷ quantidade (ou frete por unidade informado) |
| **Custo real** | preço fornecedor + frete rateado + embalagem + outros custos |
| Taxa percentual | min(preço × %, teto) — só se o preço estiver na faixa `[a partir de, abaixo de)` |
| Total de taxas | comissão + tarifas fixas + logística + outras (regras ativas, cada id uma vez) |
| Valor líquido recebido | preço − total de taxas da plataforma |
| Imposto | preço × alíquota (desativado por padrão) |
| Publicidade | CPA fixo por venda **ou** % do preço |
| **Lucro líquido** | preço − custo real − taxas − imposto − publicidade |
| **Margem líquida** | lucro ÷ preço × 100 |
| **ROI** | lucro ÷ custo real × 100 |

### Cálculo inverso (equilíbrio, margem desejada, lucro desejado)

O lucro é linear por trechos no preço `p`:
`lucro(p) = p·(1 − Σ%ᵢ − imposto% − ads%) − (Σ fixas + tetos atingidos + adsFixo + custo)`.
A fórmula só muda nas fronteiras das faixas de preço e nos pontos em que um teto passa a valer.

1. Levanta todos esses pontos de quebra.
2. Em cada trecho resolve `A·p − B = 0`, com
   - equilíbrio: `B` = fixas + custo;
   - lucro alvo `L`: `B` += `L`;
   - margem alvo `m`: `A` −= `m` (margem sobre o preço, **não** markup sobre o custo).
3. Escolhe o **menor** preço válido; se a solução cai fora do trecho (ex.: degrau de R$ 79), passa ao próximo.
4. Arredonda ao centavo e **verifica com o motor real**, ajustando centavo a centavo para
   compensar o arredondamento das tarifas. Os testes garantem que o preço atinge o objetivo
   e que 1 centavo abaixo não atinge.

Se percentuais + margem desejada somam ≥ 100%, o sistema informa que não há preço possível.

## Taxas

- Os valores iniciais são **referência** levantada em fontes públicas consultadas em 25/09/2026
  (listadas em Configurações → Fontes). Não são verificados automaticamente.
- “Última atualização das taxas” só é preenchida quando **você** edita ou confirma as taxas.
- Faixas de preço, tetos, faixas de peso, taxas personalizadas e ativação por análise são configuráveis.
- Produtos salvos guardam um snapshot; quando as taxas mudam, a lista avisa e permite recalcular.

## Integração futura de taxas

`src/lib/fee-providers.ts` define a interface `FeeProvider`. Uma integração deve gerar uma
proposta que o usuário revisa e aceita antes de substituir a configuração. Nenhum endpoint
foi implementado: as APIs oficiais (Mercado Livre, Shopee Open Platform, TikTok Shop Partner)
exigem cadastro de aplicativo e autenticação do vendedor.
