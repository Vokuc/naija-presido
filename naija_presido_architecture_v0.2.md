# NAIJA PRESIDO — Master Architecture Document
**Version 0.2 — Authoritative Pre-Code Constitution**
*Supersedes v0.1. Produced before any implementation begins.*
*All amendments from the critical review have been incorporated.*

---

## PREAMBLE

### What Naija Presido Is

Naija Presido is a **persistent society simulation** set in a fictionalized but culturally recognizable Nigeria. The 3D world is one interface to that simulation. The simulation is authoritative and must function independently of any renderer.

The game should feel like a **world first** and a game interface second. A player should look around and think: *"I am actually living somewhere."*

### Foundational Principles (Non-Negotiable)

1. The world is persistent. Nothing resets without explicit design intent.
2. Player actions have consequences. The simulation determines outcomes, not the client.
3. Other players matter. The social graph is central, not decorative.
4. The game supports emergent stories. Design for possibility spaces, not scripted paths.
5. Important systems are data-driven, not hardcoded.
6. The server and database are authoritative over all important game state.
7. The simulation must be able to exist and be tested independently of the 3D renderer.
8. The architecture must grow from one neighbourhood into a full Nigerian federation without a rewrite.
9. The first experience must be visually distinctive and immediately playable.
10. Show the world; use text to explain it.
11. Prioritize simulation depth, responsiveness, and cultural personality over graphical fidelity.
12. The game works well on both mobile and desktop browsers.
13. Avoid expensive infrastructure and paid services during early development.
14. Prefer free/open-source technologies where practical.
15. Do not introduce complexity until it solves a demonstrated problem.

### The Two Golden Rules

> **"The player decides what they attempt. The simulation determines the outcome."**

> **"The server decides what is true. The client decides what it looks like."**

### Scope Rule

We are NOT simulating the entire Nigerian economy, geography, and government immediately.

We are **building the engine for a Nigerian society** and populating it progressively.

The engine must eventually support:

```
Country → States → Cities/Towns → Neighbourhoods → Zones
→ Buildings/Venues → Households → Players → NPCs
→ Businesses → Organizations → Government Institutions → Political Offices
```

Build the engine. Populate progressively. Do not over-build content before the engine is proven.

---

## SECTION 1 — Identity Model

### The Four Layers

Identity is explicitly separated into four distinct layers. These are not interchangeable.

| Layer | Table | Description | Who controls |
|---|---|---|---|
| Auth Identity | `auth.users` | Supabase authentication. Email/OAuth credential. | Supabase |
| Game Account | `acct_account` | Game account linked to auth identity. | System |
| Character | `chr_character` | An in-world actor. Human-controlled or NPC. | System |
| Active Character | `acct_active_character` | Which character this account is currently playing. | Player |

### Relationships

```
auth.users        (1) ──→ (1)   acct_account
acct_account      (1) ──→ (0..N) chr_character      ← future multi-character support
acct_account      (1) ──→ (1)   acct_active_character → chr_character
chr_character (is_npc=true) ──→ (no acct_account link)
```

**MVP enforcement**: One character per account, enforced at the application layer. The data model does not prevent future multi-character play.

### Schema

```sql
-- Game accounts
CREATE TABLE acct_account (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username    text UNIQUE NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  status      text NOT NULL DEFAULT 'active',  -- 'active' | 'suspended' | 'banned'
  CONSTRAINT acct_account_user_unique UNIQUE (user_id)  -- one account per auth user (MVP)
);

-- Active character pointer
CREATE TABLE acct_active_character (
  account_id      uuid PRIMARY KEY REFERENCES acct_account(id) ON DELETE CASCADE,
  character_id    uuid NOT NULL REFERENCES chr_character(id),
  switched_at     timestamptz NOT NULL DEFAULT now()
);

-- Helper function for RLS (never trust auth.uid() == character_id directly)
CREATE OR REPLACE FUNCTION current_character_id()
RETURNS uuid AS $$
  SELECT ac.character_id
  FROM acct_active_character ac
  JOIN acct_account a ON ac.account_id = a.id
  WHERE a.user_id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**All RLS policies on character-level tables use `current_character_id()`, never `auth.uid()` directly.**

### NPC Character Model

NPCs are first-class characters. They share the `chr_character` table and all character sub-tables. NPCs can have wallets, relationships, reputations, employment, and organizational membership. They are distinguished by `is_npc = true` and have no `acct_account` link.

This means relationship, employment, asset, and reputation systems work consistently regardless of whether the character is human-controlled. NPCs can become important historical actors in the world's record.

### Future Capabilities (Not Built Now)

- Multiple characters per account
- Legacy/deceased characters (status = 'deceased')
- Generational play (character inherits from parent character)
- Alternate game modes

---

## SECTION 2 — Command System

### The Command Lifecycle

Every consequential player action is a **Command**. Commands are typed, named, versioned, and processed through a uniform pipeline.

```
Player Intent
  ↓
Command (typed TypeScript object, named constant)
  ↓
Authentication      — Is this user logged in? Is their session valid?
  ↓
Authorization       — Is this character permitted to perform this action
                      in this context? (location, role, status, etc.)
  ↓
Validation          — Are the inputs well-formed? Does world state permit
                      this? Is the character in the right place? Do they
                      have the required resources?
  ↓
Simulation          — Compute consequences. What actually happens?
                      (May involve probability, skills, relationships, etc.)
  ↓
Domain Events       — Record what happened durably (evt_event + evt_effect)
  ↓
State Changes       — Write new authoritative state atomically
  ↓
Realtime Notify     — Push relevant updates to affected parties
  ↓
