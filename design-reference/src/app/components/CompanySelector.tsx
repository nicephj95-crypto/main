import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CompanySelectorProps {
  value: string;
  onChange: (company: string) => void;
  hasError?: boolean;
}

export function CompanySelector({ value, onChange, hasError = false }: CompanySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mock 회사 목록
  const companies = [
    '마루시공업체B',
    '화장품공장A',
    '헬스가구제조C',
    '전자부품제조D',
    '식품유통E'
  ];

  const filteredCompanies = companies.filter(company =>
    company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <div
        className="w-full h-12 px-4 rounded-lg border cursor-pointer flex items-center justify-between"
        style={{
          backgroundColor: hasError ? '#FEE' : 'white',
          borderColor: hasError ? '#FBB' : 'var(--border3)'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ color: value ? 'var(--black)' : 'var(--gray)' }}>
          {value || '업체를 선택하세요'}
        </span>
        <ChevronDown 
          size={20} 
          style={{ color: 'var(--gray)' }}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 max-h-80 overflow-hidden"
          style={{ borderColor: 'var(--border3)' }}
        >
          <div className="p-2 border-b" style={{ borderColor: 'var(--border3)' }}>
            <input
              type="text"
              placeholder="업체명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded outline-none"
              style={{ borderColor: 'var(--border3)' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto max-h-64">
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((company) => (
                <div
                  key={company}
                  className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ color: 'var(--black)' }}
                  onClick={() => {
                    onChange(company);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {company}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-center" style={{ color: 'var(--gray)' }}>
                검색 결과가 없습니다
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}