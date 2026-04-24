import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { toast, Toaster } from 'sonner';

export function LoginPage() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ id: false, password: false });
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // 필수 입력 검증
    const newErrors = {
      id: !id.trim(),
      password: !password.trim(),
    };
    setErrors(newErrors);

    if (!id.trim() || !password.trim()) {
      return;
    }

    // 임시 로그인 로직
    if (password !== '1234') {
      toast.error('비밀번호가 올바르지 않습니다.');
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
      toast.error('존재하지 않는 사용자입니다.');
      return;
    }

    // 고객 권한인 경우 마루시공업체B 소속으로 설정
    const company = role === '고객' ? '마루시공업체B' : undefined;
    setAuth(role, id, company);
    toast.success('로그인 성공!');
    navigate('/');
  };

  return (
    <>
      <Toaster position="top-center" richColors />
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
              onChange={(e) => {
                setId(e.target.value);
                if (errors.id) setErrors({ ...errors, id: false });
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
              style={{
                borderColor: errors.id ? '#FBB' : 'var(--border3)',
                backgroundColor: errors.id ? '#FEE' : 'white',
                color: 'var(--black)'
              }}
              placeholder="고객 / 배차 / 영업 / 관리"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--black)' }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: false });
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
              style={{
                borderColor: errors.password ? '#FBB' : 'var(--border3)',
                backgroundColor: errors.password ? '#FEE' : 'white',
                color: 'var(--black)'
              }}
              placeholder="1234"
            />
          </div>

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
    </>
  );
}