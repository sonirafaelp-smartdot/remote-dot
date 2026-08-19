import React from 'react';

// Exact vector recreation of DOTDESK official logo (Server stack on crimson red circle with DOTDESK lettering)
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
        
        {/* Subtle inner border */}
        <circle cx="50" cy="50" r="49" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

        {/* Server 1 (Top) */}
        <rect x="25" y="24" width="50" height="13" rx="3.5" fill="#FFFFFF" />
        <circle cx="30.5" cy="30.5" r="2.2" fill="#E10600" />
        <rect x="56" y="29" width="12" height="3" rx="0.8" fill="#E10600" />

        {/* Server 2 (Middle) */}
        <rect x="25" y="40" width="50" height="13" rx="3.5" fill="#FFFFFF" />
        <circle cx="30.5" cy="46.5" r="2.2" fill="#E10600" />
        <rect x="56" y="45" width="12" height="3" rx="0.8" fill="#E10600" />

        {/* Server 3 (Bottom) */}
        <rect x="25" y="56" width="50" height="13" rx="3.5" fill="#FFFFFF" />
        <circle cx="30.5" cy="62.5" r="2.2" fill="#E10600" />
        <rect x="56" y="61" width="12" height="3" rx="0.8" fill="#E10600" />

        {/* DOTDESK Text on Circle */}
        <text
          x="50"
          y="81"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="10"
          letterSpacing="0.8"
        >
          DOTDESK.
        </text>
      </svg>

      {showBadge && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-sm" />
      )}
    </div>
  );
}

// Full Brand Header with DOTDESK styling and slogan
export function SmartDotBrand({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <SmartDotLogo className="w-10 h-10" />
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <div className="flex items-baseline tracking-tight font-black text-lg">
            <span className="text-white font-black tracking-tight">DOT</span>
            <span className="text-red-500 font-extrabold ml-0.5">DESK</span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-red-500/20 text-red-400 border border-red-500/30">
            ENTERPRISE
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium tracking-wide">
          Acceso Remoto. Simplificado.
        </span>
      </div>
    </div>
  );
}