Response            — Return new relevant state to the calling client
```

This pipeline is not optional. Every consequential action in the game must implement this pipeline. Non-consequential reads (fetching the map, reading the news feed) do not need it.

### Command Naming Convention

Commands are named in `SCREAMING_SNAKE_CASE` with a verb:

```typescript
// command-types.ts — single source of truth for all command names
export const Commands = {
  // Movement & Presence
  MOVE_CHARACTER:      'MOVE_CHARACTER',
  ENTER_VENUE:         'ENTER_VENUE',
  LEAVE_VENUE:         'LEAVE_VENUE',

  // Work & Economy
  START_WORK:          'START_WORK',
  END_WORK:            'END_WORK',
  BUY_ITEM:            'BUY_ITEM',
  SELL_ITEM:           'SELL_ITEM',
  TRANSFER_MONEY:      'TRANSFER_MONEY',

  // Social
  SEND_MESSAGE:        'SEND_MESSAGE',
  GREET_CHARACTER:     'GREET_CHARACTER',
  FORM_RELATIONSHIP:   'FORM_RELATIONSHIP',
  DISSOLVE_RELATIONSHIP: 'DISSOLVE_RELATIONSHIP',

  // Organizations
  JOIN_ORGANIZATION:   'JOIN_ORGANIZATION',
  LEAVE_ORGANIZATION:  'LEAVE_ORGANIZATION',
  CREATE_ORGANIZATION: 'CREATE_ORGANIZATION',

  // Assets & Business
  TRANSFER_ASSET:      'TRANSFER_ASSET',
  CREATE_BUSINESS:     'CREATE_BUSINESS',
  OPEN_BUSINESS:       'OPEN_BUSINESS',
  CLOSE_BUSINESS:      'CLOSE_BUSINESS',

  // Politics (Phase 2+)
  RUN_FOR_OFFICE:      'RUN_FOR_OFFICE',
  VOTE:                'VOTE',
  PASS_POLICY:         'PASS_POLICY',
  REPEAL_POLICY:       'REPEAL_POLICY',
} as const;
```

### MVP Command Set

The following commands must exist in the MVP:

- `MOVE_CHARACTER` — move between zones/neighbourhoods
- `ENTER_VENUE` — enter a building
- `LEAVE_VENUE` — exit a building
- `START_WORK` — begin a work session
- `END_WORK` — end a work session, trigger earnings
- `BUY_ITEM` — purchase from a venue
- `SEND_MESSAGE` — send chat message in venue or directly
- `GREET_CHARACTER` — social acknowledgement action
- `FORM_RELATIONSHIP` — initiate a relationship

### Idempotency

Commands that create economic changes, social changes, or votes MUST include an idempotency key. The key is generated client-side (UUID) and stored with the transaction/event record. If the same key is submitted twice, the second submission is a no-op returning the original result. This prevents duplicate charges, duplicate votes, duplicate item grants caused by network retries.

```typescript
interface Command<T> {
  type: keyof typeof Commands;
  payload: T;
  idempotency_key: string;  // UUID, client-generated
  character_id: string;
  issued_at: string;        // ISO timestamp
}
```

---

## SECTION 3 — Domain Model

### Domains

Each domain owns its own database tables, API routes, and domain logic. Domains communicate only through published events or stable API contracts. Domains never import each other's internal modules.

| Domain | Prefix | Owns |
|---|---|---|
| Account | `acct_` | Auth identity linkage, accounts, active character |
| Character | `chr_` | Characters, character state, character stats |
| Geography | `geo_` | Administrative geography (country → neighbourhood) |
| Physical World | `phys_` | Plots, buildings, floors, rooms, venues |
| World/Time | `wrld_` | World clock, simulation config, world parameters |
| Economy | `eco_` | Wallets, transactions, businesses, assets |
| Social | `soc_` | Relationships, reputation |
| Organizations | `org_` | Organizations, memberships, roles |
| Politics | `pol_` | Offices, elections, candidates, policies |
| Events | `evt_` | World event log, effects, causal chains |
| Notifications | `ntf_` | Player alerts and messages |
| Administration | `adm_` | Bans, reports, investigations, rollbacks |
| Observability | `obs_` | Command logs, tick logs, anomaly flags |

### Domain Communication Rule

```
✅ Domain A may: call Domain B's published API function
✅ Domain A may: read Domain B's events from evt_event
✅ Domain A may: query public views published by Domain B
❌ Domain A must not: import Domain B's internal modules
❌ Domain A must not: write directly to Domain B's tables
❌ Domain A must not: embed Domain B's business logic
```

This boundary is enforced by ESLint rules from day one (see Section 19).

---

## SECTION 4 — Geography & Physical World

### Two Separate Hierarchies

Geographic containment and physical structures are related but distinct. They are modeled separately.

#### Geographic Hierarchy (Administrative, Political, Conceptual)

```sql
geo_location (
  id          uuid PRIMARY KEY,
  parent_id   uuid REFERENCES geo_location(id),
  type        text NOT NULL,  -- 'world' | 'country' | 'state' | 'city'
                              -- | 'district' | 'neighbourhood' | 'zone'
  name        text NOT NULL,
  slug        text NOT NULL,
  description text,
  metadata    jsonb DEFAULT '{}'
)
```

The `geo_location` tree is self-referential. Any level of geographic hierarchy can be added without schema change.

#### Physical World (Structures)

```sql
phys_plot (
  id          uuid PRIMARY KEY,
  zone_id     uuid NOT NULL REFERENCES geo_location(id),  -- zone it sits in
  address     text,
  metadata    jsonb DEFAULT '{}'
)

phys_building (
  id          uuid PRIMARY KEY,
  plot_id     uuid NOT NULL REFERENCES phys_plot(id),
  name        text,
  type        text,           -- 'residential' | 'commercial' | 'government' | 'mixed'
  floors      integer DEFAULT 1,
  metadata    jsonb DEFAULT '{}'
)

phys_floor (
  id          uuid PRIMARY KEY,
  building_id uuid NOT NULL REFERENCES phys_building(id),
  floor_number integer NOT NULL
)

phys_room (
  id          uuid PRIMARY KEY,
  floor_id    uuid NOT NULL REFERENCES phys_floor(id),
  room_label  text,
  type        text            -- 'office' | 'residential' | 'commercial' | 'storage'
)

phys_venue (
  id          uuid PRIMARY KEY,
  -- A venue can be attached at any physical level
  room_id     uuid REFERENCES phys_room(id),
  floor_id    uuid REFERENCES phys_floor(id),
  building_id uuid REFERENCES phys_building(id),
  zone_id     uuid REFERENCES geo_location(id),  -- outdoor venue (market square, etc.)
  name        text NOT NULL,
  type        text NOT NULL,  -- 'market' | 'office' | 'bar' | 'restaurant' | 'home' | ...
  capacity    integer,
  is_public   boolean DEFAULT true,
  metadata    jsonb DEFAULT '{}'
)
```

#### MVP Physical World Scope

The full building/floor/room hierarchy is planned but only `phys_venue` linked to a `geo_location` zone is required in the MVP. Plots, buildings, floors, and rooms are Phase 2+ content. The schema is defined now so the data model is not broken later.

#### How Characters Locate Themselves

```sql
chr_character_state (
  character_id  uuid PRIMARY KEY REFERENCES chr_character(id),
  location_id   uuid REFERENCES geo_location(id),  -- which neighbourhood/zone
  venue_id      uuid REFERENCES phys_venue(id),     -- which venue (nullable = outdoors)
  status        text DEFAULT 'active',               -- 'active' | 'offline' | 'sleeping'
  updated_at    timestamptz NOT NULL DEFAULT now()
)
```

This is the **authoritative** persistent location. It is updated only on significant transitions (entering/leaving a venue, moving between zones). It is NOT updated on 3D movement within a zone.

---

## SECTION 5 — Time System

### The World Clock

The world clock is the single source of truth for game time. There is exactly one active clock record.

```sql
wrld_clock (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  epoch_real    timestamptz NOT NULL,   -- real-world timestamp when this epoch began
  epoch_game    timestamptz NOT NULL,   -- game-world timestamp at that real moment
  scale_factor  numeric NOT NULL,       -- game seconds per real second
                                        -- e.g., 60 = 1 real min → 1 game hour
  paused        boolean NOT NULL DEFAULT false,
  paused_at     timestamptz,            -- when pause began (null if not paused)
  updated_at    timestamptz NOT NULL DEFAULT now()
)
```

### Computing Current Game Time

```
current_game_time = epoch_game + (now() - epoch_real) * scale_factor
```

When paused:
```
current_game_time = epoch_game + (paused_at - epoch_real) * scale_factor
```

This computation is implemented in a single shared function used by all systems. No system performs its own time math from first principles.

```typescript
// lib/game-time.ts — single source of truth for game-time calculations
export function computeGameTime(clock: WorldClock): Date {
  if (clock.paused) {
    return new Date(
      clock.epoch_game.getTime() +
      (clock.paused_at!.getTime() - clock.epoch_real.getTime()) * clock.scale_factor
    );
  }
  return new Date(
    clock.epoch_game.getTime() +
    (Date.now() - clock.epoch_real.getTime()) * clock.scale_factor
  );
}

