import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = '고객' | '배차' | '영업' | '관리';

interface AuthContextType {
  userRole: UserRole | null;
  userName: string | null;
  company: string | null;
  setAuth: (role: UserRole, name: string, company?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [company, setCompany] = useState<string | null>(null);

  useEffect(() => {
    // 로컬스토리지에서 권한 정보 불러오기
    const savedRole = localStorage.getItem('userRole') as UserRole | null;
    const savedName = localStorage.getItem('userName');
    const savedCompany = localStorage.getItem('company');
    if (savedRole && savedName) {
      setUserRole(savedRole);
      setUserName(savedName);
      setCompany(savedCompany);
    }
  }, []);

  const setAuth = (role: UserRole, name: string, company?: string) => {
    setUserRole(role);
    setUserName(name);
    setCompany(company || null);
    localStorage.setItem('userRole', role);
    localStorage.setItem('userName', name);
    if (company) {
      localStorage.setItem('company', company);
    } else {
      localStorage.removeItem('company');
    }
  };

  const logout = () => {
    setUserRole(null);
    setUserName(null);
    setCompany(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('company');
  };

  return (
    <AuthContext.Provider value={{ userRole, userName, company, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}