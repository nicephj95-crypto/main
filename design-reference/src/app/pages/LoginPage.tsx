import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, UserRole } from '../contexts/AuthContext';

export function LoginPage() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 임시 로그인 로직
    if (password !== '1234') {
      setError('비밀번호가 올바르지 않습니다.');
      return;
    }

    const roleMap: Record<string, UserRole> = {
      '고객': '고객',
      '배차': '배차',
      '영업': '영업',
      '관리': '관리'
    };

    const role = roleMap[id];
    if (!role) {
      setError('존재하지 않는 사용자입니다.');
      return;
    }

    // 고객 권한인 경우 마루시공업체B 소속으로 설정
    const company = role === '고객' ? '마루시공업체B' : undefined;
    setAuth(role, id, company);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f5f5' }}>
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--blue)' }}>BAROO</h1>
          <p className="text-sm" style={{ color: '#666' }}>물류 배차 관리 시스템</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--black)' }}>
              아이디
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
              style={{ 
                borderColor: 'var(--border3)',
                color: 'var(--black)'
              }}
              placeholder="고객 / 배차 / 영업 / 관리"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--black)' }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
              style={{ 
                borderColor: 'var(--border3)',
                color: 'var(--black)'
              }}
              placeholder="1234"
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded" style={{ backgroundColor: '#fee', color: '#c33' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--blue)' }}
          >
            로그인
          </button>
        </form>

        <div className="mt-6 text-center text-xs" style={{ color: '#999' }}>
          <p>테스트 계정: 고객/배차/영업/관리 (비밀번호: 1234)</p>
        </div>
      </div>
    </div>
  );
}