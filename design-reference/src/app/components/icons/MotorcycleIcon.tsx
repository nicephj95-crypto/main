export function MotorcycleIcon() {
  return (
    <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Rear Wheel */}
      <circle cx="25" cy="60" r="15" stroke="#333" strokeWidth="2.5" fill="none"/>
      <circle cx="25" cy="60" r="10" stroke="#333" strokeWidth="1.5" fill="none"/>
      <circle cx="25" cy="60" r="3" fill="#333"/>
      
      {/* Front Wheel */}
      <circle cx="85" cy="60" r="15" stroke="#333" strokeWidth="2.5" fill="none"/>
      <circle cx="85" cy="60" r="10" stroke="#333" strokeWidth="1.5" fill="none"/>
      <circle cx="85" cy="60" r="3" fill="#333"/>
      
      {/* Frame */}
      <path d="M 25 60 L 40 45 L 50 35 L 65 35 L 75 45 L 85 60" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      
      {/* Seat */}
      <path d="M 40 45 L 60 45 L 65 40 L 45 40 Z" fill="#4A90E2" stroke="#333" strokeWidth="2"/>
      
      {/* Handlebar */}
      <path d="M 75 45 L 75 30 M 70 30 L 80 30" stroke="#333" strokeWidth="2.5" strokeLinecap="round"/>
      
      {/* Engine */}
      <rect x="45" y="48" width="20" height="12" rx="2" fill="#666" stroke="#333" strokeWidth="1.5"/>
      
      {/* Rear Support */}
      <path d="M 25 60 L 25 50 L 40 45" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      
      {/* Front Fork */}
      <path d="M 75 45 L 85 60" stroke="#333" strokeWidth="2.5" strokeLinecap="round"/>
      
      {/* Delivery Box */}
      <rect x="15" y="25" width="25" height="18" rx="2" fill="#4A90E2" stroke="#333" strokeWidth="2"/>
      <line x1="15" y1="34" x2="40" y2="34" stroke="#333" strokeWidth="1.5"/>
    </svg>
  );
}
