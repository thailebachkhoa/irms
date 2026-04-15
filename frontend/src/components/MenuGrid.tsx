import type { MenuItem } from '../types';

type Props = {
    menu: MenuItem[];
    onSelect: (item: MenuItem) => void;
};

export function MenuGrid({ menu, onSelect }: Props) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {menu.map(item => (
                <button
                    key={item.id}
                    disabled={!item.isAvailable}
                    onClick={() => onSelect(item)}
                    style={{
                        padding: 16,
                        opacity: item.isAvailable ? 1 : 0.4,
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        cursor: item.isAvailable ? 'pointer' : 'not-allowed',
                        background: item.isAvailable ? '#fff' : '#f5f5f5',
                    }}
                >
                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                    <div style={{ color: '#666', fontSize: 13 }}>
                        {item.price.toLocaleString('vi-VN')} đ
                    </div>
                    {!item.isAvailable && (
                        <div style={{ color: '#e74c3c', fontSize: 12 }}>Hết hàng</div>
                    )}
                </button>
            ))}
        </div>
    );
}