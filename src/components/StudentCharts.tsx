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

// Custom shape for the subject-wise bar chart. Draws the colored bar and
// always renders the subject name + percentage as text INSIDE that same bar
// (never on a shared axis), shrinking the font and truncating with an
// ellipsis if the bar is too narrow for the full label — so the label can
// never spill into a neighboring bar or get clipped by the chart edge.
const SubjectBar = (props: any) => {
  const { x, y, width, height, fill, payload } = props;
  const name: string = payload?.subjectName ?? "";
  const pct: number = payload?.percentage ?? 0;
  const fullLabel = `${name}  ${pct.toFixed(1)}%`;
  const barWidth = Math.max(width, 2);
  const padding = 10;
  const available = Math.max(barWidth - padding * 2, 0);

  // Try a comfortable font size first, then shrink, then truncate the name
  // with an ellipsis as a last resort — always keeping the % visible.
  const charWidthFactor = 0.58;
  let fontSize = 12;
  let label = fullLabel;

  const widthAt = (text: string, size: number) => text.length * size * charWidthFactor;

  if (widthAt(label, fontSize) > available) {
    fontSize = 10;
  }
  if (widthAt(label, fontSize) > available) {
    const pctSuffix = `  ${pct.toFixed(1)}%`;
    const budgetChars = Math.max(
      Math.floor(available / (fontSize * charWidthFactor)) - pctSuffix.length,
      3
    );
    const truncatedName = name.length > budgetChars ? `${name.slice(0, Math.max(budgetChars - 1, 1))}…` : name;
    label = `${truncatedName}${pctSuffix}`;
  }
  if (widthAt(label, fontSize) > available) {
    // Extremely narrow bar — fall back to percentage only.
    label = `${pct.toFixed(0)}%`;
  }

  return (
    <g>
      <rect x={x} y={y} width={barWidth} height={height} rx={8} ry={8} fill={fill} />
      <text
        x={x + padding}
        y={y + height / 2}
        dy="0.35em"
        fontSize={fontSize}
        fontWeight={700}
        fill="#0B1120"
      >
        {label}
      </text>
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

      {/* 2. Subject-wise Attendance Bar Chart — horizontal bars with the subject
          name and percentage rendered as text INSIDE each colored bar (via a
          custom bar shape), so labels never crowd along a shared axis. */}
      <div className="bg-[#0B1120] p-6 rounded-3xl shadow-2xl shadow-black/45 border border-white/5 lg:col-span-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Subject-wise Analytics</h3>

        {subjectData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-xs font-semibold text-slate-500">
            No subject data available.
          </div>
        ) : (
          <div
            className="w-full overflow-y-auto pr-1"
            style={{ height: Math.max(subjectData.length * 56, 220) }}
          >
            <ResponsiveContainer width="100%" height={Math.max(subjectData.length * 56, 220)}>
              <BarChart
                data={subjectData}
                layout="vertical"
                barCategoryGap={18}
                margin={{ top: 8, right: 28, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="subjectName"
                  width={1}
                  tick={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255, 255, 255, 0.02)" }} />
                <ReferenceLine x={75} stroke="#f43f5e" strokeDasharray="4 4" />
                <Bar dataKey="percentage" radius={[8, 8, 8, 8]} barSize={32} minPointSize={44} shape={<SubjectBar />}>
                  {subjectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getHexColor(entry.percentage)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
