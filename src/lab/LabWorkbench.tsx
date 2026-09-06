import { Btn, Card, Stat } from '../ui'
import { TX_PHASES } from './receipt'
import {
  ROLE_HINT,
  ROLE_LABEL,
  ROLES,
  shortAddr,
  type LabViewHandlers,
  type LabViewState,
  type Role
} from './types'

function spotlight(id: string, highlight: string | null) {
  return highlight === id ? ' lab-spotlight' : ''
}

function pressClass(id: string, pressed: string | null) {
  return pressed === id ? ' lab-pressed' : ''
}

export function LabWorkbench({
  state,
  handlers,
  compact = false
}: {
  state: LabViewState
  handlers: LabViewHandlers
  compact?: boolean
}) {
  const { highlight, pressed, busy } = state
  const assetsTotal = state.vault ? parseFloat(state.vault.assetsTotal) : 0
  const assetsAvailable = state.vault ? parseFloat(state.vault.assetsAvailable) : 0
  const assetsCap = state.vault ? parseFloat(state.vault.assetsMaximum) : 0
  const utilization = assetsTotal > 0 ? ((assetsTotal - assetsAvailable) / assetsTotal) * 100 : 0
  const capacityUsed = assetsCap > 0 ? (assetsTotal / assetsCap) * 100 : 0
  const allFunded = ROLES.every((r) => state.wallets[r]?.funded)

  return (
    <div className={`space-y-5 min-w-0 ${compact ? 'lab-compact' : ''}`} data-lab="workbench">
      {compact ? (
        <div className="flex items-center justify-end pt-1">
          <span
            data-lab="devnet-badge"
            className={
              'inline-flex items-center rounded-full border border-sky-400/40 bg-sky-500/10 ' +
              'px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300'
            }
          >
            XRPL DEVNET
          </span>
        </div>
      ) : (
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Live DevNet Lab</h1>
              <span
                data-lab="devnet-badge"
                className={
                  'inline-flex items-center rounded-full border border-sky-400/40 bg-sky-500/10 ' +
                  'px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300'
                }
              >
                XRPL DEVNET
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Real XLS-65 / XLS-66 transactions on the XRP Ledger DevNet. Test assets only — nothing
              here is real money. The vault owner wallet creates the vault and signs loan origination.
              That is infrastructure, not ownership of depositor capital.
            </p>
          </div>
        </header>
      )}

      {state.txPhase && (
        <ol
          data-lab="tx-pipeline"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-950/40 px-3 py-2"
        >
          {TX_PHASES.map((phase, i) => {
            const current = TX_PHASES.indexOf(state.txPhase!)
            const done = i < current || state.txPhase === 'confirmed'
            const active = phase === state.txPhase
            return (
              <li key={phase} className="flex items-center gap-2 text-[11px] uppercase tracking-wide">
                {i > 0 && <span className="text-slate-600">↓</span>}
                <span
                  className={
                    active
                      ? 'rounded-md bg-indigo-500 px-2 py-1 font-semibold text-white'
                      : done
                        ? 'rounded-md bg-emerald-500/20 px-2 py-1 text-emerald-300'
                        : 'rounded-md bg-slate-800 px-2 py-1 text-slate-500'
                  }
                >
                  {phase}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {state.error && (
        <div
          data-lab="error-panel"
          className={
            'rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 space-y-2' +
            spotlight('error-panel', highlight)
          }
        >
          <div className="text-sm font-semibold text-rose-200">{state.error.title}</div>
          <div className="font-mono text-lg text-rose-100">{state.error.code}</div>
          <p className="text-sm text-slate-200">{state.error.meaning}</p>
          <div className="text-xs uppercase tracking-wide text-slate-400">Recommended action</div>
          <p className="text-sm text-slate-300">{state.error.action}</p>
        </div>
      )}

      <Card title="Step 1 — Wallets">
        <p className="text-xs text-slate-500">
          Three parties: vault owner / Loan Broker, depositor, and borrower. Seeds stay in this
          browser only. Never paste a mainnet seed. Every account needs XRP for reserves and fees.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-lab="wallets">
          {ROLES.map((role) => (
            <WalletCard
              key={role}
              role={role}
              wallet={state.wallets[role]}
              highlight={highlight}
              pressed={pressed}
              busy={busy}
              onFund={() => handlers.onFundRole(role)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn
            data-lab="fund-all"
            disabled={busy === 'fund-all' || allFunded}
            onClick={handlers.onFundAll}
            className={spotlight('fund-all', highlight) + pressClass('fund-all', pressed)}
          >
            {allFunded ? 'Wallets funded' : 'Fund All Wallets'}
          </Btn>
          <Btn
            data-lab="reset"
            className={
              'bg-slate-700 hover:bg-slate-600' +
              spotlight('reset', highlight) +
              pressClass('reset', pressed)
            }
            onClick={handlers.onReset}
          >
            Reset DevNet Lab
          </Btn>
        </div>
        <p className="text-[11px] text-slate-500" data-lab="reset-note">
          Resetting clears this browser session — cached vault IDs, loan IDs, and progress. It does
          not erase transactions already validated on the XRP Ledger.{' '}
          <span className="text-slate-300 font-medium">New session ≠ erase ledger.</span>
        </p>
      </Card>

      <div className="grid md:grid-cols-2 gap-5 min-w-0">
        <Card title="Step 2 & 3 & 7 — Vault, deposit, withdraw">
          <div className="space-y-2" data-lab="vault-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div data-lab="vault-asset" className={spotlight('vault-asset', highlight)}>
                <label className="text-xs text-slate-500">Vault Asset</label>
                <div className="rounded-lg bg-slate-800 px-2 py-1.5 text-sm font-medium">
                  XRP <span className="text-slate-500 text-xs">(single-asset vault)</span>
                </div>
              </div>
              <div data-lab="max-capacity" className={spotlight('max-capacity', highlight)}>
                <label className="text-xs text-slate-500">Maximum Capacity</label>
                <input
                  className="w-full min-w-0 bg-slate-800 rounded px-2 py-1.5 text-sm"
                  value={state.assetsMaximum}
                  onChange={(e) => handlers.onAssetsMaximum(e.target.value)}
                />
              </div>
            </div>
            <Btn
              data-lab="create-vault"
              disabled={!state.wallets.owner || busy === 'create-vault'}
              onClick={handlers.onCreateVault}
              className={spotlight('create-vault', highlight) + pressClass('create-vault', pressed)}
            >
              Create Vault
            </Btn>
          </div>

          {state.vaultId && (
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="text-xs font-mono text-slate-400 break-all" data-lab="vault-id">
                Vault ID: {state.vaultId}
              </div>
              <Btn disabled={busy === 'refresh-vault'} onClick={handlers.onRefreshVault}>
                Refresh from ledger
              </Btn>

              {state.vault && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1" data-lab="vault-stats">
                  <Stat label="Vault Owner" value={shortAddr(state.vault.account)} />
                  <Stat label="Asset" value={state.vault.asset || 'XRP'} />
                  <Stat label="Maximum Capacity" value={`${state.vault.assetsMaximum} XRP`} />
                  <Stat label="Assets Total" value={`${state.vault.assetsTotal} XRP`} />
                  <Stat label="Assets Available" value={`${state.vault.assetsAvailable} XRP`} />
                  <Stat label="Vault Shares Issued" value={state.sharesIssued || '—'} />
                  {state.depositorAssetBalance !== '—' && (
                    <Stat label="Depositor assets (from withdraw)" value={`${state.depositorAssetBalance} XRP`} />
                  )}
                  <Stat label="Utilization" value={`${utilization.toFixed(1)}%`} />
                  <Stat label="Capacity used" value={`${capacityUsed.toFixed(3)}%`} />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div
                  className={'space-y-1 min-w-0' + spotlight('deposit', highlight)}
                  data-lab="deposit"
                >
                  <label className="text-xs text-slate-500">Deposit amount</label>
                  <input
                    className="w-full min-w-0 bg-slate-800 rounded px-2 py-1 text-sm"
                    value={state.depositAmount}
                    onChange={(e) => handlers.onDepositAmount(e.target.value)}
                  />
                  <Btn
                    data-lab="deposit-btn"
                    disabled={!state.wallets.depositor || !state.vaultId || busy === 'deposit'}
                    onClick={handlers.onDeposit}
                    className={
                      'w-full' + spotlight('deposit-btn', highlight) + pressClass('deposit-btn', pressed)
                    }
                  >
                    Deposit
                  </Btn>
                </div>
                <div
                  className={'space-y-1 min-w-0' + spotlight('withdraw', highlight)}
                  data-lab="withdraw"
                >
                  <label className="text-xs text-slate-500">Withdraw amount</label>
                  <input
                    className="w-full min-w-0 bg-slate-800 rounded px-2 py-1 text-sm"
                    value={state.withdrawAmount}
                    onChange={(e) => handlers.onWithdrawAmount(e.target.value)}
                  />
                  <Btn
                    data-lab="withdraw-btn"
                    disabled={!state.wallets.depositor || !state.vaultId || busy === 'withdraw'}
                    onClick={handlers.onWithdraw}
                    className={
                      'w-full' +
                      spotlight('withdraw-btn', highlight) +
                      pressClass('withdraw-btn', pressed)
                    }
                  >
                    Withdraw
                  </Btn>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card title="Step 4 — Protocol Loan Book">
          <p className="text-xs text-slate-500" data-lab="loanbook-explain">
            <span className="text-slate-300 font-medium">Protocol Loan Book</span> is the
            Accountabul application view of lending activity for this vault.{' '}
            <span className="text-slate-300 font-medium">LoanBroker</span> is the native XRPL
            protocol object. They are not the same thing.
          </p>
          <Btn
            data-lab="create-broker"
            disabled={!state.wallets.owner || !state.vaultId || busy === 'create-broker'}
            onClick={handlers.onCreateLoanBook}
            className={
              spotlight('create-broker', highlight) + pressClass('create-broker', pressed)
            }
          >
            Create Loan Broker
          </Btn>

          {state.loanBrokerId ? (
            <div className="pt-3 border-t border-slate-800 space-y-3" data-lab="broker-stats">
              <div className="text-xs font-mono text-slate-400 break-all">
                LoanBroker ID: {state.loanBrokerId}
              </div>
              {state.loanBroker && (
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Vault ID" value={shortAddr(state.loanBroker.vaultId)} />
                  <Stat label="Broker Account" value={shortAddr(state.loanBroker.account)} />
                  <Stat label="Management Fee" value="2.00%" />
                  <Stat label="Debt Total" value={`${state.loanBroker.debtTotal} XRP`} />
                  <Stat label="Cover Available" value={`${state.loanBroker.coverAvailable} XRP`} />
                  <Stat
                    label="First-loss cover"
                    value={
                      parseFloat(state.loanBroker.coverAvailable) > 0 ? 'Enabled' : 'Optional'
                    }
                  />
                </div>
              )}
              {!state.loanId && (
                <div
                  data-lab="empty-loans"
                  className="rounded-lg border border-dashed border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-300"
                >
                  No loans yet. Originate your first loan.
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                <input
                  className="min-w-0 w-full sm:flex-1 bg-slate-800 rounded px-2 py-1 text-sm"
                  value={state.coverAmount}
                  onChange={(e) => handlers.onCoverAmount(e.target.value)}
                />
                <Btn
                  disabled={!state.wallets.owner || busy === 'deposit-cover'}
                  onClick={handlers.onDepositCover}
                >
                  Deposit first-loss cover
                </Btn>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              Create the Loan Broker after the vault exists. The vault owner signs this step.
            </div>
          )}
        </Card>

        <Card title="Step 5 — Originate a loan">
          <p className="text-xs text-slate-500">
            The Loan Broker and the borrower both sign. Depositors do not sign each loan — they
            already agreed to vault terms when they deposited.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" data-lab="loan-terms">
            <div className="min-w-0">
              <label className="text-xs text-slate-500">Principal</label>
              <input
                className="w-full min-w-0 bg-slate-800 rounded px-2 py-1 text-sm"
                value={state.principal}
                onChange={(e) => handlers.onPrincipal(e.target.value)}
              />
            </div>
            <div className="min-w-0">
              <label className="text-xs text-slate-500">Interest (APR %)</label>
              <input
                className="w-full min-w-0 bg-slate-800 rounded px-2 py-1 text-sm"
                value={state.aprPercent}
                onChange={(e) => handlers.onAprPercent(e.target.value)}
              />
            </div>
            <div className="min-w-0">
              <label className="text-xs text-slate-500">Term (monthly payments)</label>
              <input
                className="w-full min-w-0 bg-slate-800 rounded px-2 py-1 text-sm"
                value={state.paymentTotal}
                onChange={(e) => handlers.onPaymentTotal(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]" data-lab="signing">
            <span
              className={
                'rounded-full px-2 py-1 border ' +
                (state.brokerSigned
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-slate-700 text-slate-500')
              }
            >
              Loan Broker {state.brokerSigned ? 'signed' : 'unsigned'}
            </span>
            <span
              className={
                'rounded-full px-2 py-1 border ' +
                (state.borrowerSigned
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-slate-700 text-slate-500')
              }
            >
              Borrower {state.borrowerSigned ? 'signed' : 'unsigned'}
            </span>
          </div>
          <Btn
            data-lab="originate"
            disabled={
              !state.wallets.owner ||
              !state.wallets.borrower ||
              !state.loanBrokerId ||
              busy === 'create-loan'
            }
            onClick={handlers.onCreateLoan}
            className={spotlight('originate', highlight) + pressClass('originate', pressed)}
          >
            Originate Loan
          </Btn>

          {state.loanId && state.loan && (
            <div
              className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-3"
              data-lab="loan-stats"
            >
              <div className="col-span-2 text-xs font-mono text-slate-400 break-all">
                Loan ID: {state.loanId}
              </div>
              <Stat label="Borrower" value={shortAddr(state.loan.borrower)} />
              <Stat label="Principal" value={`${state.principal} XRP`} />
              <Stat
                label="APR"
                value={`${(state.loan.interestRate / 1000).toFixed(2)}%`}
              />
              <Stat
                label="Outstanding Principal"
                value={`${state.loan.principalOutstanding} XRP`}
              />
              <Stat label="Payment Amount" value={`${state.paymentAmount} XRP`} />
              <Stat
                label="Next Payment"
                value={
                  state.loan.nextPaymentDueDate
                    ? String(state.loan.nextPaymentDueDate)
                    : 'Scheduled'
                }
              />
              <Stat label="Payments Remaining" value={`${state.loan.paymentRemaining ?? '—'}`} />
              <Stat
                label="Status"
                value={state.loan.defaulted ? 'Defaulted' : state.loan.impaired ? 'Impaired' : 'Active'}
              />
            </div>
          )}
        </Card>

        <Card title="Step 6 — Make a loan payment">
          <div
            className={'flex flex-col sm:flex-row gap-2 min-w-0' + spotlight('payment', highlight)}
            data-lab="payment"
          >
            <input
              className="min-w-0 w-full sm:flex-1 bg-slate-800 rounded px-2 py-1 text-sm"
              value={state.paymentAmount}
              onChange={(e) => handlers.onPaymentAmount(e.target.value)}
            />
            <Btn
              data-lab="pay-btn"
              disabled={!state.wallets.borrower || !state.loanId || busy === 'pay-loan'}
              onClick={handlers.onPayLoan}
              className={spotlight('pay-btn', highlight) + pressClass('pay-btn', pressed)}
            >
              Make Payment
            </Btn>
          </div>
          <Btn
            disabled={!state.wallets.borrower || !state.loanId || !state.loan || busy === 'pay-full'}
            onClick={handlers.onPayFull}
            className="w-full sm:w-auto whitespace-normal break-words"
          >
            Pay off in full ({state.loan ? `${state.loan.totalValueOutstanding} XRP` : '—'})
          </Btn>
        </Card>
      </div>

      <Card title="Step 8 — Verify on the ledger">
        <div className="flex flex-wrap items-center gap-2">
          <Btn
            data-lab="technical"
            className={
              'bg-slate-700 hover:bg-slate-600' +
              spotlight('technical', highlight) +
              pressClass('technical', pressed)
            }
            onClick={handlers.onToggleTechnical}
          >
            View Technical Details
          </Btn>
          {state.lastTx && (
            <span className="text-xs text-emerald-300 font-mono">
              Last result: {state.lastTx.result}
              {state.lastTx.validated ? ' · validated' : ''}
            </span>
          )}
        </div>
        {state.technicalOpen && state.lastTx && (
          <div
            data-lab="technical-panel"
            className="grid sm:grid-cols-2 gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3"
          >
            <Stat label="Transaction hash" value={state.lastTx.hash || '—'} />
            <Stat
              label="Ledger index"
              value={state.lastTx.ledgerIndex != null ? String(state.lastTx.ledgerIndex) : '—'}
            />
            <Stat label="Transaction type" value={state.lastTx.type} />
            <Stat label="Result" value={state.lastTx.result} />
            <Stat label="Validated" value={state.lastTx.validated ? 'Yes' : 'No'} />
          </div>
        )}
      </Card>

      <Card title="Activity Log">
        <div className="font-mono text-xs space-y-1 max-h-48 overflow-y-auto overflow-x-hidden">
          {state.log.length === 0 && <div className="text-slate-600">No activity yet.</div>}
          {state.log.map((l, i) => (
            <div key={i} className="text-slate-400 break-words">
              {l}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function WalletCard({
  role,
  wallet,
  highlight,
  pressed,
  busy,
  onFund
}: {
  role: Role
  wallet: LabViewState['wallets'][Role]
  highlight: string | null
  pressed: string | null
  busy: string | null
  onFund: () => void
}) {
  const funded = Boolean(wallet?.funded)
  return (
    <div
      data-lab={`wallet-${role}`}
      className={'space-y-2 rounded-lg border border-slate-800 p-3' + spotlight(`wallet-${role}`, highlight)}
    >
      <div className="text-xs font-semibold text-slate-200">{ROLE_LABEL[role]}</div>
      <div className="text-[11px] text-slate-500">{ROLE_HINT[role]}</div>
      <div className="font-mono text-sm break-all">{shortAddr(wallet?.address)}</div>
      <div
        className={
          'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ' +
          (funded
            ? 'bg-emerald-500/15 text-emerald-300'
            : 'bg-slate-800 text-slate-500')
        }
      >
        {funded ? 'Funded' : 'Not Funded'}
      </div>
      <Btn
        disabled={busy === `fund-${role}` || busy === 'fund-all'}
        onClick={onFund}
        className={pressClass(`fund-${role}`, pressed)}
      >
        {wallet ? 'Re-fund' : 'Fund wallet'}
      </Btn>
    </div>
  )
}
