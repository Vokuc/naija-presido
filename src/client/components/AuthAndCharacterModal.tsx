'use client';

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

const ANKARA_SHIRT_PALETTES = [
  { label: 'Nigerian Emerald', value: '#008751', description: 'National Pride & Hustle' },
  { label: 'Rivers Coral', value: '#e05244', description: 'Port Harcourt Oil & Vigor' },
  { label: 'Gold Brocade', value: '#d4af37', description: 'Lagos Island Wealth' },
  { label: 'Indigo Navy', value: '#1d2d50', description: 'Niger Delta Waterways' },
  { label: 'Charcoal Elegance', value: '#242424', description: 'Sleek Corporate Swagger' },
];

const TROUSER_PALETTES = [
  { label: 'Dark Navy', value: '#1e272e' },
  { label: 'Pitch Black', value: '#111111' },
  { label: 'Khaki Beige', value: '#8c7b64' },
  { label: 'Warm Cocoa', value: '#3d2b1f' },
];

const SKIN_TONES = [
  { label: 'Deep Melanin', value: '#3e2723' },
  { label: 'Rich Cocoa', value: '#5d4037' },
  { label: 'Warm Caramel', value: '#634439' },
  { label: 'Golden Umber', value: '#8d6e63' },
];

export function AuthAndCharacterModal() {
  const activeModal = useGameStore((state) => state.activeModal);
  const closeModal = useGameStore((state) => state.closeModal);
  const account = useGameStore((state) => state.account);
  const characters = useGameStore((state) => state.characters);
  const player = useGameStore((state) => state.player);
  const createCharacter = useGameStore((state) => state.createCharacter);
  const selectCharacter = useGameStore((state) => state.selectCharacter);
  const registerAccount = useGameStore((state) => state.registerAccount);

  const [tab, setTab] = useState<'create' | 'switch' | 'account'>('switch');

  // Character Creator State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [shirtColor, setShirtColor] = useState(ANKARA_SHIRT_PALETTES[0].value);
  const [trousersColor, setTrousersColor] = useState(TROUSER_PALETTES[0].value);
  const [skinColor, setSkinColor] = useState(SKIN_TONES[2].value);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Account State
  const [regUsername, setRegUsername] = useState('');

  if (activeModal !== 'auth_characters') return null;

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || displayName.length < 3) return;

    setIsSubmitting(true);
    const success = await createCharacter(displayName.trim(), bio.trim(), {
      shirt: shirtColor,
      trousers: trousersColor,
      skin: skinColor,
    });
    setIsSubmitting(false);

    if (success) {
      setDisplayName('');
      setBio('');
    }
  };

  const handleSelectCharacter = async (charId: string) => {
    if (charId === player?.characterId) {
      closeModal();
      return;
    }
    setIsSubmitting(true);
    await selectCharacter(charId);
    setIsSubmitting(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || regUsername.length < 3) return;

    setIsSubmitting(true);
    await registerAccount(regUsername.trim().toLowerCase());
    setIsSubmitting(false);
    setRegUsername('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border border-white/15 text-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-zinc-900 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-xl">
              🇳🇬
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                Citizen Registry & Auth
              </span>
              <h2 className="text-lg font-black text-zinc-100 tracking-tight">
                Character & Account Manager
              </h2>
            </div>
          </div>

          <button
            onClick={closeModal}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-sm transition-all"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 px-6 pt-2 bg-zinc-900/40 text-xs font-semibold gap-4">
          <button
            onClick={() => setTab('switch')}
            className={`pb-2.5 transition-all border-b-2 ${
              tab === 'switch'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Switch Citizen ({characters.length})
          </button>
          <button
            onClick={() => setTab('create')}
            className={`pb-2.5 transition-all border-b-2 ${
              tab === 'create'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            + Create New Citizen
          </button>
          <button
            onClick={() => setTab('account')}
            className={`pb-2.5 transition-all border-b-2 ${
              tab === 'account'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Game Account
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 text-sm">
          {/* TAB 1: SWITCH CHARACTER */}
          {tab === 'switch' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  Select an active character to explore Port Harcourt:
                </span>
                <button
                  onClick={() => setTab('create')}
                  className="text-xs text-emerald-400 hover:underline font-semibold"
                >
                  + Add another
                </button>
              </div>

              <div className="space-y-2.5">
                {characters.map((char) => {
                  const isActive = char.id === player?.characterId;
                  const cShirt = (char.avatarConfig as any)?.shirt || '#008751';

                  return (
                    <div
                      key={char.id}
                      onClick={() => handleSelectCharacter(char.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-950/20'
                          : 'bg-zinc-900/60 border-white/10 hover:border-white/20 hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner border"
                          style={{ borderColor: cShirt, backgroundColor: `${cShirt}22` }}
                        >
                          👤
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-200 text-sm">
                              {char.displayName}
                            </span>
                            {isActive && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500 text-black font-bold">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-zinc-400 block line-clamp-1 italic">
                            {char.bio || 'Port Harcourt citizen'}
                          </span>
                        </div>
                      </div>

                      <button
                        disabled={isActive || isSubmitting}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                        }`}
                      >
                        {isActive ? 'Current' : 'Select'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CREATE CHARACTER */}
          {tab === 'create' && (
            <form onSubmit={handleCreateCharacter} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Citizen Display Name
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={30}
                  placeholder="e.g. Tamuno Briggs, Amina Danjuma, Chidi Okafor"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Citizen Narrative / Bio
                </label>
                <textarea
                  rows={2}
                  maxLength={160}
                  placeholder="What is your citizen's backstory or hustle in Port Harcourt?"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-all text-sm resize-none"
                />
              </div>

              {/* Ankara Shirt Color Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Ankara Shirt Fabric & Color
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ANKARA_SHIRT_PALETTES.map((palette) => (
                    <button
                      key={palette.value}
                      type="button"
                      onClick={() => setShirtColor(palette.value)}
                      className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        shirtColor === palette.value
                          ? 'border-emerald-400 bg-emerald-950/40 ring-1 ring-emerald-400'
                          : 'border-white/10 bg-zinc-900/60 hover:border-white/20'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: palette.value }}
                      />
                      <div className="truncate">
                        <span className="text-xs font-semibold block text-zinc-200 truncate">
                          {palette.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Trousers & Skin Tone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Trousers
                  </label>
                  <div className="flex gap-2">
                    {TROUSER_PALETTES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTrousersColor(t.value)}
                        className={`w-7 h-7 rounded-full border transition-all ${
                          trousersColor === t.value
                            ? 'border-emerald-400 ring-2 ring-emerald-400 scale-110'
                            : 'border-white/20'
                        }`}
                        style={{ backgroundColor: t.value }}
                        title={t.label}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Skin Tone
                  </label>
                  <div className="flex gap-2">
                    {SKIN_TONES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setSkinColor(s.value)}
                        className={`w-7 h-7 rounded-full border transition-all ${
                          skinColor === s.value
                            ? 'border-emerald-400 ring-2 ring-emerald-400 scale-110'
                            : 'border-white/20'
                        }`}
                        style={{ backgroundColor: s.value }}
                        title={s.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || displayName.trim().length < 3}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Citizen...' : 'Confirm & Create Citizen (₦5,000 Grant)'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ACCOUNT & REGISTRATION */}
          {tab === 'account' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 uppercase tracking-wider font-semibold">Account Status</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {account?.isGuest ? 'Guest Session' : 'Registered Citizen'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-500">Username</span>
                  <span className="text-zinc-200">{account?.username || 'Guest'}</span>
                </div>
              </div>

              {account?.isGuest && (
                <form onSubmit={handleRegister} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Register Permanent Username
                    </label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={20}
                      placeholder="e.g. port_harcourt_king"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || regUsername.trim().length < 3}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-950/50 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Registering...' : 'Register Game Account'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
