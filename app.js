/* ============================================================
   FANTASY DRAFT ASSISTANT — app.js
   All application logic: data, state, render, Sleeper API,
   ESPN API, drag-drop reordering, tags, persistence.
   ============================================================ */

'use strict';

/* ============================================================
   SECTION 1 — CONFIGURATION
   ============================================================ */

const TAGS_CONFIG = {
  'My Man':       { color: '#f59e0b', bg: 'rgba(245,158,11,.15)', icon: '⭐', short: 'MM' },
  'Bust':         { color: '#ef4444', bg: 'rgba(239,68,68,.15)',  icon: '💣', short: 'BS' },
  'Breakout':     { color: '#10b981', bg: 'rgba(16,185,129,.15)', icon: '🚀', short: 'BK' },
  'Sleeper':      { color: '#8b5cf6', bg: 'rgba(139,92,246,.15)', icon: '😴', short: 'SLP' },
  'Value':        { color: '#3b82f6', bg: 'rgba(59,130,246,.15)', icon: '💎', short: 'VAL' },
  'Injury Prone': { color: '#f97316', bg: 'rgba(249,115,22,.15)', icon: '🩹', short: 'INJ' },
  'Rookie':       { color: '#06b6d4', bg: 'rgba(6,182,212,.15)',  icon: '🎓', short: 'RK' },
  'Do Not Draft': { color: '#dc2626', bg: 'rgba(220,38,38,.15)', icon: '🛑', short: 'DND' },
};
const TAG_ORDER = Object.keys(TAGS_CONFIG);

const POS_COLORS = {
  QB:  '#c84b47',
  RB:  '#2d7a54',
  WR:  '#2563eb',
  TE:  '#d97706',
  K:   '#7c3aed',
  DST: '#0d9488',
};

/* ── NFL Team Colors ───────────────────────────────────────── */
const TEAM_COLORS = {
  ARI: '#97233F', ATL: '#A71930', BAL: '#241773', BUF: '#00338D',
  CAR: '#0085CA', CHI: '#C83803', CIN: '#FB4F14', CLE: '#FF3C00',
  DAL: '#003594', DEN: '#FB4F14', DET: '#0076B6', GB:  '#203731',
  HOU: '#A71930', IND: '#4d7ab5', JAX: '#D7A22A', KC:  '#E31837',
  LAC: '#0080C6', LAR: '#FFA300', LV:  '#A5ACAF', MIA: '#008E97',
  MIN: '#4F2683', NE:  '#C60C30', NO:  '#D3BC8D', NYG: '#0B2265',
  NYJ: '#2e8b6e', PHI: '#004C54', PIT: '#FFB612', SF:  '#AA0000',
  SEA: '#69BE28', TB:  '#D50A0A', TEN: '#4B92DB', WAS: '#5A1414',
  FA:  '#6b7280',
};


/* ── NFL Team Full Names (for search) ──────────────────────── */
const TEAM_NAMES = {
  ARI: 'arizona cardinals',    ATL: 'atlanta falcons',       BAL: 'baltimore ravens',
  BUF: 'buffalo bills',        CAR: 'carolina panthers',     CHI: 'chicago bears',
  CIN: 'cincinnati bengals',   CLE: 'cleveland browns',      DAL: 'dallas cowboys',
  DEN: 'denver broncos',       DET: 'detroit lions',         GB:  'green bay packers',
  HOU: 'houston texans',       IND: 'indianapolis colts',    JAX: 'jacksonville jaguars',
  KC:  'kansas city chiefs',   LAC: 'los angeles chargers',  LAR: 'los angeles rams',
  LV:  'las vegas raiders',    MIA: 'miami dolphins',        MIN: 'minnesota vikings',
  NE:  'new england patriots', NO:  'new orleans saints',    NYG: 'new york giants',
  NYJ: 'new york jets',        PHI: 'philadelphia eagles',   PIT: 'pittsburgh steelers',
  SF:  'san francisco 49ers',  SEA: 'seattle seahawks',      TB:  'tampa bay buccaneers',
  TEN: 'tennessee titans',     WAS: 'washington commanders', FA:  'free agent',
};

/* ── Player-data cache ─────────────────────────────────────── */
const PLAYER_CACHE_KEY = 'fantasyPlayerCache_v1';
const CACHE_TTL_MS     = 12 * 60 * 60 * 1000; // 12 hours — refresh at 8 AM & 8 PM

const INJURY_META = {
  Q:  { label: 'Q',   color: '#f59e0b', title: 'Questionable' },
  D:  { label: 'D',   color: '#ef4444', title: 'Doubtful' },
  O:  { label: 'OUT', color: '#ef4444', title: 'Out' },
  IR: { label: 'IR',  color: '#991b1b', title: 'Injured Reserve' },
  NA: { label: 'NA',  color: '#6b7280', title: 'Not Available' },
  PUP:{ label: 'PUP', color: '#6b7280', title: 'PUP List' },
};

/* ============================================================
   SECTION 2 — DEFAULT PLAYER DATA (145 players)
   Ranks are 1-based and match index order.
   ============================================================ */

const DEFAULT_PLAYERS_RAW = [
  // ─── QBs ──────────────────────────────────────────────
  { name: 'Josh Allen',           team: 'BUF', position: 'QB' },
  { name: 'Jayden Daniels',       team: 'WAS', position: 'QB' },
  { name: 'Drake Maye',           team: 'NE',  position: 'QB' },
  { name: 'Joe Burrow',           team: 'CIN', position: 'QB' },
  { name: 'Lamar Jackson',        team: 'BAL', position: 'QB' },
  { name: 'Patrick Mahomes',      team: 'KC',  position: 'QB' },
  { name: 'Jalen Hurts',          team: 'PHI', position: 'QB' },
  { name: 'Dak Prescott',         team: 'DAL', position: 'QB' },
  { name: 'Tua Tagovailoa',       team: 'MIA', position: 'QB' },
  { name: 'Trevor Lawrence',      team: 'JAX', position: 'QB' },
  { name: 'Justin Herbert',       team: 'LAC', position: 'QB' },
  { name: 'Sam Darnold',          team: 'MIN', position: 'QB' },
  { name: 'Bo Nix',               team: 'DEN', position: 'QB' },
  { name: 'Anthony Richardson',   team: 'IND', position: 'QB' },
  { name: 'Kyler Murray',         team: 'ARI', position: 'QB' },
  { name: 'Jordan Love',          team: 'GB',  position: 'QB' },
  { name: 'C.J. Stroud',          team: 'HOU', position: 'QB' },
  { name: 'Caleb Williams',       team: 'CHI', position: 'QB' },
  { name: 'Geno Smith',           team: 'SEA', position: 'QB' },
  { name: 'Will Levis',           team: 'TEN', position: 'QB' },

  // ─── RBs ──────────────────────────────────────────────
  { name: 'Saquon Barkley',       team: 'PHI', position: 'RB' },
  { name: 'Bijan Robinson',       team: 'ATL', position: 'RB' },
  { name: 'Jahmyr Gibbs',         team: 'DET', position: 'RB' },
  { name: "De'Von Achane",        team: 'MIA', position: 'RB' },
  { name: 'Kyren Williams',       team: 'LAR', position: 'RB' },
  { name: 'Isiah Pacheco',        team: 'KC',  position: 'RB' },
  { name: 'Travis Etienne',       team: 'JAX', position: 'RB' },
  { name: 'Jonathan Taylor',      team: 'IND', position: 'RB' },
  { name: 'Tony Pollard',         team: 'TEN', position: 'RB' },
  { name: 'James Cook',           team: 'BUF', position: 'RB' },
  { name: 'Derrick Henry',        team: 'BAL', position: 'RB' },
  { name: 'Josh Jacobs',          team: 'GB',  position: 'RB' },
  { name: 'Alvin Kamara',         team: 'NO',  position: 'RB' },
  { name: 'Breece Hall',          team: 'NYJ', position: 'RB' },
  { name: 'Aaron Jones',          team: 'MIN', position: 'RB' },
  { name: 'David Montgomery',     team: 'DET', position: 'RB' },
  { name: 'Rachaad White',        team: 'TB',  position: 'RB' },
  { name: 'Chuba Hubbard',        team: 'CAR', position: 'RB' },
  { name: 'Zach Charbonnet',      team: 'SEA', position: 'RB' },
  { name: 'Javonte Williams',     team: 'DEN', position: 'RB' },
  { name: 'Najee Harris',         team: 'PIT', position: 'RB' },
  { name: 'D\'Andre Swift',       team: 'CHI', position: 'RB' },
  { name: 'Gus Edwards',          team: 'LAC', position: 'RB' },
  { name: 'Jerome Ford',          team: 'CLE', position: 'RB' },
  { name: 'Dameon Pierce',        team: 'HOU', position: 'RB' },
  { name: 'Austin Ekeler',        team: 'WAS', position: 'RB' },
  { name: 'Jonathon Brooks',      team: 'CAR', position: 'RB' },
  { name: 'Tank Bigsby',          team: 'JAX', position: 'RB' },
  { name: 'Tyjae Spears',         team: 'TEN', position: 'RB' },
  { name: 'A.J. Dillon',          team: 'GB',  position: 'RB' },
  { name: 'Alexander Mattison',   team: 'LV',  position: 'RB' },
  { name: 'Zamir White',          team: 'LV',  position: 'RB' },
  { name: 'Cam Akers',            team: 'MIN', position: 'RB' },
  { name: 'Roschon Johnson',      team: 'CHI', position: 'RB' },
  { name: 'Justice Hill',         team: 'BAL', position: 'RB' },

  // ─── WRs ──────────────────────────────────────────────
  { name: "Ja'Marr Chase",        team: 'CIN', position: 'WR' },
  { name: 'Justin Jefferson',     team: 'MIN', position: 'WR' },
  { name: 'CeeDee Lamb',          team: 'DAL', position: 'WR' },
  { name: 'Puka Nacua',           team: 'LAR', position: 'WR' },
  { name: 'Amon-Ra St. Brown',    team: 'DET', position: 'WR' },
  { name: 'DeVonta Smith',        team: 'PHI', position: 'WR' },
  { name: 'Chris Olave',          team: 'NO',  position: 'WR' },
  { name: 'A.J. Brown',           team: 'PHI', position: 'WR' },
  { name: 'Tyreek Hill',          team: 'MIA', position: 'WR' },
  { name: 'Stefon Diggs',         team: 'HOU', position: 'WR' },
  { name: 'Davante Adams',        team: 'LV',  position: 'WR' },
  { name: 'Tee Higgins',          team: 'CIN', position: 'WR' },
  { name: 'Jaylen Waddle',        team: 'MIA', position: 'WR' },
  { name: 'George Pickens',       team: 'PIT', position: 'WR' },
  { name: 'Calvin Ridley',        team: 'TEN', position: 'WR' },
  { name: 'Brandon Aiyuk',        team: 'SF',  position: 'WR' },
  { name: 'Deebo Samuel',         team: 'SF',  position: 'WR' },
  { name: 'Keenan Allen',         team: 'CHI', position: 'WR' },
  { name: 'Cooper Kupp',          team: 'LAR', position: 'WR' },
  { name: 'Mike Evans',           team: 'TB',  position: 'WR' },
  { name: 'D.J. Moore',           team: 'CHI', position: 'WR' },
  { name: 'Michael Pittman Jr.',  team: 'IND', position: 'WR' },
  { name: 'Amari Cooper',         team: 'CLE', position: 'WR' },
  { name: 'Diontae Johnson',      team: 'CAR', position: 'WR' },
  { name: 'Zay Flowers',          team: 'BAL', position: 'WR' },
  { name: 'Tyler Lockett',        team: 'SEA', position: 'WR' },
  { name: 'Gabe Davis',           team: 'JAX', position: 'WR' },
  { name: 'Rashid Shaheed',       team: 'NO',  position: 'WR' },
  { name: 'Christian Watson',     team: 'GB',  position: 'WR' },
  { name: 'Marvin Harrison Jr.',  team: 'ARI', position: 'WR' },
  { name: 'Christian Kirk',       team: 'JAX', position: 'WR' },
  { name: 'Hollywood Brown',      team: 'KC',  position: 'WR' },
  { name: 'Nathaniel Dell',       team: 'HOU', position: 'WR' },
  { name: 'Rome Odunze',          team: 'CHI', position: 'WR' },
  { name: 'Dontayvion Wicks',     team: 'GB',  position: 'WR' },
  { name: 'Adam Thielen',         team: 'CAR', position: 'WR' },
  { name: 'Brian Thomas Jr.',     team: 'JAX', position: 'WR' },
  { name: 'Xavier Worthy',        team: 'KC',  position: 'WR' },
  { name: 'Tank Dell',            team: 'HOU', position: 'WR' },
  { name: 'Jordan Addison',       team: 'MIN', position: 'WR' },
  { name: 'Jaxon Smith-Njigba',   team: 'SEA', position: 'WR' },
  { name: 'Josh Downs',           team: 'IND', position: 'WR' },
  { name: 'Elijah Moore',         team: 'CLE', position: 'WR' },
  { name: 'Cedric Tillman',       team: 'CLE', position: 'WR' },

  // ─── TEs ──────────────────────────────────────────────
  { name: 'Sam LaPorta',          team: 'DET', position: 'TE' },
  { name: 'Travis Kelce',         team: 'KC',  position: 'TE' },
  { name: 'Mark Andrews',         team: 'BAL', position: 'TE' },
  { name: 'Dallas Goedert',       team: 'PHI', position: 'TE' },
  { name: 'T.J. Hockenson',       team: 'MIN', position: 'TE' },
  { name: 'David Njoku',          team: 'CLE', position: 'TE' },
  { name: 'Evan Engram',          team: 'JAX', position: 'TE' },
  { name: 'Kyle Pitts',           team: 'ATL', position: 'TE' },
  { name: 'Jake Ferguson',        team: 'DAL', position: 'TE' },
  { name: 'Trey McBride',         team: 'ARI', position: 'TE' },
  { name: 'George Kittle',        team: 'SF',  position: 'TE' },
  { name: 'Pat Freiermuth',       team: 'PIT', position: 'TE' },
  { name: 'Isaiah Likely',        team: 'BAL', position: 'TE' },
  { name: 'Cade Otton',           team: 'TB',  position: 'TE' },
  { name: 'Tyler Higbee',         team: 'LAR', position: 'TE' },
  { name: 'Hunter Henry',         team: 'NE',  position: 'TE' },
  { name: 'Cole Kmet',            team: 'CHI', position: 'TE' },
  { name: 'Chigoziem Okonkwo',    team: 'TEN', position: 'TE' },

  // ─── Ks ───────────────────────────────────────────────
  { name: 'Justin Tucker',        team: 'BAL', position: 'K' },
  { name: 'Evan McPherson',       team: 'CIN', position: 'K' },
  { name: 'Tyler Bass',           team: 'BUF', position: 'K' },
  { name: 'Jake Elliott',         team: 'PHI', position: 'K' },
  { name: 'Brandon Aubrey',       team: 'DAL', position: 'K' },
  { name: 'Cameron Dicker',       team: 'LAC', position: 'K' },
  { name: 'Wil Lutz',             team: 'DEN', position: 'K' },
  { name: 'Harrison Butker',      team: 'KC',  position: 'K' },
  { name: 'Matt Gay',             team: 'IND', position: 'K' },
  { name: 'Greg Joseph',          team: 'MIN', position: 'K' },

  // ─── DSTs ─────────────────────────────────────────────
  { name: '49ers',                team: 'SF',  position: 'DST' },
  { name: 'Ravens',               team: 'BAL', position: 'DST' },
  { name: 'Eagles',               team: 'PHI', position: 'DST' },
  { name: 'Bills',                team: 'BUF', position: 'DST' },
  { name: 'Cowboys',              team: 'DAL', position: 'DST' },
  { name: 'Broncos',              team: 'DEN', position: 'DST' },
  { name: 'Jets',                 team: 'NYJ', position: 'DST' },
  { name: 'Browns',               team: 'CLE', position: 'DST' },
  { name: 'Steelers',             team: 'PIT', position: 'DST' },
  { name: 'Chiefs',               team: 'KC',  position: 'DST' },
  { name: 'Dolphins',             team: 'MIA', position: 'DST' },
  { name: 'Buccaneers',           team: 'TB',  position: 'DST' },
  { name: 'Bears',                team: 'CHI', position: 'DST' },
  { name: 'Vikings',              team: 'MIN', position: 'DST' },
  { name: 'Texans',               team: 'HOU', position: 'DST' },
];

