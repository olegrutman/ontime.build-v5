/**
 * Sparkline — inline SVG trend line for KPI cards.
 * No axes, no tooltip; the KPI number carries the value, the line carries the slope.
 */
interface Props {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  fill?: string;
}

export function Sparkline({
  data,
  color = '#059669',
  width = 72,
  height = 20,
  strokeWidth = 1.5,
  fill,
}: Props) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} aria-hidden="true" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - strokeWidth * 2) - strokeWidth;
    return { x, y };
  });

  const path = points.reduce(
    (acc, p, i) => acc + (i === 0 ? `M${p.x.toFixed(1)} ${p.y.toFixed(1)}` : ` L${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    '',
  );

  const areaPath =
    fill && `${path} L${width} ${height} L0 ${height} Z`;

  const last = points[points.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
      {areaPath && <path d={areaPath} fill={fill} opacity={0.15} />}
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={strokeWidth + 0.5} fill={color} />
    </svg>
  );
}
