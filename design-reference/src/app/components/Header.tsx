import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { userRole, userName, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const allNavLinks = [
    { path: "/", label: "배차접수" },
    { path: "/history", label: "배차내역" },
    { path: "/addressbook", label: "주소록" },
    { path: "/groups", label: "그룹관리" },
    { path: "/users", label: "유저관리" },
  ];

  // 고객 권한일 때 유저관리 메뉴 숨기기
  const navLinks = userRole === '고객' 
    ? allNavLinks.filter(link => link.path !== '/users')
    : allNavLinks;

  return (
    <>
      <header className="h-[60px] flex items-center sticky top-0 z-[200] bg-white px-4 lg:px-[max(16px,calc((100vw-1180px)/2))]" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link 
          to="/" 
          className="text-2xl no-underline whitespace-nowrap flex-shrink-0"
          style={{ fontFamily: "'Lobster', cursive", color: 'var(--black)' }}
        >
          BAROO
        </Link>

        {/* Desktop Navigation */}
        <nav className="ml-[179px] hidden lg:flex">
          {navLinks.map((link, index) => (
            <Link
              key={link.path}
              to={link.path}
              className={`w-20 h-[60px] flex items-center justify-center no-underline text-sm ${
                index > 0 ? 'ml-10' : ''
              } ${
                isActive(link.path)
                  ? 'font-bold border-b-2'
                  : 'font-normal'
              }`}
              style={{
                color: 'var(--black)',
                borderColor: isActive(link.path) ? 'var(--black)' : 'transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Login Button */}
        <div className="ml-auto hidden lg:block">
          {userRole ? (
            <div className="flex items-center gap-3">
              <span className="text-sm whitespace-nowrap" style={{ color: 'var(--black)' }}>
                {userName} <span style={{ color: 'var(--blue)' }}>({userRole})</span>
              </span>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="text-sm whitespace-nowrap transition-colors hover:text-[var(--blue)]"
                style={{ color: 'var(--black)' }}
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="text-sm whitespace-nowrap transition-colors hover:text-[var(--blue)]"
              style={{ color: 'var(--black)' }}
            >
              LOGIN / JOIN US
            </button>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="lg:hidden ml-auto p-1"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="메뉴"
        >
          {mobileMenuOpen ? (
            <X size={24} style={{ stroke: 'var(--black)' }} />
          ) : (
            <Menu size={24} style={{ stroke: 'var(--black)' }} />
          )}
        </button>
      </header>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden flex flex-col fixed top-[61px] left-0 right-0 bg-white z-[199]" style={{ borderBottom: '1px solid var(--border)' }}>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`px-6 py-3.5 text-[15px] no-underline text-left ${
                isActive(link.path) ? 'font-bold' : ''
              }`}
              style={{
                color: isActive(link.path) ? 'var(--blue)' : 'var(--black)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {link.label}
            </Link>
          ))}
          {userRole ? (
            <div className="px-6 py-3.5 text-[15px] text-left flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm whitespace-nowrap" style={{ color: 'var(--black)' }}>
                {userName} <span style={{ color: 'var(--blue)' }}>({userRole})</span>
              </span>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                  setMobileMenuOpen(false);
                }}
                className="text-sm whitespace-nowrap transition-colors hover:text-[var(--blue)]"
                style={{ color: 'var(--black)' }}
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3.5 text-[15px] text-left"
              style={{
                color: 'var(--black)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              LOGIN / JOIN US
            </button>
          )}
        </div>
      )}
    </>
  );
}