/* ============================================================
   SECTION 3 — APPLICATION STATE
   ============================================================ */

let state = {
  players:     [],       // Full player objects with custom data
  posFilter:   'ALL',    // Position filter
  searchQuery: '',       // Search string
  connection: {
    platform:      null,       // 'sleeper' | 'espn' | 'manual'
    draftId:       null,
    leagueId:      null,
    year:          null,
    status:        'disconnected',  // 'connecting' | 'connected' | 'polling' | 'error' | 'disconnected'
    statusMsg:     'Not Connected',
    interval:      null,
    ws:            null,
    knownPickNos:  new Set(),
    recentPicks:   [],
    lastUpdated:   null,
  },
  drag: {
    sourceId:  null,
    overIndex: null,
  },
  nextId: 146,
  // League View
  league: {
    teams:       0,          // number of fantasy teams
    rounds:      0,          // total rounds in draft
    rosterSlots: {},         // { QB:1, RB:2, WR:2, TE:1, FLEX:1, K:1, DST:1, BN:6, SFLX:0 }
    teamNames:   {},         // { rosterId: 'Team Name' }
    myRosterId:  null,       // which roster slot belongs to the user
  },
  leagueViewActive: false,
};

/* ============================================================
   SECTION 4 — PERSISTENCE
   ============================================================ */

const STORAGE_KEY         = 'fantasyDraftState_v3';
const SAVED_RANKINGS_KEY  = 'fantasySavedRankings_v1';

function saveState() {
  try {
    const data = {
      players: state.players,
      nextId:  state.nextId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch(e) { console.warn('Save failed', e); }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state.players = data.players || [];
      state.nextId  = data.nextId  || 146;
      return;
    }
  } catch(e) { console.warn('Load failed', e); }
  state.players = [];
}

/* ── Saved Rankings (3 independent slots) ──────────────────── */

