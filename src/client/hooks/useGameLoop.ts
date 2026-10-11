import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { initRealtimePresence, cleanupRealtimePresence } from '../store/realtimeStore';

export function useGameLoop() {
  const player = useGameStore((state) => state.player);
  const zoneId = useGameStore((state) => state.zoneId);
  const isBootstrapped = useGameStore((state) => state.isBootstrapped);
  const bootstrap = useGameStore((state) => state.bootstrap);

  // Initial Bootstrap
  useEffect(() => {
    if (!isBootstrapped) {
      bootstrap();
    }
  }, [isBootstrapped, bootstrap]);

  // Realtime Connection
  useEffect(() => {
    if (player && zoneId) {
      initRealtimePresence(zoneId, {
        characterId: player.characterId,
        displayName: player.displayName,
        jobTitle: player.jobTitle,
      });

      return () => {
        cleanupRealtimePresence(player.characterId);
      };
    }
  }, [player?.characterId, player?.displayName, zoneId]);

  // World Time Clock Interval (1 real second = 1 game minute)
  useEffect(() => {
    const timeInterval = setInterval(() => {
      useGameStore.setState((state) => {
        const currentDate = new Date(state.gameTime);
        currentDate.setMinutes(currentDate.getMinutes() + 1);
        return {
          gameTime: currentDate.toISOString(),
          gameHour: currentDate.getUTCHours(),
        };
      });
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);
}