export function realDurationForGameDuration(
  gameDurationSeconds: number,
  clock: WorldClock
): number {
  // How many real milliseconds does N game seconds take?
  return (gameDurationSeconds / clock.scale_factor) * 1000;
}
```

### The Non-Hardcoding Rule

**No gameplay system may hardcode the time ratio.**

| ❌ Forbidden | ✅ Required |
|---|---|
| `salary += rate * 60` (assumes 60s = 1hr) | `salary = rate * gameHoursWorked(startReal, clock)` |
| `cooldown = Date.now() + 3600000` (assumes real ms) | `cooldown_expires_game = currentGameTime + gameDuration` |
| `if (tick % 60 === 0)` (hardcodes minutes) | Query `wrld_clock`, derive game time |

Changing `scale_factor` must not require modifying any gameplay code. Only the clock record changes.

### Initial Development Scale

The initial `scale_factor` is **60** (1 real minute = 1 game hour). This is an early development testing scale to verify simulation behaviour quickly. It is expected to be tuned once gameplay systems are confirmed working. The fact that this scale produces fast gameplay (8-minute work shifts, 24-minute game days) is intentional for early testing — not a final player experience decision.

### Tick System

Ticks are sparse, scheduled maintenance jobs. They are not the simulation clock — game time does not "advance" because a tick fired.

**Ticks handle:**
- Processing queued/delayed consequences (e.g., "this election ends at game time X — has that arrived?")
- NPC decision-making (periodic archetype-driven behaviour)
- Aggregation (weekly economic summaries, tax collection)
- World events (scheduled or probability-driven)
- Maintenance (pruning trivial events, archiving old records)

**Ticks do NOT handle:**
- Incrementing individual wallets on every fire
- Updating every character's reputation every minute
- Writing state that can be computed from timestamps when accessed

### Timestamp-Derived State

Systems that can compute their state from a timestamp + a stored rate should do so on access, not on tick. Examples:

- **Earnings**: `earned = hourly_rate * game_hours_elapsed(work_start_real, now, clock)` — computed when `END_WORK` is called.
- **Cooldowns**: `cooldown_expires_at timestamptz` stored at action time, checked on next action attempt.
- **Business passive revenue**: accumulated when the owner checks in or when `END_WORK` is called for that business, not written every minute.
- **Reputation decay**: computed from `last_event_at` when reputation is queried.

The rule: **prefer reading from state + timestamp over writing incremental updates on tick.**

---

## SECTION 6 — Database Strategy

### Platform

Supabase (PostgreSQL). Provides Auth, Realtime, Storage, and row-level security. Free-tier compatible for MVP.

### Schema Namespacing

All tables are prefixed by domain. See Section 3 for the domain-prefix table.

### Primary Key Convention

All tables use `uuid PRIMARY KEY DEFAULT gen_random_uuid()`. No serial integers as primary keys. UUIDs prevent sequential enumeration attacks and support future distributed scenarios.

### Core MVP Tables

The following tables must exist at the end of MVP implementation:

```sql
-- ACCOUNT / IDENTITY
acct_account            (id, user_id, username, created_at, status)
acct_active_character   (account_id, character_id, switched_at)

-- CHARACTER
chr_character (
  id            uuid PRIMARY KEY,
  account_id    uuid REFERENCES acct_account(id),  -- null for NPCs
  is_npc        boolean NOT NULL DEFAULT false,
  display_name  text NOT NULL,
  avatar_config jsonb DEFAULT '{}',   -- appearance config (not a URL — generated from config)
  bio           text,
  born_at       timestamptz,          -- game-time birth date
  status        text DEFAULT 'alive', -- 'alive' | 'deceased'
  created_at    timestamptz NOT NULL DEFAULT now()
)

chr_character_state (
  character_id  uuid PRIMARY KEY REFERENCES chr_character(id),
  location_id   uuid REFERENCES geo_location(id),
  venue_id      uuid REFERENCES phys_venue(id),
  status        text DEFAULT 'active',
  updated_at    timestamptz NOT NULL DEFAULT now()
)

chr_character_stats (  -- typed stats, NOT EAV
  character_id    uuid PRIMARY KEY REFERENCES chr_character(id),
  energy          numeric NOT NULL DEFAULT 100,
  hunger          numeric NOT NULL DEFAULT 0,
  health          numeric NOT NULL DEFAULT 100,
  education_level text DEFAULT 'none',
  job_title       text,
  updated_at      timestamptz NOT NULL DEFAULT now()
)

-- GEOGRAPHY
geo_location (id, parent_id, type, name, slug, description, metadata)

-- PHYSICAL WORLD (MVP: venue only)
phys_venue (id, zone_id, name, type, capacity, is_public, metadata)

-- WORLD TIME
wrld_clock (id, epoch_real, epoch_game, scale_factor, paused, paused_at, updated_at)

-- ECONOMY
eco_asset (
  id            uuid PRIMARY KEY,
  asset_type    text NOT NULL, -- 'venue' | 'business' | 'vehicle' | 'real_estate' | 'item'
  asset_id      uuid NOT NULL, -- ID of the specific entity (e.g., phys_venue.id)
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(asset_type, asset_id)
)

eco_asset_ownership (
  id               uuid PRIMARY KEY,
  asset_id         uuid NOT NULL REFERENCES eco_asset(id),
  owner_type       text NOT NULL, -- 'character' | 'organization' | 'government'
  owner_id         uuid NOT NULL, -- ID of the owner
  share_percentage numeric NOT NULL DEFAULT 100 CHECK (share_percentage > 0 AND share_percentage <= 100),
  status           text DEFAULT 'active', -- 'active' | 'transferred' | 'seized' | 'bankrupt'
  acquired_at      timestamptz NOT NULL DEFAULT now(),
  relinquished_at  timestamptz
)

eco_wallet (
  id            uuid PRIMARY KEY,
  character_id  uuid UNIQUE NOT NULL REFERENCES chr_character(id),
  balance       numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency      text NOT NULL DEFAULT 'NGN',
  updated_at    timestamptz NOT NULL DEFAULT now()
)

eco_transaction (
  id                uuid PRIMARY KEY,
  from_id           uuid REFERENCES chr_character(id),   -- null = system source
  to_id             uuid REFERENCES chr_character(id),   -- null = system sink
  amount            numeric NOT NULL CHECK (amount > 0),
  currency          text NOT NULL DEFAULT 'NGN',
  source_type       text NOT NULL,  -- 'employment' | 'purchase' | 'transfer' | 'system_grant' | 'tax'
  source_id         uuid,           -- the job_id, business_id, etc. that caused this
  reason            text,
  idempotency_key   uuid UNIQUE NOT NULL,
  game_timestamp    timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
)

eco_employment (
  id              uuid PRIMARY KEY,
  character_id    uuid NOT NULL REFERENCES chr_character(id),
  employer_id     uuid NOT NULL REFERENCES chr_character(id),  -- business owner or NPC employer
  venue_id        uuid REFERENCES phys_venue(id),
  job_title       text NOT NULL,
  hourly_rate     numeric NOT NULL,  -- in NGN, per game hour
  started_at_game timestamptz NOT NULL,
  started_at_real timestamptz NOT NULL,
  ended_at_real   timestamptz,       -- null = currently employed
  status          text DEFAULT 'active'
)