function loadSavedRankings() {
  try {
    const raw = localStorage.getItem(SAVED_RANKINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return [
    { name: 'Slot 1', timestamp: null, players: null },
    { name: 'Slot 2', timestamp: null, players: null },
    { name: 'Slot 3', timestamp: null, players: null },
  ];
}

function persistSavedRankings(slots) {
  try {
    localStorage.setItem(SAVED_RANKINGS_KEY, JSON.stringify(slots));
  } catch(e) { console.warn('Save rankings failed', e); }
}

function saveRankingSlot(slotIndex) {
  const slots = loadSavedRankings();
  slots[slotIndex].players   = JSON.parse(JSON.stringify(state.players));
  slots[slotIndex].timestamp = Date.now();
  persistSavedRankings(slots);
  showToast(`Rankings saved to ${slots[slotIndex].name}`, 'success');
  renderSavedRankingSlots();
}

function loadRankingSlot(slotIndex) {
  const slots = loadSavedRankings();
  const slot  = slots[slotIndex];
  if (!slot.players) { showToast('Nothing saved in this slot yet', 'error'); return; }
  if (!confirm(`Load "${slot.name}"? Current rankings will be replaced.`)) return;
  state.players = JSON.parse(JSON.stringify(slot.players));
  saveState();
  renderAll();
  showToast(`Loaded "${slot.name}"`, 'success');
  closeModal('saveRankingsModal');
}

function clearRankingSlot(slotIndex) {
  const slots = loadSavedRankings();
  slots[slotIndex].players   = null;
  slots[slotIndex].timestamp = null;
  persistSavedRankings(slots);
  showToast(`${slots[slotIndex].name} cleared`, 'info');
  renderSavedRankingSlots();
}

function renameRankingSlot(slotIndex, newName) {
  const slots = loadSavedRankings();
  slots[slotIndex].name = newName.trim() || `Slot ${slotIndex + 1}`;
  persistSavedRankings(slots);
}

function renderSavedRankingSlots() {
  const slots     = loadSavedRankings();
  const container = document.getElementById('savedRankingSlots');
  if (!container) return;
  container.innerHTML = slots.map((slot, i) => {
    const hasData = !!slot.players;
    const meta    = hasData ? 'Saved list' : 'Not saved yet';
    return `
      <div class="ranking-slot${hasData ? ' ranking-slot--saved' : ''}">
        <div class="slot-header">
          <input class="slot-name-input" type="text" value="${esc(slot.name)}"
            onchange="renameRankingSlot(${i}, this.value)"
            onblur="renameRankingSlot(${i}, this.value)"
            placeholder="Slot ${i + 1}">
          <div class="slot-actions">
            ${hasData ? '' : `<button class="btn btn-sm btn-save-slot" onclick="saveRankingSlot(${i})">✦ Save Here</button>`}
            ${hasData ? `<button class="btn btn-sm btn-load-slot" onclick="loadRankingSlot(${i})">Load</button>` : ''}
            ${hasData ? `<button class="btn btn-sm btn-delete-slot" onclick="clearRankingSlot(${i})" title="Delete this slot">✕ Delete</button>` : ''}
          </div>
        </div>
        <div class="slot-meta ${hasData ? 'has-data' : ''}">${meta}</div>
      </div>`;
  }).join('');
}

function timeAgo(ts) {
  if (!ts) return '—';
  const ms  = Date.now() - ts;
  const m   = Math.floor(ms / 60000);
  if (m < 1)    return 'just now';
  if (m < 60)   return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

function initDefaultPlayers() {
  return DEFAULT_PLAYERS_RAW.map((p, i) => ({
    id:           i + 1,
    name:         p.name,
    team:         p.team,
    position:     p.position,
    rank:         i + 1,
    sleeperRank:  i + 1,
    rankLocked:   false,
    tags:         [],
    isDrafted:    false,
    draftPick:    null,
    draftedBy:    null,
    injuryStatus: null,
    byeWeek:      null,
    sleeperId:    null,
    adp:          null,
  }));
}

/* ============================================================
   SECTION 5 — FILTERING & DISPLAY ORDER
   ============================================================ */

function getDisplayPlayers() {
  let list = [...state.players].sort((a, b) => a.rank - b.rank);

  if (state.posFilter !== 'ALL')
    list = list.filter(p => p.position === state.posFilter);

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.team.toLowerCase().includes(q) ||
      p.position.toLowerCase().includes(q) ||
      (TEAM_NAMES[p.team] || '').includes(q)
    );
  }

  return list;
}

/* ============================================================
   SECTION 6 — RENDERING
   ============================================================ */

function renderAll() {
  if (state.leagueViewActive) {
    renderLeagueView();
  } else {
    renderPlayers();
  }
  renderConnectionStatus();
  renderTicker();
  renderStats();
}

function renderPlayers() {
  const players = getDisplayPlayers();
  const tbody   = document.getElementById('playerTableBody');
  const empty   = document.getElementById('emptyState');

  if (players.length === 0) {
    tbody.innerHTML = '';
    empty.classList.add('visible');
  } else {
    empty.classList.remove('visible');
    tbody.innerHTML = players.map(p => buildRow(p)).join('');
    attachDragEvents();
  }
}


function buildRow(player) {
  const posColor  = POS_COLORS[player.position] || '#6b7280';
  const teamColor = TEAM_COLORS[player.team] || posColor;
  const isMyMan   = player.tags.includes('My Man');
  const otherTags = player.tags;

  // Avatar shows team abbreviation with team colors
  const avatarText = player.team || '?';

  const pickInfo = player.isDrafted
    ? `<div class="pick-info">
         <span class="pick-num">${player.draftPick ? '#' + player.draftPick : 'Drafted'}</span>
         ${player.draftedBy ? `<span class="drafted-by">${esc(player.draftedBy)}</span>` : ''}
       </div>`
    : '';

  const draftedLabel = player.isDrafted ? '✓ Drafted' : 'Mark Drafted';

  const tagIcons = player.tags
    .filter(t => TAGS_CONFIG[t])
    .sort((a, b) => TAG_ORDER.indexOf(a) - TAG_ORDER.indexOf(b))
    .map(t => {
      const cfg = TAGS_CONFIG[t];
      return `<span class="tag-cell-icon" title="${t}" style="filter:drop-shadow(0 0 3px ${cfg.color})">${cfg.icon}</span>`;
    }).join('');

  return `<tr class="player-row ${player.isDrafted ? 'drafted' : ''} ${isMyMan ? 'my-man' : ''}"
             data-id="${player.id}" data-rank="${player.rank}" draggable="true">
    <td class="col-drag">
      <div class="drag-handle" title="Drag to reorder">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="3.5" cy="3.5" r="1.2"/>  <circle cx="3.5" cy="7"   r="1.2"/>  <circle cx="3.5" cy="10.5" r="1.2"/>
          <circle cx="9"   cy="3.5" r="1.2"/>  <circle cx="9"   cy="7"   r="1.2"/>  <circle cx="9"   cy="10.5" r="1.2"/>
        </svg>
      </div>
    </td>
    <td class="col-rank">
      <span class="rank-num" onclick="startRankEdit(event, ${player.id})" title="Click to move to a specific rank">${player.rank}</span>
    </td>
    <td class="col-player">
      <div class="player-info">
        <div class="player-avatar" style="background:${teamColor};color:#fff;font-size:10px;letter-spacing:-.3px">${esc(avatarText)}</div>
        <div class="player-name-info">
          <span class="player-name">${esc(player.name)}</span>
          <span class="player-meta">
            <span class="player-team">${esc(player.team)} · BYE ${player.byeWeek ?? 'TBD'}</span>
          </span>
        </div>
        ${buildInjuryBadge(player.injuryStatus)}<button class="add-tags-btn" onclick="openTagEditor(${player.id})" title="Edit tags">+ Tags</button>
      </div>
    </td>
    <td class="col-tags"><div class="tag-cell-icons">${tagIcons}</div></td>
    <td class="col-spacer"></td>
    <td class="col-pos">
      <span class="pos-badge" style="background:${posColor}">${player.position}</span>
    </td>
    <td class="col-adp">${player.adp != null ? player.adp.toFixed(1) : '—'}</td>
    <td class="col-drafted">
      <button class="drafted-btn ${player.isDrafted ? 'is-drafted' : ''}"
              onclick="toggleDrafted(${player.id})">
        ${draftedLabel}
      </button>
    </td>
    <td class="col-pick">${pickInfo}</td>
  </tr>`;
}

function renderConnectionStatus() {
  const dot  = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  const btn  = document.getElementById('connectBtn');
  const lu   = document.getElementById('lastUpdated');
  const { status, statusMsg, lastUpdated } = state.connection;

  dot.className  = 'status-dot ' + status;
  text.textContent = statusMsg;

  const isConnected = status === 'connected' || status === 'polling';
  if (isConnected) {
    btn.textContent = '✕ Disconnect';
    btn.classList.add('disconnect');
  } else {
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg> Connect to Draft`;
    btn.classList.remove('disconnect');
  }

  // Show/hide League View button
  const lvBtn = document.getElementById('leagueViewBtn');
  if (lvBtn) lvBtn.style.display = isConnected ? '' : 'none';

  if (lastUpdated) {
    const d = new Date(lastUpdated);
    lu.textContent = `Updated ${d.toLocaleTimeString()}`;
  } else {
    lu.textContent = '';
  }
}

function renderTicker() {
  const ticker  = document.getElementById('pickTicker');
  const inner   = document.getElementById('tickerInner');
  const { recentPicks } = state.connection;

  if (recentPicks.length === 0) {
    ticker.classList.remove('visible');
    return;
  }

  ticker.classList.add('visible');
  const items = [...recentPicks, ...recentPicks].map(pick => {
    const posColor = POS_COLORS[pick.position] || '#6b7280';
    return `<span class="ticker-item">
      <span class="ticker-pick">Pick ${pick.pick || '?'}</span>
      <span class="ticker-name" style="color:${posColor}">${esc(pick.name)}</span>
      <span class="ticker-pick" style="color:#6e7681">${pick.position} · ${pick.team}</span>
    </span>`;
  }).join('');
  inner.innerHTML = items;
}

function renderStats() {
  const all       = state.players.length;
  const drafted   = state.players.filter(p => p.isDrafted).length;
  const available = all - drafted;
  const myMan     = state.players.filter(p => p.tags.includes('My Man')).length;
  const avMyMan   = state.players.filter(p => p.tags.includes('My Man') && !p.isDrafted).length;

  document.getElementById('statTotal').innerHTML    = `<b>${all}</b> Players`;
  document.getElementById('statDrafted').innerHTML  = `<b>${drafted}</b> Drafted`;
  document.getElementById('statAvailable').innerHTML= `<b>${available}</b> Available`;
  document.getElementById('statMyMan').innerHTML    = myMan
    ? `⭐ <b>${avMyMan}/${myMan}</b> My Man remaining`
    : '';
}

/* ============================================================
   SECTION 7 — DRAFT ACTIONS
   ============================================================ */

function toggleDrafted(playerId) {
  const p = findPlayer(playerId);
  if (!p) return;

  if (p.isDrafted) {
    p.isDrafted = false;
    p.draftPick = null;
    p.draftedBy = null;
    p.rosterId  = null;
    showToast(`${p.name} unmarked as drafted`, 'info');
  } else {
    p.isDrafted = true;
    if (!p.draftPick) {
      const draftedCount = state.players.filter(x => x.isDrafted).length;
      p.draftPick = draftedCount;
    }
    showToast(`${p.name} marked as drafted`, 'success');
  }

  saveState();
  renderAll();
}


/* ============================================================
   SECTION 8 — TAG EDITOR MODAL
   ============================================================ */

let tagEditorPlayerId = null;

function openTagEditor(playerId) {
  tagEditorPlayerId = playerId;
  const p = findPlayer(playerId);
  if (!p) return;

  document.getElementById('tagModalTitle').textContent = `Tags — ${p.name}`;

  const editor = document.getElementById('tagEditor');
  editor.innerHTML = Object.entries(TAGS_CONFIG).map(([name, cfg]) => {
    const selected = p.tags.includes(name);
    return `<div class="tag-option ${selected ? 'selected' : ''}"
               style="${selected ? `border-color:${cfg.color}; background:${cfg.bg}` : ''}"
               onclick="tagEditorToggle(${playerId}, '${name}', this)">
      <span class="tag-icon">${cfg.icon}</span>
      <span class="tag-name" style="color:${cfg.color}">${name}</span>
      <span class="tag-check">✓</span>
    </div>`;
  }).join('');

  openModal('tagModal');
}

function tagEditorToggle(playerId, tagName, el) {
  const p = findPlayer(playerId);
  if (!p) return;

  const cfg = TAGS_CONFIG[tagName];
  const idx = p.tags.indexOf(tagName);

  if (idx === -1) {
    p.tags.push(tagName);
    el.classList.add('selected');
    el.style.borderColor = cfg.color;
    el.style.background  = cfg.bg;
  } else {
    p.tags.splice(idx, 1);
    el.classList.remove('selected');
    el.style.borderColor = '';
    el.style.background  = '';
  }

  saveState();
  renderPlayers();
  renderStats();
}

/* ============================================================
   SECTION 9 — DRAG & DROP REORDERING
   ============================================================ */

let dragSrcId   = null;
let dragOverId  = null;

function attachDragEvents() {
  document.querySelectorAll('.player-row').forEach(row => {
    row.addEventListener('dragstart',  onDragStart);
    row.addEventListener('dragend',    onDragEnd);
    row.addEventListener('dragover',   onDragOver);
    row.addEventListener('dragleave',  onDragLeave);
    row.addEventListener('drop',       onDrop);
  });
}

function onDragStart(e) {
  dragSrcId = parseInt(this.dataset.id);
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragSrcId);
}

function onDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.player-row').forEach(r => r.classList.remove('drag-over'));
  dragSrcId  = null;
  dragOverId = null;
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (dragOverId !== parseInt(this.dataset.id)) {
    document.querySelectorAll('.player-row').forEach(r => r.classList.remove('drag-over'));
    dragOverId = parseInt(this.dataset.id);
    this.classList.add('drag-over');
  }
}

function onDragLeave() {
  this.classList.remove('drag-over');
}

function onDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');

  const srcId  = dragSrcId;
  const tgtId  = parseInt(this.dataset.id);
  if (!srcId || srcId === tgtId) return;

  const src = findPlayer(srcId);
  const tgt = findPlayer(tgtId);
  if (!src || !tgt) return;

  // Get all players sorted by rank
  const sorted = [...state.players].sort((a, b) => a.rank - b.rank);
  const srcIdx = sorted.findIndex(p => p.id === srcId);
  const tgtIdx = sorted.findIndex(p => p.id === tgtId);

  // Move src to tgt position
  sorted.splice(srcIdx, 1);
  const insertAt = sorted.findIndex(p => p.id === tgtId);
  sorted.splice(insertAt + (srcIdx < tgtIdx ? 1 : 0), 0, src);

  // Mark as manually ranked and reassign ranks
  src.rankLocked = true;
  sorted.forEach((p, i) => { p.rank = i + 1; });

  saveState();
  renderPlayers();
  renderStats();
}

/* ============================================================
   SECTION 9b — RANK EDIT BY TYPING
   Click a rank number → type new rank → Enter to reorder
   ============================================================ */

function startRankEdit(e, playerId) {
  e.stopPropagation();
  const span = e.currentTarget;
  const player = findPlayer(playerId);
  if (!player) return;

  const input = document.createElement('input');
  input.type      = 'number';
  input.className = 'rank-edit-input';
  input.value     = player.rank;
  input.min       = 1;
  input.max       = state.players.length;

  span.replaceWith(input);
  input.select();

  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      applyRankEdit(playerId, parseInt(input.value));
    } else if (ev.key === 'Escape') {
      renderPlayers();
    }
  });

  input.addEventListener('blur', () => {
    // Small delay so Enter handler fires first
    setTimeout(() => {
      const stillThere = document.querySelector(`.rank-edit-input`);
      if (stillThere) renderPlayers();
    }, 150);
  });
}

function applyRankEdit(playerId, newRank) {
  const player = findPlayer(playerId);
  if (!player) return;

  const total = state.players.length;
  newRank = Math.max(1, Math.min(newRank || 1, total));
  if (newRank === player.rank) { renderPlayers(); return; }

  // Reorder: remove from current position, insert at new position
  const sorted = [...state.players].sort((a, b) => a.rank - b.rank);
  const oldIdx = sorted.findIndex(p => p.id === playerId);
  sorted.splice(oldIdx, 1);
  sorted.splice(newRank - 1, 0, player);
  player.rankLocked = true;
  sorted.forEach((p, i) => { p.rank = i + 1; });

  saveState();
  renderPlayers();
  renderStats();
  showToast(`${player.name} moved to rank ${newRank}`, 'info');
}

/* ============================================================
   SECTION 10 — SLEEPER API INTEGRATION
   ============================================================ */

const SLEEPER_BASE = 'https://api.sleeper.app/v1';

async function connectSleeper(input, username) {
  const raw = input.trim();
  // Extract ID from URL like https://sleeper.com/draft/nfl/1234567890
  const match = raw.match(/(\d{15,})/);
  const draftId = match ? match[1] : raw.replace(/\D/g, '');

  if (!draftId || draftId.length < 5) {
    showToast('Invalid Sleeper draft ID or URL', 'error');
    return;
  }

  setConnectionState('connecting', 'Connecting to Sleeper...');

  try {
    const info = await apiFetch(`${SLEEPER_BASE}/draft/${draftId}`);
    if (!info || !info.draft_id) throw new Error('Draft not found. Check the draft ID.');

    state.connection.platform  = 'sleeper';
    state.connection.draftId   = draftId;

    // Store draft/roster settings for League View
    if (info.settings) {
      state.league.teams  = info.settings.teams  || 12;
      state.league.rounds = info.settings.rounds || 15;
      state.league.rosterSlots = {
        QB:   info.settings.slots_qb         || 1,
        RB:   info.settings.slots_rb         || 2,
        WR:   info.settings.slots_wr         || 2,
        TE:   info.settings.slots_te         || 1,
        FLEX: info.settings.slots_flex       || 1,
        SFLX: info.settings.slots_super_flex || 0,
        K:    info.settings.slots_k          || 1,
        DST:  info.settings.slots_def        || 1,
        BN:   info.settings.slots_bn         || 6,
      };
    }

    // Fetch real team names + identify user's team (non-blocking)
    if (info.league_id) {
      fetchSleeperLeagueInfo(info.league_id, username ? username.trim() : '').catch(() => {});
    } else {
      // Mock/standalone draft — fetch participant display names from draft users
      fetchSleeperDraftUsers(draftId, info.draft_order || {}, username ? username.trim() : '').catch(() => {});
    }

    // Initial pick fetch
    await pollSleeperPicks(draftId);

    // Try WebSocket (Phoenix Channels protocol)
    trySleeperWebSocket(draftId);

    // Polling fallback every 10 s
    state.connection.interval = setInterval(() => pollSleeperPicks(draftId), 10000);

    const draftName = info.metadata?.name || `Draft ${draftId}`;
    setConnectionState('polling', `Sleeper: ${draftName}`);

    closeModal('connectModal');
    showToast(`Connected to Sleeper draft: ${draftName}`, 'success');
  } catch(err) {
    setConnectionState('error', `Connection failed`);
    showToast(`Sleeper error: ${err.message}`, 'error');
  }
}

async function pollSleeperPicks(draftId) {
  try {
    const picks = await apiFetch(`${SLEEPER_BASE}/draft/${draftId}/picks`);
    if (!Array.isArray(picks)) return;

    let changed = false;
    for (const pick of picks) {
      if (!state.connection.knownPickNos.has(pick.pick_no)) {
        state.connection.knownPickNos.add(pick.pick_no);
        processSleeperPick(pick);
        changed = true;
      }
    }

    state.connection.lastUpdated = Date.now();

    if (changed) {
      saveState();
      renderAll();
    } else {
      renderConnectionStatus();
    }
  } catch(e) {
    console.warn('Sleeper poll error:', e);
  }
}

function processSleeperPick(pick) {
  const meta = pick.metadata || {};
  const firstName = meta.first_name || '';
  const lastName  = meta.last_name  || '';
  const fullName  = `${firstName} ${lastName}`.trim();
  const pos       = meta.position || '';
  const team      = meta.team     || '';

  if (!fullName) return;

  const player = matchPlayerByName(fullName, pos);
  if (player) {
    player.isDrafted = true;
    player.draftPick = pick.pick_no;
    player.rosterId  = pick.roster_id || null;
    player.draftedBy = meta.owner_id
      ? (meta.owner_id.toString().substring(0, 10))
      : null;
  }

  // Add to recent picks ticker (track regardless of match)
  addTickerPick({ name: fullName, position: pos, team, pick: pick.pick_no, round: pick.round });
}

function trySleeperWebSocket(draftId) {
  try {
    const ws = new WebSocket('wss://apigateway.sleeper.app/v1/ws');
    state.connection.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ topic: `draft:${draftId}`, event: 'phx_join', payload: {}, ref: '1' }));
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        // Phoenix channels: [join_ref, ref, topic, event, payload]
        const [, , topic, event, payload] = Array.isArray(msg) ? msg : [];
        if (event === 'picked' && payload) {
          processSleeperPick(payload);
          state.connection.lastUpdated = Date.now();
          saveState();
          renderAll();
        }
      } catch(e) { /* non-fatal */ }
    };

    // Heartbeat
    const hb = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: Date.now().toString() }));
      } else {
        clearInterval(hb);
      }
    }, 30000);

    ws.onclose = () => clearInterval(hb);
    ws.onerror = () => { /* fall back to polling silently */ };
  } catch(e) { /* WS not available, polling handles it */ }
}

/* ============================================================
   SECTION 11 — ESPN API INTEGRATION
   ============================================================ */

async function connectESPN(leagueId, year, myTeamName) {
  if (!leagueId || !/^\d+$/.test(leagueId.trim())) {
    showToast('Enter a valid ESPN League ID', 'error');
    return;
  }

  const y = (year && year.trim()) || new Date().getFullYear().toString();
  setConnectionState('connecting', 'Connecting to ESPN...');

  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${y}/segments/0/leagues/${leagueId}?view=mDraftDetail&view=mTeam`;

  try {
    const data = await apiFetch(url);
    if (!data || !data.draftDetail) throw new Error('Draft data not found. League may be private or ID is wrong.');

    state.connection.platform  = 'espn';
    state.connection.leagueId  = leagueId.trim();
    state.connection.year      = y;

    processESPNTeams(data, (myTeamName || '').trim());
    processESPNPicks(data);

    state.connection.interval = setInterval(() => pollESPN(leagueId.trim(), y), 15000);
    setConnectionState('polling', `ESPN League ${leagueId}`);
    closeModal('connectModal');
    showToast(`Connected to ESPN league ${leagueId}`, 'success');
  } catch(err) {
    setConnectionState('error', 'ESPN connection failed');
    showToast(`ESPN error: ${err.message}`, 'error');
  }
}

async function pollESPN(leagueId, year) {
  try {
    const url  = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mDraftDetail&view=mTeam`;
    const data = await apiFetch(url);
    if (!data || !data.draftDetail) return;
    if (!state.league.teams) processESPNTeams(data, '');
    processESPNPicks(data);
    state.connection.lastUpdated = Date.now();
    saveState();
    renderAll();
  } catch(e) { console.warn('ESPN poll error', e); }
}

function processESPNTeams(data, myTeamName) {
  const teams = data.teams || [];
  if (!teams.length) return;
  state.league.teams = teams.length;
  teams.forEach(t => {
    state.league.teamNames[t.id] = t.name || t.abbrev || `Team ${t.id}`;
  });
  if (myTeamName) autoDetectMyTeam(myTeamName);
  if (state.leagueViewActive) renderLeagueView();
}

function autoDetectMyTeam(myTeamName) {
  if (!myTeamName) return;
  const needle = myTeamName.toLowerCase();
  const match = Object.entries(state.league.teamNames)
    .find(([, name]) => name.toLowerCase().includes(needle) || needle.includes(name.toLowerCase()));
  if (match) {
    state.league.myRosterId = Number(match[0]);
    showToast(`Found your team: ${match[1]}`, 'success');
    if (state.leagueViewActive) renderLeagueView();
  }
}

function processESPNPicks(data) {
  const picks = data.draftDetail?.picks || [];
  for (const pick of picks) {
    if (state.connection.knownPickNos.has(pick.overallPickNumber)) continue;
    state.connection.knownPickNos.add(pick.overallPickNumber);

    // ESPN stores playerPoolEntry.onTeamId etc.
    const playerId = pick.playerId;
    const player   = state.players.find(p => p.espnId === playerId);
    // Match by name from roster info if available
    const firstName = pick.playerPoolEntry?.playerPoolEntry?.player?.firstName || '';
    const lastName  = pick.playerPoolEntry?.playerPoolEntry?.player?.lastName  || '';
    const fullName  = `${firstName} ${lastName}`.trim();
    const pos       = pick.playerPoolEntry?.playerPoolEntry?.player?.defaultPositionId
      ? espnPosMap(pick.playerPoolEntry.playerPoolEntry.player.defaultPositionId)
      : '';

    if (fullName) {
      const found = matchPlayerByName(fullName, pos);
      if (found) {
        found.isDrafted = true;
        found.draftPick = pick.overallPickNumber;
      }
      addTickerPick({ name: fullName, position: pos, team: '', pick: pick.overallPickNumber, round: pick.roundId });
    }
  }
}

function espnPosMap(id) {
  return { 1:'QB', 2:'RB', 3:'WR', 4:'TE', 5:'K', 16:'DST' }[id] || '';
}

/* ============================================================
   SECTION 11b — YAHOO FANTASY INTEGRATION
   ============================================================ */

async function connectYahoo(leagueKey, myTeamName) {
  leagueKey = (leagueKey || '').trim();

  if (!leagueKey) {
    showToast('Enter a Yahoo Fantasy league key (e.g. 449.l.12345678)', 'error');
    return;
  }

  setConnectionState('connecting', 'Connecting to Yahoo Fantasy…');

  // Yahoo Fantasy public draft results endpoint (requires active Yahoo session)
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/draftresults?format=json`;

  try {
    const data = await apiFetch(url);
    if (!data || !data.fantasy_content) throw new Error('Could not read Yahoo draft data. Make sure you are logged into Yahoo Fantasy in this browser.');

    state.connection.platform  = 'yahoo';
    state.connection.leagueId  = leagueKey;

    processYahooPicks(data);

    // Fetch team names non-blocking
    fetchYahooTeamNames(leagueKey, (myTeamName || '').trim()).catch(() => {});

    state.connection.interval = setInterval(() => pollYahoo(leagueKey), 15000);
    setConnectionState('polling', `Yahoo: ${leagueKey}`);
    closeModal('connectModal');
    showToast(`Connected to Yahoo Fantasy league`, 'success');
  } catch(err) {
    setConnectionState('error', 'Yahoo connection failed');
    showToast(`Yahoo error: ${err.message}`, 'error');
  }
}

async function fetchYahooTeamNames(leagueKey, myTeamName) {
  const url  = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/teams?format=json`;
  const data = await apiFetch(url);
  const teamsRaw = data?.fantasy_content?.league?.[1]?.teams;
  if (!teamsRaw) return;
  const count = teamsRaw.count || 0;
  for (let i = 0; i < count; i++) {
    const teamArr = teamsRaw[i]?.team?.[0];
    if (!Array.isArray(teamArr)) continue;
    const teamId   = teamArr.find(x => x?.team_id)?.team_id;
    const teamName = teamArr.find(x => x?.name)?.name;
    if (teamId && teamName) state.league.teamNames[Number(teamId)] = teamName;
  }
  state.league.teams = count || state.league.teams;
  if (myTeamName) autoDetectMyTeam(myTeamName);
  if (state.leagueViewActive) renderLeagueView();
}

async function pollYahoo(leagueKey) {
  try {
    const url  = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/draftresults?format=json`;
    const data = await apiFetch(url);
    if (!data?.fantasy_content) return;
    processYahooPicks(data);
    state.connection.lastUpdated = Date.now();
    saveState();
    renderAll();
  } catch(e) { console.warn('Yahoo poll error', e); }
}

function processYahooPicks(data) {
  try {
    const picks = data.fantasy_content?.league?.[1]?.draft_results?.[0]?.draft_result || [];
    for (const pick of picks) {
      const no = pick?.pick;
      if (!no || state.connection.knownPickNos.has(no)) continue;
      state.connection.knownPickNos.add(no);

      const name = pick?.player?.[0]?.name?.full || '';
      const pos  = pick?.player?.[0]?.display_position || '';
      if (name) {
        const found = matchPlayerByName(name, pos);
        if (found) { found.isDrafted = true; found.draftPick = no; }
        addTickerPick({ name, position: pos, team: '', pick: no });
      }
    }
  } catch(e) { console.warn('Yahoo pick parse error', e); }
}

/* ============================================================
   SECTION 11c — NFL FANTASY INTEGRATION
   ============================================================ */

async function connectNFL(leagueId, year) {
  leagueId = (leagueId || '').trim();
  year     = (year || '2025').trim();

  if (!leagueId) {
    showToast('Enter an NFL Fantasy league ID', 'error');
    return;
  }

  setConnectionState('connecting', 'Connecting to NFL Fantasy…');

  const url = `https://api.fantasy.nfl.com/v1/league/${leagueId}/picks?season=${year}&format=json`;

  try {
    const data = await apiFetch(url);
    if (!data) throw new Error('Could not read NFL Fantasy draft data. Ensure you are logged into NFL.com in this browser.');

    state.connection.platform  = 'nfl';
    state.connection.leagueId  = leagueId;
    state.connection.year      = year;

    processNFLPicks(data);

    state.connection.interval = setInterval(() => pollNFL(leagueId, year), 15000);
    setConnectionState('polling', `NFL Fantasy: ${leagueId}`);
    closeModal('connectModal');
    showToast(`Connected to NFL Fantasy league`, 'success');
  } catch(err) {
    setConnectionState('error', 'NFL Fantasy connection failed');
    showToast(`NFL Fantasy error: ${err.message}`, 'error');
  }
}

async function pollNFL(leagueId, year) {
  try {
    const url  = `https://api.fantasy.nfl.com/v1/league/${leagueId}/picks?season=${year}&format=json`;
    const data = await apiFetch(url);
    if (!data) return;
    processNFLPicks(data);
    state.connection.lastUpdated = Date.now();
    saveState();
    renderAll();
  } catch(e) { console.warn('NFL Fantasy poll error', e); }
}

function processNFLPicks(data) {
  try {
    const picks = data?.picks || data?.draftPicks || [];
    for (const pick of picks) {
      const no   = pick?.pickNumber || pick?.pick_no;
      if (!no || state.connection.knownPickNos.has(no)) continue;
      state.connection.knownPickNos.add(no);

      const first = pick?.firstName || pick?.player?.firstName || '';
      const last  = pick?.lastName  || pick?.player?.lastName  || '';
      const name  = `${first} ${last}`.trim();
      const pos   = pick?.position  || pick?.player?.position  || '';
      if (name) {
        const found = matchPlayerByName(name, pos);
        if (found) { found.isDrafted = true; found.draftPick = no; }
        addTickerPick({ name, position: pos, team: '', pick: no });
      }
    }
  } catch(e) { console.warn('NFL pick parse error', e); }
}

/* ============================================================
   SECTION 12 — MANUAL MODE
   ============================================================ */

function connectManual() {
  state.connection.platform = 'manual';
  setConnectionState('connected', 'Manual Mode');
  closeModal('connectModal');
  showToast('Manual mode active — click "Mark Drafted" next to each player', 'info');
  renderConnectionStatus();
}

/* ============================================================
   SECTION 13 — CONNECTION HELPERS
   ============================================================ */

function disconnect() {
  if (state.connection.interval) {
    clearInterval(state.connection.interval);
    state.connection.interval = null;
  }
  if (state.connection.ws) {
    try { state.connection.ws.close(); } catch(e) {}
    state.connection.ws = null;
  }
  state.connection.platform      = null;
  state.connection.draftId       = null;
  state.connection.leagueId      = null;
  state.connection.year          = null;
  state.connection.status        = 'disconnected';
  state.connection.statusMsg     = 'Not Connected';
  state.connection.lastUpdated   = null;
  // Reset league info
  state.league = { teams: 0, rounds: 0, rosterSlots: {}, teamNames: {}, myRosterId: null };
  // Close league view if open
  if (state.leagueViewActive) closeLeagueView();
  renderConnectionStatus();
  showToast('Disconnected from draft', 'info');
}

function setConnectionState(status, msg) {
  state.connection.status    = status;
  state.connection.statusMsg = msg;
  renderConnectionStatus();
}

function addTickerPick(pick) {
  state.connection.recentPicks.unshift(pick);
  if (state.connection.recentPicks.length > 12)
    state.connection.recentPicks.pop();
}

async function apiFetch(url) {
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ============================================================
   SECTION 14 — PLAYER MATCHING
   ============================================================ */

function matchPlayerByName(fullName, position) {
  const nameLower = fullName.toLowerCase().trim();

  // Exact name match + position
  let p = state.players.find(x =>
    x.name.toLowerCase() === nameLower &&
    (!position || x.position === position)
  );
  if (p) return p;

  // Exact name match without position
  p = state.players.find(x => x.name.toLowerCase() === nameLower);
  if (p) return p;

  // Fuzzy: last name + position
  const parts    = nameLower.split(' ');
  const lastName = parts[parts.length - 1];
  p = state.players.find(x =>
    x.name.toLowerCase().includes(lastName) &&
    (!position || x.position === position)
  );
  return p || null;
}

function findPlayer(id) {
  return state.players.find(p => p.id === id) || null;
}

/* ============================================================
   SECTION 15 — IMPORT / EXPORT
   ============================================================ */

function exportRankings() {
  const sorted = [...state.players].sort((a, b) => a.rank - b.rank);
  const lines  = sorted.map(p =>
    `${p.rank},${p.name},${p.team},${p.position},${p.tags.join('|')},${p.isDrafted ? 'drafted' : 'available'}`
  );
  const csv    = 'Rank,Name,Team,Position,Tags,Status\n' + lines.join('\n');
  const blob   = new Blob([csv], { type: 'text/csv' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href = url; a.download = 'fantasy-rankings.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Rankings exported!', 'success');
}

function importRankings(csv) {
  const lines   = csv.trim().split('\n').filter(l => l.trim());
  const players = [];
  let   nextId  = state.nextId;

  // Skip header if present
  const startIdx = lines[0].toLowerCase().includes('name') ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim());
    if (parts.length < 3) continue;

    // Support formats: Name,Team,Pos  or  Rank,Name,Team,Pos
    let name, team, pos;
    if (parts.length >= 4 && /^\d+$/.test(parts[0])) {
      [, name, team, pos] = parts;
    } else {
      [name, team, pos] = parts;
    }

    if (!name || !pos) continue;
    pos = pos.toUpperCase().trim();
    if (!POS_COLORS[pos]) continue;

    // Try to find existing player to preserve tags/drafted status
    const existing = state.players.find(p =>
      p.name.toLowerCase() === name.toLowerCase() && p.position === pos
    );

    players.push({
      id:        existing ? existing.id : nextId++,
      name:      name,
      team:      (team || '').toUpperCase(),
      position:  pos,
      rank:      players.length + 1,
      tags:      existing ? existing.tags : [],
      isDrafted: existing ? existing.isDrafted : false,
      draftPick: existing ? existing.draftPick : null,
      draftedBy: existing ? existing.draftedBy : null,
    });
  }

  if (players.length === 0) {
    showToast('No valid players found in import data', 'error');
    return;
  }

  state.players = players;
  state.nextId  = nextId;
  saveState();
  closeModal('importModal');
  renderAll();
  showToast(`Imported ${players.length} players`, 'success');
  document.getElementById('importTextarea').value = '';
}

function addCustomPlayer(name, team, pos, insertRank) {
  if (!name.trim() || !pos) {
    showToast('Player name and position are required', 'error');
    return;
  }

  const rank = Math.max(1, Math.min(insertRank || (state.players.length + 1), state.players.length + 1));

  // Shift existing ranks up
  state.players.forEach(p => { if (p.rank >= rank) p.rank++; });

  state.players.push({
    id:        state.nextId++,
    name:      name.trim(),
    team:      team.trim().toUpperCase() || 'FA',
    position:  pos.toUpperCase(),
    rank:      rank,
    tags:      [],
    isDrafted: false,
    draftPick: null,
    draftedBy: null,
  });

  saveState();
  closeModal('addPlayerModal');
  renderAll();
  showToast(`Added ${name.trim()} at rank ${rank}`, 'success');
}

/* ============================================================
   SECTION 16 — MODAL SYSTEM
   ============================================================ */

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

/* ============================================================
   SECTION 17 — TOAST NOTIFICATIONS
   ============================================================ */

let toastTimer = null;

function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3000);
}

