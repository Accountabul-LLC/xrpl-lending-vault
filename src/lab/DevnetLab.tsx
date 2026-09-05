import { useEffect, useState } from 'react'
import { Wallet } from 'xrpl'
import {
  fundNewWallet,
  createVault,
  depositVault,
  withdrawVault,
  fetchVault,
  createLoanBroker,
  depositCover,
  withdrawCover,
  createLoan,
  payLoan,
  payLoanFull,
  fetchLoan,
  fetchLoanBroker,
  type VaultInfo,
  type LoanInfo,
  type LoanBrokerInfo
} from '../lib/xrpl'
import { explainXrplError, parseXrplCode } from './errors'
import { LabWorkbench } from './LabWorkbench'
import type { TxPhase, TxReceipt } from './receipt'
import {
  EMPTY_WALLETS,
  ROLE_LABEL,
  ROLES,
  shortAddr,
  type LabError,
  type LabViewHandlers,
  type LabViewState,
  type Role,
  type WalletView
} from './types'

const STORAGE_KEY = 'jrpu-devnet-session'

type Session = {
  seeds: Partial<Record<Role, string>>
  vaultId: string
  loanBrokerId: string
  loanId: string
}

function emptyWalletRecord(): Record<Role, Wallet | null> {
  return { owner: null, depositor: null, borrower: null }
}

function loadSession(): Session {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { seeds: {}, vaultId: '', loanBrokerId: '', loanId: '' }
    const parsed = JSON.parse(raw)
    return {
      seeds: parsed.seeds ?? {},
      vaultId: parsed.vaultId ?? '',
      loanBrokerId: parsed.loanBrokerId ?? '',
      loanId: parsed.loanId ?? ''
    }
  } catch {
    return { seeds: {}, vaultId: '', loanBrokerId: '', loanId: '' }
  }
}

function walletsFromSeeds(seeds: Partial<Record<Role, string>>): Record<Role, Wallet | null> {
  const next = emptyWalletRecord()
  for (const role of ROLES) {
    const seed = seeds[role]
    if (!seed) continue
    try {
      next[role] = Wallet.fromSeed(seed)
    } catch {
      next[role] = null
    }
  }
  return next
}

function toView(w: Wallet | null): WalletView {
  if (!w) return null
  return { address: w.address, funded: true }
}

