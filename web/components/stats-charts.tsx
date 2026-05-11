'use client';

import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DailyData {
  date: string;
  views: number;
  whatsapp: number;
  calls: number;
}

interface Props {
  dailyData: DailyData[];
  rangeLabel: string;
}

export default function StatsCharts({ dailyData, rangeLabel }: Props) {
  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-white/40 text-sm">Sin datos suficientes para mostrar estadísticas todavía.</p>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } 
    }
  };

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Gráfico de línea: visitas */}
      <motion.div variants={itemVariants} className="glass rounded-xl p-6">
        <h2 className="font-display text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary shadow-glow-sm" />
          Visitas al perfil <span className="text-white/30 text-sm font-normal">({rangeLabel})</span>
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dailyData}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E07B39" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#E07B39" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(10, 14, 26, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px 0 rgba(5, 6, 15, 0.5)',
                color: '#fff',
                padding: '10px 14px',
              }}
              itemStyle={{ color: '#FFB347' }}
              labelStyle={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', marginBottom: '4px' }}
            />
            {/* Línea de resplandor (sombra) */}
            <Line
              type="monotone"
              dataKey="views"
              stroke="#E07B39"
              strokeWidth={4}
              dot={false}
              style={{ filter: 'blur(4px)', opacity: 0.3 }}
            />
            {/* Línea principal */}
            <Line
              type="monotone"
              dataKey="views"
              stroke="url(#colorViews)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, fill: "#FFB347", stroke: "#fff", strokeWidth: 2, style: { filter: `drop-shadow(0 0 4px rgba(255,179,71,0.6))` } }}
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Gráfico de barras: WhatsApp vs Llamadas */}
      <motion.div variants={itemVariants} className="glass rounded-xl p-6">
        <h2 className="font-display text-lg font-semibold text-white mb-6 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-accent shadow-glow-accent" />
          Interacciones <span className="text-white/30 text-sm font-normal">({rangeLabel})</span>
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dailyData}>
            <defs>
              <linearGradient id="colorWhatsapp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.9}/>
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.4}/>
              </linearGradient>
              <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E07B39" stopOpacity={0.9}/>
                <stop offset="95%" stopColor="#E07B39" stopOpacity={0.4}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(10, 14, 26, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px 0 rgba(5, 6, 15, 0.5)',
                color: '#fff',
                padding: '10px 14px',
              }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', marginBottom: '4px' }}
            />
            <Bar dataKey="whatsapp" fill="url(#colorWhatsapp)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="calls" fill="url(#colorCalls)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        
        {/* Leyenda personalizada */}
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <span className="w-3 h-3 rounded-sm bg-accent/70" />
            WhatsApp
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <span className="w-3 h-3 rounded-sm bg-primary/70" />
            Llamadas
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}