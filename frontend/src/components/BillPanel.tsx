
// ────────────────────────────────────────────────────────────
// frontend/src/components/BillPanel.tsx
// Thu ngân tìm hóa đơn theo bàn, xác nhận thanh toán
// ────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useBilling } from '../hooks/useBilling';

export function BillPanel() {
    const { bill, loading, fetchBill, pay } = useBilling();
    const [tableInput, setTableInput] = useState('');

    return (
        <div style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Tìm hóa đơn */}
            <div style={{ display: 'flex', gap: 8 }}>
                <input
                    placeholder="Số bàn..."
                    value={tableInput}
                    onChange={e => setTableInput(e.target.value)}
                    style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                />
                <button
                    onClick={() => fetchBill(tableInput)}
                    style={{
                        padding: '8px 16px', background: '#2c3e50',
                        color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer'
                    }}
                >
                    Tìm
                </button>
            </div>

            {loading && <div>Đang tải...</div>}

            {/* Hiển thị hóa đơn */}
            {bill && (
                <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                    <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
                        Hóa đơn bàn {bill.tableId}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#2c3e50', marginBottom: 16 }}>
                        {bill.totalAmount.toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
                        Trạng thái: {bill.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </div>

                    {bill.status === 'pending' && (
                        <button
                            onClick={() => pay(bill.id)}
                            style={{
                                width: '100%', padding: 12, background: '#27ae60',
                                color: '#fff', border: 'none', borderRadius: 8,
                                fontSize: 16, fontWeight: 500, cursor: 'pointer',
                            }}
                        >
                            Xác nhận thanh toán
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}