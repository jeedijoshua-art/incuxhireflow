import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { time: '0:00', score: 65 },
  { time: '3:00', score: 78 },
  { time: '6:00', score: 82 },
  { time: '9:00', score: 80 },
  { time: '12:00', score: 89 },
  { time: '15:00', score: 92 },
];

export default function ProgressChart() {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#71717a', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#71717a', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
            itemStyle={{ color: '#2dd4bf' }}
          />
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke="#2dd4bf" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorScore)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