/* ============================================================
   SECTION 18 — UTILITIES
   ============================================================ */

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================
   SECTION 19 — EVENT LISTENERS
   ============================================================ */

function initEventListeners() {
  // Search
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  searchInput.addEventListener('input', () => {
    state.searchQuery = searchInput.value;
    searchClear.style.display = state.searchQuery ? 'block' : 'none';
    renderPlayers();
    renderStats();
  });
  searchClear.addEventListener('click', () => {
    state.searchQuery = '';
    searchInput.value = '';
    searchClear.style.display = 'none';
    renderPlayers();
    renderStats();
  });

  // Position filters
  document.getElementById('posFilters').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pos]');
    if (!btn) return;
    state.posFilter = btn.dataset.pos;
    document.querySelectorAll('.pos-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.pos === state.posFilter);
    });
    renderPlayers();
    renderStats();
  });


  // Connect button
  document.getElementById('connectBtn').addEventListener('click', () => {
    const { status } = state.connection;
    if (status === 'connected' || status === 'polling') {
      disconnect();
    } else {
      openModal('connectModal');
    }
  });

  // Platform tabs
  document.getElementById('platformTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('[data-platform]');
    if (!tab) return;
    const platform = tab.dataset.platform;
    document.querySelectorAll('.platform-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.platform-config').forEach(c => c.classList.add('hidden'));
    document.getElementById(`cfg-${platform}`)?.classList.remove('hidden');
  });

  // Start connection
  document.getElementById('startConnectionBtn').addEventListener('click', () => {
    const activePlatform = document.querySelector('.platform-tab.active')?.dataset.platform;
    if (activePlatform === 'sleeper') {
      connectSleeper(
        document.getElementById('sleeperInput').value,
        document.getElementById('sleeperUsernameInput').value
      );
    } else if (activePlatform === 'espn') {
      connectESPN(
        document.getElementById('espnLeagueInput').value,
        document.getElementById('espnYearInput').value,
        document.getElementById('espnMyTeamInput').value
      );
    } else if (activePlatform === 'yahoo') {
      connectYahoo(
        document.getElementById('yahooLeagueKeyInput').value,
        document.getElementById('yahooMyTeamInput').value
      );
    } else if (activePlatform === 'nfl') {
      connectNFL(
        document.getElementById('nflLeagueIdInput').value,
        document.getElementById('nflYearInput').value
      );
    } else if (activePlatform === 'manual') {
      connectManual();
    }
  });

  // League View
  document.getElementById('leagueViewBtn').addEventListener('click', toggleLeagueView);

  // Import/Export
  document.getElementById('exportBtn').addEventListener('click', exportRankings);
  document.getElementById('importBtn').addEventListener('click', () => openModal('importModal'));
  document.getElementById('importConfirmBtn').addEventListener('click', () => {
    importRankings(document.getElementById('importTextarea').value);
  });

  // Save Rankings
  document.getElementById('saveRankingsBtn').addEventListener('click', () => {
    renderSavedRankingSlots();
    openModal('saveRankingsModal');
  });

  // Refresh player data
  document.getElementById('refreshPlayersBtn').addEventListener('click', async () => {
    // Force a stale cache so we always re-fetch
    try { localStorage.removeItem(PLAYER_CACHE_KEY); } catch(e) {}
    showToast('Refreshing player data from Sleeper…', 'info');
    await checkAndRefreshPlayers();
  });

  // Reset draft
  document.getElementById('resetDraftBtn').addEventListener('click', () => {
    if (!confirm('Reset all draft picks and tags? Rankings are preserved.')) return;
    state.players.forEach(p => {
      p.isDrafted = false;
      p.draftPick = null;
      p.draftedBy = null;
      p.rosterId  = null;
      p.tags      = [];
    });
    state.connection.knownPickNos = new Set();
    state.connection.recentPicks  = [];
    saveState();
    renderAll();
    showToast('Draft picks reset', 'info');
  });

  // Clear filters
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    state.posFilter   = 'ALL';
    state.searchQuery = '';
    document.querySelectorAll('.pos-btn').forEach(b => b.classList.toggle('active', b.dataset.pos === 'ALL'));
    document.getElementById('searchInput').value = '';
    document.getElementById('searchClear').style.display = 'none';
    renderAll();
  });

  // Modal close buttons
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });

  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Keyboard: Escape closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
    }
  });
}

