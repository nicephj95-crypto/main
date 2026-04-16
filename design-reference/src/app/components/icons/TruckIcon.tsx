export function TruckIcon() {
  return (
    <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Rear Wheel */}
      <circle cx="25" cy="65" r="11" stroke="#333" strokeWidth="2.5" fill="none"/>
      <circle cx="25" cy="65" r="7" stroke="#333" strokeWidth="1.5" fill="none"/>
      <circle cx="25" cy="65" r="3" fill="#333"/>
      
      {/* Middle Wheel */}
      <circle cx="45" cy="65" r="11" stroke="#333" strokeWidth="2.5" fill="none"/>
      <circle cx="45" cy="65" r="7" stroke="#333" strokeWidth="1.5" fill="none"/>
      <circle cx="45" cy="65" r="3" fill="#333"/>
      
      {/* Front Wheel */}
      <circle cx="95" cy="65" r="11" stroke="#333" strokeWidth="2.5" fill="none"/>
      <circle cx="95" cy="65" r="7" stroke="#333" strokeWidth="1.5" fill="none"/>
      <circle cx="95" cy="65" r="3" fill="#333"/>
      
      {/* Cargo Container */}
      <path d="M 8 54 L 8 20 L 70 20 L 70 54" fill="#4A90E2" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      
      {/* Container Panels */}
      <line x1="25" y1="20" x2="25" y2="54" stroke="#333" strokeWidth="1.5"/>
      <line x1="42" y1="20" x2="42" y2="54" stroke="#333" strokeWidth="1.5"/>
      <line x1="59" y1="20" x2="59" y2="54" stroke="#333" strokeWidth="1.5"/>
      <line x1="8" y1="35" x2="70" y2="35" stroke="#333" strokeWidth="1.5"/>
      
      {/* Cabin */}
      <path d="M 70 54 L 70 42 L 78 32 L 88 30 L 100 38 L 105 44 L 105 54" fill="#4A90E2" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      
      {/* Windshield */}
      <path d="M 78 32 L 78 42 L 70 42 Z" fill="#87CEEB" stroke="#333" strokeWidth="2"/>
      
      {/* Side Window */}
      <path d="M 85 33 L 95 33 L 100 38 L 95 42 L 85 42 Z" fill="#87CEEB" stroke="#333" strokeWidth="1.5"/>
      
      {/* Front Grill */}
      <path d="M 100 38 L 105 40 L 108 44 L 108 50 L 105 54" fill="#666" stroke="#333" strokeWidth="2"/>
      <line x1="105" y1="42" x2="108" y2="44" stroke="#333" strokeWidth="1"/>
      <line x1="105" y1="46" x2="108" y2="47" stroke="#333" strokeWidth="1"/>
      <line x1="105" y1="50" x2="108" y2="50" stroke="#333" strokeWidth="1"/>
      
      {/* Undercarriage */}
      <path d="M 14 65 L 8 65 L 8 54 M 36 65 L 54 65 M 56 65 L 84 65 M 106 65 L 105 65 L 105 54" stroke="#333" strokeWidth="2.5" strokeLinecap="round"/>
      
      {/* Cabin Detail */}
      <line x1="88" y1="30" x2="88" y2="54" stroke="#333" strokeWidth="1.5"/>
    </svg>
  );
}
