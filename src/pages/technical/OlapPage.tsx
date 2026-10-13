import { useState } from 'react';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { OlapRow, getOlap, getOlapPivot, getOlapSchema } from '../../services/technicalApi';
import { BarChart, compact, heatColor } from '../../charts';
import { money } from '../../lib/format';
import { Card, EmptyState, PageHeader, useAsync } from '../../ui';
import { Loaded, Tabs } from './shared';

type MeasureKey = 'loanCount' | 'fraudCount' | 'fraudRate' | 'totalLoanAmount' | 'avgLoanAmount';
const formatMeasure = (key: string, value: number | null) =>
  value === null ? '—' : key === 'fraudRate' ? `${value.toFixed(2)}%` : key === 'totalLoanAmount' || key === 'avgLoanAmount' ? `₹${compact(value)}` : value.toLocaleString();

function MeasureTable({ label, rows, total, onDrill }: { label: string; rows: OlapRow[]; total: Omit<OlapRow, 'key'>; onDrill?: (key: string) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>{label}</th><th className="num">Loan count</th><th className="num">Fraud count</th><th className="num">Fraud %</th><th className="num">Total loan amount</th><th className="num">Average loan amount</th>{onDrill && <th />}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={onDrill ? 'clickable' : ''} onClick={onDrill ? () => onDrill(row.key) : undefined}>
              <td><b>{row.key}</b></td>
              <td className="num">{row.loanCount.toLocaleString()}</td>
              <td className="num">{row.fraudCount.toLocaleString()}</td>
              <td className="num">{row.fraudRate.toFixed(2)}%</td>
              <td className="num">{money(row.totalLoanAmount)}</td>
              <td className="num">{money(row.avgLoanAmount)}</td>
              {onDrill && <td><button type="button" className="btn btn-secondary btn-sm" onClick={(event) => { event.stopPropagation(); onDrill(row.key); }}>Drill down <ChevronRight size={13} /></button></td>}
            </tr>
          ))}
          <tr className="total-row">
            <td>Total</td><td className="num">{total.loanCount.toLocaleString()}</td><td className="num">{total.fraudCount.toLocaleString()}</td><td className="num">{total.fraudRate.toFixed(2)}%</td><td className="num">{money(total.totalLoanAmount)}</td><td className="num">{money(total.avgLoanAmount)}</td>{onDrill && <td />}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function OlapPage() {
  const schema = useAsync(() => getOlapSchema(), []);
  // Drill-down path along the hierarchy Year → Quarter → Month → Loan Type.
  const [path, setPath] = useState<{ dim: string; value: string }[]>([]);
  const [slice, setSlice] = useState('loan_type');
  const [pivot, setPivot] = useState({ rows: 'loan_type', cols: 'year', measure: 'fraudRate' as MeasureKey });
  const [dice, setDice] = useState<Record<string, string>>({});

  const hierarchy = schema.data?.hierarchy ?? ['year', 'quarter', 'month', 'loan_type'];
  const level = Math.min(path.length, hierarchy.length - 1);
  const atLeaf = level >= hierarchy.length - 1;
  const filters = Object.fromEntries(path.map((step) => [step.dim, step.value]));
  const drill = useAsync(() => getOlap(hierarchy[level], filters), [JSON.stringify(path), hierarchy.join()]);
  const sliced = useAsync(() => getOlap(slice, {}), [slice]);
  const cube = useAsync(() => getOlapPivot(pivot.rows, pivot.cols, pivot.measure, dice), [JSON.stringify(pivot), JSON.stringify(dice)]);

  return (
    <>
      <PageHeader title="DWM / OLAP Analysis" description="The loan dataset viewed as a data warehouse: one fact table, five analysis dimensions and four measures, explored with OLAP operations." />
      <Loaded state={schema} label="Loading OLAP schema…" title="Unable to load the OLAP schema">
        {(meta) => {
          const label = (key: string) => meta.dimensions.find((item) => item.key === key)?.label ?? key;
          const dimOptions = meta.dimensions.map((item) => ({ value: item.key, label: item.label }));
          return (
            <>
              <div className="grid-2">
                <Card title="Star schema" subtitle={`Fact grain: one row per loan application · ${meta.grain.toLocaleString()} facts`}>
                  <div className="star">
                    <div className="star-dim" style={{ gridArea: 'date' }}>DIM_DATE<small>Year · Quarter · Month · Day</small></div>
                    <div className="star-dim" style={{ gridArea: 'loan' }}>DIM_LOAN<small>Loan Type · Purpose · Tenure</small></div>
                    <div className="star-fact" style={{ gridArea: 'fact' }}>FACT_LOAN_<wbr />APPLICATION<small>Measures: Loan Amount · Fraud Flag · Monthly Income · Existing EMIs · DTI</small></div>
                    <div className="star-dim" style={{ gridArea: 'cust' }}>DIM_CUSTOMER<small>Gender · Age Group · Dependents</small></div>
                    <div className="star-dim" style={{ gridArea: 'emp' }}>DIM_EMPLOYMENT<small>Employment Status</small></div>
                    <div className="star-dim" style={{ gridArea: 'fraud' }}>DIM_FRAUD_STATUS<small>Fraud Flag · Fraud Type · Loan Status</small></div>
                  </div>
                  <p className="muted small" style={{ marginTop: 10 }}>The star schema is a documented analytical design over the dataset; the aggregations on this page are computed by the API with pandas rather than by a deployed warehouse database.</p>
                </Card>
                <Card title="Dimensions and measures">
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Dimension</th><th>Group</th><th className="num">Members</th></tr></thead>
                      <tbody>{meta.dimensions.map((item) => <tr key={item.key}><td>{item.label}</td><td className="muted">{item.group}</td><td className="num">{item.members.length}</td></tr>)}</tbody>
                    </table>
                  </div>
                  <h3 style={{ margin: '14px 0 8px' }}>Measures</h3>
                  <div className="chips">{meta.measures.map((item) => <span className="badge purple" key={item.key}>{item.label}</span>)}</div>
                </Card>
              </div>

              <Card className="flush" title="Drill-down and roll-up" subtitle="Hierarchy: Year → Quarter → Month → Loan Type → Fraud cases">
                <div className="drill-bar">
                  <button type="button" className={`crumb ${path.length === 0 ? 'active' : ''}`} onClick={() => setPath([])}>All years</button>
                  {path.map((step, index) => (
                    <span key={step.dim} className="crumb-wrap">
                      <ChevronRight size={14} />
                      <button type="button" className={`crumb ${index === path.length - 1 ? 'active' : ''}`} onClick={() => setPath(path.slice(0, index + 1))}>{label(step.dim)}: {step.value}</button>
                    </span>
                  ))}
                  <span style={{ flex: 1 }} />
                  {path.length > 0 && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPath(path.slice(0, -1))}><RotateCcw size={13} /> Roll up</button>}
                </div>
                <Loaded state={drill} label="Aggregating…" title="Unable to aggregate">
                  {(result) => (
                    <>
                      <MeasureTable
                        label={result.label}
                        rows={result.rows}
                        total={result.total}
                        onDrill={!atLeaf ? (key) => setPath([...path.slice(0, level), { dim: hierarchy[level], value: key }]) : undefined}
                      />
                      <p className="muted small" style={{ padding: '10px 16px 14px' }}>
                        {atLeaf ? `Lowest level of the hierarchy: fraud cases by Loan Type within ${path.map((step) => step.value).join(' → ')}. Use “Roll up” to go back.` : `Showing ${result.label} level${path.length ? ` within ${path.map((step) => step.value).join(' → ')}` : ''}. Click a row to drill down to ${label(hierarchy[Math.min(level + 1, hierarchy.length - 1)])}.`}
                      </p>
                    </>
                  )}
                </Loaded>
              </Card>

              <Card title="Slice: fraud by one dimension" subtitle="Aggregated over all other dimensions" actions={<Tabs label="Dimension" value={slice} onChange={setSlice} options={dimOptions} />}>
                <Loaded state={sliced} label="Aggregating…" title="Unable to aggregate">
                  {(result) => (
                    <>
                      <BarChart wide ariaLabel={`Fraud percentage by ${result.label}`} yLabel="Fraud %" format={(value) => `${value.toFixed(2)}%`} data={result.rows.map((row) => ({ label: row.key, value: row.fraudRate, detail: `${row.fraudCount} fraud of ${row.loanCount.toLocaleString()} loans` }))} />
                      <MeasureTable label={result.label} rows={result.rows} total={result.total} />
                    </>
                  )}
                </Loaded>
              </Card>

              <Card title="Dice and pivot: two dimensions" subtitle="Choose rows, columns and a measure; add filters to dice the cube">
                <div className="toolbar" style={{ marginBottom: 12 }}>
                  <label className="inline-label">Rows
                    <select aria-label="Pivot rows" value={pivot.rows} onChange={(event) => setPivot({ ...pivot, rows: event.target.value, cols: event.target.value === pivot.cols ? pivot.rows : pivot.cols })}>{dimOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                  </label>
                  <label className="inline-label">Columns
                    <select aria-label="Pivot columns" value={pivot.cols} onChange={(event) => setPivot({ ...pivot, cols: event.target.value, rows: event.target.value === pivot.rows ? pivot.cols : pivot.rows })}>{dimOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                  </label>
                  <label className="inline-label">Measure
                    <select aria-label="Pivot measure" value={pivot.measure} onChange={(event) => setPivot({ ...pivot, measure: event.target.value as MeasureKey })}>{meta.measures.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
                  </label>
                  {meta.dimensions.filter((item) => item.key !== pivot.rows && item.key !== pivot.cols && ['gender', 'employment', 'age_group', 'loan_type', 'year'].includes(item.key)).slice(0, 3).map((item) => (
                    <label className="inline-label" key={item.key}>{item.label}
                      <select aria-label={`Filter by ${item.label}`} value={dice[item.key] ?? ''} onChange={(event) => setDice({ ...dice, [item.key]: event.target.value })}>
                        <option value="">All</option>
                        {item.members.map((member) => <option key={member} value={member}>{member}</option>)}
                      </select>
                    </label>
                  ))}
                  {Object.values(dice).some(Boolean) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDice({})}>Clear filters</button>}
                </div>
                <Loaded state={cube} label="Building pivot…" title="Unable to build the pivot">
                  {(result) => {
                    if (!result.rowMembers.length) return <EmptyState title="No records match these filters" />;
                    const values = result.rowMembers.flatMap((row) => result.colMembers.map((col) => result.cells[row][col] ?? 0));
                    const max = Math.max(...values, 0);
                    return (
                      <div className="table-wrap">
                        <table className="pivot">
                          <thead><tr><th>{label(result.rows)} \ {label(result.cols)}</th>{result.colMembers.map((col) => <th key={col} className="num">{col}</th>)}<th className="num">All</th></tr></thead>
                          <tbody>
                            {result.rowMembers.map((row) => (
                              <tr key={row}>
                                <th>{row}</th>
                                {result.colMembers.map((col) => <td key={col} className="num" style={heatColor(result.cells[row][col], max)}>{formatMeasure(result.measure, result.cells[row][col])}</td>)}
                                <td className="num"><b>{formatMeasure(result.measure, result.rowTotals[row])}</b></td>
                              </tr>
                            ))}
                            <tr className="total-row"><th>All</th>{result.colMembers.map((col) => <td key={col} className="num">{formatMeasure(result.measure, result.colTotals[col])}</td>)}<td className="num">{formatMeasure(result.measure, result.grandTotal)}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  }}
                </Loaded>
                <p className="muted small" style={{ marginTop: 10 }}>Cell shading: darker purple = larger value of the selected measure. Exact values are printed in every cell.</p>
              </Card>

              <Card title="OLAP operations demonstrated">
                <dl className="dl">
                  <div><dt>Roll-up</dt><dd>Month → Quarter → Year; individual ages → Age Group.</dd></div>
                  <div><dt>Drill-down</dt><dd>Year → Quarter → Month → Loan Type in the table above.</dd></div>
                  <div><dt>Slice</dt><dd>Fix one dimension (e.g. Loan Type) and aggregate the measures.</dd></div>
                  <div><dt>Dice</dt><dd>Combine filters on several dimensions in the pivot.</dd></div>
                  <div><dt>Pivot</dt><dd>Swap the row and column dimensions of the cross-tab.</dd></div>
                </dl>
              </Card>
            </>
          );
        }}
      </Loaded>
    </>
  );
}