export default function DevnetLab({ onOpenWalkthrough }: { onOpenWalkthrough?: () => void }) {
  const [session] = useState(loadSession)
  const [wallets, setWallets] = useState<Record<Role, Wallet | null>>(() =>
    walletsFromSeeds(session.seeds)
  )
  const [busy, setBusy] = useState<string | null>(null)
  const [txPhase, setTxPhase] = useState<TxPhase | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [vaultId, setVaultId] = useState(session.vaultId)
  const [vault, setVault] = useState<VaultInfo | null>(null)
  const [assetsMaximum, setAssetsMaximum] = useState('250000')
  const [depositAmount, setDepositAmount] = useState('20')
  const [withdrawAmount, setWithdrawAmount] = useState('5')
  const [loanBrokerId, setLoanBrokerId] = useState(session.loanBrokerId)
  const [loanBroker, setLoanBroker] = useState<LoanBrokerInfo | null>(null)
  const [coverAmount, setCoverAmount] = useState('10')
  const [coverWithdrawAmount, setCoverWithdrawAmount] = useState('1')
  const [principal, setPrincipal] = useState('10')
  const [aprPercent, setAprPercent] = useState('37')
  const [paymentTotal, setPaymentTotal] = useState('12')
  const [loanId, setLoanId] = useState(session.loanId)
  const [loan, setLoan] = useState<LoanInfo | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('2')
  const [sharesIssued, setSharesIssued] = useState('—')
  const [depositorAssetBalance, setDepositorAssetBalance] = useState('—')
  const [lastTx, setLastTx] = useState<TxReceipt | null>(null)
  const [error, setError] = useState<LabError | null>(null)
  const [technicalOpen, setTechnicalOpen] = useState(false)
  const [brokerSigned, setBrokerSigned] = useState(false)
  const [borrowerSigned, setBorrowerSigned] = useState(false)

  function pushLog(msg: string) {
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...l].slice(0, 30))
  }

  function fail(e: unknown) {
    const raw = e instanceof Error ? e.message : String(e)
    const hint = explainXrplError(raw)
    const title = parseXrplCode(raw) ? `${hint.code}` : 'Transaction failed'
    setError({ ...hint, title, raw })
    pushLog(`ERROR ${hint.code}: ${raw}`)
  }

  useEffect(() => {
    const seeds: Partial<Record<Role, string>> = {}
    for (const role of ROLES) {
      const seed = wallets[role]?.seed
      if (seed) seeds[role] = seed
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ seeds, vaultId, loanBrokerId, loanId }))
  }, [wallets, vaultId, loanBrokerId, loanId])

  useEffect(() => {
    let cancelled = false
    const { vaultId: restoredVaultId, loanBrokerId: restoredBrokerId, loanId: restoredLoanId } =
      session
    ;(async () => {
      if (restoredVaultId) {
        try {
          const info = await fetchVault(restoredVaultId)
          if (!cancelled) {
            setVault(info)
            setSharesIssued(info.shareMptId ? 'Issued (MPT)' : '—')
            pushLog(`Restored vault ${shortAddr(restoredVaultId)}`)
          }
        } catch (e: any) {
          if (!cancelled) pushLog(`ERROR restoring vault: ${e.message ?? e}`)
        }
      }
      if (restoredBrokerId) {
        try {
          const info = await fetchLoanBroker(restoredBrokerId)
          if (!cancelled) {
            setLoanBroker(info)
            pushLog(`Restored protocol loan book ${shortAddr(restoredBrokerId)}`)
          }
        } catch (e: any) {
          if (!cancelled) pushLog(`ERROR restoring loan book: ${e.message ?? e}`)
        }
      }
      if (restoredLoanId) {
        try {
          const info = await fetchLoan(restoredLoanId)
          if (!cancelled) {
            setLoan(info)
            setBrokerSigned(true)
            setBorrowerSigned(true)
            pushLog(`Restored loan ${shortAddr(restoredLoanId)}`)
          }
        } catch (e: any) {
          if (!cancelled) pushLog(`ERROR restoring loan: ${e.message ?? e}`)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session])

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY)
    setWallets(emptyWalletRecord())
    setVaultId('')
    setVault(null)
    setLoanBrokerId('')
    setLoanBroker(null)
    setLoanId('')
    setLoan(null)
    setLastTx(null)
    setError(null)
    setSharesIssued('—')
    setBrokerSigned(false)
    setBorrowerSigned(false)
    setTechnicalOpen(false)
    pushLog('Session cleared. Validated DevNet transactions remain on the ledger.')
  }

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key)
    setError(null)
    setTxPhase('preparing')
    try {
      await fn()
    } catch (e: any) {
      setTxPhase(null)
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  async function fundRole(role: Role) {
    await run(`fund-${role}`, async () => {
      setTxPhase('submitting')
      const w = await fundNewWallet()
      setTxPhase('validating')
      setWallets((prev) => ({ ...prev, [role]: w }))
      setTxPhase('confirmed')
      pushLog(`Funded ${ROLE_LABEL[role]} wallet ${shortAddr(w.address)} — verified on DevNet`)
    })
  }

  async function fundAll() {
    await run('fund-all', async () => {
      for (const role of ROLES) {
        if (wallets[role]) continue
        setTxPhase('submitting')
        const w = await fundNewWallet()
        setWallets((prev) => ({ ...prev, [role]: w }))
        pushLog(`Funded ${ROLE_LABEL[role]} wallet ${shortAddr(w.address)} — verified on DevNet`)
      }
      setTxPhase('confirmed')
    })
  }

  async function handleCreateVault() {
    if (!wallets.owner) return
    await run('create-vault', async () => {
      setTxPhase('signing')
      setTxPhase('submitting')
      const created = await createVault(wallets.owner!, {
        assetsMaximumXrp: assetsMaximum,
        data: 'Accountabul / JRPU Lending Protocol DevNet test vault'
      })
      setTxPhase('validating')
      setVaultId(created.vaultId)
      setLastTx(created.receipt)
      pushLog(`VaultCreate ${created.receipt.result} — VaultID ${shortAddr(created.vaultId)}`)
      const info = await fetchVault(created.vaultId)
      setVault(info)
      setSharesIssued('0')
      setTxPhase('confirmed')
    })
  }

  async function handleRefreshVault() {
    if (!vaultId) return
    await run('refresh-vault', async () => {
      setTxPhase('validating')
      setVault(await fetchVault(vaultId))
      setTxPhase('confirmed')
      pushLog('Vault refreshed from validated ledger')
    })
  }

  async function handleDeposit() {
    if (!wallets.depositor || !vaultId) return
    await run('deposit', async () => {
      setTxPhase('signing')
      setTxPhase('submitting')
      const { receipt } = await depositVault(wallets.depositor!, vaultId, depositAmount)
      setTxPhase('validating')
      setLastTx(receipt)
      pushLog(`VaultDeposit ${depositAmount} XRP — ${receipt.result}`)
      const info = await fetchVault(vaultId)
      setVault(info)
      setSharesIssued(info.assetsTotal)
      setTxPhase('confirmed')
    })
  }

  async function handleWithdraw() {
    if (!wallets.depositor || !vaultId) return
    await run('withdraw', async () => {
      setTxPhase('signing')
      setTxPhase('submitting')
      const { receipt } = await withdrawVault(wallets.depositor!, vaultId, withdrawAmount)
      setTxPhase('validating')
      setLastTx(receipt)
      pushLog(`VaultWithdraw ${withdrawAmount} XRP — ${receipt.result}`)
      const info = await fetchVault(vaultId)
      setVault(info)
      setSharesIssued(info.assetsAvailable)
      setTxPhase('confirmed')
    })
  }

  async function handleCreateLoanBook() {
    if (!wallets.owner || !vaultId) return
    await run('create-broker', async () => {
      setTxPhase('signing')
      setTxPhase('submitting')
      const created = await createLoanBroker(wallets.owner!, vaultId, {
        managementFeeRateBps: 200
      })
      setTxPhase('validating')
      setLoanBrokerId(created.loanBrokerId)
      setLastTx(created.receipt)
      pushLog(`LoanBrokerSet ${created.receipt.result} — LoanBroker ${shortAddr(created.loanBrokerId)}`)
      setLoanBroker(await fetchLoanBroker(created.loanBrokerId))
      setTxPhase('confirmed')
    })
  }

  async function handleDepositCover() {
    if (!wallets.owner || !loanBrokerId) return
    await run('deposit-cover', async () => {
      setTxPhase('submitting')
      const { receipt } = await depositCover(wallets.owner!, loanBrokerId, coverAmount)
      setLastTx(receipt)
      setLoanBroker(await fetchLoanBroker(loanBrokerId))
      setTxPhase('confirmed')
      pushLog(`LoanBrokerCoverDeposit ${coverAmount} XRP — ${receipt.result}`)
    })
  }

  async function handleWithdrawCover() {
    if (!wallets.owner || !loanBrokerId) return
    await run('withdraw-cover', async () => {
      setTxPhase('submitting')
      await withdrawCover(wallets.owner!, loanBrokerId, coverWithdrawAmount)
      setLoanBroker(await fetchLoanBroker(loanBrokerId))
      setTxPhase('confirmed')
      pushLog(`LoanBrokerCoverWithdraw ${coverWithdrawAmount} XRP`)
    })
  }

  async function handleCreateLoan() {
    if (!wallets.owner || !wallets.borrower || !loanBrokerId) return
    await run('create-loan', async () => {
      setBrokerSigned(true)
      setTxPhase('signing')
      setBorrowerSigned(true)
      setTxPhase('submitting')
      const bps10 = Math.round(parseFloat(aprPercent) * 1000)
      const created = await createLoan(wallets.owner!, wallets.borrower!, loanBrokerId, {
        principalXrp: principal,
        interestRateBps: bps10,
        paymentTotal: parseInt(paymentTotal, 10),
        paymentIntervalSeconds: 2592000
      })
      setTxPhase('validating')
      setLoanId(created.loanId)
      setLastTx(created.receipt)
      pushLog(`LoanSet ${created.receipt.result} — LoanID ${shortAddr(created.loanId)}`)
      setLoan(await fetchLoan(created.loanId))
      if (vaultId) setVault(await fetchVault(vaultId))
      if (loanBrokerId) setLoanBroker(await fetchLoanBroker(loanBrokerId))
      setTxPhase('confirmed')
    })
  }

  async function handlePayLoan() {
    if (!wallets.borrower || !loanId) return
    await run('pay-loan', async () => {
      setTxPhase('signing')
      setTxPhase('submitting')
      const { receipt } = await payLoan(wallets.borrower!, loanId, paymentAmount)
      setTxPhase('validating')
      setLastTx(receipt)
      pushLog(`LoanPay ${paymentAmount} XRP — ${receipt.result}`)
      setLoan(await fetchLoan(loanId))
      if (vaultId) setVault(await fetchVault(vaultId))
      if (loanBrokerId) setLoanBroker(await fetchLoanBroker(loanBrokerId))
      setTxPhase('confirmed')
    })
  }

  async function handlePayFull() {
    if (!wallets.borrower || !loanId || !loan) return
    await run('pay-full', async () => {
      setTxPhase('submitting')
      const { receipt } = await payLoanFull(wallets.borrower!, loanId, loan.totalValueOutstanding)
      setLastTx(receipt)
      pushLog(`LoanPay full ${loan.totalValueOutstanding} XRP — ${receipt.result}`)
      setLoan(await fetchLoan(loanId))
      if (vaultId) setVault(await fetchVault(vaultId))
      if (loanBrokerId) setLoanBroker(await fetchLoanBroker(loanBrokerId))
      setTxPhase('confirmed')
    })
  }

  const state: LabViewState = {
    wallets: {
      owner: toView(wallets.owner),
      depositor: toView(wallets.depositor),
      borrower: toView(wallets.borrower)
    },
    busy,
    txPhase,
    vaultId,
    vault,
    assetsMaximum,
    depositAmount,
    withdrawAmount,
    loanBrokerId,
    loanBroker,
    coverAmount,
    coverWithdrawAmount,
    principal,
    aprPercent,
    paymentTotal,
    loanId,
    loan,
    paymentAmount,
    log,
    sharesIssued,
    depositorAssetBalance,
    lastTx,
    error,
    technicalOpen,
    highlight: null,
    pressed: null,
    brokerSigned,
    borrowerSigned
  }

  const handlers: LabViewHandlers = {
    onFundRole: (role) => void fundRole(role),
    onFundAll: () => void fundAll(),
    onReset: clearSession,
    onCreateVault: () => void handleCreateVault(),
    onRefreshVault: () => void handleRefreshVault(),
    onDeposit: () => void handleDeposit(),
    onWithdraw: () => void handleWithdraw(),
    onCreateLoanBook: () => void handleCreateLoanBook(),
    onDepositCover: () => void handleDepositCover(),
    onWithdrawCover: () => void handleWithdrawCover(),
    onCreateLoan: () => void handleCreateLoan(),
    onPayLoan: () => void handlePayLoan(),
    onPayFull: () => void handlePayFull(),
    onToggleTechnical: () => setTechnicalOpen((v) => !v),
    onAssetsMaximum: setAssetsMaximum,
    onDepositAmount: setDepositAmount,
    onWithdrawAmount: setWithdrawAmount,
    onCoverAmount: setCoverAmount,
    onCoverWithdrawAmount: setCoverWithdrawAmount,
    onPrincipal: setPrincipal,
    onAprPercent: setAprPercent,
    onPaymentTotal: setPaymentTotal,
    onPaymentAmount: setPaymentAmount
  }

  return (
    <div className="space-y-4">
      {onOpenWalkthrough && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-500/25 bg-indigo-950/30 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">
              Accountabul Lending Protocol walkthrough
            </div>
            <div className="text-xs text-slate-400">
              Ten-minute guided tour — funding, vault, deposits, loans, payments, withdrawals.
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenWalkthrough}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"
          >
            Watch walkthrough
          </button>
        </div>
      )}
      <LabWorkbench state={state} handlers={handlers} />
    </div>
  )
}
