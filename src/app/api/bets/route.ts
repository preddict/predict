import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { calculateBuyCost, sharesForAmount } from '@/lib/lmsr'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { marketId, side, amountBrl } = await request.json()

    if (!marketId || !side || !amountBrl) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    if (!['yes', 'no'].includes(side)) {
      return NextResponse.json({ error: 'Lado inválido' }, { status: 400 })
    }
    if (amountBrl < 1) {
      return NextResponse.json({ error: 'Valor mínimo de R$ 1,00' }, { status: 400 })
    }

    // Busca mercado
    const { data: market, error: marketErr } = await supabase
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single()

    if (marketErr || !market) {
      return NextResponse.json({ error: 'Mercado não encontrado' }, { status: 404 })
    }
    if (market.status !== 'open') {
      return NextResponse.json({ error: 'Mercado não está aberto' }, { status: 400 })
    }

    const qYes = market.q_yes ?? 0
    const qNo = market.q_no ?? 0
    const b = market.liquidity_b ?? 100

    // Calcula cotas e custo via LMSR
    const shares = sharesForAmount(qYes, qNo, b, side, amountBrl)
    const { cost, newYesPrice, newNoPrice } = calculateBuyCost(qYes, qNo, b, side, shares)

    const newQYes = side === 'yes' ? qYes + shares : qYes
    const newQNo = side === 'no' ? qNo + shares : qNo

    // Executa aposta atomicamente via função Supabase
    const admin = await createAdminClient()
    const { error: betErr } = await admin.rpc('execute_bet', {
      p_user_id: user.id,
      p_market_id: marketId,
      p_side: side,
      p_shares: shares,
      p_cost: cost,
      p_new_q_yes: newQYes,
      p_new_q_no: newQNo,
      p_new_yes_price: newYesPrice,
      p_new_no_price: newNoPrice,
    })

    if (betErr) {
      return NextResponse.json({ error: betErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, shares, cost, newYesPrice, newNoPrice })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
