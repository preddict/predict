// LMSR (Logarithmic Market Scoring Rule)
// b = parâmetro de liquidez. Maior b = preços menos sensíveis a apostas individuais

export function lmsrCost(qYes: number, qNo: number, b: number): number {
  return b * Math.log(Math.exp(qYes / b) + Math.exp(qNo / b))
}

export function lmsrPrice(qYes: number, qNo: number, b: number): { yes: number; no: number } {
  const expYes = Math.exp(qYes / b)
  const expNo = Math.exp(qNo / b)
  const total = expYes + expNo
  return {
    yes: expYes / total,
    no: expNo / total,
  }
}

// Calcula custo de comprar `shares` cotas do lado `side`
export function calculateBuyCost(
  currentQYes: number,
  currentQNo: number,
  b: number,
  side: 'yes' | 'no',
  shares: number
): { cost: number; newYesPrice: number; newNoPrice: number } {
  const costBefore = lmsrCost(currentQYes, currentQNo, b)

  const newQYes = side === 'yes' ? currentQYes + shares : currentQYes
  const newQNo = side === 'no' ? currentQNo + shares : currentQNo

  const costAfter = lmsrCost(newQYes, newQNo, b)
  const cost = costAfter - costBefore

  const newPrices = lmsrPrice(newQYes, newQNo, b)

  return { cost, newYesPrice: newPrices.yes, newNoPrice: newPrices.no }
}

// Calcula retorno de vender `shares` cotas do lado `side`
export function calculateSellReturn(
  currentQYes: number,
  currentQNo: number,
  b: number,
  side: 'yes' | 'no',
  shares: number
): { returnAmount: number; newYesPrice: number; newNoPrice: number } {
  const costBefore = lmsrCost(currentQYes, currentQNo, b)

  const newQYes = side === 'yes' ? currentQYes - shares : currentQYes
  const newQNo = side === 'no' ? currentQNo - shares : currentQNo

  const costAfter = lmsrCost(newQYes, newQNo, b)
  const returnAmount = costBefore - costAfter

  const newPrices = lmsrPrice(newQYes, newQNo, b)

  return { returnAmount, newYesPrice: newPrices.yes, newNoPrice: newPrices.no }
}

// Dado um valor em BRL, calcula quantas cotas o usuário recebe
export function sharesForAmount(
  currentQYes: number,
  currentQNo: number,
  b: number,
  side: 'yes' | 'no',
  amountBrl: number
): number {
  let low = 0
  let high = amountBrl * 100 // limite superior generoso
  const tolerance = 0.0001

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2
    const { cost } = calculateBuyCost(currentQYes, currentQNo, b, side, mid)

    if (Math.abs(cost - amountBrl) < tolerance) return mid
    if (cost < amountBrl) low = mid
    else high = mid
  }

  return (low + high) / 2
}

// Potencial lucro se ganhar (cotas * R$1 - custo)
export function calculatePotentialProfit(shares: number, cost: number): number {
  return shares - cost
}

// Fee de 5% sobre o lucro
export function calculateFee(profit: number): number {
  return Math.max(0, profit * 0.05)
}

// Inicializa mercado com liquidez b e 50/50
export function initMarketQuantities(b: number): { qYes: number; qNo: number } {
  // Começa com 50/50 — preços iniciais iguais
  return { qYes: 0, qNo: 0 }
}
