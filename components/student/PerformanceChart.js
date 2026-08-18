"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

export default function PerformanceChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No data available</div>;
  }

  // Format data for Recharts
  const chartData = data.slice(-10).map((a, i) => ({
    name: `T${i + 1}`,
    fullTitle: a.testId?.title || "Test",
    percentage: a.percentage,
    score: a.score
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white p-3 rounded-lg shadow-xl border border-gray-700 text-xs">
          <p className="font-bold mb-1">{payload[0].payload.fullTitle}</p>
          <p className="text-blue-300">Percentage: {payload[0].value}%</p>
          <p className="text-gray-400 mt-1">Score: {payload[0].payload.score}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorPercentage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 12, fill: "#94a3b8" }} 
          axisLine={false} 
          tickLine={false} 
          dy={10} 
        />
        <YAxis 
          domain={[0, 100]} 
          tick={{ fontSize: 12, fill: "#94a3b8" }} 
          axisLine={false} 
          tickLine={false} 
          dx={-10} 
        />
        <Tooltip content={<CustomTooltip />} />
        <Area 
          type="monotone" 
          dataKey="percentage" 
          stroke="#2563eb" 
          strokeWidth={3} 
          fillOpacity={1} 
          fill="url(#colorPercentage)" 
          activeDot={{ r: 6, fill: "#ffffff", stroke: "#2563eb", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
