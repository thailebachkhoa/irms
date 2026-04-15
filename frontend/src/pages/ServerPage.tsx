import { useState } from 'react';
import { OrderForm } from '../components/OrderForm';
import { TableMap } from '../components/TableMap';
import { Layout } from '../components/Layout';

const TABS = [
  { key: 'order', label: 'Tạo đơn' },
  { key: 'tables', label: 'Sơ đồ bàn' },
];

export function ServerPage() {
    const [tab, setTab] = useState('order');

    return (
        <Layout title="Phục vụ" tabs={TABS} activeTab={tab} onTabChange={setTab}>
            {tab === 'order' && <OrderForm />}
            {tab === 'tables' && <TableMap />}
        </Layout>
    );
}