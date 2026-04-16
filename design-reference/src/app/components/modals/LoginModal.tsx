import { useState } from "react";
import { X } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [tab, setTab] = useState<"login" | "join">("login");
  const [autoLogin, setAutoLogin] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-7 pb-6 min-w-[360px] max-w-[96vw] w-[400px] max-[768px]:w-[92vw] max-[768px]:min-w-[92vw] animate-[mIn_0.18s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-extrabold" style={{ color: 'var(--black)' }}>로그인</span>
          <button className="w-7 h-7 rounded-md flex items-center justify-center text-lg transition-colors hover:bg-[var(--bg)]" style={{ color: 'var(--gray)' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="flex mb-6" style={{ borderBottom: '2px solid var(--border)' }}>
          <button
            onClick={() => setTab("login")}
            className={`flex-1 h-10 text-[15px] transition-all ${
              tab === "login" ? 'font-bold' : ''
            }`}
            style={{
              color: tab === "login" ? 'var(--blue)' : 'var(--gray)',
              borderBottom: `2px solid ${tab === "login" ? 'var(--blue)' : 'transparent'}`,
              marginBottom: '-2px',
            }}
          >
            로그인
          </button>
          <button
            onClick={() => setTab("join")}
            className={`flex-1 h-10 text-[15px] transition-all ${
              tab === "join" ? 'font-bold' : ''
            }`}
            style={{
              color: tab === "join" ? 'var(--blue)' : 'var(--gray)',
              borderBottom: `2px solid ${tab === "join" ? 'var(--blue)' : 'transparent'}`,
              marginBottom: '-2px',
            }}
          >
            회원가입
          </button>
        </div>

        {tab === "login" ? (
          <div className="flex flex-col gap-2.5">
            <input className="h-11 w-full rounded-md px-4 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }} type="text" placeholder="아이디 (이메일)" />
            <input className="h-11 w-full rounded-md px-4 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }} type="password" placeholder="비밀번호" />
            
            {/* 자동로그인 체크박스 */}
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="checkbox" 
                id="autoLogin"
                checked={autoLogin}
                onChange={(e) => setAutoLogin(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
                style={{ accentColor: 'var(--blue)' }}
              />
              <label htmlFor="autoLogin" className="text-sm cursor-pointer" style={{ color: 'var(--gray)' }}>
                자동로그인
              </label>
            </div>
            
            <button className="h-11 w-full rounded-md text-[15px] font-bold text-white mt-1.5 transition-colors hover:opacity-90" style={{ background: 'var(--blue)' }}>
              로그인
            </button>
            
            {/* ID/PW 찾기 */}
            <button 
              className="text-sm text-center transition-colors hover:underline mt-2"
              style={{ color: 'var(--gray)' }}
              onClick={() => alert('ID/PW 찾기 기능은 준비 중입니다.')}
            >
              아이디 / 비밀번호 찾기
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <input className="h-11 w-full rounded-md px-4 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }} type="text" placeholder="담당자명" />
            <input className="h-11 w-full rounded-md px-4 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }} type="text" placeholder="아이디 (이메일)" />
            <input className="h-11 w-full rounded-md px-4 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }} type="password" placeholder="비밀번호" />
            <input className="h-11 w-full rounded-md px-4 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }} type="password" placeholder="비밀번호 확인" />
            <input className="h-11 w-full rounded-md px-4 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }} type="text" placeholder="연락처" />
            
            {/* 자동로그인 체크박스 */}
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="checkbox" 
                id="autoLoginJoin"
                checked={autoLogin}
                onChange={(e) => setAutoLogin(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
                style={{ accentColor: 'var(--blue)' }}
              />
              <label htmlFor="autoLoginJoin" className="text-sm cursor-pointer" style={{ color: 'var(--gray)' }}>
                자동로그인
              </label>
            </div>
            
            <button className="h-11 w-full rounded-md text-[15px] font-bold text-white mt-1.5 transition-colors hover:opacity-90" style={{ background: 'var(--blue)' }}>
              회원가입
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes mIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
