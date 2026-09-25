import Decimal from "decimal.js"

/**
 * Aritmética monetária.
 *
 * Todo valor monetário dentro do motor de cálculo é um número INTEIRO de
 * centavos (`Cents`). Percentuais são números "humanos" (14 = 14%).
 * Operações que podem gerar frações de centavo (percentuais, divisões)
 * passam pelo decimal.js e são arredondadas para o centavo mais próximo
 * (meio para cima), exatamente uma vez por linha de cobrança.
 * Somas e subtrações de centavos inteiros são exatas em JS.
 */
export type Cents = number

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

export function toCents(reais: number | string | null | undefined): Cents {
  if (reais === null || reais === undefined || reais === "") return 0
  const d = new Decimal(reais)
  if (!d.isFinite()) return 0
  return d.times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber()
}

export function toReais(cents: Cents): number {
  return new Decimal(cents).div(100).toNumber()
}

/** percent% de `cents`, arredondado ao centavo. */
export function percentOf(cents: Cents, percent: number): Cents {
  return new Decimal(cents).times(percent).div(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber()
}

/** Divide centavos por n, arredondando ao centavo. */
export function divideCents(cents: Cents, n: number): Cents {
  if (!n) return 0
  return new Decimal(cents).div(n).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber()
}

export function multiplyCents(cents: Cents, n: number): Cents {
  return new Decimal(cents).times(n).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber()
}

export function sumCents(values: Cents[]): Cents {
  return values.reduce((a, b) => a + b, 0)
}

/** Razão em % com 2 casas (ex.: margem, ROI). Retorna null se o denominador for 0. */
export function ratioPercent(numerator: Cents, denominator: Cents): number | null {
  if (!denominator) return null
  return new Decimal(numerator).div(denominator).times(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber()
}

/** Arredonda um valor em centavos (possivelmente fracionário) para CIMA. */
export function ceilCents(value: Decimal.Value): Cents {
  return new Decimal(value).toDecimalPlaces(0, Decimal.ROUND_CEIL).toNumber()
}

export { Decimal }
