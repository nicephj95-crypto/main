export function VanIcon() {
  return (
    <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Rear Wheel */}
      <circle cx="30" cy="65" r="10" stroke="#333" strokeWidth="2.5" fill="none"/>
      <circle cx="30" cy="65" r="6" stroke="#333" strokeWidth="1.5" fill="none"/>
      <circle cx="30" cy="65" r="2.5" fill="#333"/>
      
      {/* Front Wheel */}
      <circle cx="85" cy="65" r="10" stroke="#333" strokeWidth="2.5" fill="none"/>
      <circle cx="85" cy="65" r="6" stroke="#333" strokeWidth="1.5" fill="none"/>
      <circle cx="85" cy="65" r="2.5" fill="#333"/>
      
      {/* Main Body */}
      <path d="M 15 55 L 15 25 L 75 25 L 85 30 L 95 40 L 95 55" fill="#4A90E2" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      
      {/* Windshield */}
      <path d="M 75 25 L 75 40 L 85 30 Z" fill="#87CEEB" stroke="#333" strokeWidth="2"/>
      
      {/* Side Window */}
      <rect x="20" y="30" width="35" height="18" rx="1" fill="#87CEEB" stroke="#333" strokeWidth="1.5"/>
      
      {/* Door Line */}
      <line x1="40" y1="48" x2="40" y2="55" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
      
      {/* Front Bumper */}
      <path d="M 95 40 L 100 42 L 100 52 L 95 55" fill="#666" stroke="#333" strokeWidth="2"/>
      
      {/* Undercarriage */}
      <path d="M 20 65 L 15 65 L 15 55 M 40 65 L 75 65 M 95 65 L 95 55" stroke="#333" strokeWidth="2.5" strokeLinecap="round"/>
      
      {/* Side Detail Lines */}
      <line x1="15" y1="40" x2="70" y2="40" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
