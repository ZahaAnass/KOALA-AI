import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface UsagePoint {
  day: string;
  a: number;
  b: number;
}

interface UsageChartProps {
  data: UsagePoint[];
  labelA: string;
  labelB: string;
  height?: number;
}

const COLOR_A = "#217bfe";
const COLOR_B = "#e55571";

const shortDay = (day: string): string => {
  const d = new Date(day);
  return Number.isNaN(d.getTime()) ? day : `${d.getDate()}/${d.getMonth() + 1}`;
};

/** Stacked area chart of two daily series (for example user vs model messages). */
export function UsageChart({ data, labelA, labelB, height = 280 }: UsageChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="usage-a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLOR_A} stopOpacity={0.5} />
            <stop offset="100%" stopColor={COLOR_A} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="usage-b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLOR_B} stopOpacity={0.5} />
            <stop offset="100%" stopColor={COLOR_B} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fill: "var(--fg-muted)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis tick={{ fill: "var(--fg-muted)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--fg)" }}
          labelStyle={{ color: "var(--fg-muted)" }}
          cursor={{ stroke: "var(--border-strong)" }}
        />
        <Area type="monotone" dataKey="a" name={labelA} stackId="1" stroke={COLOR_A} fill="url(#usage-a)" strokeWidth={2} />
        <Area type="monotone" dataKey="b" name={labelB} stackId="1" stroke={COLOR_B} fill="url(#usage-b)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
