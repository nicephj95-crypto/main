export function PickupIcon() {
  return (
    <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Rear Wheel */}
      <circle cx="28" cy="65" r="11" stroke="#333" strokeWidth="2.5" fill="none"/>
      <circle cx="28" cy="65" r="7" stroke="#333" strokeWidth="1.5" fill="none"/>
      <circle cx="28" cy="65" r="3" fill="#333"/>
      
      {/* Front Wheel */}
      <circle cx="90" cy="65" r="11" stroke="#333" strokeWidth="2.5" fill="none"/>
      <circle cx="90" cy="65" r="7" stroke="#333" strokeWidth="1.5" fill="none"/>
      <circle cx="90" cy="65" r="3" fill="#333"/>
      
      {/* Cargo Bed */}
      <path d="M 10 54 L 10 30 L 58 30 L 58 54" fill="#4A90E2" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      
      {/* Cargo Bed Side Lines */}
      <line x1="10" y1="42" x2="58" y2="42" stroke="#333" strokeWidth="1.5"/>
      <line x1="25" y1="30" x2="25" y2="54" stroke="#333" strokeWidth="1.5"/>
      <line x1="43" y1="30" x2="43" y2="54" stroke="#333" strokeWidth="1.5"/>
      
      {/* Cabin */}
      <path d="M 58 54 L 58 38 L 68 28 L 85 28 L 95 38 L 95 54" fill="#4A90E2" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      
      {/* Windshield */}
      <path d="M 68 28 L 68 38 L 58 38 Z" fill="#87CEEB" stroke="#333" strokeWidth="2"/>
      
      {/* Side Window */}
      <path d="M 75 32 L 88 32 L 92 38 L 75 38 Z" fill="#87CEEB" stroke="#333" strokeWidth="1.5"/>
      
      {/* Front Bumper */}
      <path d="M 95 38 L 100 40 L 100 50 L 95 54" fill="#666" stroke="#333" strokeWidth="2"/>
      
      {/* Undercarriage */}
      <path d="M 17 65 L 10 65 L 10 54 M 39 65 L 79 65 M 101 65 L 95 65 L 95 54" stroke="#333" strokeWidth="2.5" strokeLinecap="round"/>
      
      {/* Cabin Detail */}
      <line x1="85" y1="28" x2="85" y2="54" stroke="#333" strokeWidth="1.5"/>
    </svg>
  );
}
