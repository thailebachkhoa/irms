import { useState, useEffect } from 'react';
import { TableMap } from '../components/TableMap';
import { RevenueChart } from '../components/RevenueChart';
import { Layout } from '../components/Layout';
import { inventoryApi } from '../services/inventoryApi';
import type { Ingredient } from '../types';

const TABS = [
  { key: 'tables', label: 'Sơ đồ bàn' },
  { key: 'inventory', label: 'Kho nguyên liệu' },
  { key: 'revenue', label: 'Doanh thu' },
];

export function ManagerPage() {
    const [tab, setTab] = useState('tables');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);

    useEffect(() => {
        if (tab === 'inventory')
            inventoryApi.getAll().then(setIngredients).catch(console.error);
    }, [tab]);

    return (
        <Layout title="Quản lý" tabs={TABS} activeTab={tab} onTabChange={setTab}>
            {tab === 'tables' && <TableMap />}
            {tab === 'revenue' && <RevenueChart />}
            {tab === 'inventory' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                            {['Nguyên liệu', 'Số lượng', 'Đơn vị', 'Ngưỡng cảnh báo'].map(h => (
                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ingredients.map(item => (
                            <tr key={item.id}
                                style={{
                                    borderTop: '1px solid #eee',
                                    background: item.quantity < item.threshold ? '#fff3f3' : 'transparent'
                                }}>
                                <td style={{ padding: '8px 12px' }}>{item.name}</td>
                                <td style={{
                                    padding: '8px 12px',
                                    color: item.quantity < item.threshold ? '#e74c3c' : 'inherit',
                                    fontWeight: item.quantity < item.threshold ? 500 : 400
                                }}>
                                    {item.quantity}
                                </td>
                                <td style={{ padding: '8px 12px' }}>{item.unit}</td>
                                <td style={{ padding: '8px 12px', color: '#999' }}>{item.threshold}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Layout>
    );
}
