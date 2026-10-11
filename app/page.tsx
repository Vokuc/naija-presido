import { GameView } from '@/src/client/GameView';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Naija Presido | Port Harcourt 3D World',
  description: 'First playable 3D presentation layer for Naija Presido set in Port Harcourt (D-Line, Rivers State).',
};

export default function HomePage() {
  return <GameView />;
}
