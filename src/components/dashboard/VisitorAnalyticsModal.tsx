"use client";

import { useEffect, useState } from "react";
import { X, Calendar, Activity, Loader2 } from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";

interface VisitorAnalyticsModalProps {
  onClose: () => void;
}

export function VisitorAnalyticsModal({ onClose }: VisitorAnalyticsModalProps) {
  const [activeTab, setActiveTab] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const [data, setData] = useState<Record<string, string | number>[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/super-admin/analytics?type=${activeTab}&year=${selectedYear}&month=${selectedMonth}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, selectedYear, selectedMonth]);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f1629] border border-slate-700/50 p-3 rounded-lg shadow-xl">
          <p className="text-slate-400 text-xs mb-1">{label}</p>
          <p className="text-white font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            {payload[0].value} Pengunjung
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b1120] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Analitik Kunjungan</h2>
              <p className="text-xs text-slate-400">Pantau pergerakan trafik Landing Page Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 flex-1 overflow-y-auto">
          
          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            
            {/* Tabs */}
            <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
              <button
                onClick={() => setActiveTab("weekly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "weekly" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                7 Hari Terakhir
              </button>
              <button
                onClick={() => setActiveTab("monthly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "monthly" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Bulanan
              </button>
              <button
                onClick={() => setActiveTab("yearly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "yearly" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Tahunan
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              {activeTab === "monthly" && (
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="pl-9 pr-8 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm text-slate-200 appearance-none outline-none focus:border-blue-500/50 transition-colors cursor-pointer"
                  >
                    {months.map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
              
              {(activeTab === "monthly" || activeTab === "yearly") && (
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="pl-9 pr-8 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm text-slate-200 appearance-none outline-none focus:border-blue-500/50 transition-colors cursor-pointer"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>

          </div>

          {/* Chart Area */}
          <div className="h-[350px] w-full relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#475569" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="visits" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorVisits)" 
                    activeDot={{ r: 6, fill: "#3b82f6", stroke: "#0b1120", strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          
        </div>

      </div>
    </div>
  );
}
