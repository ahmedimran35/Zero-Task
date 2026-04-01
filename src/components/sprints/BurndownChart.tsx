import { useMemo } from 'react';
import type { Sprint } from '../../types';
import { differenceInDays, format } from 'date-fns';

interface BurndownChartProps {
  sprint: Sprint & { tasks?: { id: string; title: string; status: string; priority: string }[] };
  completedTasks: number;
}

export default function BurndownChart({ sprint, completedTasks }: BurndownChartProps) {
  const totalDays = differenceInDays(new Date(sprint.endDate), new Date(sprint.startDate));
  const daysElapsed = Math.min(totalDays, differenceInDays(new Date(), new Date(sprint.startDate)));
  const totalTasks = sprint.totalTasks || 0;

  const chartData = useMemo(() => {
    const width = 600;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (totalDays <= 0 || totalTasks <= 0) return null;

    // Ideal burndown line (straight diagonal)
    const idealPoints: [number, number][] = [
      [padding.left, padding.top],
      [padding.left + chartWidth, padding.top + chartHeight],
    ];

    // Actual burndown line
    const actualPoints: [number, number][] = [];
    const remaining = totalTasks - completedTasks;

    // Start point
    actualPoints.push([padding.left, padding.top]);

    // Current point
    const xProgress = totalDays > 0 ? (daysElapsed / totalDays) : 0;
    const yProgress = totalTasks > 0 ? (remaining / totalTasks) : 0;
    const currentX = padding.left + xProgress * chartWidth;
    const currentY = padding.top + (1 - yProgress) * chartHeight;

    // Add intermediate points for visual effect
    if (daysElapsed > 0) {
      const midX = padding.left + (xProgress * 0.5) * chartWidth;
      const midY = padding.top + (1 - (remaining / totalTasks) * 0.7) * chartHeight;
      actualPoints.push([midX, Math.min(midY, currentY + 10)]);
    }

    actualPoints.push([currentX, currentY]);

    // Y-axis labels
    const yLabels: { y: number; label: string }[] = [];
    for (let i = 0; i <= 4; i++) {
      const value = Math.round((totalTasks / 4) * (4 - i));
      yLabels.push({
        y: padding.top + (i / 4) * chartHeight,
        label: value.toString(),
      });
    }

    // X-axis labels
    const xLabels: { x: number; label: string }[] = [];
    const labelCount = Math.min(7, totalDays + 1);
    for (let i = 0; i < labelCount; i++) {
      const dayIndex = Math.round((i / (labelCount - 1)) * totalDays);
      const date = new Date(new Date(sprint.startDate).getTime() + dayIndex * 86400000);
      xLabels.push({
        x: padding.left + (dayIndex / totalDays) * chartWidth,
        label: format(date, 'MMM d'),
      });
    }

    return { width, height, padding, chartWidth, chartHeight, idealPoints, actualPoints, yLabels, xLabels, currentX, currentY };
  }, [sprint, totalTasks, totalDays, daysElapsed, completedTasks]);

  if (!chartData || totalTasks === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-tertiary bg-secondary rounded-xl">
        No tasks in sprint to display burndown
      </div>
    );
  }

  const { width, height, padding, idealPoints, actualPoints, yLabels, xLabels, currentX, currentY } = chartData;

  return (
    <div className="bg-secondary rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-primary">Burndown Chart</h4>
        <div className="flex items-center gap-4 text-xs text-tertiary">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-slate-400" style={{ borderStyle: 'dashed' }} />
            <span>Ideal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-emerald-500" />
            <span>Actual</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines */}
        {yLabels.map((yl, i) => (
          <g key={`y-${i}`}>
            <line x1={padding.left} y1={yl.y} x2={width - padding.right} y2={yl.y}
              stroke="var(--border-primary, #e2e8f0)" strokeWidth={1} strokeDasharray="4 4" />
            <text x={padding.left - 8} y={yl.y + 4} textAnchor="end" fill="currentColor" fontSize={11} className="text-tertiary">
              {yl.label}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {xLabels.map((xl, i) => (
          <text key={`x-${i}`} x={xl.x} y={height - 8} textAnchor="middle" fill="currentColor" fontSize={10} className="text-tertiary">
            {xl.label}
          </text>
        ))}

        {/* Ideal burndown line */}
        <line x1={idealPoints[0][0]} y1={idealPoints[0][1]} x2={idealPoints[1][0]} y2={idealPoints[1][1]}
          stroke="#94a3b8" strokeWidth={2} strokeDasharray="8 4" />

        {/* Actual burndown line */}
        <polyline
          points={actualPoints.map(p => `${p[0]},${p[1]}`).join(' ')}
          fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
        />

        {/* Current position dot */}
        <circle cx={currentX} cy={currentY} r={5} fill="#10b981" />
        <circle cx={currentX} cy={currentY} r={8} fill="none" stroke="#10b981" strokeWidth={2} opacity={0.3} />

        {/* Stats */}
        <text x={width - padding.right} y={padding.top + 15} textAnchor="end" fill="currentColor" fontSize={12} fontWeight={600} className="text-primary">
          {completedTasks}/{totalTasks} done ({totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%)
        </text>
        <text x={width - padding.right} y={padding.top + 32} textAnchor="end" fill="currentColor" fontSize={11} className="text-tertiary">
          {Math.max(0, totalDays - daysElapsed)} days remaining
        </text>
      </svg>
    </div>
  );
}
