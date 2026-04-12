
// ────────────────────────────────────────────────────────────
// frontend/src/components/TableMap.tsx
// Hiển thị sơ đồ bàn với màu trạng thái
// ────────────────────────────────────────────────────────────
import { useTables } from '../hooks/useTables';
import type { TableStatus } from '../types';

const colorMap: Record<TableStatus, string> = {
    available: '#27ae60',  // xanh lá — trống
    occupied: '#e67e22',  // cam     — có khách, đang nấu
    food_ready: '#2980b9',  // xanh    — món đã ra, chờ dọn
};
const labelMap: Record<TableStatus, string> = {
    available: 'Trống',
    occupied: 'Có khách',
    food_ready: 'Món đã ra',
};

export function TableMap() {
    const { tables } = useTables();

    return (
        <div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13 }}>
                {Object.entries(colorMap).map(([status, color]) => (
                    <span key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                            width: 12, height: 12, borderRadius: 2,
                            background: color, display: 'inline-block'
                        }} />
                        {labelMap[status as TableStatus]}
                    </span>
                ))}
            </div>

            {/* Grid bàn */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                {tables.map(table => (
                    <div
                        key={table.id}
                        style={{
                            padding: 16, borderRadius: 8, textAlign: 'center',
                            background: colorMap[table.status],
                            color: '#fff', fontWeight: 500,
                        }}
                    >
                        <div style={{ fontSize: 18 }}>Bàn {table.tableNumber}</div>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>
                            {labelMap[table.status]}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
