import type { Mode } from './domain/types';

export interface Guardian {
  mode: Mode;
  name: string;
  domain: string;
  icon: string;
}

export const GUARDIANS: Record<Mode, Guardian> = {
  athena: { mode: 'athena', name: 'Athena', domain: 'Work', icon: '🦉' },
  hestia: { mode: 'hestia', name: 'Hestia', domain: 'Personal', icon: '🔥' },
  hermes: { mode: 'hermes', name: 'Hermes', domain: 'Neutral', icon: '🪽' },
};