/* ============================================================
   SECTION 19b — LEAGUE VIEW
   ============================================================ */

function toggleLeagueView() {
  state.leagueViewActive ? closeLeagueView() : openLeagueView();
}

function openLeagueView() {
  state.leagueViewActive = true;
  document.getElementById('mainView').style.display   = 'none';
  document.getElementById('leagueView').style.display = '';
  const btn = document.getElementById('leagueViewBtn');
  btn.classList.add('active');
  btn.innerHTML = '🏟 Draft View';
  renderLeagueView();
}

function closeLeagueView() {
  state.leagueViewActive = false;
  document.getElementById('mainView').style.display   = '';
  document.getElementById('leagueView').style.display = 'none';
  const btn = document.getElementById('leagueViewBtn');
  btn.classList.remove('active');
  btn.innerHTML = '🏟 League View';
}

function getNumTeams() {
  if (state.league.teams > 0) return state.league.teams;
  const maxRId = Math.max(0, ...state.players.filter(p => p.rosterId).map(p => p.rosterId));
  return maxRId > 0 ? maxRId : 12;
}

/** Snake-draft math: which team made overall pick N in a league of T teams? */
function inferTeamSlot(pickNo, numTeams) {
  if (!pickNo || !numTeams) return null;
  const round      = Math.ceil(pickNo / numTeams);
  const posInRound = ((pickNo - 1) % numTeams) + 1;
  return round % 2 === 1 ? posInRound : (numTeams + 1 - posInRound);
}

