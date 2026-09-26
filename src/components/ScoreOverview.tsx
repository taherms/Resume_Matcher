import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, ArrowUpRight, Sparkles, TrendingUp } from 'lucide-react';
import { ATSEvaluationResult, EvaluationRunRecord } from '../types';
import { ScoreHistoryChart } from './ScoreHistoryChart';

interface ScoreOverviewProps {
  result: ATSEvaluationResult;
  history?: EvaluationRunRecord[];
}

export const ScoreOverview: React.FC<ScoreOverviewProps> = ({ result, history = [] }) => {
  const { masterScore, isBelowThreshold, updatedResume, evaluationSummary, differences } = result;

  const scoreDelta = updatedResume.score - masterScore;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';
    if (score >= 60) return 'text-amber-400 bg-amber-950/60 border-amber-500/40';
    return 'text-rose-400 bg-rose-950/60 border-rose-500/40';
  };

  const getBadgeStyle = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (score >= 60) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Alert */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Master Resume Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Master Resume Match</span>
              <h3 className="text-xl font-bold text-white mt-1">Initial Evaluation</h3>
            </div>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getBadgeStyle(masterScore)}`}>
              {masterScore >= 80 ? 'ATS Compatible' : 'Below 80% Threshold'}
            </span>
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-5xl font-black text-white tracking-tight">{masterScore}%</span>
            <span className="text-sm text-slate-400">ATS Match Score</span>
          </div>

          {/* Progress track */}
          <div className="mt-4 w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                masterScore >= 80 ? 'bg-emerald-500' : masterScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, masterScore))}%` }}
            />
          </div>

          <p className="mt-4 text-xs text-slate-400 leading-relaxed">
            {isBelowThreshold ? (
              <span className="flex items-center gap-1.5 text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Score is below 80%. Automated ATS revision triggered.
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Meets the 80% requirement. Tailored ATS refinements generated.
              </span>
            )}
          </p>
        </div>

        {/* Updated Tailored Resume Card */}
        <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-cyan-950/30 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm shadow-lg shadow-indigo-950/20">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                New Tailored ATS Resume
              </span>
              <h3 className="text-xl font-bold text-white mt-1">Optimized Version</h3>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              ATS Optimized
            </span>
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-5xl font-black text-emerald-400 tracking-tight">{updatedResume.score}%</span>
            <span className="text-sm text-slate-300 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              +{scoreDelta}% increase
            </span>
          </div>

          {/* Progress track */}
          <div className="mt-4 w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-1000"
              style={{ width: `${Math.min(100, updatedResume.score)}%` }}
            />
          </div>

          <p className="mt-4 text-xs text-indigo-200/80 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            Keywords synchronized & Google X-Y-Z bullet points restructured.
          </p>
        </div>
      </div>

      {/* Evaluation Summary */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-2">
          Recruiter & ATS Assessment Breakdown
        </h4>
        <p className="text-sm text-slate-300 leading-relaxed">{evaluationSummary}</p>
      </div>

      {/* Differences Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Missing Keywords & Hard Skills */}
        <div className="bg-slate-900/60 border border-rose-950/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <XCircle className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Missing Keywords & Core Skills</h4>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
              {differences.missingKeywords.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {differences.missingKeywords.length > 0 ? (
              differences.missingKeywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 text-xs rounded-md bg-rose-950/40 text-rose-300 border border-rose-800/40 font-mono"
                >
                  {kw}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No critical keywords missing!</span>
            )}
          </div>
        </div>

        {/* Matched Strengths */}
        <div className="bg-slate-900/60 border border-emerald-950/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Matched Strengths & Experiences</h4>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
              {differences.matchedStrengths.length}
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {differences.matchedStrengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Missing Qualifications */}
        <div className="bg-slate-900/60 border border-amber-950/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Experience & Qualification Gaps</h4>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {differences.missingQualifications.map((gap, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Strategic Improvements Made */}
        <div className="bg-slate-900/60 border border-indigo-950/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Key Improvements in Updated Resume</h4>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {updatedResume.keyImprovements.map((imp, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>{imp}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Multiple Evaluation Runs Match Score Improvement History (Recharts) */}
      <ScoreHistoryChart
        history={
          history.length > 0
            ? history
            : [
                {
                  id: 'curr',
                  runIndex: 1,
                  timestamp: 'Just now',
                  roleOrCompany: 'Current Evaluation',
                  masterScore: masterScore,
                  tailoredScore: updatedResume.score,
                  improvement: scoreDelta,
                },
              ]
        }
        currentMasterScore={masterScore}
        currentTailoredScore={updatedResume.score}
      />
    </div>
  );
};
