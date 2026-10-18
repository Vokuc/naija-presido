'use client';

import { useGameStore } from '../store/gameStore';

export function CitizenPassportModal() {
  const activeModal = useGameStore((state) => state.activeModal);
  const closeModal = useGameStore((state) => state.closeModal);
  const openModal = useGameStore((state) => state.openModal);
  const player = useGameStore((state) => state.player);
  const account = useGameStore((state) => state.account);
  const reputation = useGameStore((state) => state.reputation);
  const transactions = useGameStore((state) => state.transactions);
  const events = useGameStore((state) => state.events);
  const zoneName = useGameStore((state) => state.zoneName);
  const organizations = useGameStore((state) => state.organizations);
  const memberships = useGameStore((state) => state.memberships);
  const joinOrganization = useGameStore((state) => state.joinOrganization);
  const payOrgDues = useGameStore((state) => state.payOrgDues);

  if (activeModal !== 'passport' || !player) return null;

  const popularityScore = reputation.find((r) => r.dimension === 'popularity')?.score ?? 10;
  const trustScore = reputation.find((r) => r.dimension === 'trust')?.score ?? 10;
  const competenceScore = reputation.find((r) => r.dimension === 'competence')?.score ?? 5;

  const shirtColor = (player.avatarConfig as any)?.shirt || '#008751';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border border-emerald-500/30 text-white shadow-2xl shadow-emerald-950/40 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Passport Header with Nigerian Theme */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-emerald-950 via-zinc-900 to-emerald-950 border-b border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-2xl shadow-inner">
              🇳🇬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Federal Republic of Nigeria
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  VERIFIED CITIZEN
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-zinc-100 tracking-tight">
                Port Harcourt Digital Passport
              </h2>
            </div>
          </div>

          <button
            onClick={closeModal}
            className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-sm transition-all"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Passport Content */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 text-sm">
          {/* Identity Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-white/10">
            {/* Citizen Avatar / Photo */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-black/40 border border-white/5">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-md border-2"
                style={{ borderColor: shirtColor, backgroundColor: `${shirtColor}22` }}
              >
                👤
              </div>
              <span className="text-xs font-bold text-zinc-200 mt-2 text-center">
                {player.displayName}
              </span>
              <span className="text-[11px] text-amber-400 font-mono text-center">
                {player.jobTitle}
              </span>
            </div>

            {/* Passport Particulars */}
            <div className="sm:col-span-2 flex flex-col justify-between space-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                  Bio / Narrative
                </span>
                <p className="text-zinc-300 text-xs mt-0.5 italic">
                  &ldquo;{player.bio || 'Port Harcourt citizen hustling along Olu Obasanjo Road & D-Line.'}&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 font-mono">
                <div>
                  <span className="text-[10px] text-zinc-500 block">ACCOUNT USERNAME</span>
                  <span className="text-zinc-200 font-semibold">{account?.username || 'Guest Citizen'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">LOCATION</span>
                  <span className="text-emerald-300 font-semibold truncate block">D-Line (Olu Obasanjo Rd)</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">WALLET CASH</span>
                  <span className="text-emerald-400 font-bold text-sm">₦{player.walletBalance.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">CITIZEN STATUS</span>
                  <span className="text-amber-400 font-semibold">Active & Resident</span>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Dimensional Scoped Reputation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span>⭐</span> Multi-Dimensional Scoped Reputation
              </h3>
              <span className="text-[11px] text-zinc-400">Constitution-compliant non-scalar</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Popularity Card */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-amber-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-zinc-200 flex items-center gap-1">
                      <span>🌟</span> Popularity
                    </span>
                    <span className="font-mono text-amber-400 font-bold">{popularityScore} / 100</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                      style={{ width: `${Math.min(100, popularityScore * 2)}%` }}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Neighbourhood Scope: Port Harcourt D-Line. Built by greetings and social interactions.
                </p>
              </div>

              {/* Trust Card */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-blue-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-zinc-200 flex items-center gap-1">
                      <span>🤝</span> Trust
                    </span>
                    <span className="font-mono text-blue-400 font-bold">{trustScore} / 100</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                      style={{ width: `${Math.min(100, trustScore * 2)}%` }}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Community Scope: Reliability in mutual obligations and honest peer transfers.
                </p>
              </div>

              {/* Competence Card */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-emerald-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-zinc-200 flex items-center gap-1">
                      <span>💼</span> Competence
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">{competenceScore} / 100</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                      style={{ width: `${Math.min(100, competenceScore * 2)}%` }}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Economic Scope: Built by completing verified shifts at Garden City Plaza.
                </p>
              </div>
            </div>
          </div>

          {/* Civic & Enterprise Affiliations (Trade Unions, Associations & Enterprises) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span>🏛️</span> Civic & Enterprise Affiliations (Unions & Collectives)
              </h3>
              <span className="text-[11px] text-zinc-400">
                {memberships.length} Active {memberships.length === 1 ? 'Affiliation' : 'Affiliations'}
              </span>
            </div>

            {/* Active Memberships */}
            {memberships && memberships.length > 0 ? (
              <div className="space-y-2.5 mb-4">
                {memberships.map((m: any) => {
                  const orgName = m.org_organization?.name || m.orgName || 'Local Organization';
                  const orgType = m.org_organization?.type || m.type || 'organization';
                  const roleName = m.org_role?.name || m.roleName || 'Member';
                  const roleRank = m.org_role?.rank || m.roleRank || 10;
                  const isDuesPaid = m.dues_paid_until && new Date(m.dues_paid_until) > new Date();

                  const typeBadgeClass =
                    orgType === 'trade_union'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : orgType === 'business'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

                  return (
                    <div
                      key={m.id || m.org_id}
                      className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-100 text-xs">{orgName}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono border ${typeBadgeClass}`}>
                            {orgType.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                          <span>
                            Role: <strong className="text-zinc-200">{roleName}</strong> (Rank {roleRank})
                          </span>
                          <span>•</span>
                          <span>
                            Dues Status:{' '}
                            <strong className={isDuesPaid ? 'text-emerald-400' : 'text-amber-400'}>
                              {isDuesPaid ? 'Up to date' : 'Due: ₦500'}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isDuesPaid && (
                          <button
                            onClick={() => payOrgDues(m.org_id || m.orgId, 500)}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] transition-all shadow-md shadow-amber-950/40"
                          >
                            Pay Dues (₦500)
                          </button>
                        )}
                        {isDuesPaid && (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                            ✓ Good Standing
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 text-center text-xs text-zinc-500 mb-3">
                No active trade union or business memberships. Join a collective below to participate in civic society!
              </div>
            )}

            {/* Organizations to Join */}
            {organizations && organizations.filter((org: any) => !memberships.some((m: any) => (m.org_id || m.orgId) === org.id)).length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
                  Available Collectives in Port Harcourt D-Line:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {organizations
                    .filter((org: any) => !memberships.some((m: any) => (m.org_id || m.orgId) === org.id))
                    .map((org: any) => (
                      <div
                        key={org.id}
                        className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2"
                      >
                        <div className="truncate">
                          <span className="text-xs font-semibold text-zinc-200 block truncate">{org.name}</span>
                          <span className="text-[10px] text-zinc-500 capitalize">{org.type?.replace('_', ' ')}</span>
                        </div>
                        <button
                          onClick={() => joinOrganization(org.id)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold whitespace-nowrap transition-all"
                        >
                          + Join
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Financial Ledger & Authoritative History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span>💰</span> Financial Ledger (Authoritative Postgres Transactions)
              </h3>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                ₦{player.walletBalance.toLocaleString()} NGN
              </span>
            </div>

            <div className="rounded-2xl bg-zinc-900/60 border border-white/10 overflow-hidden">
              {transactions && transactions.length > 0 ? (
                <div className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                  {transactions.slice(0, 6).map((tx) => {
                    const isCredit = tx.toId === player.characterId;
                    return (
                      <div key={tx.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{isCredit ? '📥' : '📤'}</span>
                          <div>
                            <span className="font-medium text-zinc-200 block">
                              {tx.reason || (isCredit ? 'Funds Received' : 'Payment Disbursed')}
                            </span>
                            <span className="text-[10px] text-zinc-500 uppercase font-mono">
                              {tx.sourceType} • {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`font-mono font-bold text-xs ${
                            isCredit ? 'text-emerald-400' : 'text-orange-400'
                          }`}
                        >
                          {isCredit ? '+' : '-'}₦{tx.amount.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-zinc-500">
                  No recorded ledger entries yet. Work a shift at Garden City Plaza or buy Bole from Mama Tarila!
                </div>
              )}
            </div>
          </div>

          {/* Meaningful Chronicle & History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span>📜</span> Citizen Chronicle (Domain Event Log)
              </h3>
              <span className="text-[11px] text-zinc-500">Durable Postgres Events</span>
            </div>

            <div className="rounded-2xl bg-zinc-900/60 border border-white/10 overflow-hidden">
              {events && events.length > 0 ? (
                <div className="divide-y divide-white/5 max-h-40 overflow-y-auto">
                  {events.slice(0, 5).map((evt) => (
                    <div key={evt.id} className="p-2.5 px-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-zinc-300 font-mono text-[11px] font-semibold">{evt.type}</span>
                        <span className="text-[10px] text-zinc-500 uppercase">({evt.significance})</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(evt.gameTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-zinc-500">
                  Events will be logged as you interact with the Port Harcourt neighbourhood.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-zinc-950 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-400">
            Current neighbourhood: <span className="text-amber-400 font-semibold">{zoneName}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => openModal('auth_characters')}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all border border-white/10"
            >
              🔄 Switch / Create Citizen
            </button>
            <button
              onClick={closeModal}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/50"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
