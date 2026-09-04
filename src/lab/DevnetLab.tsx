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
  manageLoan,
  deleteLoan,
  fetchLoan,
  fetchLoanBroker,
  TF_LOAN_DEFAULT,
  TF_LOAN_IMPAIR,
  TF_LOAN_UNIMPAIR,
  type VaultInfo,
  type LoanInfo,
  type LoanBrokerInfo
} from '../lib/xrpl'
import { Btn, Card, Stat } from '../ui'

type Role = 'owner' | 'depositor' | 'borrower'

const STORAGE_KEY = 'jrpu-devnet-session'
const ROLES: Role[] = ['owner', 'depositor', 'borrower']

type Session = {
  seeds: Partial<Record<Role, string>>
  vaultId: string
  loanBrokerId: string
  loanId: string
}

function emptyWallets(): Record<Role, Wallet | null> {
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
  const next = emptyWallets()
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

const ROLE_LABEL: Record<Role, string> = {
  owner: 'Protocol operator',
  depositor: 'Depositor',
  borrower: 'Borrower'
}

function short(addr?: string) {
  if (!addr) return '—'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export default function DevnetLab() {
  const [session] = useState(loadSession)
  const [wallets, setWallets] = useState<Record<Role, Wallet | null>>(() =>
    walletsFromSeeds(session.seeds)
  )
  const [busy, setBusy] = useState<string | null>(null)
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

  function pushLog(msg: string) {
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...l].slice(0, 30))
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
            pushLog(`Restored vault ${short(restoredVaultId)}`)
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
            pushLog(`Restored protocol loan book ${short(restoredBrokerId)}`)
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
            pushLog(`Restored loan ${short(restoredLoanId)}`)
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
    setWallets(emptyWallets())
    setVaultId('')
    setVault(null)
    setLoanBrokerId('')
    setLoanBroker(null)
    setLoanId('')
    setLoan(null)
    pushLog('Session cleared')
  }

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key)
    try {
      await fn()
    } catch (e: any) {
      pushLog(`ERROR: ${e.message ?? e}`)
    } finally {
      setBusy(null)
    }
  }

  async function fundRole(role: Role) {
    await run(`fund-${role}`, async () => {
      const w = await fundNewWallet()
      setWallets((prev) => ({ ...prev, [role]: w }))
      pushLog(`Funded ${ROLE_LABEL[role]} wallet ${short(w.address)}`)
    })
  }

  async function handleCreateVault() {
    if (!wallets.owner) return
    await run('create-vault', async () => {
      const { vaultId: id } = await createVault(wallets.owner!, {
        assetsMaximumXrp: assetsMaximum,
        data: 'JRPU Lending Protocol devnet test vault'
      })
      setVaultId(id)
      pushLog(`VaultCreate ok — VaultID ${short(id)}`)
      setVault(await fetchVault(id))
    })
  }

  async function handleRefreshVault() {
    if (!vaultId) return
    await run('refresh-vault', async () => {
      setVault(await fetchVault(vaultId))
      pushLog('Vault refreshed')
    })
  }

  async function handleDeposit() {
    if (!wallets.depositor || !vaultId) return
    await run('deposit', async () => {
      await depositVault(wallets.depositor!, vaultId, depositAmount)
      pushLog(`VaultDeposit ${depositAmount} XRP by ${short(wallets.depositor!.address)}`)
      setVault(await fetchVault(vaultId))
    })
  }

  async function handleWithdraw() {
    if (!wallets.depositor || !vaultId) return
    await run('withdraw', async () => {
      await withdrawVault(wallets.depositor!, vaultId, withdrawAmount)
      pushLog(`VaultWithdraw ${withdrawAmount} XRP by ${short(wallets.depositor!.address)}`)
      setVault(await fetchVault(vaultId))
    })
  }

  async function handleCreateLoanBook() {
    if (!wallets.owner || !vaultId) return
    await run('create-broker', async () => {
      const { loanBrokerId: id } = await createLoanBroker(wallets.owner!, vaultId, {
        managementFeeRateBps: 200
      })
      setLoanBrokerId(id)
      pushLog(`LoanBrokerSet ok — protocol loan book ${short(id)}`)
      setLoanBroker(await fetchLoanBroker(id))
    })
  }

  async function handleDepositCover() {
    if (!wallets.owner || !loanBrokerId) return
    await run('deposit-cover', async () => {
      await depositCover(wallets.owner!, loanBrokerId, coverAmount)
      pushLog(`LoanBrokerCoverDeposit ${coverAmount} XRP`)
      setLoanBroker(await fetchLoanBroker(loanBrokerId))
    })
  }

  async function handleWithdrawCover() {
    if (!wallets.owner || !loanBrokerId) return
    await run('withdraw-cover', async () => {
      await withdrawCover(wallets.owner!, loanBrokerId, coverWithdrawAmount)
      pushLog(`LoanBrokerCoverWithdraw ${coverWithdrawAmount} XRP`)
      setLoanBroker(await fetchLoanBroker(loanBrokerId))
    })
  }

  async function handleCreateLoan() {
    if (!wallets.owner || !wallets.borrower || !loanBrokerId) return
    await run('create-loan', async () => {
      const bps10 = Math.round(parseFloat(aprPercent) * 1000)
      const { loanId: id } = await createLoan(wallets.owner!, wallets.borrower!, loanBrokerId, {
        principalXrp: principal,
        interestRateBps: bps10,
        paymentTotal: parseInt(paymentTotal, 10),
        paymentIntervalSeconds: 2592000
      })
      setLoanId(id)
      pushLog(`LoanSet ok — LoanID ${short(id)}`)
      setLoan(await fetchLoan(id))
    })
  }

  async function handlePayLoan() {
    if (!wallets.borrower || !loanId) return
    await run('pay-loan', async () => {
      await payLoan(wallets.borrower!, loanId, paymentAmount)
      pushLog(`LoanPay ${paymentAmount} XRP`)
      setLoan(await fetchLoan(loanId))
      if (vaultId) setVault(await fetchVault(vaultId))
      if (loanBrokerId) setLoanBroker(await fetchLoanBroker(loanBrokerId))
    })
  }

  async function handlePayFull() {
    if (!wallets.borrower || !loanId || !loan) return
    await run('pay-full', async () => {
      await payLoanFull(wallets.borrower!, loanId, loan.totalValueOutstanding)
      pushLog(`LoanPay full ${loan.totalValueOutstanding} XRP`)
      setLoan(await fetchLoan(loanId))
      if (vaultId) setVault(await fetchVault(vaultId))
      if (loanBrokerId) setLoanBroker(await fetchLoanBroker(loanBrokerId))
    })
  }

  async function handleManage(
    flag: typeof TF_LOAN_DEFAULT | typeof TF_LOAN_IMPAIR | typeof TF_LOAN_UNIMPAIR,
    label: string
  ) {
    if (!wallets.owner || !loanId) return
    await run(`manage-${label}`, async () => {
      await manageLoan(wallets.owner!, loanId, flag)
      pushLog(`LoanManage ${label}`)
      setLoan(await fetchLoan(loanId))
      if (vaultId) setVault(await fetchVault(vaultId))
      if (loanBrokerId) setLoanBroker(await fetchLoanBroker(loanBrokerId))
    })
  }

  async function handleDeleteLoan() {
    if (!wallets.owner || !loanId) return
    await run('delete-loan', async () => {
      await deleteLoan(wallets.owner!, loanId)
      pushLog(`LoanDelete ${short(loanId)}`)
      setLoanId('')
      setLoan(null)
      if (loanBrokerId) setLoanBroker(await fetchLoanBroker(loanBrokerId))
    })
  }

  const assetsTotal = vault ? parseFloat(vault.assetsTotal) : 0
  const assetsAvailable = vault ? parseFloat(vault.assetsAvailable) : 0
  const assetsCap = vault ? parseFloat(vault.assetsMaximum) : 0
  const utilization = assetsTotal > 0 ? ((assetsTotal - assetsAvailable) / assetsTotal) * 100 : 0
  const capacityUsed = assetsCap > 0 ? (assetsTotal / assetsCap) * 100 : 0

  return (
    <div className="space-y-6 min-w-0">
      <header>
        <h1 className="text-2xl font-bold">Live Devnet Lab</h1>
        <p className="text-slate-400 text-sm mt-1">
          Real XLS-65 / XLS-66 transactions on XRPL Devnet. Test assets only. The protocol
          operator wallet creates the vault and signs loan origination — that is infrastructure,
          not ownership of depositor capital.
        </p>
      </header>

      <Card title="Wallets">
        <p className="text-xs text-slate-500">
          Three parties: protocol operator, depositor, borrower. Seeds stay in this browser only.
          Never paste a mainnet seed.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ROLES.map((role) => (
            <div key={role} className="space-y-2">
              <div className="text-xs text-slate-500">{ROLE_LABEL[role]}</div>
              <div className="font-mono text-sm break-all">{short(wallets[role]?.address)}</div>
              <Btn disabled={busy === `fund-${role}`} onClick={() => fundRole(role)}>
                {wallets[role] ? 'Re-fund' : 'Fund wallet'}
              </Btn>
            </div>
          ))}
        </div>
        <Btn className="bg-slate-700 hover:bg-slate-600" onClick={clearSession}>
          Clear session
        </Btn>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 min-w-0">
        <Card title="Vault">
          <div className="space-y-2">
            <label className="text-xs text-slate-500">Max vault capacity (XRP)</label>
            <input
              className="w-full min-w-0 bg-slate-800 rounded px-2 py-1 text-sm"
              value={assetsMaximum}
              onChange={(e) => setAssetsMaximum(e.target.value)}
            />
            <Btn disabled={!wallets.owner || busy === 'create-vault'} onClick={handleCreateVault}>
              Create vault (protocol)
            </Btn>
          </div>

          {vaultId && (
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="text-xs font-mono text-slate-400 break-all">VaultID: {vaultId}</div>
              <Btn disabled={busy === 'refresh-vault'} onClick={handleRefreshVault}>
                Refresh
              </Btn>

              {vault && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Stat label="Assets Total" value={`${vault.assetsTotal} XRP`} />
                  <Stat label="Available to lend" value={`${vault.assetsAvailable} XRP`} />
                  <Stat label="Max Capacity" value={`${vault.assetsMaximum} XRP`} />
                  <Stat label="Utilization" value={`${utilization.toFixed(1)}%`} />
                  <Stat label="Capacity used" value={`${capacityUsed.toFixed(3)}%`} />
                  <Stat label="Loss unrealized" value={`${vault.lossUnrealized} XRP`} />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1 min-w-0">
                  <input
                    className="w-full min-w-0 bg-slate-800 rounded px-2 py-1 text-sm"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                  <Btn
                    disabled={!wallets.depositor || busy === 'deposit'}
                    onClick={handleDeposit}
                    className="w-full"
                  >
                    Deposit
                  </Btn>
                </div>
                <div className="space-y-1 min-w-0">
                  <input
                    className="w-full min-w-0 bg-slate-800 rounded px-2 py-1 text-sm"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <Btn
                    disabled={!wallets.depositor || busy === 'withdraw'}
                    onClick={handleWithdraw}
                    className="w-full"
                  >
                    Withdraw
                  </Btn>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card title="Protocol loan book">
          <p className="text-xs text-slate-500">
            XRPL names this object <code>LoanBroker</code>. Here it is protocol infrastructure —
            not a person arranging the deal. Only the protocol operator can create it or post
            first-loss cover.
          </p>
          <Btn
            disabled={!wallets.owner || !vaultId || busy === 'create-broker'}
            onClick={handleCreateLoanBook}
          >
            Open loan book (protocol)
          </Btn>

          {loanBrokerId && (
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="text-xs font-mono text-slate-400 break-all">
                LoanBrokerID: {loanBrokerId}
              </div>
              {loanBroker && (
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Debt Total" value={`${loanBroker.debtTotal} XRP`} />
                  <Stat label="Cover Available" value={`${loanBroker.coverAvailable} XRP`} />
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                <input
                  className="min-w-0 w-full sm:flex-1 bg-slate-800 rounded px-2 py-1 text-sm"
                  value={coverAmount}
                  onChange={(e) => setCoverAmount(e.target.value)}
                />
                <Btn disabled={!wallets.owner || busy === 'deposit-cover'} onClick={handleDepositCover}>
                  Deposit first-loss cover
                </Btn>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                <input
                  className="min-w-0 w-full sm:flex-1 bg-slate-800 rounded px-2 py-1 text-sm"
                  value={coverWithdrawAmount}
                  onChange={(e) => setCoverWithdrawAmount(e.target.value)}
                />
                <Btn
                  disabled={!wallets.owner || busy === 'withdraw-cover'}
                  onClick={handleWithdrawCover}
                >
                  Withdraw cover
                </Btn>
              </div>
            </div>
          )}
        </Card>

        <Card title="Originate loan">
          <p className="text-xs text-slate-500">
            Protocol and borrower both sign. Depositors do not sign each loan — they already
            agreed to vault terms when they deposited.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="min-w-0">
              <label className="text-xs text-slate-500">Principal (XRP)</label>
              <input
                className="w-full min-w-0 bg-slate-800 rounded px-2 py-1 text-sm"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
              />
            </div>
            <div className="min-w-0">
              <label className="text-xs text-slate-500">Borrower APR %</label>
              <input
                className="w-full min-w-0 bg-slate-800 rounded px-2 py-1 text-sm"
                value={aprPercent}
                onChange={(e) => setAprPercent(e.target.value)}
              />
            </div>
            <div className="min-w-0">
              <label className="text-xs text-slate-500"># Payments</label>
              <input
                className="w-full min-w-0 bg-slate-800 rounded px-2 py-1 text-sm"
                value={paymentTotal}
                onChange={(e) => setPaymentTotal(e.target.value)}
              />
            </div>
          </div>
          <Btn
            disabled={!wallets.owner || !wallets.borrower || !loanBrokerId || busy === 'create-loan'}
            onClick={handleCreateLoan}
          >
            Originate loan
          </Btn>

          {loanId && loan && (
            <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-3">
              <div className="col-span-2 text-xs font-mono text-slate-400 break-all">
                LoanID: {loanId}
              </div>
              <Stat label="Principal Outstanding" value={`${loan.principalOutstanding} XRP`} />
              <Stat label="Total Owed" value={`${loan.totalValueOutstanding} XRP`} />
              <Stat label="Interest Rate" value={`${(loan.interestRate / 1000).toFixed(2)}%`} />
              <Stat label="Payments Remaining" value={`${loan.paymentRemaining ?? '—'}`} />
              <Stat
                label="Status"
                value={loan.defaulted ? 'Defaulted' : loan.impaired ? 'Impaired' : 'Active'}
              />
              <div className="col-span-2 flex flex-wrap gap-2">
                <Btn
                  disabled={!wallets.owner || loan.impaired || loan.defaulted || busy === 'manage-impair'}
                  onClick={() => handleManage(TF_LOAN_IMPAIR, 'impair')}
                >
                  Impair
                </Btn>
                <Btn
                  disabled={!wallets.owner || !loan.impaired || loan.defaulted || busy === 'manage-unimpair'}
                  onClick={() => handleManage(TF_LOAN_UNIMPAIR, 'unimpair')}
                >
                  Unimpair
                </Btn>
                <Btn
                  disabled={!wallets.owner || loan.defaulted || busy === 'manage-default'}
                  onClick={() => handleManage(TF_LOAN_DEFAULT, 'default')}
                  className="bg-rose-700 hover:bg-rose-600"
                >
                  Default (needs grace elapsed)
                </Btn>
                <Btn
                  disabled={
                    !wallets.owner || (loan.paymentRemaining ?? 1) > 0 || busy === 'delete-loan'
                  }
                  onClick={handleDeleteLoan}
                >
                  Delete loan
                </Btn>
              </div>
            </div>
          )}
        </Card>

        <Card title="Repayment">
          <div className="flex flex-col sm:flex-row gap-2 min-w-0">
            <input
              className="min-w-0 w-full sm:flex-1 bg-slate-800 rounded px-2 py-1 text-sm"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
            <Btn disabled={!wallets.borrower || !loanId || busy === 'pay-loan'} onClick={handlePayLoan}>
              Make payment
            </Btn>
          </div>
          <Btn
            disabled={!wallets.borrower || !loanId || !loan || busy === 'pay-full'}
            onClick={handlePayFull}
            className="w-full sm:w-auto whitespace-normal break-words"
          >
            Pay off in full ({loan ? `${loan.totalValueOutstanding} XRP` : '—'})
          </Btn>
        </Card>
      </div>

      <Card title="Activity Log">
        <div className="font-mono text-xs space-y-1 max-h-64 overflow-y-auto overflow-x-hidden">
          {log.length === 0 && <div className="text-slate-600">No activity yet.</div>}
          {log.map((l, i) => (
            <div key={i} className="text-slate-400 break-words">
              {l}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
