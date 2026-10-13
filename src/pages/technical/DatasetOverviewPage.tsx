import { getDatasetProfile } from '../../services/technicalApi';
import { CHART_PURPLE, CHART_PURPLE_SOFT, HBarChart, SplitBar } from '../../charts';
import { formatDate, pretty } from '../../lib/format';
import { Card, Kpi, PageHeader, useAsync } from '../../ui';
import { Loaded, RefreshButton, SourceNote, num } from './shared';

export function DatasetOverviewPage() {
  const profile = useAsync(() => getDatasetProfile(), []);
  return (
    <>
      <PageHeader
        title="Dataset Overview"
        description="Technical profile of the historical loan-application dataset used for analytics and model training."
        actions={<RefreshButton onClick={profile.reload} busy={profile.loading} />}
      />
      <Loaded state={profile} label="Profiling dataset…" title="Unable to load the dataset profile">
        {(data) => (
          <>
            <SourceNote source={data.source} />
            <div className="kpis">
              <Kpi label="Records (rows)" value={data.rows.toLocaleString()} />
              <Kpi label="Columns" value={String(data.columns)} note={`${data.numericalColumns.length} numerical · ${data.categoricalColumns.length} categorical / text`} />
              <Kpi label="Missing values" value={data.missingCells.toLocaleString()} note={`${data.completeness?.toFixed(2) ?? '—'}% complete`} />
              <Kpi label="Duplicate rows" value={data.duplicateRows.toLocaleString()} note={`${data.uniqueCustomers?.toLocaleString() ?? '—'} unique customers`} />
            </div>

            <div className="grid-2">
              <Card title="Fraud distribution" subtitle="Target column: FraudFlag">
                <SplitBar parts={[{ label: 'Genuine', value: data.fraud.genuine, color: CHART_PURPLE_SOFT }, { label: 'Fraud', value: data.fraud.fraud, color: CHART_PURPLE }]} />
              </Card>
              <Card title="Source and date range">
                <dl className="dl">
                  <div><dt>Configured source</dt><dd>{data.source.configured}</dd></div>
                  <div><dt>Source in use</dt><dd>{data.source.inUse}</dd></div>
                  <div><dt>First application date</dt><dd>{formatDate(data.dateRange.from)}</dd></div>
                  <div><dt>Last application date</dt><dd>{formatDate(data.dateRange.to)}</dd></div>
                </dl>
              </Card>
            </div>

            <Card className="flush" title="Columns" subtitle={`${data.columns} columns · data type, missing values and unique values are calculated from the loaded data`}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Column</th><th>Data type</th><th>Role</th><th className="num">Missing</th><th className="num">Unique values</th><th>Example</th></tr></thead>
                  <tbody>
                    {data.columnInfo.map((column, index) => (
                      <tr key={column.name}>
                        <td className="muted">{index + 1}</td>
                        <td className="mono">{column.name}</td>
                        <td><span className="badge neutral">{column.type}</span></td>
                        <td>{column.role === 'target' ? <span className="badge purple">target</span> : column.role}</td>
                        <td className="num">{column.missing.toLocaleString()}</td>
                        <td className="num">{column.unique.toLocaleString()}</td>
                        <td className="muted" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{column.example ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="flush" title="Statistical summary" subtitle="Numerical columns">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Column</th><th className="num">Count</th><th className="num">Mean</th><th className="num">Std dev</th><th className="num">Min</th><th className="num">25%</th><th className="num">Median</th><th className="num">75%</th><th className="num">Max</th></tr></thead>
                  <tbody>
                    {data.numericSummary.map((row) => (
                      <tr key={row.column}>
                        <td className="mono">{row.column}</td>
                        <td className="num">{row.count.toLocaleString()}</td>
                        <td className="num">{num(row.mean)}</td>
                        <td className="num">{num(row.std)}</td>
                        <td className="num">{num(row.min)}</td>
                        <td className="num">{num(row.q1)}</td>
                        <td className="num">{num(row.median)}</td>
                        <td className="num">{num(row.q3)}</td>
                        <td className="num">{num(row.max)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid-2">
              {data.categoricalSummary.map((category) => (
                <Card key={category.column} title={pretty(category.column)} subtitle={`${category.unique} unique values · share of records`}>
                  <HBarChart tone="soft" format={(value) => value.toLocaleString()} data={category.values.map((item) => ({ label: item.value, value: item.count, detail: `${item.share}% of records` }))} />
                </Card>
              ))}
            </div>

            <Card title="Columns used by the models" subtitle={`${data.modelFeatures.all.length} input features · target: FraudFlag`}>
              <dl className="dl">
                <div className="span-2"><dt>Numerical features ({data.modelFeatures.numeric.length})</dt><dd className="chips">{data.modelFeatures.numeric.map((name) => <span className="badge neutral" key={name}>{name}</span>)}</dd></div>
                <div className="span-2"><dt>Categorical features ({data.modelFeatures.categorical.length})</dt><dd className="chips">{data.modelFeatures.categorical.map((name) => <span className="badge neutral" key={name}>{name}</span>)}</dd></div>
              </dl>
              {!data.hasCibil && <p className="muted small" style={{ marginTop: 10 }}>CIBILScore is not a column of this dataset and is not used by any model.</p>}
            </Card>
          </>
        )}
      </Loaded>
    </>
  );
}
