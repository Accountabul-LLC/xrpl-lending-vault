import { useState } from 'react'
import type { Wallet } from 'xrpl'
import {
  fundNewWallet,
  createVault,
  depositVault,
  withdrawVault,
  fetchVault,
  createLoanBroker,
  depositCover,
  createLoan,
  payLoan,
  fetchLoan,
  fetchLoanBroker,
  type VaultInfo,
  type LoanInfo,
  type LoanBrokerInfo
} from './lib/xrpl'

type Role = 'owner' | 'depositor' | 'broker' | 'borrower'

function short(addr?: string) {
  if (!addr) return '—'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-mono text-slate-100">{value}</div>
    </div>
  )
}

function Btn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        'px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition ' +
        (props.className ?? '')
      }
    />
  )
}

export default function App() {
  const [wallets, setWallets] = useState<Record<Role, Wallet | null>>({
    owner: null,
    depositor: null,
    broker: null,
    borrower: null
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [vaultId, setVaultId] = useState('')
  const [vault, setVault] = useState<VaultInfo | null>(null)
  const [assetsMaximum, setAssetsMaximum] = useState('250000')
  const [depositAmount, setDepositAmount] = useState('10000')
  const [withdrawAmount, setWithdrawAmount] = useState('1000')

  const [loanBrokerId, setLoanBrokerId] = useState('')
  const [loanBroker, setLoanBroker] = useState<LoanBrokerInfo | null>(null)
  const [coverAmount, setCoverAmount] = useState('5000')

  const [principal, setPrincipal] = useState('1000')
  const [aprPercent, setAprPercent] = useState('37')
  const [paymentTotal, setPaymentTotal] = useState('12')
  const [loanId, setLoanId] = useState('')
  const [loan, setLoan] = useState<LoanInfo | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('100')

  function pushLog(msg: string) {
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...l].slice(0, 30))
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
      pushLog(`Funded ${role} wallet ${short(w.address)}`)
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
      const info = await fetchVault(id)
      setVault(info)
    })
  }

  async function handleRefreshVault() {
    if (!vaultId) return
    await run('refresh-vault', async () => {
      const info = await fetchVault(vaultId)
      setVault(info)
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

  async function handleCreateLoanBroker() {
    if (!wallets.broker || !vaultId) return
    await run('create-broker', async () => {
      const { loanBrokerId: id } = await createLoanBroker(wallets.broker!, vaultId, {
        managementFeeRateBps: 200
      })
      setLoanBrokerId(id)
      pushLog(`LoanBrokerSet ok — LoanBrokerID ${short(id)}`)
      setLoanBroker(await fetchLoanBroker(id))
    })
  }

  async function handleDepositCover() {
    if (!wallets.broker || !loanBrokerId) return
    await run('deposit-cover', async () => {
      await depositCover(wallets.broker!, loanBrokerId, coverAmount)
      pushLog(`LoanBrokerCoverDeposit ${coverAmount} XRP`)
      setLoanBroker(await fetchLoanBroker(loanBrokerId))
    })
  }

  async function handleCreateLoan() {
    if (!wallets.broker || !wallets.borrower || !loanBrokerId) return
    await run('create-loan', async () => {
      // APY -> 1/10th bps field per XLS-66 (InterestRate is annualized, 1/10th bps units)
      const bps10 = Math.round(parseFloat(aprPercent) * 1000)
      const { loanId: id } = await createLoan(wallets.broker!, wallets.borrower!, loanBrokerId, {
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
    })
  }

  const utilization =
    vault && parseFloat(vault.assetsMaximum) > 0
      ? ((parseFloat(vault.assetsTotal) - parseFloat(vault.assetsAvailable)) /
          parseFloat(vault.assetsMaximum)) *
        100
      : 0

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">JRPU Lending Protocol — Devnet Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          XRPL Devnet · native <span className="text-indigo-400">XLS-65 Single Asset Vault</span>{' '}
          + <span className="text-indigo-400">XLS-66 Lending Protocol</span> amendments. Test
          assets only — no real funds.
        </p>
      </header>

      <Card title="1. Devnet Wallets (fund via faucet)">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['owner', 'depositor', 'broker', 'borrower'] as Role[]).map((role) => (
            <div key={role} className="space-y-2">
              <div className="text-xs text-slate-500 capitalize">{role}</div>
              <div className="font-mono text-sm">{short(wallets[role]?.address)}</div>
              <Btn disabled={busy === `fund-${role}`} onClick={() => fundRole(role)}>
                {wallets[role] ? 'Re-fund' : 'Fund wallet'}
              </Btn>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="2. Vault (XLS-65)">
          <div className="space-y-2">
            <label className="text-xs text-slate-500">Max vault capacity (XRP)</label>
            <input
              className="w-full bg-slate-800 rounded px-2 py-1 text-sm"
              value={assetsMaximum}
              onChange={(e) => setAssetsMaximum(e.target.value)}
            />
            <Btn disabled={!wallets.owner || busy === 'create-vault'} onClick={handleCreateVault}>
              Create Vault (owner)
            </Btn>
          </div>

          {vaultId && (
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="text-xs font-mono text-slate-400 break-all">VaultID: {vaultId}</div>
              <Btn disabled={busy === 'refresh-vault'} onClick={handleRefreshVault}>
                Refresh
              </Btn>

              {vault && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Stat label="Assets Total" value={`${vault.assetsTotal} XRP`} />
                  <Stat label="Assets Available" value={`${vault.assetsAvailable} XRP`} />
                  <Stat label="Max Capacity" value={`${vault.assetsMaximum} XRP`} />
                  <Stat label="Utilization" value={`${utilization.toFixed(1)}%`} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <input
                    className="w-full bg-slate-800 rounded px-2 py-1 text-sm"
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
                <div className="space-y-1">
                  <input
                    className="w-full bg-slate-800 rounded px-2 py-1 text-sm"
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

        <Card title="3. Loan Broker & Cover (XLS-66)">
          <Btn
            disabled={!wallets.broker || !vaultId || busy === 'create-broker'}
            onClick={handleCreateLoanBroker}
          >
            Create Loan Broker (broker)
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
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-slate-800 rounded px-2 py-1 text-sm"
                  value={coverAmount}
                  onChange={(e) => setCoverAmount(e.target.value)}
                />
                <Btn disabled={!wallets.broker || busy === 'deposit-cover'} onClick={handleDepositCover}>
                  Deposit first-loss cover
                </Btn>
              </div>
            </div>
          )}
        </Card>

        <Card title="4. Create Loan (broker + borrower cosign)">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-slate-500">Principal (XRP)</label>
              <input
                className="w-full bg-slate-800 rounded px-2 py-1 text-sm"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Borrower APR %</label>
              <input
                className="w-full bg-slate-800 rounded px-2 py-1 text-sm"
                value={aprPercent}
                onChange={(e) => setAprPercent(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500"># Payments</label>
              <input
                className="w-full bg-slate-800 rounded px-2 py-1 text-sm"
                value={paymentTotal}
                onChange={(e) => setPaymentTotal(e.target.value)}
              />
            </div>
          </div>
          <Btn
            disabled={!wallets.broker || !wallets.borrower || !loanBrokerId || busy === 'create-loan'}
            onClick={handleCreateLoan}
          >
            Create Loan
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
            </div>
          )}
        </Card>

        <Card title="5. Loan Repayment">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-slate-800 rounded px-2 py-1 text-sm"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
            <Btn disabled={!wallets.borrower || !loanId || busy === 'pay-loan'} onClick={handlePayLoan}>
              Make Payment
            </Btn>
          </div>
        </Card>
      </div>

      <Card title="Activity Log">
        <div className="font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
          {log.length === 0 && <div className="text-slate-600">No activity yet.</div>}
          {log.map((l, i) => (
            <div key={i} className="text-slate-400">
              {l}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
