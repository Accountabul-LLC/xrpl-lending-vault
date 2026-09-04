import { ROLE_META, captions, LAYER_HINTS, type Complexity, type Labeling, type RoleId, type StructureView } from './glossary'
import { Arrow, Callout, Legend, NodeBox } from './shared'

export function RoleMap({
  revealLevel,
  structure,
  labeling,
  highlight,
  selected,
  onSelect
}: {
  revealLevel: number
  structure: StructureView
  labeling: Labeling
  highlight?: RoleId[]
  selected?: RoleId | null
  onSelect?: (id: RoleId) => void
}) {
  const show = (id: RoleId) => ROLE_META[id].minReveal <= revealLevel
  const dim = (id: RoleId) => (highlight && highlight.length > 0 ? !highlight.includes(id) : false)

  function node(id: RoleId) {
    if (!show(id)) return null
    const meta = ROLE_META[id]
    const cap = captions(meta, structure, labeling)
    const isHi = selected === id || Boolean(highlight?.includes(id))
    return (
      <NodeBox
        title={cap.title}
        subtitle={cap.subtitle}
        tone={id}
        layer={meta.layer}
        active={isHi}
        dimmed={dim(id)}
        onClick={() => onSelect?.(id)}
      />
    )
  }

  const orgIds: RoleId[] = ['originator', 'underwriter', 'broker', 'vault', 'admin', 'servicer', 'compliance', 'auditor']
  const orgVisible = orgIds.filter(show)
  const wrapOrg = structure === 'one' && orgVisible.length > 0 && revealLevel >= 1

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wide text-slate-500">Transaction map</div>
        <Legend />
      </div>
      <p className="text-xs text-slate-400">{LAYER_HINTS[Math.min(revealLevel, LAYER_HINTS.length - 1)]}</p>

      {revealLevel === 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">{node('depositor')}</div>
          <div className="text-center text-xs text-slate-500 sm:px-1">→</div>
          <div className="flex-1">{node('vault')}</div>
          <div className="text-center text-xs text-slate-500 sm:px-1">→</div>
          <div className="flex-1">{node('borrower')}</div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 max-w-2xl mx-auto w-full">
          {show('compliance') && (
            <>
              {node('compliance')}
              <Arrow />
            </>
          )}
          {wrapOrg ? (
            <div className="w-full rounded-xl border border-dashed border-indigo-500/40 bg-indigo-950/10 p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wide text-indigo-300 text-center">
                {structure === 'one' ? 'JRPU FINANCIAL — internal functions' : 'Lending operator'}
              </div>
              {show('originator') && (
                <>
                  {node('originator')}
                  <Arrow />
                </>
              )}
              {show('underwriter') && (
                <>
                  {node('underwriter')}
                  <Arrow label="credit recommendation" />
                </>
              )}
              {node('broker')}
              {show('admin') && (
                <div className="pt-1">
                  {node('admin')}
                  <p className="text-[10px] text-center text-slate-500 mt-1">
                    Business operator. The XRPL Vault Owner account is the same account as the Loan Broker in the current protocol.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {show('originator') && (
                <>
                  {node('originator')}
                  <Arrow />
                </>
              )}
              {show('underwriter') && (
                <>
                  {node('underwriter')}
                  <Arrow label="credit recommendation" />
                </>
              )}
              {node('broker')}
            </>
          )}

          <div className="grid grid-cols-2 gap-4 w-full mt-2">
            <div className="space-y-1">
              <Arrow label="associated vault" />
              {node('vault')}
              <Arrow label="deposits / shares" />
              {node('depositor')}
            </div>
            <div className="space-y-1">
              <Arrow label="LoanSet with borrower" />
              {node('borrower')}
              {show('guarantor') && (
                <>
                  <Arrow label="off-chain guarantee" />
                  {node('guarantor')}
                </>
              )}
            </div>
          </div>

          {show('servicer') && (
            <div className="w-full mt-2">
              <Arrow label="ongoing operations" />
              {node('servicer')}
              <Arrow label="payments settle into the loan, then the vault" />
              <div className="text-center text-[11px] text-slate-400">Payment collection → Vault share value</div>
            </div>
          )}

          {show('custodian') && (
            <div className="w-full mt-3">
              {node('custodian')}
              <p className="text-[11px] text-center text-rose-300/80 mt-1">
                Secures collateral outside the native uncollateralized XRPL loan primitive.
              </p>
            </div>
          )}

          {(show('issuer') || show('auditor')) && (
            <div className="grid sm:grid-cols-2 gap-3 w-full mt-3">
              {node('issuer')}
              {node('auditor')}
            </div>
          )}
        </div>
      )}

      {selected && (
        <Callout tone={ROLE_META[selected].layer === 'extra' ? 'extra' : ROLE_META[selected].layer === 'xrpl' ? 'chain' : 'info'} title={ROLE_META[selected].role}>
          {ROLE_META[selected].short}
        </Callout>
      )}
    </div>
  )
}

export function ComplexityBar({
  complexity,
  revealLevel,
  onComplexity,
  onReveal
}: {
  complexity: Complexity
  revealLevel: number
  onComplexity: (c: Complexity) => void
  onReveal: (n: number) => void
}) {
  const labels: Complexity[] = ['simple', 'professional', 'institutional']
  return (
    <div className="flex flex-wrap items-center gap-2">
      {labels.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onComplexity(c)}
          className={
            'rounded-full px-3 py-1 text-xs font-semibold capitalize border transition ' +
            (complexity === c
              ? 'bg-indigo-600 border-indigo-400 text-white'
              : 'border-slate-700 text-slate-400 hover:border-slate-500')
          }
        >
          {c}
        </button>
      ))}
      <button
        type="button"
        className="ml-auto text-xs text-slate-400 hover:text-slate-200"
        onClick={() => onReveal(Math.max(0, revealLevel - 1))}
        disabled={revealLevel === 0}
      >
        Simpler
      </button>
      <button
        type="button"
        className="text-xs text-indigo-300 hover:text-indigo-100"
        onClick={() => onReveal(Math.min(4, revealLevel + 1))}
        disabled={revealLevel === 4}
      >
        Add next layer
      </button>
    </div>
  )
}