eco_work_session (
  id              uuid PRIMARY KEY,
  character_id    uuid NOT NULL REFERENCES chr_character(id),
  employment_id   uuid NOT NULL REFERENCES eco_employment(id),
  started_at_real timestamptz NOT NULL,
  started_at_game timestamptz NOT NULL,
  ended_at_real   timestamptz,
  ended_at_game   timestamptz,
  game_hours      numeric,           -- computed on END_WORK
  earned          numeric,           -- computed on END_WORK
  idempotency_key uuid UNIQUE NOT NULL
)

-- SOCIAL
soc_relationship (
  id          uuid PRIMARY KEY,
  actor_id    uuid NOT NULL REFERENCES chr_character(id),
  target_id   uuid NOT NULL REFERENCES chr_character(id),
  type        text NOT NULL,   -- 'friend' | 'rival' | 'family' | 'colleague' | 'enemy'
  strength    numeric NOT NULL DEFAULT 0,  -- -100 to 100
  formed_at   timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, target_id, type)
)

soc_reputation (
  id            uuid PRIMARY KEY,
  character_id  uuid NOT NULL REFERENCES chr_character(id),
  scope_type    text NOT NULL,    -- 'neighbourhood' | 'city' | 'state' | 'national' | 'organization'
  scope_id      uuid,             -- which neighbourhood/org/etc (null = global)
  dimension     text NOT NULL,    -- 'popularity' | 'trust' | 'competence' | 'notoriety' | 'influence'
  score         numeric NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (character_id, scope_type, scope_id, dimension)
)

-- EVENTS
evt_event (
  id            uuid PRIMARY KEY,
  type          text NOT NULL,
  category      text NOT NULL,       -- 'action' | 'consequence' | 'world' | 'system'
  significance  text NOT NULL,       -- 'trivial' | 'minor' | 'significant' | 'historic'
  actor_id      uuid REFERENCES chr_character(id),
  location_id   uuid REFERENCES geo_location(id),
  venue_id      uuid REFERENCES phys_venue(id),
  payload       jsonb NOT NULL DEFAULT '{}',
  caused_by     uuid REFERENCES evt_event(id),
  game_timestamp timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
)

evt_effect (
  id            uuid PRIMARY KEY,
  event_id      uuid NOT NULL REFERENCES evt_event(id),
  target_type   text NOT NULL,   -- 'character' | 'venue' | 'organization' | 'location'
  target_id     uuid NOT NULL,
  attribute     text NOT NULL,   -- what changed (e.g. 'reputation.popularity', 'wallet.balance')
  delta         jsonb NOT NULL,  -- what the change was
  applied_at    timestamptz NOT NULL DEFAULT now()
)

-- NOTIFICATIONS
ntf_notification (
  id            uuid PRIMARY KEY,
  character_id  uuid NOT NULL REFERENCES chr_character(id),
  type          text NOT NULL,
  title         text NOT NULL,
  body          text,
  payload       jsonb DEFAULT '{}',
  read          boolean DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
)

-- OBSERVABILITY
obs_command_log (
  id              uuid PRIMARY KEY,
  command_type    text NOT NULL,
  actor_id        uuid REFERENCES chr_character(id),
  status          text NOT NULL,       -- 'accepted' | 'rejected' | 'error'
  rejection_reason text,
  idempotency_key uuid,
  duration_ms     integer,
  created_at      timestamptz NOT NULL DEFAULT now()
)

obs_tick_log (
  id                  uuid PRIMARY KEY,
  tick_type           text NOT NULL,
  started_at          timestamptz NOT NULL,
  completed_at        timestamptz,
  entities_processed  integer,
  errors              jsonb DEFAULT '[]'
)
```

### Planned Post-MVP Tables (Named, Not Yet Implemented)

The following tables are planned and reserved. They should not be created in MVP migrations but must not conflict with future naming:

```
eco_business, eco_supply_event, eco_tax_record
org_organization, org_membership, org_role
pol_office, pol_election, pol_candidate, pol_policy, pol_vote
adm_report, adm_action, adm_ban, adm_investigation
phys_plot, phys_building, phys_floor, phys_room
```

### JSONB Usage Rules

JSONB is powerful but can become an escape hatch that destroys data integrity. Apply these rules:

| Use JSONB for | Do NOT use JSONB for |
|---|---|
| Appearance/avatar configuration | Any field you will query/filter by |
| Scene-specific rendering hints | Any field that has referential integrity requirements |
| Extensible metadata on stable entities | Core simulation state (balances, scores, statuses) |
| Payload of world events (variable structure) | Foreign key relationships |
| Feature-specific config that varies by type | Fields that need type safety or constraints |

### Atomic Database Operations

Financial transfers, vote recording, and item grants use **PostgreSQL functions** — not multi-step application-layer writes. This guarantees atomicity. The business logic that determines *what* to transfer lives in the application layer (TypeScript). The execution of the transfer itself lives in a PG function.

```sql
CREATE OR REPLACE FUNCTION eco_transfer_funds(
  p_from_id         uuid,
  p_to_id           uuid,
  p_amount          numeric,
  p_source_type     text,
  p_source_id       uuid,
  p_reason          text,
  p_idempotency_key uuid,
  p_game_timestamp  timestamptz
) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  -- Idempotency check
  IF EXISTS (SELECT 1 FROM eco_transaction WHERE idempotency_key = p_idempotency_key) THEN
    RETURN;
  END IF;

  -- Deduct with lock + balance check in one statement
  UPDATE eco_wallet
  SET balance = balance - p_amount, updated_at = now()
  WHERE character_id = p_from_id AND balance >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_funds';
  END IF;

  -- Credit
  UPDATE eco_wallet
  SET balance = balance + p_amount, updated_at = now()
  WHERE character_id = p_to_id;

  -- Immutable ledger entry
  INSERT INTO eco_transaction (
    id, from_id, to_id, amount, currency,
    source_type, source_id, reason,
    idempotency_key, game_timestamp, created_at
  ) VALUES (
    gen_random_uuid(), p_from_id, p_to_id, p_amount, 'NGN',
    p_source_type, p_source_id, p_reason,
    p_idempotency_key, p_game_timestamp, now()
  );