/**
 * Assign players to ordered roster slots via two-phase greedy:
 * Phase 1 fills position-specific slots, Phase 2 fills FLEX/BN.
 * Returns array of { label, posColor, player|null }.
 */
function assignPlayersToSlots(players, rosterSlots) {
  const defs = [
    { id: 'QB',   label: 'QB',   pos: ['QB'],                         count: rosterSlots.QB   || 0 },
    { id: 'RB',   label: 'RB',   pos: ['RB'],                         count: rosterSlots.RB   || 0 },
    { id: 'WR',   label: 'WR',   pos: ['WR'],                         count: rosterSlots.WR   || 0 },
    { id: 'TE',   label: 'TE',   pos: ['TE'],                         count: rosterSlots.TE   || 0 },
    { id: 'FLEX', label: 'FLX',  pos: ['RB','WR','TE'],               count: rosterSlots.FLEX || 0 },
    { id: 'SFLX', label: 'SF',   pos: ['QB','RB','WR','TE'],          count: rosterSlots.SFLX || 0 },
    { id: 'K',    label: 'K',    pos: ['K'],                          count: rosterSlots.K    || 0 },
    { id: 'DST',  label: 'DST',  pos: ['DST'],                        count: rosterSlots.DST  || 0 },
    { id: 'BN',   label: 'BN',   pos: ['QB','RB','WR','TE','K','DST'],count: rosterSlots.BN   || 0 },
  ];

  const totalSlots = defs.reduce((s, d) => s + d.count, 0);
  if (totalSlots === 0) {
    // No roster config — just list players by position
    return players.map(p => ({ label: p.position, posColor: POS_COLORS[p.position], player: p, isFlex: false }));
  }

  // Build expanded slot list
  const slots = [];
  defs.forEach(def => {
    const color = def.pos.length === 1 ? (POS_COLORS[def.pos[0]] || '#6b7280') : '#6b7280';
    for (let i = 0; i < def.count; i++) {
      const suffix = def.count > 1 ? (i + 1) : '';
      slots.push({ label: def.label + suffix, posColor: color, pos: def.pos, isFlex: def.pos.length > 1, slotId: def.id, player: null });
    }
  });

  const remaining = [...players];

  // Phase 1: specific-position slots
  slots.forEach(slot => {
    if (slot.player || slot.isFlex) return;
    const idx = remaining.findIndex(p => slot.pos.includes(p.position));
    if (idx !== -1) slot.player = remaining.splice(idx, 1)[0];
  });

  // Phase 2: flex / BN slots
  slots.forEach(slot => {
    if (slot.player || !slot.isFlex) return;
    const idx = remaining.findIndex(p => slot.pos.includes(p.position));
    if (idx !== -1) slot.player = remaining.splice(idx, 1)[0];
  });

  // Overflow (more picks than roster spots)
  remaining.forEach(p => {
    slots.push({ label: 'BN', posColor: '#4b5563', pos: [], isFlex: true, player: p });
  });

  return slots;
}

function renderLeagueView() {
  const container = document.getElementById('leagueViewContent');
  const subtitle  = document.getElementById('lvSubtitle');
  if (!container) return;

  const numTeams = getNumTeams();
  const drafted  = state.players.filter(p => p.isDrafted);

  if (drafted.length === 0) {
    if (subtitle) subtitle.textContent = '';
    container.innerHTML = `
      <div class="lv-empty-state">
        <div class="lv-empty-icon">🏟</div>
        <p>No picks yet — rosters will fill in as players are drafted.</p>
      </div>`;
    return;
  }

  if (subtitle) subtitle.textContent = `${numTeams} teams · ${drafted.length} picks`;

  const allHaveRoster = drafted.every(p => p.rosterId);
  const note = (!allHaveRoster && state.connection.platform !== 'sleeper')
    ? `<div class="lv-note">⚠ Team assignments estimated via snake-draft math. Connect via Sleeper for exact team data.</div>`
    : '';

  // Group players by roster slot
  const teamRosters = {};
  for (let t = 1; t <= numTeams; t++) teamRosters[t] = [];
  drafted.forEach(p => {
    const slot = p.rosterId || inferTeamSlot(p.draftPick, numTeams);
    if (!slot) return;
    if (!teamRosters[slot]) teamRosters[slot] = [];
    teamRosters[slot].push(p);
  });

  // Sort within each team: by pick number (preserve draft order for slot assignment)
  Object.values(teamRosters).forEach(players =>
    players.sort((a, b) => (a.draftPick || 0) - (b.draftPick || 0))
  );

  const rosterSlots = state.league.rosterSlots;
  const hasSlots    = Object.keys(rosterSlots).length > 0;

  // Compute bye week conflict colors for my team (weeks with 2+ players)
  const byeColorMap = {};
  if (state.league.myRosterId) {
    const BYE_CONFLICT_COLORS = ['#d946ef','#06b6d4','#84cc16','#fb7185','#f97316','#818cf8','#eab308','#10b981'];
    const myPlayers = teamRosters[state.league.myRosterId] || [];
    const weekCounts = {};
    myPlayers.forEach(p => { const k = p.byeWeek ?? 'null'; weekCounts[k] = (weekCounts[k] || 0) + 1; });
    let colorIdx = 0;
    Object.entries(weekCounts)
      .filter(([, count]) => count >= 2)
      .sort(([a], [b]) => (a === 'null' ? 1 : b === 'null' ? -1 : Number(a) - Number(b)))
      .forEach(([week]) => { byeColorMap[week] = BYE_CONFLICT_COLORS[colorIdx++ % BYE_CONFLICT_COLORS.length]; });
  }

  const cards = [];
  for (let t = 1; t <= numTeams; t++) {
    const isMe     = state.league.myRosterId === t;
    const teamName = state.league.teamNames[t] || `Team ${t}`;
    cards.push(buildTeamCard(t, teamRosters[t] || [], rosterSlots, hasSlots, teamName, isMe, isMe ? byeColorMap : {}));
  }

  container.innerHTML = `${note}<div class="league-grid">${cards.join('')}</div>`;
}

