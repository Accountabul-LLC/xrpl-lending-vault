import { useEffect, useMemo, useState } from 'react'
import { Wallet } from 'xrpl'
import { formatXrp, parseXrpNumber, tenthsOfBpsToPercent } from '../lib/amounts'
import { LAB_DEFAULTS } from '../lib/labLifecycle'
import {
  computeStepStatus,
  checksForStep,
  emptySnapshot,
  isReady,
  nextActionFor,
  type LabSnapshot,
  type StepId,
  type StepStatus
} from '../lib/labWorkflow'
import {
  RESET_DISCLAIMER,
  ROLES,
  clearSessionStorage,
  loadSession,
  saveSession,
  type Role,
  type Session
} from '../lib/session'
import {
  DEVNET_WSS,
  NETWORK_LABEL,
  createLoan,
  createLoanBroker,
  createVault,
  depositVault,
  fetchAccountXrp,
  fetchLoan,
  fetchLoanBroker,
  fetchMptAmount,
  fetchRippleTime,
  fetchVault,
  fundNewWallet,
  isLoanPayLate,
  listLoans,
  payLoan,
  payRequiredInstallment,
  vaultPhaseOf,
  withdrawVault,
  type LoanBrokerInfo,
  type LoanInfo,
  type TxReceipt,
  type VaultInfo
} from '../lib/xrpl'
import { interpretXrplError, type ErrorGuidance } from '../lib/xrplErrors'
import { formatPhase, phaseHint, secondsUntil, type VaultPhase } from '../lib/vaultPhase'
import {
  ActionButton,
  ErrorBox,
  Kv,
  ProgressBar,
  PrereqList,
  StepCard,
  Tip,
  TxDetails
} from './components'
import { Btn } from '../ui'

const ROLE_COPY: Record<Role, { title: string; blurb: string }> = {
  owner: {
    title: 'VAULT OWNER / BROKER',
    blurb: 'Creates the vault and the LoanBroker, then cosigns origination.'
  },
  depositor: {
    title: 'DEPOSITOR',
    blurb: 'Supplies XRP to the vault and later redeems shares.'
  },
  borrower: {
    title: 'BORROWER',
    blurb: 'Cosigns the loan and makes LoanPay payments.'
  }
}