END;
$$;
```

### Soft Deletion

Entities that represent real-world history (characters, businesses, organizations) are soft-deleted with `status = 'inactive' | 'deceased' | 'dissolved'`. Hard deletion is reserved for account closure by user request.

### Indexes (MVP Minimum)

```sql
CREATE INDEX ON chr_character_state (location_id);
CREATE INDEX ON chr_character_state (venue_id);
CREATE INDEX ON eco_transaction (from_id, created_at);
CREATE INDEX ON eco_transaction (to_id, created_at);
CREATE INDEX ON eco_transaction (idempotency_key);
CREATE INDEX ON eco_work_session (character_id, status);
CREATE INDEX ON soc_reputation (character_id, scope_type, dimension);
CREATE INDEX ON evt_event (actor_id, created_at);
CREATE INDEX ON evt_event (location_id, significance);
CREATE INDEX ON ntf_notification (character_id, read, created_at);
CREATE INDEX ON obs_command_log (actor_id, created_at);
```

---

## SECTION 7 — Economy Foundation

### Principles

1. Money in Naija Presido has traceable sources and sinks.
2. The total money supply is managed, not infinite.
3. In MVP, employment is the primary source of money. The employer is an NPC business funded by a system "government grant" source — modelled explicitly as `source_type = 'system_grant'`, not as arbitrary wallet inflation.
4. Every Naira that enters a wallet entered from a traceable `eco_transaction`. Every Naira that leaves has a traceable record.

### Asset & Ownership Model

Ownership of entities (venues, businesses, vehicles, properties, significant items) is strictly separated from the entity's data record.
- An entity (e.g., a `phys_venue`) NEVER has an `owner_id` column.
- Instead, it is registered in the `eco_asset` ledger.
- The `eco_asset_ownership` table records *who* owns it (character, organization, or government), *how much* they own (`share_percentage`), and the *status* of that ownership.

This explicitly supports:
- **Independent Persistence**: A business or venue exists whether or not it currently has an owner.
- **Partnerships**: Multiple owners can hold shares adding up to 100%.
- **Transfers**: Assets can be sold, inherited, or seized by changing ownership records without touching the core entity.
- **Institutional Ownership**: Organizations or government entities can own properties just like characters.

### Economy Flow (Long-Term Vision, Not MVP)

```
production → employment → wages → consumption
→ business revenue → taxes → government spending
→ infrastructure/services → economic consequences
```

MVP only implements: employment → wages → consumption (one item type).

### Why This Matters

The MVP economy is simple. But the schema and transaction structure are designed for the full flow from day one. Adding taxes, business revenue, and government budgets in Phase 2 requires adding new `source_type` values and new tables — it does not require rewriting the wallet or transaction system.

---

## SECTION 8 — Social & Reputation

### Relationship Model

Relationships are directional (actor → target), typed, and have strength. Two-way relationships are two records. This allows asymmetric relationships: A may consider B a friend while B considers A a rival.

### Reputation Model

Reputation is multi-dimensional and scoped from day one.

```
dimension:  'popularity' | 'trust' | 'competence' | 'notoriety' | 'influence'
scope_type: 'neighbourhood' | 'city' | 'state' | 'national' | 'organization'
scope_id:   uuid of the specific neighbourhood/org/etc
```

MVP implements only `popularity` and `trust` at `neighbourhood` scope. All other dimensions and scopes are added as new rows without schema changes.

**MVP UI must display reputation as labelled dimensions**, not as a single unlabelled score. Even in MVP with one dimension, the label "Popularity in Ojuelegba" is shown — not just a number. This prevents UI assumptions that break when dimensions are added.

### Social → Political Connection

Reputation, relationships, and organizational membership are the foundation on which political influence is built. This is not an accident — it is the intended progression:

```
Individual Life → Relationships → Reputation
→ Organizations → Influence → Leadership
→ Political Power → Government → Policy
→ Consequences for Society
```

The social domain is therefore not a generic "friendship system." It is the substrate of the political simulation.

---

## SECTION 9 — Event System & World History

### Event Significance

Every event is classified by significance:

| Significance | Examples | Retention |
|---|---|---|
| `trivial` | Character walked into a bar | Pruned after 7 game-days |
| `minor` | Character greeted another | Pruned after 30 game-days |
| `significant` | Business opened, relationship formed, job started | Kept indefinitely |
| `historic` | Election won, major policy enacted, organization founded | Never deleted |

### Causal Chain

Events reference their cause via `caused_by uuid REFERENCES evt_event(id)`. This builds a causal graph. The world can answer:

- "What happened?" → `evt_event.type + payload`
- "Who caused it?" → `evt_event.actor_id`
- "What changed?" → `evt_effect` records linked to the event
- "When did it happen?" → `evt_event.game_timestamp`
- "What chain of events led here?" → traverse `caused_by` chain

### This Is Not Pure Event Sourcing

The current authoritative state (ballets, reputation, location) is stored directly in dedicated tables — not re-derived from events. Events are the audit trail, not the source of truth for queries. This hybrid approach gives fast reads on current state and a durable history for investigation and world-building.

### Institutional Memory

`significance = 'historic'` events form the in-game historical record. Phase 5 will expose this as the world's timeline — the emergent history of Nigerian society as players and NPCs created it.

---

## SECTION 10 — Server / Client Responsibility Model

### The Two Golden Rules (Repeated for Emphasis)

> **"The player decides what they attempt. The simulation determines the outcome."**

> **"The server decides what is true. The client decides what it looks like."**

### Player Agency Principle

The game must not become a menu-driven collection of predefined rewards. Players attempt actions; outcomes are computed by the simulation based on:

- Character skills and attributes
- Available resources (money, energy, health)
- Reputation and relationships
- Location and time
- Active laws and policies
- Other players and NPCs involved
- Calibrated probability where appropriate

This principle must be maintained as new systems are built. No new mechanic should bypass the simulation to guarantee an outcome client-side.

### Responsibility Table

| Responsibility | Server | Client |
|---|---|---|
| Validate all commands | ✅ | ❌ |
| Mutate game state | ✅ | ❌ |
| Compute economy | ✅ | display only |
| Enforce election rules | ✅ | ❌ |
| Auth/session management | ✅ | reads token only |
| Idempotency enforcement | ✅ | provides key |
| Render 3D world | ❌ | ✅ |
| 3D movement / camera | ❌ | ✅ |
| Ephemeral presence broadcast | gateway only | ✅ |
| Optimistic UI (safe actions) | N/A | ✅ with rollback |
| Local UI state | ❌ | ✅ |
| Tick execution | ✅ | ❌ |

### API Contract

All consequential game mutations:

```
Client constructs Command → POST /api/commands/{type}
  Server: authenticate → authorize → validate → simulate → write → notify
  Server: returns { ok: true, state: <new relevant state> } | { ok: false, reason: '...' }
Client: re-renders from returned state (rolls back optimistic update if rejected)
```

Non-consequential reads of world data (map, venue listings, character profiles) may go directly through the Supabase client with RLS for performance.

---

## SECTION 11 — Multiplayer & Realtime Strategy

### Two-Layer Location Architecture

#### Layer 1 — Authoritative Location State (Persistent)

*Where in the world is this character, persistently?*

- Stored in `chr_character_state` (neighbourhood, venue)
- Updated only on significant transitions via commands (`MOVE_CHARACTER`, `ENTER_VENUE`, `LEAVE_VENUE`)
- Delivered to subscribers via Supabase Realtime **Postgres Changes** on `chr_character_state`
- Low frequency: changes a few times per session at most

#### Layer 2 — Ephemeral Presence (Real-Time Position)

*Where exactly in 3D space is this character right now?*

- Managed by Supabase Realtime **Broadcast** (not Postgres Changes — no DB write)
- Broadcast channel: `presence:location:{location_id}`
- Client sends position updates at ≤10 Hz (configurable, throttled)
- Not stored in the database. Acceptable to lose frames.
- Persists for session only. On disconnect, character's last authoritative location remains in `chr_character_state`.

#### Layer 2a — Client-Side Interpolation

To produce smooth movement despite 100–300ms WebSocket latency, all remote character positions are rendered using **linear interpolation (lerp)** toward the last-received broadcast position. Characters appear to move smoothly even when position updates arrive at irregular intervals.

```typescript
// Each frame in the R3F render loop:
remoteCharacter.position.lerp(targetPosition, INTERPOLATION_FACTOR * delta);
```

This is implemented in the `RemoteCharacter` R3F component. It is not an architecture decision — it is a rendering technique — but it is recorded here because it resolves the known latency problem without requiring a presence server.

### Channel Taxonomy

```
Supabase Realtime Broadcast channels (ephemeral, high-frequency):
  presence:location:{location_id}   — 3D position of players in same zone/venue