function buildTeamCard(teamSlot, players, rosterSlots, hasSlots, teamName, isMyTeam, byeColorMap = {}) {
  const slots = assignPlayersToSlots(players, rosterSlots);

  // Remaining needs — compare slot requirements vs what's filled
  const posCounts  = {};
  players.forEach(p => { posCounts[p.position] = (posCounts[p.position] || 0) + 1; });

  const remaining = [];
  if (hasSlots) {
    ['QB','RB','WR','TE','K','DST'].forEach(pos => {
      const need = (rosterSlots[pos] || 0) - (posCounts[pos] || 0);
      if (need > 0) remaining.push({ pos, count: need });
    });
    const flexNeed = rosterSlots.FLEX || 0;
    if (flexNeed > 0) {
      const surplus = ['RB','WR','TE'].reduce((s, pos) =>
        s + Math.max(0, (posCounts[pos] || 0) - (rosterSlots[pos] || 0)), 0);
      if (surplus < flexNeed) remaining.push({ pos: 'FLX', count: flexNeed - surplus });
    }
  }

  // Picks remaining
  const picksLeft = state.league.rounds > 0 ? state.league.rounds - players.length : null;

  // Build roster rows
  const rosterRows = slots.map(slot => {
    if (slot.player) {
      const p          = slot.player;
      const isTrueFlex = slot.isFlex && slot.slotId !== 'BN';
      const color      = isTrueFlex ? '#ffffff' : (POS_COLORS[p.position] || '#6b7280');
      const labelStyle = isTrueFlex ? 'background:#ffffff;color:#1f2937' : `background:${color}`;
      const inj        = p.injuryStatus ? buildInjuryBadge(p.injuryStatus) : '';
      const byeKey     = p.byeWeek ?? 'null';
      const byeConflictColor = byeColorMap[byeKey] || null;
      const rowStyle   = byeConflictColor ? ` style="background:${byeConflictColor}18;border-left:2px solid ${byeConflictColor}99;"` : '';
      const byeChip    = `<span class="lv-slot-bye${byeConflictColor ? ' lv-slot-bye--conflict' : ''}"${byeConflictColor ? ` style="color:${byeConflictColor};border-color:${byeConflictColor}55;"` : ''}>BYE ${p.byeWeek ?? 'TBD'}</span>`;
      return `<div class="lv-slot lv-slot--filled"${rowStyle}>
        <span class="lv-slot-label" style="${labelStyle}">${slot.label}</span>
        <span class="lv-slot-name">${esc(p.name)}${inj}</span>
        <span class="lv-slot-nfl">${esc(p.team)}</span>
        ${byeChip}
      </div>`;
    } else {
      const isTrueFlex  = slot.isFlex && slot.slotId !== 'BN';
      const emptyStyle  = isTrueFlex
        ? 'background:rgba(255,255,255,0.08);color:#ffffff;border:1px solid rgba(255,255,255,0.25)'
        : `background:${slot.posColor}22;color:${slot.posColor};border:1px solid ${slot.posColor}44`;
      return `<div class="lv-slot lv-slot--empty">
        <span class="lv-slot-label lv-slot-label--empty" style="${emptyStyle}">${slot.label}</span>
        <span class="lv-slot-placeholder">—</span>
      </div>`;
    }
  }).join('');

  const needsBadges = remaining.map(({ pos, count }) => {
    const color = POS_COLORS[pos] || '#6b7280';
    return `<span class="lv-need-badge" style="border-color:${color}55;color:${color}">${count} ${pos}</span>`;
  }).join('');

  const myBadge  = isMyTeam ? '<span class="lv-my-badge">👑 My Team</span>' : '';
  const markBtn  = !isMyTeam
    ? `<button class="lv-mark-btn" onclick="markMyTeam(${teamSlot})" title="Mark as my team">Mark as Mine</button>`
    : '';
  const picksInfo = picksLeft !== null
    ? `<span class="lv-picks-left">${picksLeft} picks left</span>`
    : `<span class="lv-picks-left">${players.length} picks</span>`;

  const byeConflictEntries = Object.entries(byeColorMap).sort(([a], [b]) => Number(a) - Number(b));
  const byeConflictSummary = byeConflictEntries.length
    ? `<div class="lv-bye-conflicts">
        <span class="lv-bye-conflicts-label">Bye conflicts:</span>
        ${byeConflictEntries.map(([week, color]) => {
          const count = week === 'null' ? players.filter(p => !p.byeWeek).length : players.filter(p => p.byeWeek == week).length;
          const label = week === 'null' ? 'TBD' : `Wk ${week}`;
          return `<span class="lv-bye-conflict-chip" style="color:${color};border-color:${color}55;background:${color}18;">${label} · ${count} players</span>`;
        }).join('')}
      </div>`
    : '';

  return `<div class="lv-team-card${isMyTeam ? ' lv-my-team' : ''}">
    <div class="lv-card-header">
      <div class="lv-card-title">
        ${myBadge}
        <span class="lv-card-name" title="${esc(teamName)}">${esc(teamName)}</span>
      </div>
      <div class="lv-card-right">
        ${picksInfo}
        ${markBtn}
      </div>
    </div>
    <div class="lv-roster">${rosterRows || '<div class="lv-no-picks">No picks yet</div>'}</div>
    ${needsBadges ? `<div class="lv-needs-row">
      <span class="lv-needs-label">Needs:</span>${needsBadges}
    </div>` : ''}
    ${byeConflictSummary}
  </div>`;
}

/** Fetch Sleeper league users + rosters → populate team names and identify user's team */
async function fetchSleeperLeagueInfo(leagueId, username) {
  const [users, rosters] = await Promise.all([
    apiFetch(`${SLEEPER_BASE}/league/${leagueId}/users`),
    apiFetch(`${SLEEPER_BASE}/league/${leagueId}/rosters`),
  ]);
  if (!users || !rosters) return;

  // Build user_id → display name map
  const userMap = {};
  users.forEach(u => {
    userMap[u.user_id] = u.metadata?.team_name || u.display_name || `User ${u.user_id}`;
  });

  // Map username → user_id for "my team" detection
  let myUserId = null;
  if (username) {
    const me = users.find(u =>
      u.username?.toLowerCase() === username.toLowerCase() ||
      u.display_name?.toLowerCase() === username.toLowerCase()
    );
    if (me) myUserId = me.user_id;
  }

  // Assign team names and detect my roster
  rosters.forEach(r => {
    const ownerName = userMap[r.owner_id] || '';
    state.league.teamNames[r.roster_id] = r.metadata?.team_name || ownerName || `Team ${r.roster_id}`;
    if (myUserId && r.owner_id === myUserId) state.league.myRosterId = r.roster_id;
  });

  if (state.leagueViewActive) renderLeagueView();
  if (myUserId && state.league.myRosterId) {
    showToast(`Found your team: ${state.league.teamNames[state.league.myRosterId]}`, 'success');
  }
}

/** Fetch Sleeper draft participants for mock/standalone drafts (no league_id) */
async function fetchSleeperDraftUsers(draftId, draftOrder, username) {
  const users = await apiFetch(`${SLEEPER_BASE}/draft/${draftId}/users`);
  if (!Array.isArray(users) || !users.length) return;
  users.forEach(u => {
    const slot = draftOrder?.[u.user_id];
    if (!slot) return;
    state.league.teamNames[slot] = u.metadata?.team_name || u.display_name || `Team ${slot}`;
    if (username && (u.username?.toLowerCase() === username.toLowerCase() ||
        u.display_name?.toLowerCase() === username.toLowerCase())) {
      state.league.myRosterId = slot;
    }
  });
  if (state.leagueViewActive) renderLeagueView();
  if (username && state.league.myRosterId)
    showToast(`Found your team: ${state.league.teamNames[state.league.myRosterId]}`, 'success');
}

/** Manual "mark as my team" — lets users on non-Sleeper platforms identify their roster */
function markMyTeam(rosterId) {
  state.league.myRosterId = state.league.myRosterId === rosterId ? null : rosterId;
  if (state.leagueViewActive) renderLeagueView();
}

/* ============================================================
   SECTION 20 — TAG FILTER OPTIONS (built once)
   ============================================================ */

function buildTagFilterOptions() {
  const container = document.getElementById('tagFilterOptions');
  container.innerHTML = Object.entries(TAGS_CONFIG).map(([name, cfg]) => `
    <label class="tag-filter-option">
      <input type="checkbox" value="${name}">
      <span class="tag-filter-dot" style="background:${cfg.color}"></span>
      <span class="tag-filter-label">${cfg.icon} ${name}</span>
    </label>
  `).join('');

  container.addEventListener('change', (e) => {
    const cb   = e.target;
    const tag  = cb.value;
    if (cb.checked) {
      if (!state.tagFilter.includes(tag)) state.tagFilter.push(tag);
    } else {
      state.tagFilter = state.tagFilter.filter(t => t !== tag);
    }
    updateTagFilterCount();
    renderPlayers();
    renderStats();
  });
}

function updateTagFilterCount() {
  const count   = state.tagFilter.length;
  const countEl = document.getElementById('tagFilterCount');
  const btn     = document.getElementById('tagsDropdownBtn');
  countEl.textContent = count;
  countEl.classList.toggle('visible', count > 0);
  btn.classList.toggle('has-active', count > 0);
}

/* ============================================================
   SECTION 20b — INJURY BADGE HELPER
   ============================================================ */

function buildInjuryBadge(status) {
  if (!status) return '';
  const key  = status.toUpperCase().replace('-', '');
  const meta = INJURY_META[key] || { label: status, color: '#6b7280', title: status };
  return ` <span class="injury-badge" style="color:${meta.color};border-color:${meta.color}40" title="${meta.title}">${meta.label}</span>`;
}

/* ============================================================
   SECTION 20c — DAILY PLAYER REFRESH
   Pulls the latest NFL player list from Sleeper once per day.
   - First load with no cache → full loading overlay
   - Stale cache → silent background refresh, shows indicator
   - Fresh cache → merge team/injury changes only (instant)
   ============================================================ */

