import { useKitchen } from '../hooks/useKitchen';

export function KitchenBoard() {
    const { tickets, startCooking, markDone } = useKitchen();

    const pending = tickets.filter(t => t.status === 'pending');
    const cooking = tickets.filter(t => t.status === 'cooking');

    const cardStyle = {
        padding: 12, border: '1px solid #ddd', borderRadius: 8,
        background: '#fff', marginBottom: 8,
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
                <h3 style={{ color: '#e67e22' }}>Chờ nấu ({pending.length})</h3>
                {pending.map(t => (
                    <div key={t.id} style={cardStyle}>
                        <div style={{ fontWeight: 500 }}>Bàn {t.tableId}</div>
                        <div>{t.quantity}x {t.comboName}</div>
                        {t.notes && <div style={{ color: '#666', fontSize: 13 }}>"{t.notes}"</div>}
                        <button
                            onClick={() => startCooking(t.id)}
                            style={{
                                marginTop: 8, padding: '6px 12px', background: '#e67e22',
                                color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer'
                            }}
                        >
                            Bắt đầu nấu
                        </button>
                    </div>
                ))}
            </div>

            <div>
                <h3 style={{ color: '#27ae60' }}>Đang nấu ({cooking.length})</h3>
                {cooking.map(t => (
                    <div key={t.id} style={cardStyle}>
                        <div style={{ fontWeight: 500 }}>Bàn {t.tableId}</div>
                        <div>{t.quantity}x {t.comboName}</div>
                        {t.notes && <div style={{ color: '#666', fontSize: 13 }}>"{t.notes}"</div>}
                        <button
                            onClick={() => markDone(t.id)}
                            style={{
                                marginTop: 8, padding: '6px 12px', background: '#27ae60',
                                color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer'
                            }}
                        >
                            Xong món
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
