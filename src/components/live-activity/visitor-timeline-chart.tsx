"use client";

import { useState } from "react";

interface Point {
  label: string;
  count: number;
}

const WIDTH = 640;
const HEIGHT = 160;
const PAD_X = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

/** Single-series sparkline of concurrent visitors over the last hour — thin line, rounded data-end, recessive gridlines, hover crosshair. No legend needed for one series (the card title already names it). */
export function VisitorTimelineChart({ data }: { data: Point[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const plotWidth = WIDTH - PAD_X * 2;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;

  function xFor(i: number) {
    return PAD_X + i * stepX;
  }
  function yFor(count: number) {
    return PAD_TOP + plotHeight - (count / maxCount) * plotHeight;
  }

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(d.count).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${xFor(data.length - 1).toFixed(1)} ${(PAD_TOP + plotHeight).toFixed(1)} L ${xFor(0).toFixed(1)} ${(PAD_TOP + plotHeight).toFixed(1)} Z`;

  const gridLines = [0, 0.5, 1];
  const allZero = data.every((d) => d.count === 0);

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full min-w-[480px]"
        role="img"
        aria-label="Concurrent visitors over the last hour"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {gridLines.map((g) => (
          <line key={g} x1={PAD_X} x2={WIDTH - PAD_X} y1={PAD_TOP + plotHeight * g} y2={PAD_TOP + plotHeight * g} stroke="var(--border)" strokeWidth={1} />
        ))}

        {!allZero && (
          <>
            <path d={areaPath} fill="var(--success)" opacity={0.08} />
            <path d={linePath} fill="none" stroke="var(--success)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}

        {data.map((d, i) => (
          <circle key={i} cx={xFor(i)} cy={yFor(d.count)} r={hoverIndex === i ? 4 : 0} fill="var(--success)" className="transition-all" />
        ))}

        {data.map((d, i) => (
          <rect
            key={`hit-${i}`}
            x={xFor(i) - stepX / 2}
            y={PAD_TOP}
            width={stepX || plotWidth}
            height={plotHeight}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
          />
        ))}

        {data.map((d, i) => {
          const isFirst = i === 0;
          const isLast = i === data.length - 1;
          const isMiddle = i === Math.floor(data.length / 2);
          if (!isFirst && !isLast && !isMiddle) return null;
          // Middle-anchoring the first/last labels on their exact point centers
          // the text on the plot edge, so half of it runs past the viewBox and
          // gets clipped — anchor those two inward instead so they grow away
          // from the edge; the middle label has room on both sides already.
          const textAnchor = isFirst ? "start" : isLast ? "end" : "middle";
          return (
            <text key={`label-${i}`} x={xFor(i)} y={HEIGHT - 6} textAnchor={textAnchor} fontSize={10} fill="var(--muted-foreground)">
              {d.label}
            </text>
          );
        })}

        {hoverIndex !== null && (
          <line x1={xFor(hoverIndex)} x2={xFor(hoverIndex)} y1={PAD_TOP} y2={PAD_TOP + plotHeight} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
        )}
      </svg>

      {hoverIndex !== null && (
        <div
          className="pointer-events-none absolute rounded-md border border-border bg-card px-2 py-1 text-xs shadow-md"
          style={{ left: `${(xFor(hoverIndex) / WIDTH) * 100}%`, top: 4, transform: "translateX(-50%)" }}
        >
          <p className="font-medium">{data[hoverIndex].count} visitor{data[hoverIndex].count === 1 ? "" : "s"}</p>
          <p className="text-muted-foreground">{data[hoverIndex].label}</p>
        </div>
      )}

      {allZero && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">No visitors in the last hour</p>
      )}
    </div>
  );
}