async function checkAndRefreshPlayers() {
  let cached    = null;
  let cacheAge  = Infinity;

  try {
    const raw = localStorage.getItem(PLAYER_CACHE_KEY);
    if (raw) {
      cached   = JSON.parse(raw);
      cacheAge = Date.now() - (cached.timestamp || 0);
    }
  } catch(e) { /* corrupt cache — ignore */ }

  const isFirstLoad = state.players.length === 0;
  const isFresh     = cacheAge < CACHE_TTL_MS;

  if (isFresh && cached?.players?.length) {
    // ── Fresh cache: apply metadata updates silently ──────────
    if (isFirstLoad) {
      buildPlayersFromSleeperList(cached.players);
    } else {
      applyPlayerMetadata(cached.players);
    }
    reapplyAdpRanks();
    updateDataFreshness(new Date(cached.timestamp));
    renderAll();
    return;
  }

  // ── Need a network fetch ──────────────────────────────────
  if (isFirstLoad) {
    showLoadingOverlay('Fetching latest player data from Sleeper…');
  } else {
    updateDataFreshness(cached ? new Date(cached.timestamp) : null, true);
  }

  try {
    const [players, adpMap] = await Promise.all([
      fetchSleeperPlayerList(),
      fetchSleeperAdp(),
    ]);
    localStorage.setItem(PLAYER_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), players }));

    if (isFirstLoad || state.players.length === 0) {
      buildPlayersFromSleeperList(players);
    } else {
      applyPlayerMetadata(players);
      addNewSleeperPlayers(players);
      reapplySleeperRanks();
    }
    applyAdpData(adpMap);
    reapplyAdpRanks();

    updateDataFreshness(new Date());
    hideLoadingOverlay();
    saveState();
    renderAll();
    if (!isFirstLoad) showToast('Player data refreshed from Sleeper', 'success');

  } catch(err) {
    console.warn('Sleeper player refresh failed:', err);
    hideLoadingOverlay();
    if (state.players.length === 0) {
      state.players = initDefaultPlayers();
      updateDataFreshness(null);
      renderAll();
    }
    updateDataFreshness(cached ? new Date(cached.timestamp) : null);
    showToast('Could not reach Sleeper — using cached player list', 'error');
  }
}

async function fetchSleeperPlayerList() {
  const raw = await apiFetch('https://api.sleeper.app/v1/players/nfl');
  return parseSleeperPlayerResponse(raw);
}

async function fetchSleeperAdp() {
  // Use current year during preseason (Jun+), prior year during offseason
  const now    = new Date();
  const season = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  try {
    const data = await apiFetch(
      `https://api.sleeper.app/projections/nfl/${season}/1?season_type=regular` +
      `&position[]=QB&position[]=RB&position[]=WR&position[]=TE&position[]=K&position[]=DEF`
    );
    const map = {};
    const entries = Array.isArray(data) ? data : Object.values(data);
    entries.forEach(entry => {
      const pid = entry?.player_id;
      const adp = entry?.stats?.adp_dd_ppr;
      if (pid && adp != null) map[pid] = adp;
    });
    return map;
  } catch(e) {
    console.warn('Sleeper ADP fetch failed:', e);
    return {};
  }
}

function applyAdpData(adpMap) {
  state.players.forEach(p => {
    if (p.sleeperId && adpMap[p.sleeperId] != null) {
      p.adp = adpMap[p.sleeperId];
    }
  });
}

/**
 * Re-sort players by ADP, preserving manually locked positions.
 * Players without ADP data sort to the end.
 */
function reapplyAdpRanks() {
  state.players.forEach(p => { p.rankLocked = false; });
  state.players.sort((a, b) => (a.adp ?? 9999) - (b.adp ?? 9999));
  state.players.forEach((p, i) => { p.rank = i + 1; });
}

function parseSleeperPlayerResponse(raw) {
  const SKILL = new Set(['QB', 'RB', 'WR', 'TE', 'K']);
  const all   = Object.values(raw);

  // Skill position players — ranked by Sleeper's search_rank
  const skillPlayers = all
    .filter(p =>
      p.active !== false &&
      SKILL.has(p.position) &&
      p.search_rank != null && p.search_rank > 0 &&
      (p.full_name || (p.first_name && p.last_name))
    )
    .sort((a, b) => (a.search_rank || 9999) - (b.search_rank || 9999))
    .map(p => ({
      sleeperId:    p.player_id,
      name:         (p.full_name || `${p.first_name} ${p.last_name}`).trim(),
      team:         p.team || 'FA',
      position:     p.position,
      injuryStatus: p.injury_status || null,
      byeWeek:      p.bye_week || null,
    }));

  // DST — include all 32 active team defenses regardless of search_rank
  const seenDst = new Set();
  const dstPlayers = all
    .filter(p => p.position === 'DEF' && p.team && !seenDst.has(p.team) && seenDst.add(p.team))
    .sort((a, b) => (a.search_rank || 9999) - (b.search_rank || 9999))
    .map(p => ({
      sleeperId:    p.player_id,
      name:         p.full_name || (TEAM_NAMES[p.team]
                      ? TEAM_NAMES[p.team].replace(/\b\w/g, c => c.toUpperCase())
                      : p.team + ' Defense'),
      team:         p.team,
      position:     'DST',
      injuryStatus: null,
      byeWeek:      p.bye_week || null,
    }));

  return [...skillPlayers, ...dstPlayers].map((p, i) => ({
    ...p,
    sleeperRank: i + 1,
  }));
}

/** Build full player list from Sleeper data (first load / no saved state) */
function buildPlayersFromSleeperList(sleeperPlayers) {
  state.players = sleeperPlayers.map((sp, i) => ({
    id:           i + 1,
    name:         sp.name,
    team:         sp.team,
    position:     sp.position,
    rank:         i + 1,
    sleeperRank:  sp.sleeperRank,
    rankLocked:   false,
    tags:         [],
    isDrafted:    false,
    draftPick:    null,
    draftedBy:    null,
    injuryStatus: sp.injuryStatus,
    byeWeek:      sp.byeWeek,
    sleeperId:    sp.sleeperId,
    adp:          null,
  }));
  state.nextId = state.players.length + 1;
  saveState();
}

/** Update team + injury info on existing players without touching ranks/tags */
function applyPlayerMetadata(sleeperPlayers) {
  state.players.forEach(player => {
    const sp = matchSleeperRecord(player, sleeperPlayers);
    if (!sp) return;
    player.team         = sp.team;
    player.injuryStatus = sp.injuryStatus;
    player.byeWeek      = sp.byeWeek;
    player.sleeperRank  = sp.sleeperRank;
    if (!player.sleeperId) player.sleeperId = sp.sleeperId;
  });
}

/**
 * Re-sort players using Sleeper's search_rank, but preserve manually locked positions.
 * Locked players sort by their pinned rank; unlocked players sort by sleeperRank.
 * All ranks are then reassigned sequentially 1..N.
 */
function reapplySleeperRanks() {
  state.players.sort((a, b) => {
    const ra = a.rankLocked ? a.rank : (a.sleeperRank || 9999);
    const rb = b.rankLocked ? b.rank : (b.sleeperRank || 9999);
    return ra - rb;
  });
  state.players.forEach((p, i) => { p.rank = i + 1; });
}

/** Add Sleeper players that don't exist in our board yet (trades, rookies, etc.) */
function addNewSleeperPlayers(sleeperPlayers) {
  let maxRank = Math.max(0, ...state.players.map(p => p.rank));
  let added   = 0;

  for (const sp of sleeperPlayers) {
    if (added >= 30) break;
    const exists = state.players.some(p =>
      p.name.toLowerCase() === sp.name.toLowerCase() && p.position === sp.position
    );
    if (!exists) {
      state.players.push({
        id:           state.nextId++,
        name:         sp.name,
        team:         sp.team,
        position:     sp.position,
        rank:         ++maxRank,
        sleeperRank:  sp.sleeperRank,
        rankLocked:   false,
        tags:         [],
        isDrafted:    false,
        draftPick:    null,
        draftedBy:    null,
        injuryStatus: sp.injuryStatus,
        sleeperId:    sp.sleeperId,
        adp:          null,
      });
      added++;
    }
  }
}

function matchSleeperRecord(player, sleeperPlayers) {
  // Prefer ID match (most accurate across name changes)
  if (player.sleeperId) {
    const byId = sleeperPlayers.find(sp => sp.sleeperId === player.sleeperId);
    if (byId) return byId;
  }
  // Fall back to name + position
  const nameLow = player.name.toLowerCase();
  return sleeperPlayers.find(sp =>
    sp.name.toLowerCase() === nameLow && sp.position === player.position
  ) || null;
}

/* ── Loading overlay helpers ─────────────────────────────── */

function showLoadingOverlay(msg) {
  const el = document.getElementById('loadingOverlay');
  if (el) {
    document.getElementById('loadingMsg').textContent = msg || 'Loading…';
    el.style.display = 'flex';
  }
}

function hideLoadingOverlay() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.style.display = 'none';
}

/* ── Data freshness indicator ────────────────────────────── */

function updateDataFreshness(date, isRefreshing = false) {
  const el = document.getElementById('dataFreshness');
  if (!el) return;

  if (isRefreshing) {
    el.innerHTML = '<span class="freshness refreshing">↻ Refreshing…</span>';
    return;
  }
  if (!date) {
    el.innerHTML = '<span class="freshness stale">● No player data synced</span>';
    return;
  }

  const ageMs  = Date.now() - date.getTime();
  const ageMin = Math.floor(ageMs / 60000);
  const ageStr = ageMin < 1    ? 'just now'
               : ageMin < 60   ? `${ageMin}m ago`
               : ageMin < 1440 ? `${Math.floor(ageMin / 60)}h ago`
               :                 `${Math.floor(ageMin / 1440)}d ago`;
  const stale = ageMs >= CACHE_TTL_MS;
  el.innerHTML = `<span class="freshness ${stale ? 'stale' : 'fresh'}" title="Click to force refresh">📡 Players synced ${ageStr}</span>`;
}

/* ============================================================
   SECTION 21 — TWICE-DAILY REFRESH SCHEDULER
   Fires at 8 AM and 8 PM local time
   ============================================================ */

function scheduleNextRefresh() {
  const now          = new Date();
  const refreshHours = [8, 20]; // 8 AM and 8 PM

  let nextRefresh = null;
  for (const hour of refreshHours) {
    const candidate = new Date(now);
    candidate.setHours(hour, 0, 0, 0);
    if (candidate > now) { nextRefresh = candidate; break; }
  }

  if (!nextRefresh) {
    // Both have passed today — schedule for 8 AM tomorrow
    nextRefresh = new Date(now);
    nextRefresh.setDate(nextRefresh.getDate() + 1);
    nextRefresh.setHours(8, 0, 0, 0);
  }

  const msUntilNext = nextRefresh - now;
  setTimeout(async () => {
    try { localStorage.removeItem(PLAYER_CACHE_KEY); } catch(e) {}
    await checkAndRefreshPlayers();
    scheduleNextRefresh();
  }, msUntilNext);

  const hStr = nextRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  console.log(`%cNext Sleeper player sync scheduled for ${hStr}`, 'color:#8b949e');
}

/* ============================================================
   SECTION 22 — INIT
   ============================================================ */

async function init() {
  loadState();
  initEventListeners();

  // Render immediately with whatever we have
  renderAll();

  // Refresh player data from Sleeper (12h cache)
  await checkAndRefreshPlayers();

  // Schedule twice-daily auto-refresh at 8 AM and 8 PM
  scheduleNextRefresh();

  console.log('%cFantasy Draft Assistant loaded', 'color:#2563eb;font-weight:bold;font-size:14px');
  console.log(`%c${state.players.length} players ready`, 'color:#8b949e');
}

document.addEventListener('DOMContentLoaded', init);