function short(addr?: string) {
  if (!addr) return '—'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function walletsFromSeeds(seeds: Session['seeds']): Record<Role, Wallet | null> {
  const next: Record<Role, Wallet | null> = { owner: null, depositor: null, borrower: null }
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

type Guidance = (ErrorGuidance & { whatFailed: string; raw?: string }) | null

export default function DevnetLab({ onOpenWalkthrough }: { onOpenWalkthrough?: () => void }) {
  const [session] = useState(loadSession)
  const [wallets, setWallets] = useState<Record<Role, Wallet | null>>(() =>
    walletsFromSeeds(session.seeds)
  )
  const [balances, setBalances] = useState<Record<Role, number>>({
    owner: 0,
    depositor: 0,
    borrower: 0
  })
  const [funded, setFunded] = useState<Record<Role, boolean>>({
    owner: false,
    depositor: false,
    borrower: false
  })

  const [busy, setBusy] = useState<{ step?: StepId; phase?: 'SUBMITTING' | 'VALIDATING'; key?: string } | null>(
    null
  )
  const [failedStep, setFailedStep] = useState<StepId | null>(null)
  const [errors, setErrors] = useState<Partial<Record<StepId, Guidance>>>({})
  const [receipts, setReceipts] = useState<Partial<Record<StepId, TxReceipt>>>({})
  const [log, setLog] = useState<string[]>([])

  const [vaultId, setVaultId] = useState(session.vaultId)
  const [vault, setVault] = useState<VaultInfo | null>(null)
  const [assetsMaximum, setAssetsMaximum] = useState(LAB_DEFAULTS.assetsMaximumXrp)
  const [depositAmount, setDepositAmount] = useState(LAB_DEFAULTS.depositXrp)
  const [withdrawAmount, setWithdrawAmount] = useState(LAB_DEFAULTS.withdrawXrp)
  const [depositedXrp, setDepositedXrp] = useState(session.depositedXrp)
  const [withdrawnXrp, setWithdrawnXrp] = useState(session.withdrawnXrp)
  const [depositorShares, setDepositorShares] = useState('0')
  const [vaultBefore, setVaultBefore] = useState<VaultInfo | null>(null)
  const [vaultAfter, setVaultAfter] = useState<VaultInfo | null>(null)

  const [loanBrokerId, setLoanBrokerId] = useState(session.loanBrokerId)
  const [loanBroker, setLoanBroker] = useState<LoanBrokerInfo | null>(null)
  const [loanBookOpen, setLoanBookOpen] = useState(false)

  const [principal, setPrincipal] = useState(LAB_DEFAULTS.principalXrp)
  const [aprPercent, setAprPercent] = useState(LAB_DEFAULTS.aprPercent)
  const [paymentTotal, setPaymentTotal] = useState(String(LAB_DEFAULTS.paymentTotal))
  const [paymentInterval, setPaymentInterval] = useState(String(LAB_DEFAULTS.paymentIntervalSeconds))
  const [gracePeriod, setGracePeriod] = useState('0')
  const [originationFee, setOriginationFee] = useState('0')
  const [serviceFee, setServiceFee] = useState('0')
  const [loanId, setLoanId] = useState(session.loanId)
  const [loanIds, setLoanIds] = useState<string[]>(session.loanIds)
  const [loan, setLoan] = useState<LoanInfo | null>(null)
  const [loans, setLoans] = useState<LoanInfo[]>([])
  const [loanBefore, setLoanBefore] = useState<LoanInfo | null>(null)
  const [loanAfter, setLoanAfter] = useState<LoanInfo | null>(null)
  const [customPayment, setCustomPayment] = useState('')
  const [showCustomPay, setShowCustomPay] = useState(false)
  const [signingStep, setSigningStep] = useState<string>('')

  const [paymentMade, setPaymentMade] = useState(session.paymentMade)
  const [withdrawMade, setWithdrawMade] = useState(session.withdrawMade)
  const [verified, setVerified] = useState(false)
  const [withdrawBefore, setWithdrawBefore] = useState<{ shares: string; available: string } | null>(null)
  const [ledgerTime, setLedgerTime] = useState<number>(0)
  const [vaultPhase, setVaultPhase] = useState<VaultPhase>('open-ended')

  function pushLog(msg: string) {
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...l].slice(0, 40))
  }

  useEffect(() => {
    const seeds: Session['seeds'] = {}
    for (const role of ROLES) {
      const seed = wallets[role]?.seed
      if (seed) seeds[role] = seed
    }
    saveSession({
      seeds,
      vaultId,
      loanBrokerId,
      loanId,
      loanIds,
      paymentMade,
      withdrawMade,
      depositedXrp,
      withdrawnXrp
    })
  }, [wallets, vaultId, loanBrokerId, loanId, loanIds, paymentMade, withdrawMade, depositedXrp, withdrawnXrp])

  useEffect(() => {
    let cancelled = false
    async function tick() {
      try {
        const now = await fetchRippleTime()
        if (cancelled) return
        setLedgerTime(now)
        if (vault) setVaultPhase(vaultPhaseOf(vault, now))
      } catch {
        /* keep last known time */
      }
    }
    tick()
    const id = window.setInterval(tick, 4000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [vault])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      for (const role of ROLES) {
        const w = wallets[role]
        if (!w) continue
        try {
          const info = await fetchAccountXrp(w.address)
          if (cancelled) return
          setBalances((b) => ({ ...b, [role]: info.xrp }))
          setFunded((f) => ({ ...f, [role]: info.exists && info.xrp > 0 }))
        } catch (e: any) {
          if (!cancelled) pushLog(`ERROR restoring ${role}: ${e.message ?? e}`)
        }
      }
      if (session.vaultId) {
        try {
          const info = await fetchVault(session.vaultId)
          if (cancelled) return
          setVault(info)
          if (wallets.depositor) {
            setDepositorShares(await fetchMptAmount(wallets.depositor.address, info.shareMptId))
          }
          pushLog(`Restored vault ${short(session.vaultId)} from ledger`)
        } catch (e: any) {
          if (!cancelled) pushLog(`ERROR restoring vault: ${e.message ?? e}`)
        }
      }
      if (session.loanBrokerId) {
        try {
          const info = await fetchLoanBroker(session.loanBrokerId)
          if (cancelled) return
          setLoanBroker(info)
          pushLog(`Restored LoanBroker ${short(session.loanBrokerId)} from ledger`)
        } catch (e: any) {
          if (!cancelled) pushLog(`ERROR restoring loan broker: ${e.message ?? e}`)
        }
      }
      if (session.loanId) {
        try {
          const info = await fetchLoan(session.loanId)
          if (cancelled) return
          setLoan(info)
          pushLog(`Restored loan ${short(session.loanId)} from ledger`)
        } catch (e: any) {
          if (!cancelled) pushLog(`ERROR restoring loan: ${e.message ?? e}`)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // Restore once from the loaded session snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const snapshot: LabSnapshot = useMemo(
    () =>
      emptySnapshot({
        ownerAddress: wallets.owner?.address,
        depositorAddress: wallets.depositor?.address,
        borrowerAddress: wallets.borrower?.address,
        ownerFunded: funded.owner,
        depositorFunded: funded.depositor,
        borrowerFunded: funded.borrower,
        ownerXrp: balances.owner,
        depositorXrp: balances.depositor,
        borrowerXrp: balances.borrower,
        vaultExists: Boolean(vault),
        vaultId,
        vaultPrivate: Boolean(vault?.isPrivate),
        vaultAsset: vault?.asset ?? 'XRP',
        vaultKind: vault?.vaultKind ?? 0,
        vaultPhase,
        subscriptionDate: vault?.subscriptionDate,
        redemptionDate: vault?.redemptionDate,
        assetsTotal: parseXrpNumber(vault?.assetsTotal),
        assetsAvailable: parseXrpNumber(vault?.assetsAvailable),
        assetsMaximum: parseXrpNumber(vault?.assetsMaximum),
        depositorShares: parseXrpNumber(depositorShares),
        brokerExists: Boolean(loanBroker),
        loanBrokerId,
        loanExists: Boolean(loan),
        loanId,
        paymentMade,
        withdrawMade,
        verified,
        depositAmount: parseXrpNumber(depositAmount),
        withdrawAmount: parseXrpNumber(withdrawAmount)
      }),
    [
      wallets,
      funded,
      balances,
      vault,
      vaultId,
      depositorShares,
      loanBroker,
      loanBrokerId,
      loan,
      loanId,
      paymentMade,
      withdrawMade,
      verified,
      depositAmount,
      withdrawAmount,
      vaultPhase,
      ledgerTime
    ]
  )

  const statuses = useMemo(() => {
    const out = {} as Record<StepId, StepStatus>
    ;([1, 2, 3, 4, 5, 6, 7, 8] as StepId[]).forEach((id) => {
      out[id] = computeStepStatus(id, snapshot, busy, failedStep)
    })
    return out
  }, [snapshot, busy, failedStep])

  async function run(step: StepId, key: string, fn: () => Promise<void>) {
    setBusy({ step, phase: 'SUBMITTING', key })
    setFailedStep(null)
    setErrors((e) => ({ ...e, [step]: null }))
    try {
      setBusy({ step, phase: 'VALIDATING', key })
      await fn()
    } catch (err) {
      const g = interpretXrplError(err, key)
      setFailedStep(step)
      setErrors((e) => ({ ...e, [step]: g }))
      pushLog(`ERROR ${key}: ${g.code} — ${g.meaning}`)
    } finally {
      setBusy(null)
    }
  }

  async function refreshRole(role: Role) {
    const w = wallets[role]
    if (!w) return
    const info = await fetchAccountXrp(w.address)
    setBalances((b) => ({ ...b, [role]: info.xrp }))
    setFunded((f) => ({ ...f, [role]: info.exists && info.xrp > 0 }))
    return info
  }

  async function fundRole(role: Role) {
    await run(1, `fund-${role}`, async () => {
      const { wallet, xrp } = await fundNewWallet()
      setWallets((prev) => ({ ...prev, [role]: wallet }))
      const verifiedBal = await fetchAccountXrp(wallet.address)
      setBalances((b) => ({ ...b, [role]: verifiedBal.xrp || xrp }))
      setFunded((f) => ({ ...f, [role]: verifiedBal.exists && verifiedBal.xrp > 0 }))
      pushLog(`Funded ${ROLE_COPY[role].title} ${wallet.address} — ledger ${verifiedBal.xrp} XRP`)
    })
  }

  async function fundAll() {
    await run(1, 'fund-all', async () => {
      for (const role of ROLES) {
        const { wallet, xrp } = await fundNewWallet()
        setWallets((prev) => ({ ...prev, [role]: wallet }))
        const verifiedBal = await fetchAccountXrp(wallet.address)
        setBalances((b) => ({ ...b, [role]: verifiedBal.xrp || xrp }))
        setFunded((f) => ({ ...f, [role]: verifiedBal.exists && verifiedBal.xrp > 0 }))
        pushLog(`Funded ${ROLE_COPY[role].title} ${wallet.address} — ledger ${verifiedBal.xrp} XRP`)
      }
    })
  }

  function resetSession() {
    clearSessionStorage()
    setWallets({ owner: null, depositor: null, borrower: null })
    setBalances({ owner: 0, depositor: 0, borrower: 0 })
    setFunded({ owner: false, depositor: false, borrower: false })
    setVaultId('')
    setVault(null)
    setLoanBrokerId('')
    setLoanBroker(null)
    setLoanId('')
    setLoanIds([])
    setLoan(null)
    setLoans([])
    setPaymentMade(false)
    setWithdrawMade(false)
    setVerified(false)
    setDepositedXrp('0')
    setWithdrawnXrp('0')
    setDepositorShares('0')
    setReceipts({})
    setErrors({})
    setFailedStep(null)
    setLoanBookOpen(false)
    setVaultBefore(null)
    setVaultAfter(null)
    setLoanBefore(null)
    setLoanAfter(null)
    pushLog('Local lab session cleared. DevNet ledger objects were not deleted.')
  }

  async function handleCreateVault() {
    if (!wallets.owner) return
    await run(2, 'VaultCreate', async () => {
      const created = await createVault(wallets.owner!, {
        assetsMaximumXrp: assetsMaximum,
        data: 'JRPU Live DevNet Lab vault'
      })
      const info = await fetchVault(created.vaultId)
      setVaultId(info.vaultId)
      setVault(info)
      setReceipts((r) => ({ ...r, 2: created.receipt }))
      pushLog(`VaultCreate tesSUCCESS — ${info.vaultId}`)
    })
  }

  async function handleDeposit() {
    if (!wallets.depositor || !vaultId) return
    await run(3, 'VaultDeposit', async () => {
      const before = await fetchVault(vaultId)
      setVaultBefore(before)
      const dep = await depositVault(wallets.depositor!, vaultId, depositAmount)
      const after = await fetchVault(vaultId)
      setVault(after)
      setVaultAfter(after)
      setDepositorShares(dep.shares)
      setDepositedXrp(String(parseXrpNumber(depositedXrp) + parseXrpNumber(depositAmount)))
      setReceipts((r) => ({ ...r, 3: dep.receipt }))
      await refreshRole('depositor')
      pushLog(`VaultDeposit tesSUCCESS — ${depositAmount} XRP, shares ${dep.shares}`)
    })
  }

  async function handleCreateBroker() {
    if (!wallets.owner || !vaultId) return
    await run(4, 'LoanBrokerSet', async () => {
      const created = await createLoanBroker(wallets.owner!, vaultId, {
        managementFeeRateBps10: LAB_DEFAULTS.managementFeeRate
      })
      const info = await fetchLoanBroker(created.loanBrokerId)
      setLoanBrokerId(info.loanBrokerId)
      setLoanBroker(info)
      setReceipts((r) => ({ ...r, 4: created.receipt }))
      setLoanBookOpen(true)
      pushLog(`LoanBrokerSet tesSUCCESS — ${info.loanBrokerId}`)
    })
  }

  async function openLoanBook() {
    if (!loanBrokerId) {
      setLoanBookOpen(true)
      setFailedStep(4)
      setErrors((e) => ({
        ...e,
        4: {
          code: 'LoanBroker not created',
          meaning:
            'The Protocol Loan Book is a Lab view of loans associated with an XRPL LoanBroker. It is not itself a ledger object. Nothing was submitted to DevNet.',
          fix: 'Create the Loan Broker first (step 4, LoanBrokerSet signed by the vault owner), then originate a loan. This panel will list those loans.',
          category: 'INVALID STATE',
          whatFailed: 'Protocol Loan Book'
        }
      }))
      document.getElementById('lab-step-4')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    setLoanBookOpen(true)
    try {
      const list = await listLoans({
        loanBrokerId,
        brokerPseudoAccount: loanBroker?.account,
        borrowerAddress: wallets.borrower?.address,
        knownIds: loanIds
      })
      setLoans(list)
    } catch (e: any) {
      pushLog(`Loan book refresh: ${e.message ?? e}`)
    }
  }

  async function handleCreateLoan() {
    if (!wallets.owner || !wallets.borrower || !loanBrokerId) return
    await run(5, 'LoanSet', async () => {
      setSigningStep('1. Loan Broker signs')
      const created = await createLoan(wallets.owner!, wallets.borrower!, loanBrokerId, {
        principalXrp: principal,
        interestRateBps10: Math.round(parseFloat(aprPercent) * 1000),
        paymentTotal: parseInt(paymentTotal, 10),
        paymentIntervalSeconds: parseInt(paymentInterval, 10) || 60,
        gracePeriodSeconds: parseInt(gracePeriod, 10) > 0 ? parseInt(gracePeriod, 10) : undefined,
        originationFeeXrp: parseXrpNumber(originationFee) > 0 ? originationFee : undefined,
        serviceFeeXrp: parseXrpNumber(serviceFee) > 0 ? serviceFee : undefined
      })
      setSigningStep('5. Loan object created')
      const info = await fetchLoan(created.loanId)
      setLoanId(info.loanId)
      setLoanIds((ids) => Array.from(new Set([...ids, info.loanId])))
      setLoan(info)
      setLoans((prev) => {
        const rest = prev.filter((l) => l.loanId !== info.loanId)
        return [info, ...rest]
      })
      setReceipts((r) => ({ ...r, 5: created.receipt }))
      if (vaultId) setVault(await fetchVault(vaultId))
      if (loanBrokerId) setLoanBroker(await fetchLoanBroker(loanBrokerId))
      pushLog(`LoanSet tesSUCCESS — ${info.loanId}`)
    })
  }

  async function handleRequiredPayment() {
    if (!wallets.borrower || !loan) return
    await run(6, 'LoanPay', async () => {
      const before = await fetchLoan(loan.loanId)
      setLoanBefore(before)
      const paid = await payRequiredInstallment(wallets.borrower!, before)
      const after = await fetchLoan(loan.loanId)
      setLoan(after)
      setLoanAfter(after)
      setPaymentMade(true)
      setReceipts((r) => ({ ...r, 6: paid.receipt }))
      if (vaultId) setVault(await fetchVault(vaultId))
      if (loanBrokerId) setLoanBroker(await fetchLoanBroker(loanBrokerId))
      await refreshRole('borrower')
      pushLog(`LoanPay tesSUCCESS — ${before.periodicPayment} XRP`)
    })
  }

  async function handleCustomPayment() {
    if (!wallets.borrower || !loanId) return
    await run(6, 'LoanPay', async () => {
      const before = await fetchLoan(loanId)
      setLoanBefore(before)
      const paid = await payLoan(wallets.borrower!, loanId, customPayment)
      const after = await fetchLoan(loanId)
      setLoan(after)
      setLoanAfter(after)
      setPaymentMade(true)
      setReceipts((r) => ({ ...r, 6: paid.receipt }))
      if (vaultId) setVault(await fetchVault(vaultId))
      if (loanBrokerId) setLoanBroker(await fetchLoanBroker(loanBrokerId))
      pushLog(`LoanPay tesSUCCESS — custom ${customPayment} XRP`)
    })
  }

  async function handleWithdraw() {
    if (!wallets.depositor || !vaultId || !vault) return
    await run(7, 'VaultWithdraw', async () => {
      const before = await fetchVault(vaultId)
      const shares = await fetchMptAmount(wallets.depositor!.address, before.shareMptId)
      setWithdrawBefore({ shares, available: before.assetsAvailable })
      const requested = parseXrpNumber(withdrawAmount)
      if (parseXrpNumber(before.assetsAvailable) + 1e-9 < requested) {
        throw new Error(
          `tecINSUFFICIENT_FUNDS: requested ${requested} XRP but Assets Available is ${before.assetsAvailable}`
        )
      }
      const wd = await withdrawVault(wallets.depositor!, vaultId, withdrawAmount)
      setVault(wd.vault)
      setVaultAfter(wd.vault)
      setDepositorShares(wd.shares)
      setWithdrawnXrp(String(parseXrpNumber(withdrawnXrp) + requested))
      setWithdrawMade(true)
      setReceipts((r) => ({ ...r, 7: wd.receipt }))
      await refreshRole('depositor')
      pushLog(`VaultWithdraw tesSUCCESS — ${withdrawAmount} XRP, remaining shares ${wd.shares}`)
    })
  }

  async function handleVerify() {
    await run(8, 'Verify', async () => {
      if (vaultId) {
        const v = await fetchVault(vaultId)
        setVault(v)
        if (wallets.depositor) {
          setDepositorShares(await fetchMptAmount(wallets.depositor.address, v.shareMptId))
        }
      }
      if (loanBrokerId) setLoanBroker(await fetchLoanBroker(loanBrokerId))
      if (loanId) setLoan(await fetchLoan(loanId))
      for (const role of ROLES) await refreshRole(role)
      if (loanBrokerId) {
        const list = await listLoans({
          loanBrokerId,
          brokerPseudoAccount: loanBroker?.account,
          borrowerAddress: wallets.borrower?.address,
          knownIds: loanIds
        })
        setLoans(list)
      }
      setVerified(true)
      pushLog('Final state re-queried from validated ledger')
    })
  }

  const outstandingLending = Math.max(
    0,
    parseXrpNumber(vault?.assetsTotal) - parseXrpNumber(vault?.assetsAvailable)
  )

  return (
    <div className="space-y-6 min-w-0 pb-10">
      <div className="rounded-xl border border-amber-700/70 bg-amber-950/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-amber-400 font-semibold">
            NETWORK: {NETWORK_LABEL}
          </div>
          <div className="text-xs text-amber-100/80 mt-1">
            Test assets only. DevNet XRP has no real-world value. This is not Mainnet.
          </div>
        </div>
        <div className="font-mono text-[11px] text-amber-200/80 break-all">{DEVNET_WSS}</div>
      </div>

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

      <header className="space-y-2">
        <h1 className="text-2xl font-bold">LIVE DEVNET WORKFLOW</h1>
        <p className="text-slate-400 text-sm">
          Guided XRPL Lending Protocol laboratory. Each step names the wallet, the native
          transaction, the prerequisites, and what the validated ledger returned. This lab uses a
          public <strong>closed-ended</strong> XRP vault because LendingProtocolV1_1 only allows a
          LoanBroker to attach to closed-ended vaults.
        </p>
        <ol className="text-sm text-slate-300 space-y-0.5 font-mono">
          <li>1. Fund Wallets</li>
          <li className="pl-2 text-slate-600">↓</li>
          <li>2. Configure &amp; Create Vault</li>
          <li className="pl-2 text-slate-600">↓</li>
          <li>3. Deposit Liquidity</li>
          <li className="pl-2 text-slate-600">↓</li>
          <li>4. Create Loan Broker</li>
          <li className="pl-2 text-slate-600">↓</li>
          <li>5. Originate Loan</li>
          <li className="pl-2 text-slate-600">↓</li>
          <li>6. Make Loan Payment</li>
          <li className="pl-2 text-slate-600">↓</li>
          <li>7. Withdraw from Vault</li>
          <li className="pl-2 text-slate-600">↓</li>
          <li>8. Verify Final State</li>
        </ol>
      </header>

      <ProgressBar statuses={statuses} />

      {vault && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Vault phase</div>
          <div className="text-sm font-semibold text-sky-300">{formatPhase(vaultPhase)}</div>
          <p className="text-xs text-slate-400">{phaseHint(vaultPhase, vault, ledgerTime)}</p>
          {vaultPhase === 'subscription' && (
            <p className="text-xs text-amber-300">
              Investment starts in {secondsUntil(vault.subscriptionDate, ledgerTime)}s — deposit and
              create the Loan Broker now.
            </p>
          )}
          {vaultPhase === 'investment' && (
            <p className="text-xs text-amber-300">
              Redemption in {secondsUntil(vault.redemptionDate, ledgerTime)}s — originate and pay the
              loan now. Withdrawals are locked (tecTOO_SOON).
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
        <h2 className="text-sm font-semibold">Reset DevNet Lab Session</h2>
        <p className="text-xs text-slate-400">
          Clears selected wallets, generated test credentials, cached VaultID / LoanBrokerID /
          LoanID, previous transaction hashes, UI completion state, and simulated values stored in
          this browser. {RESET_DISCLAIMER} For a truly fresh run, fund new test wallets so new
          ledger objects are created.
        </p>
        <Btn className="bg-slate-700 hover:bg-slate-600" onClick={resetSession}>
          Reset DevNet Lab Session
        </Btn>
      </div>

      <StepCard id={1} status={statuses[1]} wallet="Vault Owner / Broker, Depositor, Borrower">
        <p className="text-xs text-slate-500">
          Prerequisites: none. Next: {nextActionFor(1, statuses[1], snapshot)}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ROLES.map((role) => (
            <div key={role} className="rounded-lg border border-slate-800 p-3 space-y-1">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                {ROLE_COPY[role].title}
              </div>
              <div className="text-[11px] text-slate-500">{ROLE_COPY[role].blurb}</div>
              <Kv label="Address" value={wallets[role]?.address ?? '—'} />
              <Kv label="DevNet XRP" value={`${formatXrp(balances[role], 4)} XRP`} />
              {role === 'depositor' && <Kv label="Vault Asset" value="XRP (native)" />}
              <div className="text-xs">
                Status:{' '}
                {funded[role] ? (
                  <span className="text-emerald-400">✓ Funded</span>
                ) : (
                  <span className="text-slate-500">Not funded</span>
                )}
              </div>
              <Btn
                disabled={busy?.step === 1}
                onClick={() => fundRole(role)}
                className="w-full"
              >
                {wallets[role] ? 'Re-fund from faucet' : 'Fund this wallet'}
              </Btn>
            </div>
          ))}
        </div>
        <ActionButton
          busy={busy?.key === 'fund-all'}
          onClick={fundAll}
        >
          Fund All Required Wallets
        </ActionButton>
        <ErrorBox guidance={errors[1] ?? null} />
        <TxDetails receipt={receipts[1]} />
        <p className="text-xs text-slate-500">Next recommended action: {nextActionFor(1, statuses[1], snapshot)}</p>
      </StepCard>

      <StepCard id={2} status={statuses[2]} wallet="Vault Owner / Loan Broker">
        <PrereqList checks={checksForStep(2, snapshot)} />
        <div className="rounded-lg border border-slate-800 p-3 space-y-2">
          <Kv label="Vault Asset" value="XRP" />
          <div>
            <label className="text-xs text-slate-500">
              Max Capacity
              <Tip text="Maximum amount of the selected asset this vault is permitted to hold. XRPL field: AssetsMaximum. It can be set on VaultCreate and later changed with VaultSet. This is not the maximum loan amount." />
            </label>
            <input
              className="w-full min-w-0 bg-slate-800 rounded px-2 py-1 text-sm mt-1"
              value={assetsMaximum}
              onChange={(e) => setAssetsMaximum(e.target.value)}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Maximum Capacity is the maximum amount of the selected asset that this vault is
              permitted to hold. XRPL exposes this as AssetsMaximum.
            </p>
          </div>
          <div className="inline-flex rounded-md border border-emerald-700 bg-emerald-950/40 px-2 py-1 text-xs text-emerald-300">
            PUBLIC VAULT
          </div>
          <div className="inline-flex rounded-md border border-sky-700 bg-sky-950/40 px-2 py-1 text-xs text-sky-300 ml-2">
            CLOSED-ENDED
          </div>
          <p className="text-[11px] text-slate-500">
            A public vault does not require credential-based authorization for depositors. This lab
            does not set tfVaultPrivate or a DomainID. Closed-ended (VaultKind=1) is required for
            LoanBrokerSet on DevNet with LendingProtocolV1_1. SubscriptionDate is ~45s after create;
            RedemptionDate is 180s after that. Deposit during subscription, originate during
            investment, withdraw after redemption.
          </p>
        </div>
        <ActionButton
          disabled={!isReady(checksForStep(2, snapshot))}
          busy={busy?.step === 2}
          onClick={handleCreateVault}
          requires={checksForStep(2, snapshot)}
        >
          Create Lending Vault
        </ActionButton>
        {vault && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-emerald-800/50 p-3">
            <Kv label="Vault ID" value={vault.vaultId} />
            <Kv label="Vault Owner" value={vault.owner || wallets.owner?.address} />
            <Kv label="Vault Pseudo-Account" value={vault.account} />
            <Kv label="Asset" value={vault.asset} />
            <Kv label="Maximum Capacity" value={`${vault.assetsMaximum} XRP`} />
            <Kv label="Assets Total" value={`${vault.assetsTotal} XRP`} />
            <Kv label="Assets Available" value={`${vault.assetsAvailable} XRP`} />
            <Kv label="Share Issuance ID" value={vault.shareMptId} />
            <Kv label="Vault Kind" value={vault.vaultKind === 1 ? 'CLOSED-ENDED (1)' : `OPEN-ENDED (${vault.vaultKind})`} />
            <Kv label="Subscription Date" value={vault.subscriptionIso} />
            <Kv label="Redemption Date" value={vault.redemptionIso} />
            <Kv label="Current Phase" value={`${formatPhase(vaultPhase)}${ledgerTime ? ` · ledger ${ledgerTime}` : ''}`} />
            <Kv label="Transaction Hash" value={receipts[2]?.hash} />
          </div>
        )}
        <ErrorBox guidance={errors[2] ?? null} />
        <TxDetails receipt={receipts[2]} />
        <p className="text-xs text-slate-500">Next recommended action: {nextActionFor(2, statuses[2], snapshot)}</p>
      </StepCard>

      <StepCard id={3} status={statuses[3]} wallet="Depositor">
        <div className="text-xs text-slate-400">Before deposit</div>
        <PrereqList checks={checksForStep(3, snapshot)} />
        <label className="text-xs text-slate-500">Deposit amount (XRP)</label>
        <input
          className="w-full max-w-xs bg-slate-800 rounded px-2 py-1 text-sm"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
        />
        <ActionButton
          disabled={!isReady(checksForStep(3, snapshot))}
          busy={busy?.step === 3}
          onClick={handleDeposit}
          requires={checksForStep(3, snapshot)}
        >
          Deposit Into Vault
        </ActionButton>
        {(vaultBefore || vaultAfter) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-slate-800 p-3 space-y-1">
              <div className="text-xs text-slate-500">BEFORE</div>
              <Kv label="Vault Assets Total" value={`${vaultBefore?.assetsTotal ?? '—'} XRP`} />
              <Kv label="Assets Available" value={`${vaultBefore?.assetsAvailable ?? '—'} XRP`} />
            </div>
            <div className="rounded-lg border border-slate-800 p-3 space-y-1">
              <div className="text-xs text-slate-500">AFTER</div>
              <Kv label="Vault Assets Total" value={`${vaultAfter?.assetsTotal ?? vault?.assetsTotal} XRP`} />
              <Kv label="Assets Available" value={`${vaultAfter?.assetsAvailable ?? vault?.assetsAvailable} XRP`} />
              <Kv label="Depositor vault shares" value={depositorShares} />
            </div>
          </div>
        )}
        <ErrorBox guidance={errors[3] ?? null} />
        <TxDetails receipt={receipts[3]} />
        <p className="text-xs text-slate-500">Next recommended action: {nextActionFor(3, statuses[3], snapshot)}</p>
      </StepCard>

      <StepCard id={4} status={statuses[4]} wallet="Vault Owner / Loan Broker">
        <p className="text-xs text-slate-400">
          Secondary label: <strong>Initialize Protocol Loan Book</strong>. ProtocolLoanBook is a
          Lab/JRPU UI concept. The XRPL ledger object is <code>LoanBroker</code>.
        </p>
        <PrereqList checks={checksForStep(4, snapshot)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <Kv label="Vault" value={vaultId || '—'} />
          <Kv label="Management Fee" value="1% (ManagementFeeRate = 1000 tenths of a basis point)" />
          <Kv
            label="First-Loss Configuration"
            value="CoverRateMinimum = 0 (optional). First-loss capital is not required for this public-vault lab run."
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            disabled={!isReady(checksForStep(4, snapshot)) || Boolean(loanBroker)}
            busy={busy?.step === 4}
            onClick={handleCreateBroker}
            requires={checksForStep(4, snapshot)}
          >
            Create Loan Broker
          </ActionButton>
          <Btn className="bg-slate-700 hover:bg-slate-600" onClick={openLoanBook}>
            Protocol Loan Book
          </Btn>
        </div>
        {loanBroker && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-emerald-800/50 p-3">
            <div className="sm:col-span-2 font-semibold text-emerald-300">LOAN BROKER CREATED</div>
            <Kv label="LoanBroker ID" value={loanBroker.loanBrokerId} />
            <Kv label="Vault ID" value={loanBroker.vaultId} />
            <Kv label="Broker Account" value={loanBroker.owner || wallets.owner?.address} />
            <Kv label="Broker Pseudo-Account" value={loanBroker.account} />
            <Kv label="Management Fee" value={tenthsOfBpsToPercent(loanBroker.managementFeeRate)} />
            <Kv label="Transaction" value={receipts[4]?.hash} />
            <div className="sm:col-span-2 text-emerald-400 text-sm">STEP 4 ✓ COMPLETE</div>
          </div>
        )}
        <ErrorBox guidance={errors[4] ?? null} />
        <TxDetails receipt={receipts[4]} />
        {loanBookOpen && (
          <div className="rounded-xl border border-indigo-800/60 bg-slate-950 p-4 space-y-3">
            <h3 className="font-semibold">PROTOCOL LOAN BOOK</h3>
            <p className="text-xs text-slate-500">
              Lab view of loans associated with this session&apos;s LoanBroker. Not an XRPL ledger
              type named ProtocolLoanBook.
            </p>
            {loanBroker ? (
              <>
                <Kv label="Broker" value={loanBroker.owner || wallets.owner?.address} />
                <Kv label="Vault" value={loanBroker.vaultId} />
                <Kv label="Active Loans" value={String(loans.length || loanBroker.ownerCount || 0)} />
                {loans.length === 0 && !loan ? (
                  <div className="rounded-lg border border-slate-800 p-3 text-sm">
                    <div className="font-semibold">NO LOANS YET</div>
                    <p className="text-slate-400 mt-1">
                      The Loan Broker exists, but no loans have been originated.
                    </p>
                    <p className="mt-2">
                      Next Step:{' '}
                      <button
                        type="button"
                        className="text-indigo-300 underline"
                        onClick={() =>
                          document.getElementById('lab-step-5')?.scrollIntoView({ behavior: 'smooth' })
                        }
                      >
                        Originate your first loan.
                      </button>
                    </p>
                  </div>
                ) : (
                  (loans.length ? loans : loan ? [loan] : []).map((l) => (
                    <div key={l.loanId} className="rounded-lg border border-slate-800 p-3 space-y-1">
                      <div className="font-mono text-xs text-slate-500">Loan {short(l.loanId)}</div>
                      <Kv label="Borrower" value={l.borrower} />
                      <Kv label="Outstanding" value={`${l.principalOutstanding} XRP`} />
                      <Kv label="APR" value={tenthsOfBpsToPercent(l.interestRate)} />
                      <Kv
                        label="Status"
                        value={l.defaulted ? 'Defaulted' : l.impaired ? 'Impaired' : 'Active'}
                      />
                      <Kv label="Next Payment" value={l.nextPaymentDueIso} />
                    </div>
                  ))
                )}
              </>
            ) : (
              <div className="text-sm">
                Requires a LoanBroker. Use Create Loan Broker above — this button now opens this
                panel instead of silently no-opping.
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-slate-500">Next recommended action: {nextActionFor(4, statuses[4], snapshot)}</p>
      </StepCard>

      <StepCard id={5} status={statuses[5]} wallet="Loan Broker and Borrower (cosign)">
        <PrereqList checks={checksForStep(5, snapshot)} />
        {!loanBroker && (
          <button
            type="button"
            className="text-sm text-indigo-300 underline"
            onClick={() => document.getElementById('lab-step-4')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Create Loan Broker
          </button>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">
              Borrower
              <Tip text="Account that will receive principal and must later submit LoanPay." />
            </label>
            <div className="font-mono text-sm break-all">{wallets.borrower?.address ?? '—'}</div>
          </div>
          <div>
            <label className="text-xs text-slate-500">
              Principal Requested
              <Tip text="Amount being borrowed from vault liquidity, in XRP." />
            </label>
            <input
              className="w-full bg-slate-800 rounded px-2 py-1 text-sm"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">
              Annual Interest Rate
              <Tip text="Annualized borrowing rate. Submitted as XRPL InterestRate in tenths of a basis point (8% = 8000)." />
            </label>
            <input
              className="w-full bg-slate-800 rounded px-2 py-1 text-sm"
              value={aprPercent}
              onChange={(e) => setAprPercent(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">
              Number of Payments
              <Tip text="Payment Total — how many scheduled installments. This lab defaults to 1 so the loan matures inside the 180-second investment window." />
            </label>
            <input
              className="w-full bg-slate-800 rounded px-2 py-1 text-sm"
              value={paymentTotal}
              onChange={(e) => setPaymentTotal(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">
              Payment Interval (seconds)
              <Tip text="Time between required payments. This lab defaults to 60 seconds so a 1-payment loan fits the 180-second closed-ended investment window (final payment + 60s buffer ≤ RedemptionDate)." />
            </label>
            <input
              className="w-full bg-slate-800 rounded px-2 py-1 text-sm"
              value={paymentInterval}
              onChange={(e) => setPaymentInterval(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">
              Grace Period (seconds)
              <Tip text="Seconds after a missed payment before the loan can be defaulted. Leave 0 to omit the field and use the protocol default. Must not exceed Payment Interval if set." />
            </label>
            <input
              className="w-full bg-slate-800 rounded px-2 py-1 text-sm"
              value={gracePeriod}
              onChange={(e) => setGracePeriod(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">
              Origination Fee (XRP)
              <Tip text="One-time fee taken from principal at LoanSet. Leave 0 for this lab." />
            </label>
            <input
              className="w-full bg-slate-800 rounded px-2 py-1 text-sm"
              value={originationFee}
              onChange={(e) => setOriginationFee(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">
              Service Fee (XRP)
              <Tip text="Fee charged with every loan payment. Leave 0 for this lab." />
            </label>
            <input
              className="w-full bg-slate-800 rounded px-2 py-1 text-sm"
              value={serviceFee}
              onChange={(e) => setServiceFee(e.target.value)}
            />
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 p-3 text-xs font-mono text-slate-300 space-y-1">
          <div>Signing flow</div>
          <div>1. Loan Broker signs {signingStep.includes('1') ? '←' : ''}</div>
          <div>↓</div>
          <div>2. Borrower signs</div>
          <div>↓</div>
          <div>3. Fully signed LoanSet submitted</div>
          <div>↓</div>
          <div>4. XRPL validates</div>
          <div>↓</div>
          <div>5. Loan object created</div>
        </div>
        <ActionButton
          disabled={!isReady(checksForStep(5, snapshot))}
          busy={busy?.step === 5}
          onClick={handleCreateLoan}
          requires={checksForStep(5, snapshot)}
        >
          Originate Loan
        </ActionButton>
        {loan && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-emerald-800/50 p-3">
            <Kv label="Loan ID" value={loan.loanId} />
            <Kv label="Borrower" value={loan.borrower} />
            <Kv label="Principal outstanding" value={`${loan.principalOutstanding} XRP`} />
            <Kv label="Interest Rate" value={tenthsOfBpsToPercent(loan.interestRate)} />
            <Kv label="Payment Amount" value={`${loan.periodicPayment} XRP`} />
            <Kv label="Number of Payments remaining" value={String(loan.paymentRemaining ?? '—')} />
            <Kv label="Next Payment Due" value={loan.nextPaymentDueIso} />
            <Kv
              label="Loan Status"
              value={loan.defaulted ? 'Defaulted' : loan.impaired ? 'Impaired' : 'Active'}
            />
            <Kv label="Transaction Hash" value={receipts[5]?.hash} />
          </div>
        )}
        <ErrorBox guidance={errors[5] ?? null} />
        <TxDetails receipt={receipts[5]} />
        <p className="text-xs text-slate-500">Next recommended action: {nextActionFor(5, statuses[5], snapshot)}</p>
      </StepCard>

      <StepCard id={6} status={statuses[6]} wallet="Borrower">
        <p className="text-xs text-slate-400">
          Only the borrower on this Loan can submit <code>LoanPay</code>. An on-time (regular)
          installment must be submitted <strong>before</strong> Next Payment Due. Waiting until that
          timestamp makes the payment late: a regular LoanPay then returns <code>tecEXPIRED</code>
          unless <code>tfLoanLatePayment</code> is set.
        </p>
        <PrereqList checks={checksForStep(6, snapshot)} />
        {loan && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Kv label="Outstanding Principal" value={`${loan.principalOutstanding} XRP`} />
            <Kv label="Next Payment" value={`${loan.periodicPayment} XRP`} />
            <Kv label="Next Due" value={loan.nextPaymentDueIso} />
            <Kv label="Payments Remaining" value={String(loan.paymentRemaining ?? '—')} />
            <Kv
              label="Payment type"
              value={
                isLoanPayLate(ledgerTime, loan.nextPaymentDueDate)
                  ? 'LATE — will set tfLoanLatePayment'
                  : 'REGULAR (on-time)'
              }
            />
          </div>
        )}
        <ActionButton
          disabled={!isReady(checksForStep(6, snapshot))}
          busy={busy?.key === 'LoanPay' && busy?.step === 6}
          onClick={handleRequiredPayment}
          requires={checksForStep(6, snapshot)}
        >
          Make Required Payment
        </ActionButton>
        <button
          type="button"
          className="text-xs text-indigo-300 underline"
          onClick={() => setShowCustomPay((v) => !v)}
        >
          Custom Payment
        </button>
        {showCustomPay && (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="min-w-0 flex-1 bg-slate-800 rounded px-2 py-1 text-sm"
              value={customPayment}
              onChange={(e) => setCustomPayment(e.target.value)}
              placeholder="XRP amount"
            />
            <Btn disabled={!loan || busy?.step === 6} onClick={handleCustomPayment}>
              Submit custom LoanPay
            </Btn>
          </div>
        )}
        {(loanBefore || loanAfter) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-800 p-3">
              <div className="text-xs text-slate-500">BEFORE</div>
              <Kv label="Outstanding Principal" value={loanBefore?.principalOutstanding} />
              <Kv label="Next Payment" value={loanBefore?.periodicPayment} />
              <Kv label="Payments Remaining" value={String(loanBefore?.paymentRemaining ?? '—')} />
            </div>
            <div className="rounded-lg border border-slate-800 p-3">
              <div className="text-xs text-slate-500">AFTER</div>
              <Kv label="Outstanding Principal" value={loanAfter?.principalOutstanding} />
              <Kv label="Next Payment" value={loanAfter?.periodicPayment} />
              <Kv label="Payments Remaining" value={String(loanAfter?.paymentRemaining ?? '—')} />
            </div>
          </div>
        )}
        <ErrorBox guidance={errors[6] ?? null} />
        <TxDetails receipt={receipts[6]} />
        <p className="text-xs text-slate-500">Next recommended action: {nextActionFor(6, statuses[6], snapshot)}</p>
      </StepCard>

      <StepCard id={7} status={statuses[7]} wallet="Depositor">
        <p className="text-xs text-slate-400">
          A vault may show Assets Total of {vault?.assetsTotal ?? '—'} XRP but Assets Available of{' '}
          {vault?.assetsAvailable ?? '—'} XRP because capital may be committed to loans. Those
          numbers are not the same thing.
        </p>
        <PrereqList checks={checksForStep(7, snapshot)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Kv label="Your Vault Shares" value={depositorShares} />
          <Kv label="Estimated Redeemable Assets" value={`${vault?.assetsAvailable ?? '0'} XRP`} />
          <Kv label="Vault Assets Available" value={`${vault?.assetsAvailable ?? '0'} XRP`} />
          <div>
            <label className="text-xs text-slate-500">Requested Withdrawal (XRP)</label>
            <input
              className="w-full bg-slate-800 rounded px-2 py-1 text-sm"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
          </div>
        </div>
        <ActionButton
          disabled={!isReady(checksForStep(7, snapshot))}
          busy={busy?.step === 7}
          onClick={handleWithdraw}
          requires={checksForStep(7, snapshot)}
        >
          Withdraw From Vault
        </ActionButton>
        {withdrawBefore && (
          <div className="text-xs text-slate-400">
            Before: shares {withdrawBefore.shares}, available {withdrawBefore.available} XRP. After
            shares {depositorShares}, available {vault?.assetsAvailable} XRP.
          </div>
        )}
        <ErrorBox guidance={errors[7] ?? null} />
        <TxDetails receipt={receipts[7]} />
        <p className="text-xs text-slate-500">Next recommended action: {nextActionFor(7, statuses[7], snapshot)}</p>
      </StepCard>

      <StepCard id={8} status={statuses[8]} wallet="Read-only ledger queries">
        <PrereqList checks={checksForStep(8, snapshot)} />
        <ActionButton busy={busy?.step === 8} onClick={handleVerify}>
          Refresh Final State From Ledger
        </ActionButton>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-800 p-3 space-y-1">
            <h3 className="font-semibold text-sm">VAULT</h3>
            <Kv label="Vault ID" value={vault?.vaultId} />
            <Kv label="Max Capacity" value={`${vault?.assetsMaximum ?? '—'} XRP`} />
            <Kv label="Assets Total" value={`${vault?.assetsTotal ?? '—'} XRP`} />
            <Kv label="Assets Available" value={`${vault?.assetsAvailable ?? '—'} XRP`} />
            <Kv label="Outstanding Lending" value={`${formatXrp(outstandingLending)} XRP`} />
            <Kv label="Vault Kind" value={vault?.vaultKind === 1 ? 'CLOSED-ENDED' : 'OPEN-ENDED'} />
            <Kv label="Phase" value={formatPhase(vaultPhase)} />
          </div>
          <div className="rounded-lg border border-slate-800 p-3 space-y-1">
            <h3 className="font-semibold text-sm">DEPOSITOR</h3>
            <Kv label="Asset Balance" value={`${formatXrp(balances.depositor, 4)} XRP`} />
            <Kv label="Vault Shares" value={depositorShares} />
            <Kv label="Deposited" value={`${depositedXrp} XRP`} />
            <Kv label="Withdrawn" value={`${withdrawnXrp} XRP`} />
          </div>
          <div className="rounded-lg border border-slate-800 p-3 space-y-1">
            <h3 className="font-semibold text-sm">LOAN BROKER</h3>
            <Kv label="LoanBroker ID" value={loanBroker?.loanBrokerId} />
            <Kv label="Vault" value={loanBroker?.vaultId} />
            <Kv label="Loans" value={String(loans.length || loanBroker?.ownerCount || 0)} />
            <Kv
              label="First-Loss / Cover"
              value={`${loanBroker?.coverAvailable ?? '0'} XRP (not required for this lab)`}
            />
          </div>
          <div className="rounded-lg border border-slate-800 p-3 space-y-1">
            <h3 className="font-semibold text-sm">BORROWER</h3>
            <Kv label="Loan ID" value={loan?.loanId} />
            <Kv label="Outstanding Principal" value={`${loan?.principalOutstanding ?? '—'} XRP`} />
            <Kv
              label="Payments Made"
              value={
                loan
                  ? String(
                      Math.max(
                        0,
                        parseInt(paymentTotal, 10) - (loan.paymentRemaining ?? parseInt(paymentTotal, 10))
                      )
                    )
                  : '—'
              }
            />
            <Kv label="Next Payment" value={`${loan?.periodicPayment ?? '—'} XRP`} />
            <Kv
              label="Status"
              value={loan ? (loan.defaulted ? 'Defaulted' : loan.impaired ? 'Impaired' : 'Active') : '—'}
            />
          </div>
        </div>
        <ErrorBox guidance={errors[8] ?? null} />
        <p className="text-xs text-slate-500">Next recommended action: {nextActionFor(8, statuses[8], snapshot)}</p>
      </StepCard>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Activity Log</h2>
        <div className="font-mono text-xs space-y-1 max-h-64 overflow-y-auto mt-2">
          {log.length === 0 && <div className="text-slate-600">No activity yet.</div>}
          {log.map((l, i) => (
            <div key={i} className="text-slate-400 break-words">
              {l}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
