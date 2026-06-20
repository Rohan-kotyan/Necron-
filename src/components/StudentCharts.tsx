import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  LineChart,
  Line,
  LabelList,
} from "recharts";

interface SubjectStat {
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

// Wraps long subject names onto up to two short lines so labels stay
// fully visible near their bar and never overlap neighboring labels,
// on both mobile and desktop.
const SubjectAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const value = String(payload?.value ?? "");
  const words = value.split(" ");
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const candidate = (current + " " + word).trim();
    if (candidate.length > 11 && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  const finalLines = lines.slice(0, 2);

  return (
    <g transform={`translate(${x},${y})`}>
      {finalLines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={0}
          dy={12 + i * 12}
          textAnchor="middle"
          fill="#cbd5e1"
          fontSize={10}
          fontWeight={700}
        >
          {line}
        </text>
      ))}
    </g>
  );
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

      {/* 2. Subject-wise Attendance Bar Chart */}
      <div className="bg-[#0B1120] p-4 sm:p-6 rounded-3xl shadow-2xl shadow-black/45 border border-white/5 lg:col-span-2 min-w-0">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Subject-wise Analytics</h3>

        {subjectData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-500 font-semibold">
            No active subjects to display yet.
          </div>
        ) : (
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={subjectData}
                margin={{ top: 24, right: 14, left: -18, bottom: 10 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis
                  dataKey="subjectName"
                  tick={<SubjectAxisTick />}
                  interval={0}
                  height={42}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255, 255, 255, 0.02)" }} />
                <ReferenceLine y={75} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: '75% Threshold', position: 'insideTopRight', fill: '#f43f5e', fontSize: 9, fontWeight: 'bold' }} />
                <Bar dataKey="percentage" radius={[8, 8, 0, 0]} barSize={28} maxBarSize={36}>
                  {subjectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getHexColor(entry.percentage)} />
                  ))}
                  <LabelList
                    dataKey="percentage"
                    position="top"
                    formatter={(v: number) => `${v.toFixed(0)}%`}
                    style={{ fill: "#e2e8f0", fontSize: 11, fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend: maps each subject to its bar color so it stays identifiable even if labels get tight on small screens */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {subjectData.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: getHexColor(entry.percentage) }}
              />
              <span className="text-[10px] sm:text-xs font-semibold text-slate-300 truncate max-w-[140px]">
                {entry.subjectName}
              </span>
            </div>
          ))}
        </div>
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
