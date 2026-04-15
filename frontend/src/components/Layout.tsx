import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Props = {
  title: string;
  tabs?: { key: string; label: string }[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  children: React.ReactNode;
};

export function Layout({ title, tabs, activeTab, onTabChange, children }: Props) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>{title}</h1>
        <button
          onClick={handleLogout}
          style={{ padding: '6px 12px', cursor: 'pointer', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}
        >
          Đăng xuất
        </button>
      </div>

      {tabs && onTabChange && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: activeTab === t.key ? '#2c3e50' : '#eee',
                color: activeTab === t.key ? '#fff' : '#333',
                fontWeight: activeTab === t.key ? 500 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
