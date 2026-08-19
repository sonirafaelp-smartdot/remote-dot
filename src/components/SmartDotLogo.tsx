import React from 'react';

// Exact vector recreation of 7.png logo (Server stack on crimson red circle with white servers)
export function SmartDotLogo({ className = 'w-9 h-9', showBadge = false }: { className?: string; showBadge?: boolean }) {
  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        {/* Red Circle Background #E10600 - #D90429 */}
        <circle cx="50" cy="50" r="50" fill="#E10600" />
        
        {/* Subtle inner glow / gradient */}
        <circle cx="50" cy="50" r="49" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />

        {/* Server 1 (Top) */}
        <rect x="26" y="28" width="48" height="13.5" rx="4" fill="#FFFFFF" />
        <circle cx="31" cy="34.75" r="2.2" fill="#E10600" />
        <rect x="56.5" y="33.25" width="11" height="3" rx="0.8" fill="#E10600" />

        {/* Server 2 (Middle) */}
        <rect x="26" y="43.5" width="48" height="13.5" rx="4" fill="#FFFFFF" />
        <circle cx="31" cy="50.25" r="2.2" fill="#E10600" />
        <rect x="56.5" y="48.75" width="11" height="3" rx="0.8" fill="#E10600" />

        {/* Server 3 (Bottom) */}
        <rect x="26" y="59" width="48" height="13.5" rx="4" fill="#FFFFFF" />
        <circle cx="31" cy="65.75" r="2.2" fill="#E10600" />
        <rect x="56.5" y="64.25" width="11" height="3" rx="0.8" fill="#E10600" />
      </svg>

      {showBadge && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
      )}
    </div>
  );
}

// Full Brand Header with SMARTDOT styling
export function SmartDotBrand({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <SmartDotLogo className="w-10 h-10" />
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <div className="flex items-baseline tracking-tight font-black text-lg">
            <span className="text-white font-extrabold tracking-tight">SMARTDOT</span>
            <span className="text-red-500 font-black ml-1.5 text-sm tracking-widest">•</span>
            <span className="text-slate-100 font-bold ml-1.5 text-sm">DESK</span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-red-500/20 text-red-400 border border-red-500/30">
            ENTERPRISE
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium tracking-wide">
          Help Desk Remoto • Cifrado Seguro • Windows .NET 9
        </span>
      </div>
    </div>
  );
}
