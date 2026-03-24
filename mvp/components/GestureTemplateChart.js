import React from "react";

const MARGIN = { left: 48, right: 15, top: 28, bottom: 30 };
const PANEL_H = 90;
const GAP = 18;
const CHART_W = 380;
const CHART_H = MARGIN.top + PANEL_H + GAP + PANEL_H + MARGIN.bottom;

// X=red, Y=green, Z=blue — matches matplotlib default cycle
const COLORS = ["#e53935", "#43a047", "#1e88e5"];

function dataRange(arr) {
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const pad = (max - min) * 0.06 || 1;
    return [min - pad, max + pad];
}

function toPolylinePoints(values, plotW, yMin, yMax, panelTop, panelH) {
    if (!values || values.length === 0) return "";
    const n = values.length;
    return values
        .map((v, i) => {
            const x = MARGIN.left + (i / (n - 1)) * plotW;
            const y = panelTop + panelH * (1 - (v - yMin) / (yMax - yMin));
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
}

function YTicks({ x, panelTop, panelH, min, max }) {
    const mid = (min + max) / 2;
    const ticks = [
        { y: panelTop + 4,          val: max },
        { y: panelTop + panelH / 2, val: mid },
        { y: panelTop + panelH - 2, val: min },
    ];
    return (
        <>
            {ticks.map(({ y, val }) => (
                <text key={val} x={x} y={y} textAnchor="end" fontSize={8} fill="#666">
                    {val.toFixed(1)}
                </text>
            ))}
        </>
    );
}

export default function GestureTemplateChart({ template, gestureName }) {
    const plotW = CHART_W - MARGIN.left - MARGIN.right;

    const gyroTop = MARGIN.top;
    const accTop  = MARGIN.top + PANEL_H + GAP;

    const gyroCols = ["gyro_x", "gyro_y", "gyro_z"];
    const accCols  = ["acc_x",  "acc_y",  "acc_z"];

    const allGyro = gyroCols.flatMap((c) => template[c] || []);
    const allAcc  = accCols.flatMap((c)  => template[c] || []);

    const [gyroMin, gyroMax] = dataRange(allGyro);
    const [accMin,  accMax]  = dataRange(allAcc);

    return (
        <svg width={CHART_W} height={CHART_H} style={{ fontFamily: "sans-serif", display: "block" }}>
            {/* Title */}
            <text x={CHART_W / 2} y={16} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#333">
                {gestureName}
            </text>

            {/* ── Gyro panel ── */}
            <rect x={MARGIN.left} y={gyroTop} width={plotW} height={PANEL_H} fill="#fafafa" stroke="#ddd" />
            <text
                transform={`translate(11, ${gyroTop + PANEL_H / 2}) rotate(-90)`}
                textAnchor="middle" fontSize={9} fill="#555"
            >
                Gyro (d/s)
            </text>
            <YTicks x={MARGIN.left - 3} panelTop={gyroTop} panelH={PANEL_H} min={gyroMin} max={gyroMax} />
            {gyroCols.map((col, i) => (
                <polyline
                    key={col}
                    points={toPolylinePoints(template[col], plotW, gyroMin, gyroMax, gyroTop, PANEL_H)}
                    fill="none"
                    stroke={COLORS[i]}
                    strokeWidth={1.5}
                />
            ))}

            {/* ── Acc panel ── */}
            <rect x={MARGIN.left} y={accTop} width={plotW} height={PANEL_H} fill="#fafafa" stroke="#ddd" />
            <text
                transform={`translate(11, ${accTop + PANEL_H / 2}) rotate(-90)`}
                textAnchor="middle" fontSize={9} fill="#555"
            >
                Accel (m/s²)
            </text>
            <YTicks x={MARGIN.left - 3} panelTop={accTop} panelH={PANEL_H} min={accMin} max={accMax} />
            {accCols.map((col, i) => (
                <polyline
                    key={col}
                    points={toPolylinePoints(template[col], plotW, accMin, accMax, accTop, PANEL_H)}
                    fill="none"
                    stroke={COLORS[i]}
                    strokeWidth={1.5}
                />
            ))}

            {/* x-axis label */}
            <text x={CHART_W / 2} y={CHART_H - 2} textAnchor="middle" fontSize={9} fill="#555">
                Sample (0–99)
            </text>

            {/* Legend (top-right of gyro panel) */}
            {["X", "Y", "Z"].map((label, i) => (
                <g key={label} transform={`translate(${MARGIN.left + plotW - 78 + i * 28}, ${gyroTop + 10})`}>
                    <line x1={0} y1={0} x2={14} y2={0} stroke={COLORS[i]} strokeWidth={1.5} />
                    <text x={17} y={4} fontSize={9} fill="#333">{label}</text>
                </g>
            ))}
        </svg>
    );
}