Supabase Realtime Postgres Changes (low-frequency, persistent state):
  chr_character_state               — authoritative location transitions
  ntf_notification                  — personal alerts
  evt_event (significance >= 'significant') — world-level news feed
```

### Concurrency Assumptions & Free-Tier Limits

Supabase free tier: 200 concurrent Realtime connections.

With 200 concurrent players each holding 2–3 channel subscriptions, this ceiling is close. Mitigation:
- Limit subscriptions per client to what is immediately relevant (local zone + personal channel)
- Use Realtime Broadcast (not Postgres Changes) for high-frequency events (Broadcast does not count toward the Postgres Change subscription limit in the same way)
- If concurrent connections approach 150, upgrade to Supabase Pro or introduce a dedicated presence relay

### Path to Future Presence Server

When concurrent players require it, a lightweight presence relay (Cloudflare Workers, Fly.io) can sit between clients and handle ephemeral broadcasts without any DB interaction. The client code changes only the WebSocket endpoint URL. Game simulation and persistent state remain on Supabase/Vercel. This seam is clean and does not require rewriting game logic.

---

## SECTION 12 — 3D Presentation Strategy

### Technology

**React Three Fiber (R3F) + Three.js + Drei**

Chosen for: React integration, large ecosystem, no game-engine overhead, sufficient for required visual style.

### The Simulation Boundary

The 3D scene is not the simulation. It is a consumer of simulation state.

```
Supabase Realtime + API Responses
  ↓
React hooks (domain hooks: useCharacterState, useVenue, etc.)
  ↓
Zustand world store (client-side state cache)
  ↓
R3F scene components read from store
  ↓
Player intent (keypress, click) dispatched as Commands → API
```

**The 3D scene never calls the simulation API directly.** It dispatches typed Commands through a `useCommand` hook. The hook handles auth, optimistic updates, and rollback.

**No simulation logic lives in R3F components.** ESLint enforces this (see Section 19).

### Visual Style

Low-poly stylized Nigeria. Not photorealistic.

- Clean geometry, flat/cel shading
- Warm palettes: terracotta, ochre, deep green, burnt orange, gold
- Day/night cycle driven by `wrld_clock` game time
- Nigerian vernacular architecture: zinc rooftops, painted storefronts, compound walls, open-air markets
- Environmental detail: molue buses, okada riders, hawkers, market stalls, generator exhaust
- Signage: Pidgin English shop names, Nigerian brand aesthetics

### Scene Architecture

```jsx
<WorldScene>
  <Sky gametime={gameTime} />              {/* time-of-day driven sky/lighting */}
  <Terrain zoneId={currentZone} />         {/* tiled, streamed */}
  <VenueLayer venues={nearbyVenues} />     {/* instanced buildings, LOD */}
  <CharacterLayer>
    <LocalPlayer />
    {remoteCharacters.map(c =>
      <RemoteCharacter key={c.id} data={c} />  {/* with lerp interpolation */}
    )}
    <AmbientNPCLayer count={20} seed={zoneId} />  {/* decorative, not simulated */}
  </CharacterLayer>
  <WorldHUD />                             {/* HTML overlay: wallet, status, actions */}
</WorldScene>
```

### Scene Streaming

Scenes are chunked by `geo_location` zone. When a character moves between zones, the new zone's assets are loaded and the previous zone is gradually unloaded. This prevents loading the entire city in memory and is the foundation for future expansion to multiple neighbourhoods and cities.

### Performance Budget

- Target: 30fps on mid-range Android phone (2022 hardware baseline)
- Instanced meshes for crowds and repeated building types
- LOD: full geometry within 30 units, reduced beyond, billboard beyond 100
- Frustum culling on all static objects (Three.js default, ensure it is not disabled)
- Compressed GLTF/GLB assets (Draco compression)
- Lazy-load zone chunks asynchronously on zone transition

### Asset Pipeline (Acknowledged Gap)

3D assets (buildings, props, characters, vehicles) require a creation and compression pipeline. This is not an architecture concern but must be planned before 3D world implementation:
- Source format: Blender → GLTF export
- Compression: `gltf-pipeline` with Draco
- Hosting: Supabase Storage or Vercel public assets
- Loading: `@react-three/drei` `useGLTF` with preloading

### Simulation Testability Without Renderer

All domain logic in `domains/` is pure TypeScript with no React/R3F/browser dependencies. Core simulation tests run in Vitest without a browser.

Example tests that must work without R3F:
- "Character worked 4 game hours and earned correct salary"
- "Purchase correctly deducts wallet and records transaction"
- "Money transfer is atomic (no double-spend)"
- "Reputation increased after positive social interaction"
- "Policy modified a simulation parameter"
- "Election counted votes correctly with no duplicates"

---

## SECTION 13 — Security Model

### Authentication Flow

```
User registers → Supabase creates auth.users entry
  → DB trigger creates acct_account row
  → Character creation command (CREATE_CHARACTER) called explicitly by client
  → JWT issued, stored in httpOnly cookie (Next.js middleware)
  → All API routes verify JWT before processing any command
  → current_character_id() resolves auth.uid() → account → active character
```

Note: Character creation is a Command, not a trigger. This preserves the command pipeline for the first player action and avoids hidden side effects in DB triggers for game logic.

### RLS Pattern

All RLS policies use `current_character_id()`, never `auth.uid()` directly as a character identifier.

```sql
-- Players can update only their own character state
CREATE POLICY "own_character_state_update"
ON chr_character_state FOR UPDATE
USING (character_id = current_character_id());

-- Players can see characters in their current location
CREATE POLICY "read_characters_in_same_location"
ON chr_character_state FOR SELECT
USING (
  location_id = (
    SELECT location_id FROM chr_character_state
    WHERE character_id = current_character_id()
  )
);

-- Wallets are private
CREATE POLICY "own_wallet_read"
ON eco_wallet FOR SELECT
USING (character_id = current_character_id());

