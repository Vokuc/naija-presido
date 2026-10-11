'use client';

import { Html } from '@react-three/drei';

interface EntityLabelProps {
  name: string;
  role?: string;
  activity?: string;
  isNpc?: boolean;
  isNearby?: boolean;
}

export function EntityLabel({ name, role, activity, isNpc = false, isNearby = false }: EntityLabelProps) {
  return (
    <Html position={[0, 2.2, 0]} center distanceFactor={16}>
      <div
        className={`pointer-events-none select-none flex flex-col items-center transition-all duration-200 ${
          isNearby ? 'scale-110' : 'scale-90 opacity-90'
        }`}
      >
        <div
          className={`px-2.5 py-1 rounded-full shadow-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap backdrop-blur-md ${
            isNpc
              ? 'bg-amber-950/85 text-amber-200 border border-amber-500/50'
              : 'bg-emerald-950/85 text-emerald-200 border border-emerald-500/50'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isNpc ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
          <span>{name}</span>
          {role && (
            <span className="text-[10px] text-zinc-300 font-normal">
              • {role}
            </span>
          )}
        </div>

        {activity && isNearby && (
          <div className="mt-1 px-2 py-0.5 rounded-md bg-black/70 text-[10px] text-zinc-300 shadow">
            {activity}
          </div>
        )}
      </div>
    </Html>
  );
}
