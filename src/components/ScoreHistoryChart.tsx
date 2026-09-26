import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, History, Info } from 'lucide-react';
import { EvaluationRunRecord } from '../types';

interface ScoreHistoryChartProps {
  history: EvaluationRunRecord[];
  currentMasterScore: number;
  currentTailoredScore: number;
}

export const ScoreHistoryChart: React.FC<ScoreHistoryChartProps> = ({
  history,
  currentMasterScore,
  currentTailoredScore,
}) => {
  // Format data for chart
  const data = history.map((item) => ({
    name: `Run #${item.runIndex}`,
    label: item.roleOrCompany || `Evaluation #${item.runIndex}`,
    masterScore: item.masterScore,
    tailoredScore: item.tailoredScore,
    improvement: item.improvement,
    date: item.timestamp,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pData = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-1.5">
          <div className="font-bold text-white flex items-center justify-between gap-3">
            <span>{label}</span>
            <span className="text-[10px] text-slate-400 font-normal">{pData.date}</span>
          </div>
          {pData.label && (
            <div className="text-[11px] text-indigo-300 font-medium truncate max-w-[220px]">
              {pData.label}
            </div>
          )}
          <div className="pt-1.5 border-t border-slate-800 space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                Master Resume:
              </span>
              <span className="font-bold font-mono text-white">{pData.masterScore}%</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                Tailored Resume:
              </span>
              <span className="font-bold font-mono text-emerald-300">{pData.tailoredScore}%</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-400">Net Improvement:</span>
              <span className="font-bold font-mono text-cyan-300">+{pData.improvement}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <History className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Match Score Improvement History</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {data.length} {data.length === 1 ? 'Run Logged' : 'Runs Logged'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tracking match score progression across multiple evaluation runs and iterations against target job descriptions.
          </p>
        </div>

        {/* Quick summary stats */}
        <div className="flex items-center gap-4 text-xs bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="text-slate-400">Master Avg:</span>
            <span className="font-bold font-mono text-white">
              {Math.round(data.reduce((acc, curr) => acc + curr.masterScore, 0) / (data.length || 1))}%
            </span>
          </div>
          <div className="w-px h-3 bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Tailored Avg:</span>
            <span className="font-bold font-mono text-emerald-300">
              {Math.round(data.reduce((acc, curr) => acc + curr.tailoredScore, 0) / (data.length || 1))}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }}
              formatter={(value) => {
                if (value === 'masterScore') return <span className="text-slate-300 mr-4">Master Resume Score</span>;
                if (value === 'tailoredScore') return <span className="text-emerald-300 mr-4">New Tailored Resume Score</span>;
                return value;
              }}
            />
            {/* 80% Threshold reference line */}
            <ReferenceLine
              y={80}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{
                value: '80% ATS Threshold',
                position: 'insideTopRight',
                fill: '#f59e0b',
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            <Line
              type="monotone"
              dataKey="masterScore"
              name="masterScore"
              stroke="#f43f5e"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#f43f5e', strokeWidth: 1.5, stroke: '#881337' }}
              activeDot={{ r: 6, fill: '#fda4af', stroke: '#f43f5e', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="tailoredScore"
              name="tailoredScore"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#064e3b' }}
              activeDot={{ r: 7, fill: '#6ee7b7', stroke: '#10b981', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/40 rounded-lg p-2.5 border border-slate-800/60">
        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          The amber dashed line represents the <strong>80% ATS pass target</strong>. Any master resume landing below 80% automatically triggers optimization to lift candidate scores into the 88%–98% green zone.
        </span>
      </div>
    </div>
  );
};