-- Wallets are never written by the client directly
-- eco_wallet: no INSERT/UPDATE policy for authenticated users
-- All writes go through PG functions called by server-side API routes (service role)
```

### Authorization vs Authentication

- **Authentication**: Is this a valid logged-in user? (JWT verification)
- **Authorization**: Is this character allowed to perform this action *here and now*? (command-level logic)

Authorization checks include: character location, character status, character resources, organizational membership, political role, cooldowns, rate limits. These are application-layer checks in the command handler, not only RLS.

### Rate Limiting

All mutation API routes (`/api/commands/*`) enforce rate limiting:
- 60 commands per minute per character (general)
- 5 money transfer commands per minute per character
- 1 vote per election per character (enforced at DB level, not rate limiting)

Rate limiting is implemented via in-memory counters in Next.js API routes for MVP. Upgrade to Redis or Upstash if needed.

### Anti-Cheat Vectors

| Attack | Mitigation |
|---|---|
| Wallet manipulation | Server + PG function only; no client wallet writes |
| Vote stuffing | Unique constraint on (election_id, character_id) in pol_vote |
| Teleportation | Server validates movement against geo_location graph adjacency |
| Item duplication | Idempotency key on all purchase transactions |
| Spam commands | Per-character rate limiting |
| Impersonation | JWT verification + `current_character_id()` resolution |
| Replay attack | Idempotency keys expire after 24 hours |

---

## SECTION 14 — Observability & Auditability

### Day-One Minimum

The following must exist from the first deployment:

**`obs_command_log`** — every command attempted, accepted or rejected, with timing.

**`obs_tick_log`** — every tick execution: type, duration, entities processed, errors.

**Economic audit query** — a scheduled SQL query (run manually or weekly) that reconciles wallet balances against transaction sums. Any discrepancy is an alert.

```sql
-- Economic reconciliation check (run as a periodic admin query)
SELECT
  w.character_id,
  w.balance AS wallet_balance,
  COALESCE(SUM(t_in.amount), 0) - COALESCE(SUM(t_out.amount), 0) AS computed_balance,
  w.balance - (COALESCE(SUM(t_in.amount), 0) - COALESCE(SUM(t_out.amount), 0)) AS discrepancy
FROM eco_wallet w
LEFT JOIN eco_transaction t_in  ON t_in.to_id   = w.character_id
LEFT JOIN eco_transaction t_out ON t_out.from_id = w.character_id
GROUP BY w.character_id, w.balance
HAVING ABS(w.balance - (COALESCE(SUM(t_in.amount),0) - COALESCE(SUM(t_out.amount),0))) > 0.01;
```

Any character appearing in this result set has a ledger discrepancy — triggering an `adm_investigation`.

### Answerable Questions

The system must be able to answer from day one:

- "Why does this character's wallet contain ₦X?" → `eco_transaction` ledger
- "What commands did this character run in the last hour?" → `obs_command_log`
- "Did this tick run successfully?" → `obs_tick_log`
- "What events affected this character?" → `evt_effect` + `evt_event`
- "When did this character last log in?" → `acct_account` + `chr_character_state`

---

## SECTION 15 — Administration & Moderation

### Principles

A persistent multiplayer society requires administrative capabilities from the moment real players exist. The admin panel UI can be post-MVP. The underlying data capability must not be.

The system must support:
- **Bans and suspensions** (`acct_account.status`)
- **Character investigation** (full event/command/transaction history)
- **Rollback investigation** (what state existed before a disputed action)
- **Economic auditing** (the reconciliation query above)
- **Player reports** (player flags another player)
- **Abuse detection** (anomaly queries on `obs_command_log` and `eco_transaction`)

### Planned Tables (Post-MVP)

```
adm_report        — player-submitted reports
adm_action        — admin actions taken (ban, warn, rollback)
adm_investigation — open cases
```

These tables do not exist in MVP but the schema space is reserved and their need is acknowledged.

---

## SECTION 16 — Tick Infrastructure

### The Free-Tier Tick Problem

Supabase scheduled Edge Functions require the Pro plan. Vercel Cron Jobs are available on the free tier but limited to once-per-day frequency. Neither supports a "every real minute" tick on a free plan.

### MVP Tick Solution

**A lightweight Node.js process on Fly.io free tier (256MB RAM shared machine).**

```
Fly.io tick-worker (Node.js):
  setInterval(() => {
    fetch('https://naija-presido.vercel.app/api/internal/tick/fast', {
      headers: { 'Authorization': `Bearer ${TICK_SECRET}` }
    })
  }, 60_000)
```

The `/api/internal/tick/*` endpoints are protected by a secret token (not player auth). They are not callable by players. The Fly.io process is a dumb scheduler — all tick logic runs in the Next.js API route on Vercel.

This approach:
- Is free on Fly.io (256MB shared machine, always-on)
- Is controllable (can pause, adjust interval, inspect logs)
- Is replaceable (when Supabase Pro is warranted, swap the scheduler, keep the tick endpoints)
- Is honest (acknowledged in the constitution rather than assuming unavailable features)

### Tick Types (MVP)

| Tick | Frequency (real) | Handles |
|---|---|---|
| Fast tick | Every 1 real minute | Process queued consequences, check game-time triggers |
| Slow tick | Every 15 real minutes | NPC decisions, reputation recalculation for active players |
| Daily tick | Every 24 real hours | World events, major aggregation, maintenance |

Each tick endpoint:
1. Writes an `obs_tick_log` entry (start)
2. Processes its work
3. Updates the `obs_tick_log` entry (complete/error)

### Upgrade Path

```
MVP:     Fly.io setInterval → Vercel /api/internal/tick
Phase 2: Supabase Pro → Supabase scheduled Edge Functions
Phase 3: Dedicated simulation worker (if needed)
```

---

## SECTION 17 — MVP Boundaries

### The Vertical Slice

The first playable build proves the core loop with one neighbourhood. It includes:

| Feature | Rationale |
|---|---|
| Registration and login | Identity foundation |
| Character creation (name, appearance) | Player enters the world |
| 3D neighbourhood (one zone) | The world exists and is walkable |
| Walk and explore | Player has agency in space |
| Seeing other players in realtime | Multiplayer is real |
| Time-of-day cycle | World feels alive |
| 2–3 interactable venue types | World has structure |
| Enter and exit buildings | Space has depth |
| In-venue chat | Social interaction |
| Basic wallet (₦ Naira) | Economy exists |
| One job (work for NPC employer) | Player has purpose |
| One purchase (buy food at market) | Economy loop closes |
| Persistence across sessions | World has memory |
| Mobile responsive | Accessible |

### The Vertical Slice Success Criterion

> *"A player can enter this society, move through it, see another human player, perform an activity, experience a consequence, leave, return, and find that the world remembers."*

### What MVP Explicitly Excludes

| Feature | Phase |
|---|---|
| Multiple cities / states | Phase 2+ |
| Elections / political offices | Phase 2+ |
| Organization creation | Phase 2+ |
| Player-owned businesses | Phase 2+ |
| Meaningful NPC decision-making | Phase 2+ |
| Admin panel UI | Phase 2+ |
| Analytics dashboard | Phase 2+ |
| Organizations | Phase 2+ |

These are excluded from implementation, not from the architecture. The schema and domain model accommodate them. They are not built because they are not needed to prove the core loop.

---

## SECTION 18 — Expansion Strategy

### Phase Model

```
Phase 1 — The Vertical Slice / MVP
  One neighbourhood. Prove the engine and core loop.

Phase 2 — The City
  Multiple neighbourhoods in Lagos.
  Player-owned businesses. Business revenue model.
  Organizations (clubs, associations, religious groups).
  Reputation systems mature — multiple dimensions in use.
  LGA-level local government. First elections.
  NPC decision trees (job-seeking, spending, socializing).

Phase 3 — The State
  Multiple cities within Lagos State.
  Inter-city travel (Danfo, ride-sharing).
  State government (Governor, LASG ministries).
  State budget and taxation.
  Media organizations and journalism careers.

Phase 4 — The Federation
  Multiple states.
  Federal government offices.
  National elections (President, Senate, House of Reps).
  National economy (inter-state trade, tariffs).
  Diaspora system (players abroad sending remittances).

Phase 5 — Living Society
  Full NPC population with meaningful behaviour.
  Generational play (legacies, family trees, inheritance).
  Institutional memory (queryable world history).
  Deep political simulation (coalitions, impeachments, corruption).
  Modder and scenario tools.
```

### Expandability Table

| Decision | Why it enables growth |
|---|---|
| `geo_location` self-referential tree | Add any geographic level without schema change |
| Physical world separate from geography | Outdoor venues, multi-building campuses, etc. |
| Four-layer identity model | Multi-character, legacy characters, generational play |
| Command pipeline | All new actions follow same pattern, no fragmentation |
| `scale_factor` in `wrld_clock` | Time pacing tuned without touching gameplay code |
| Timestamp-derived state | Scale to millions of entities without tick writes |
| `soc_reputation` with dimension column | New reputation dimensions = new rows, not migrations |
| `evt_event` with significance + causal chain | World history grows automatically |
| `eco_transaction` with source_type | Full economic audit trail from day one |
| NPC / Player same character schema | NPC population scales independently |
| Domain isolation | Add or extract a domain without touching others |
| Fly.io tick worker → replaceable scheduler | Infrastructure scales without game logic changes |
| R3F scene composition | New scene types (state capital, village) without rewrite |

### Governance of Expansion

- New features start behind feature flags (per-user or global).
- New geography is added via SQL seed files, not code changes.
- New simulation parameters use the `wrld_config` table, not hardcoded values.
- Political systems unlock when player population in a jurisdiction exceeds a threshold.
- New economy mechanics plug into the existing `eco_transaction` ledger.

---

## SECTION 19 — Project Structure

### Directory Layout

```
naija-presido/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login, register, onboarding
│   ├── (game)/                   # Game shell (requires auth)
│   │   ├── world/                # 3D world page
│   │   └── profile/              # Character profile page
│   └── api/
│       ├── commands/             # POST /api/commands/{type}
│       └── internal/
│           └── tick/             # Protected tick endpoints
│               ├── fast/
│               ├── slow/
│               └── daily/
│
├── domains/                      # Pure domain logic. NO UI. NO DB calls. NO React.
│   ├── account/
│   ├── character/
│   ├── geography/
│   ├── physical-world/
│   ├── world-time/
│   ├── economy/
│   ├── social/
│   └── events/
│
├── lib/
│   ├── db/                       # Supabase client (server + browser)
│   ├── game-time.ts              # Authoritative game time functions
│   ├── command-handler.ts        # Command pipeline factory
│   └── types/                    # Shared TypeScript types
│
├── src/
│   ├── client/
│   │   ├── 3d/                   # R3F scenes and components
│   │   │   ├── scenes/
│   │   │   │   ├── WorldScene.tsx
│   │   │   │   └── VenueScene.tsx
│   │   │   └── components/
│   │   │       ├── LocalPlayer.tsx
│   │   │       ├── RemoteCharacter.tsx
│   │   │       └── ...
│   │   ├── components/           # React UI components
│   │   ├── hooks/                # Domain hooks (useCommand, useCharacter, etc.)
│   │   └── store/                # Zustand stores
│   └── server/
│       └── commands/             # Command handler implementations
│           ├── move-character.ts
│           ├── enter-venue.ts
│           └── ...
│
├── supabase/
│   ├── migrations/               # Versioned SQL migrations
│   └── seed/                     # MVP seed data
│
└── tick-worker/                  # Fly.io tick scheduler (separate deployable)
    └── index.ts
```

### ESLint Enforcement Rules (Day One)

The following rules are configured in `.eslintrc` before any code is written:

```jsonc
{
  "rules": {
    // domains/ must not import React, R3F, or client-side libraries
    "no-restricted-imports": [
      "error",
      {
        "paths": [
          { "name": "react", "allowTypeImports": true, "message": "domains/ must not import React" },
          { "name": "@react-three/fiber", "message": "domains/ must not import R3F" },
          { "name": "@react-three/drei", "message": "domains/ must not import drei" }
        ],
        // Apply only inside domains/ — achieved via override
      }
    ]
  },
  "overrides": [
    {
      "files": ["domains/**/*"],
      "rules": {
        "no-restricted-imports": ["error",
          { "patterns": ["react*", "@react-three*", "three*", "../src/client*"] }
        ]
      }
    },
    {
      // 3D scene components must not call simulation API directly
      "files": ["src/client/3d/**/*"],
      "rules": {
        "no-restricted-imports": ["error",
          { "patterns": ["../server*", "../../lib/db*"] }
        ]
      }
    }
  ]
}
```

These rules make the simulation/presentation boundary structurally impossible to violate accidentally.

### Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| DB tables | `{prefix}_{noun}` | `eco_transaction` |
| DB columns | `snake_case` | `character_id`, `created_at` |
| TypeScript types | `PascalCase` | `WorldClock`, `EcoTransaction` |
| Commands | `SCREAMING_SNAKE_CASE` | `MOVE_CHARACTER` |
| API routes | `kebab-case` | `/api/commands/move-character` |
| React components | `PascalCase` | `RemoteCharacter.tsx` |
| Hooks | `useCamelCase` | `useCommand`, `useCharacterState` |
| Zustand stores | `useCamelCaseStore` | `useWorldStore` |

---

## SECTION 20 — Technology Decision Table

| Question | Decision | Rationale |
|---|---|---|
| Framework | Next.js 14+ (App Router) | SSR + API routes in one project |
| Language | TypeScript (strict mode) | Catch simulation bugs at compile time |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| 3D | React Three Fiber + Three.js + Drei | React integration, no engine overhead |
| Database | PostgreSQL via Supabase | Free-tier, RLS, Realtime, Auth in one |
| Auth | Supabase Auth (JWT + httpOnly cookie) | Managed, secure, integrated with RLS |
| Realtime (presence) | Supabase Realtime Broadcast | High-frequency, no DB write |
| Realtime (state) | Supabase Realtime Postgres Changes | Low-frequency, authoritative |
| Client state | Zustand (world store) | Lightweight, works with R3F |
| Client auth state | React context | Simple session propagation |
| Server logic | Next.js API Routes | Stateless, scales on Vercel |
| Atomic DB ops | PostgreSQL functions | Guaranteed atomicity for money/votes |
| Tick scheduler | Fly.io Node.js process (MVP) | Free tier, controllable, replaceable |
| Unit testing | Vitest | Fast, TypeScript-native |
| E2E testing | Playwright | Browser automation, mobile emulation |
| Migrations | Supabase CLI (versioned SQL) | Reproducible, reviewable |
| Deployment | Vercel (app) + Supabase cloud + Fly.io (tick) | All free tier for MVP |
| Assets | Supabase Storage or Vercel public | CDN-delivered, simple |
| Visual style | Low-poly stylized, Nigerian palette | Achievable, distinctive, mobile-friendly |

### What We Are NOT Building

- Kafka, Redis, or any message broker (clean seam exists; introduce when needed)
- Kubernetes or container orchestration (Vercel + Supabase + Fly.io is sufficient)
- Dedicated game server process (stateless API routes are sufficient for MVP concurrency)
- Microservices architecture (one Next.js monorepo with domain isolation)
- Dedicated AI/ML infrastructure (NPC behaviour is simple rule-based in MVP)
- Photorealistic 3D engine (low-poly stylized is the target)
- Full event sourcing (hybrid model: authoritative state + event audit trail)

---

*This document is the authoritative technical constitution for Naija Presido v0.2.*
*All implementation must conform to the decisions made here.*
*Amendments require explicit revision of this document with version increment.*
*No implementation begins until this document is approved.*
