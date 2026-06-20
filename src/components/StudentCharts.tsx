import React from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
} from "recharts";

interface SubjectStat {
  id?: string;
  subjectName: string;
  percentage: number;
  present: number;
  total: number;
  status: "Safe" | "Below Requirement";
}

interface MonthlyStat {
  month: string;
  percentage: number;
  classes: number;
}

interface ChartsProps {
  subjectData: SubjectStat[];
  monthlyData: MonthlyStat[];
  overallPercentage: number;
}

// Custom tooltip for consistent styling
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0B1120] border border-white/5 p-3 rounded-xl shadow-2xl text-xs font-sans text-slate-200">
        <p className="font-bold text-white mb-1">{label}</p>
        <p className="text-indigo-400 font-semibold">
          Attendance: <span className="font-mono text-white font-bold">{payload[0].value.toFixed(1)}%</span>
        </p>
        {payload[0].payload.total !== undefined && (
          <p className="text-slate-400">
            Classes: <span className="font-mono text-slate-200 font-semibold">{payload[0].payload.present}/{payload[0].payload.total}</span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function StudentCharts({ subjectData, monthlyData, overallPercentage }: ChartsProps) {
  // Determine ring color based on percentage
  const getColor = (pct: number) => {
    if (pct < 75) return "text-rose-500 stroke-rose-500";
    if (pct < 80) return "text-indigo-400 stroke-indigo-400";
    return "text-emerald-500 stroke-emerald-500";
  };

  const getHexColor = (pct: number) => {
    if (pct < 75) return "#e11d48"; // Rose-600 (Immersive UI absent/critical style)
    if (pct < 80) return "#6366f1"; // Indigo-500
    return "#10b981"; // Emerald-500
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Overall Attendance Radial Display */}
      <div className="bg-[#0B1120] p-6 rounded-3xl shadow-2xl shadow-black/45 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 self-start">Overall Attendance</h3>
        
        <div className="relative w-44 h-44 flex items-center justify-center">
          {/* Background Ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="88"
              cy="88"
              r="76"
              className="stroke-slate-800/80"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Progress Fill */}
            <circle
              cx="88"
              cy="88"
              r="76"
              className={getColor(overallPercentage)}
              strokeWidth="11"
              fill="transparent"
              strokeDasharray={477.5}
              strokeDashoffset={477.5 - (477.5 * Math.min(overallPercentage, 100)) / 100}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
            />
          </svg>
          
          {/* Centered Percentage Label */}
          <div className="absolute text-center">
            <span className="text-4xl font-black text-white tracking-tight">
              {overallPercentage.toFixed(1)}%
            </span>
            <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-1">
              Minimum 75%
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-[10px] uppercase font-bold text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
            <span>&ge; 80% Safe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block"></span>
            <span>Alert</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
            <span>Critical</span>
          </div>
        </div>
      </div>

      {/* 2. Subject-wise Attendance — horizontal bars with the subject name and
          percentage attached directly to each bar's own row. This avoids the
          classic recharts problem of cramming every subject name along a single
          x-axis, which overlaps/crowds on narrow (mobile) screens. */}
      <div className="bg-[#0B1120] p-6 rounded-3xl shadow-2xl shadow-black/45 border border-white/5 lg:col-span-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Subject-wise Analytics</h3>

        {subjectData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-xs font-semibold text-slate-500">
            No subject data available.
          </div>
        ) : (
          <div className="space-y-5 max-h-80 overflow-y-auto pr-1">
            {subjectData.map((entry) => {
              const color = getHexColor(entry.percentage);
              const widthPct = Math.min(Math.max(entry.percentage, 0), 100);
              return (
                <div key={entry.id ?? entry.subjectName} className="w-full">
                  {/* Label row: subject name attached directly above its own bar */}
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span
                      className="text-xs sm:text-sm font-bold text-slate-200 leading-snug break-words pr-2"
                      title={entry.subjectName}
                    >
                      {entry.subjectName}
                    </span>
                    <span
                      className="text-xs sm:text-sm font-mono font-extrabold shrink-0"
                      style={{ color }}
                    >
                      {entry.percentage.toFixed(1)}%
                    </span>
                  </div>

                  {/* Bar track */}
                  <div className="relative w-full h-3 sm:h-3.5 rounded-full bg-slate-900/80 border border-white/[0.04] overflow-hidden">
                    {/* 75% threshold marker */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-rose-500/60"
                      style={{ left: "75%" }}
                      title="75% threshold"
                    />
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${widthPct}%`, backgroundColor: color }}
                    />
                  </div>

                  {/* Secondary detail: classes attended, kept small + muted */}
                  <div className="mt-1 text-[10px] font-semibold text-slate-500">
                    {entry.present}/{entry.total} classes attended
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Monthly Attendance Line Chart */}
      <div className="bg-[#0B1120] p-6 rounded-3xl shadow-2xl shadow-black/45 border border-white/5 lg:col-span-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Monthly Attendance Trend</h3>
        
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyData}
              margin={{ top: 10, right: 15, left: -25, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                domain={[40, 100]} 
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={75} stroke="#6366f1" strokeDasharray="3 3" />
              <Line 
                type="monotone" 
                dataKey="percentage" 
                stroke="#6366f1" 
                strokeWidth={3}
                dot={{ r: 5, fill: "#6366f1", strokeWidth: 1 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
