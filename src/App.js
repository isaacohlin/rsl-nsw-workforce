import React, { useState, useCallback, useEffect } from 'react';
import { MASTER_ROLES, GAPS, BASE_OPTIONS } from './data';
import { useCloudState } from './useCloudState';
import TeamColumn from './TeamColumn';
import RoleTile from './RoleTile';

const TYPE_CYCLE = ['existing', 'new', 'vacant', 'outsourced'];

// ── USER IDENTITY PROMPT ──────────────────────────────────────
function IdentityPrompt({ onConfirm }) {
  const [name, setName] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#003863', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 12, width: 380, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,.4)' }}>
        <div style={{ background: '#003863', padding: '20px 24px', borderBottom: '4px solid #F6BE00' }}>
          <div style={{ fontFamily: 'Oswald', fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: 1 }}>
            RSL <span style={{ color: '#F6BE00' }}>NSW</span>
          </div>
          <div style={{ fontFamily: 'Oswald', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,.7)', marginTop: 4 }}>
            Workforce Structural Options
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ fontFamily: 'Oswald', fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', color: '#003863', marginBottom: 6 }}>Who are you?</div>
          <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>
            Your name will be recorded alongside any changes you make, so the team can see who moved what.
          </p>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onConfirm(name.trim())}
            placeholder="e.g. Isaac, Kim, Shay..."
            style={{ width: '100%', fontSize: 13, fontFamily: 'Poppins', border: '2px solid #e5e7eb', borderRadius: 6, padding: '9px 12px', color: '#1f2937', outline: 'none', marginBottom: 12 }}
            onFocus={e => e.target.style.borderColor = '#003863'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
          <button
            onClick={() => name.trim() && onConfirm(name.trim())}
            disabled={!name.trim()}
            style={{ width: '100%', padding: '10px 0', background: name.trim() ? '#F6BE00' : '#e5e7eb', color: name.trim() ? '#003863' : '#9ca3af', border: 'none', borderRadius: 6, fontFamily: 'Oswald', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', cursor: name.trim() ? 'pointer' : 'default', fontWeight: 700, transition: 'all .15s' }}
          >
            Enter Tool
          </button>
        </div>
      </div>
    </div>
  );
}

// Build initial team state from option definitions
function buildInitialTeamState() {
  const ts = {};
  BASE_OPTIONS.forEach(opt => {
    ts[opt.id] = {};
    opt.teams.forEach(t => {
      ts[opt.id][t.id] = [...t.roleIds];
      if (t.subGroups) t.subGroups.forEach(sg => { ts[opt.id][sg.id] = [...sg.roleIds]; });
    });
    ts[opt.id]['unassigned'] = [];
    ts[opt.id]['redundancy'] = [];
  });
  return ts;
}

const INITIAL_STATE = {
  teamState: buildInitialTeamState(),
  roleEdits: {},         // roleId → { name, level, type, notes, notesOpen }
  customRoles: {},       // roleId → role object
  customOptions: [],     // array of custom option objects
  activeOptionIdx: 2,    // start on Option C
  activeFilter: 'all',
};

function getRoleById(id, customRoles) {
  return customRoles[id] || MASTER_ROLES.find(r => r.id === id);
}

function allOptions(customOptions) {
  return [...BASE_OPTIONS, ...customOptions];
}

function buildExportText(optIdx, state, liveMetrics) {
  const opts = allOptions(state.customOptions);
  const opt = opts[optIdx];
  if (!opt) return '';
  const optId = opt.id;
  const st = state.teamState[optId] || {};
  let txt = `RSL NSW WORKFORCE STRUCTURAL OPTIONS\n${opt.label.toUpperCase()}\n${'═'.repeat(58)}\n`;
  txt += `Risk: ${opt.risk}  |  Active Roles: ${liveMetrics?.active ?? '—'}  |  New: ${liveMetrics?.newRoles ?? '—'}  |  Vacant: ${liveMetrics?.vacant ?? '—'}  |  Redundant: ${liveMetrics?.redundant ?? '—'}\n\n`;
  const allTeamIds = new Set();
  opt.teams.forEach(t => { allTeamIds.add(t.id); if (t.subGroups) t.subGroups.forEach(sg => allTeamIds.add(sg.id)); });
  allTeamIds.forEach(tid => {
    const ids = st[tid] || []; if (!ids.length) return;
    const t = opt.teams.find(x => x.id === tid) || (opt.teams.flatMap(x => x.subGroups || []).find(x => x && x.id === tid));
    const label = t ? t.label : tid;
    txt += `▸ ${label.toUpperCase()}\n`;
    ids.forEach(id => {
      const r = getRoleById(id, state.customRoles); if (!r) return;
      const e = state.roleEdits[id] || {};
      const name = e.name ?? r.name; const level = e.level ?? r.level; const type = e.type ?? r.type;
      const flags = [type === 'new' ? 'NEW' : null, type === 'vacant' ? 'VACANT' : null, type === 'outsourced' ? 'OUT' : null,
        (e.name !== undefined && e.name !== r.name) || (e.level !== undefined && e.level !== r.level) || (e.type !== undefined && e.type !== r.type) ? 'EDITED' : null,
        (st['redundancy'] || []).includes(id) ? 'REDUNDANT' : null].filter(Boolean);
      txt += `  • ${name}  [${level}]${flags.length ? ' (' + flags.join(', ') + ')' : ''}\n`;
      if (e.notes) txt += `    Notes: ${e.notes}\n`;
    });
    txt += '\n';
  });
  ['unassigned', 'redundancy'].forEach(pool => {
    const ids = st[pool] || []; if (!ids.length) return;
    txt += `▸ ${pool.toUpperCase()}\n`;
    ids.forEach(id => { const r = getRoleById(id, state.customRoles); if (!r) return; const e = state.roleEdits[id] || {}; txt += `  • ${e.name ?? r.name}  [${e.level ?? r.level}]\n`; });
    txt += '\n';
  });
  txt += `${'─'.repeat(58)}\nTRACK A\n`; opt.trackA.forEach(t => { txt += `  • ${t}\n`; });
  txt += `\nTRACK B\n`; opt.trackB.forEach(t => { txt += `  • ${t}\n`; });
  txt += `\nGenerated: ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' })} · RSL NSW Confidential`;
  return txt;
}

let customRoleCounter = 1000;
let customOptCounter = 10;

// ── POOL ZONE — separate component to avoid useState-in-map ──
function PoolZone({ pool, poolRoles, state, isRedundant, onDrop, onDragStart, onDragEnd, onEdit, onCycleType, onToggleNotes, onSaveNotes, onMarkRedundant, onUnmarkRedundant, onReset, filter }) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: pool.bg, borderRadius: '4px 4px 0 0', padding: '4px 8px', fontFamily: 'Oswald', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600, color: 'white' }}>{pool.label}</div>
      <div
        style={{ flex: 1, border: `1px dashed ${dragOver ? '#93c5fd' : '#d1d5db'}`, borderTop: 'none', borderRadius: '0 0 5px 5px', padding: 5, minHeight: 52, maxHeight: 120, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 4, alignContent: 'flex-start', background: dragOver ? (pool.isDanger ? '#fef2f2' : '#dbeafe') : pool.poolBg, transition: 'background .15s' }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { setDragOver(false); onDrop(e, pool.id); }}
      >
        {poolRoles.length === 0
          ? <span style={{ fontSize: 8.5, color: pool.hintColor, padding: 4 }}>{pool.hint}</span>
          : poolRoles.map(r => (
              <div key={r.id} style={{ minWidth: 140, maxWidth: 180 }}>
                <RoleTile role={r} teamId={pool.id} edits={state.roleEdits[r.id]} isRedundant={isRedundant(r.id)}
                  onDragStart={onDragStart} onDragEnd={onDragEnd}
                  onEdit={onEdit} onCycleType={onCycleType} onToggleNotes={onToggleNotes}
                  onSaveNotes={onSaveNotes} onMarkRedundant={onMarkRedundant}
                  onUnmarkRedundant={onUnmarkRedundant} onReset={onReset} filter={filter} />
              </div>
            ))
        }
      </div>
    </div>
  );
}

export default function App() {
  const [userName, setUserName] = useState(() => localStorage.getItem('rsl-workforce-user') || '');
  const { state, update, syncStatus, loaded, reload } = useCloudState(INITIAL_STATE, userName);
  const [showNewOptModal, setShowNewOptModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [newOptName, setNewOptName] = useState('');
  const [newOptDesc, setNewOptDesc] = useState('');
  const [newOptRisk, setNewOptRisk] = useState('MODERATE');
  const [newOptClone, setNewOptClone] = useState('');
  const [exportText, setExportText] = useState('');
  const [toast, setToast] = useState('');
  const [dragId, setDragId] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);

  const opts = allOptions(state.customOptions || []);
  const cur = state.activeOptionIdx ?? 2;
  const opt = opts[cur];
  const filter = state.activeFilter || 'all';

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200); }

  // Ensure team state is initialised for current option
  useEffect(() => {
    if (!loaded || !opt) return;
    const optId = opt.id;
    if (!state.teamState[optId]) {
      update(s => {
        const newTs = { ...s.teamState };
        newTs[optId] = {};
        opt.teams.forEach(t => {
          newTs[optId][t.id] = [...(t.roleIds || [])];
          if (t.subGroups) t.subGroups.forEach(sg => { newTs[optId][sg.id] = [...(sg.roleIds || [])]; });
        });
        newTs[optId]['unassigned'] = [];
        newTs[optId]['redundancy'] = [];
        return { ...s, teamState: newTs };
      });
    }
  }, [cur, loaded]);

  const getRole = useCallback((id) => getRoleById(id, state.customRoles || {}), [state.customRoles]);

  function isRedundant(id) {
    const optId = opt?.id;
    return !!(state.teamState[optId]?.['redundancy']?.includes(id));
  }

  // Drag handlers
  function onDragStart(e, roleId, teamId) {
    setDragId(roleId); setDragFrom(teamId);
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragEnd() { setDragId(null); setDragFrom(null); }

  function onDrop(e, toTeam) {
    e.preventDefault();
    if (!dragId || !dragFrom || dragFrom === toTeam) return;
    const optId = opt.id;
    update(s => {
      const newTs = { ...s.teamState };
      const optTs = { ...newTs[optId] };
      // Remove from all teams in this option
      Object.keys(optTs).forEach(tid => { optTs[tid] = (optTs[tid] || []).filter(id => id !== dragId); });
      if (!optTs[toTeam]) optTs[toTeam] = [];
      optTs[toTeam] = [...optTs[toTeam], dragId];
      newTs[optId] = optTs;
      return { ...s, teamState: newTs };
    });
    setDragId(null); setDragFrom(null);
  }

  // Role edits
  function onEdit(roleId, field, value) {
    update(s => ({
      ...s, roleEdits: { ...s.roleEdits, [roleId]: { ...(s.roleEdits[roleId] || {}), [field]: value } }
    }));
  }
  function onCycleType(roleId) {
    const r = getRole(roleId);
    const cur_type = (state.roleEdits[roleId]?.type) ?? r?.type ?? 'existing';
    const next = TYPE_CYCLE[(TYPE_CYCLE.indexOf(cur_type) + 1) % TYPE_CYCLE.length];
    onEdit(roleId, 'type', next);
  }
  function onToggleNotes(roleId) {
    const cur = state.roleEdits[roleId]?.notesOpen ?? false;
    onEdit(roleId, 'notesOpen', !cur);
  }
  function onSaveNotes(roleId, value) { onEdit(roleId, 'notes', value); }
  function onReset(roleId) {
    update(s => {
      const newEdits = { ...s.roleEdits };
      if (newEdits[roleId]) { delete newEdits[roleId].name; delete newEdits[roleId].level; delete newEdits[roleId].type; }
      return { ...s, roleEdits: newEdits };
    });
    showToast('Role reset');
  }

  function onMarkRedundant(roleId) {
    const optId = opt.id;
    update(s => {
      const newTs = { ...s.teamState }; const optTs = { ...newTs[optId] };
      Object.keys(optTs).forEach(tid => { optTs[tid] = (optTs[tid] || []).filter(id => id !== roleId); });
      optTs['redundancy'] = [...(optTs['redundancy'] || []), roleId];
      newTs[optId] = optTs;
      return { ...s, teamState: newTs };
    });
    showToast('Moved to Redundancy');
  }
  function onUnmarkRedundant(roleId) {
    const optId = opt.id;
    update(s => {
      const newTs = { ...s.teamState }; const optTs = { ...newTs[optId] };
      Object.keys(optTs).forEach(tid => { optTs[tid] = (optTs[tid] || []).filter(id => id !== roleId); });
      optTs['unassigned'] = [...(optTs['unassigned'] || []), roleId];
      newTs[optId] = optTs;
      return { ...s, teamState: newTs };
    });
    showToast('Moved to Unassigned');
  }

  function onAddRole(teamId, name, level, type) {
    const id = 'custom_' + (customRoleCounter++);
    const newRole = { id, name, level, type };
    const optId = opt.id;
    update(s => {
      const newCustom = { ...s.customRoles, [id]: newRole };
      const newTs = { ...s.teamState }; const optTs = { ...newTs[optId] };
      optTs[teamId] = [...(optTs[teamId] || []), id];
      newTs[optId] = optTs;
      return { ...s, customRoles: newCustom, teamState: newTs };
    });
    showToast('Role added');
  }

  // New option
  function createNewOption() {
    if (!newOptName.trim()) { showToast('Enter an option name'); return; }
    const riskCols = { HIGH: '#dc2626', MODERATE: '#d97706', LOWER: '#15803d' };
    const newId = customOptCounter++;
    let newTeams = [];
    if (newOptClone !== '') {
      const srcOpt = opts[parseInt(newOptClone)];
      newTeams = srcOpt.teams.map(t => ({
        ...t, id: `${t.id}_c${newId}`,
        roleIds: [...(t.roleIds || [])],
        subGroups: t.subGroups ? t.subGroups.map(sg => ({ ...sg, id: `${sg.id}_c${newId}`, roleIds: [...(sg.roleIds || [])] })) : undefined,
      }));
    } else {
      newTeams = [{ id: `team_${newId}`, label: 'Team 1', theme: '', roleIds: [] }];
    }
    const newOpt = {
      id: newId, label: newOptName.trim(), desc: newOptDesc.trim() || 'Custom structural option.',
      risk: newOptRisk, riskCol: riskCols[newOptRisk], isRec: false, isCustom: true,
      metrics: { active: '—', newRoles: '—', cost: '—' },
      trackA: newOptClone !== '' ? [...opts[parseInt(newOptClone)].trackA] : ['Define Track A actions'],
      trackB: newOptClone !== '' ? [...opts[parseInt(newOptClone)].trackB] : ['Define Track B investment'],
      teams: newTeams,
    };
    update(s => {
      const newCustomOpts = [...(s.customOptions || []), newOpt];
      const newTs = { ...s.teamState };
      newTs[newId] = {};
      newOpt.teams.forEach(t => {
        if (newOptClone !== '') {
          const srcOpt = opts[parseInt(newOptClone)];
          const srcT = srcOpt.teams.find((_, i) => newOpt.teams.indexOf(t) === i) || srcOpt.teams[0];
          newTs[newId][t.id] = [...(s.teamState[srcOpt.id]?.[srcT?.id] || t.roleIds || [])];
          if (t.subGroups) t.subGroups.forEach((sg, j) => {
            const srcSg = srcT?.subGroups?.[j];
            newTs[newId][sg.id] = [...(s.teamState[srcOpt.id]?.[srcSg?.id] || sg.roleIds || [])];
          });
        } else {
          newTs[newId][t.id] = [];
        }
      });
      newTs[newId]['unassigned'] = [];
      newTs[newId]['redundancy'] = [];
      const newIdx = BASE_OPTIONS.length + newCustomOpts.length - 1;
      return { ...s, customOptions: newCustomOpts, teamState: newTs, activeOptionIdx: newIdx };
    });
    setShowNewOptModal(false);
    setNewOptName(''); setNewOptDesc(''); setNewOptRisk('MODERATE'); setNewOptClone('');
    showToast(`"${newOptName.trim()}" created`);
  }

  function deleteCustomOption(idx, e) {
    e.stopPropagation();
    const optToDelete = opts[idx];
    if (!optToDelete.isCustom) return;
    update(s => {
      const newCustomOpts = (s.customOptions || []).filter(o => o.id !== optToDelete.id);
      const newIdx = Math.min(s.activeOptionIdx, BASE_OPTIONS.length + newCustomOpts.length - 1);
      return { ...s, customOptions: newCustomOpts, activeOptionIdx: newIdx };
    });
  }

  function openExport() {
    setExportText(buildExportText(cur, state, liveMetrics));
    setShowExportModal(true);
  }

  if (!userName) {
    return <IdentityPrompt onConfirm={name => { localStorage.setItem('rsl-workforce-user', name); setUserName(name); }} />;
  }

  if (!loaded) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#003863', color: 'white', fontFamily: 'Poppins', fontSize: 14 }}>
      Loading RSL NSW Workforce Options…
    </div>
  );

  const optId = opt?.id;
  const curTeamState = state.teamState[optId] || {};

  // ── LIVE METRICS ─────────────────────────────────────────────
  const liveMetrics = React.useMemo(() => {
    if (!opt) return { active: 0, newRoles: 0, vacant: 0, redundant: 0 };
    const redundancyIds = new Set(curTeamState['redundancy'] || []);
    const unassignedIds = new Set(curTeamState['unassigned'] || []);
    const allTeamIds = Object.keys(curTeamState).filter(k => k !== 'redundancy' && k !== 'unassigned');
    const activeIds = new Set();
    allTeamIds.forEach(tid => (curTeamState[tid] || []).forEach(id => activeIds.add(id)));
    let newCount = 0, vacantCount = 0;
    activeIds.forEach(id => {
      const effectiveType = (state.roleEdits[id]?.type) ?? (getRole(id)?.type ?? 'existing');
      if (effectiveType === 'new') newCount++;
      if (effectiveType === 'vacant') vacantCount++;
    });
    return {
      active: activeIds.size,
      newRoles: newCount,
      vacant: vacantCount,
      redundant: redundancyIds.size,
    };
  }, [curTeamState, state.roleEdits, opt]);

  const riskBadge = (risk) => {
    const s = { HIGH: { bg: '#fef2f2', c: '#dc2626' }, 'MOD-HIGH': { bg: '#fffbeb', c: '#d97706' }, MODERATE: { bg: '#fffbeb', c: '#d97706' }, LOWER: { bg: '#f0fdf4', c: '#15803d' } }[risk] || {};
    return <span style={{ display: 'inline-block', fontSize: 7, padding: '2px 4px', borderRadius: 3, marginLeft: 5, fontFamily: 'Poppins', fontWeight: 600, background: s.bg, color: s.c, verticalAlign: 'middle' }}>{risk}</span>;
  };

  return (
    <div style={{ fontFamily: 'Poppins', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* STICKY TOP BAR */}
      <div style={{ position: 'sticky', top: 0, zIndex: 200, boxShadow: '0 2px 10px rgba(0,0,0,.25)' }}>
        {/* Header */}
        <div style={{ background: '#003863', color: 'white', padding: '9px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #F6BE00' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'Oswald', fontSize: 21, fontWeight: 700, letterSpacing: 1 }}>RSL <span style={{ color: '#F6BE00' }}>NSW</span></span>
            <div style={{ width: 2, height: 22, background: 'rgba(255,255,255,.2)' }} />
            <span style={{ fontFamily: 'Oswald', fontSize: 11, fontWeight: 400, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,.78)' }}>Workforce Structural Options — Board & CEO Briefing</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {syncStatus === 'saving' && <span style={{ fontSize: 9, color: 'rgba(255,255,255,.5)' }}>⏳ Saving…</span>}
            {syncStatus === 'saved' && <span style={{ fontSize: 9, color: '#F6BE00' }}>✓ Saved</span>}
            {syncStatus === 'error' && <span style={{ fontSize: 9, color: '#fca5a5' }}>⚠ Save failed</span>}
            <button onClick={reload} title="Reload latest from database" style={{ fontSize: 9, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.7)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontFamily: 'Poppins' }}>↻ Refresh</button>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,.45)', borderLeft: '1px solid rgba(255,255,255,.15)', paddingLeft: 10 }}>
              Signed in as <strong style={{ color: 'rgba(255,255,255,.75)' }}>{userName}</strong>
              <button onClick={() => { localStorage.removeItem('rsl-workforce-user'); setUserName(''); }} style={{ marginLeft: 6, fontSize: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,.35)', cursor: 'pointer', fontFamily: 'Poppins' }}>change</button>
            </span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)' }}>Confidential · May 2026</span>
          </div>
        </div>
        {/* Vacancy banner */}
        <div style={{ background: '#4c1d95', color: 'white', padding: '4px 18px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 10 }}>
          <span style={{ background: 'rgba(255,255,255,.18)', borderRadius: 3, padding: '1px 7px', fontWeight: 600 }}>19 Vacancies</span>
          <span style={{ color: 'rgba(255,255,255,.55)' }}>7 covered by AH / secondment</span>
          <span style={{ marginLeft: 'auto', opacity: .4, fontSize: 9 }}>Gold=new · Purple=vacant · Dashed=outsourced · Red=redundancy</span>
        </div>
        {/* Tabs */}
        <div style={{ background: '#01426a', display: 'flex', padding: '0 18px', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          {opts.map((o, i) => (
            <div key={o.id} style={{ position: 'relative' }}>
              <button
                onClick={() => update(s => ({ ...s, activeOptionIdx: i }))}
                style={{
                  fontFamily: 'Oswald', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
                  padding: '9px 13px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  color: i === cur ? '#F6BE00' : 'rgba(255,255,255,.52)',
                  background: 'transparent',
                  borderBottom: i === cur ? '3px solid #F6BE00' : '3px solid transparent',
                  transition: 'all .15s',
                }}
              >
                {o.label}{riskBadge(o.risk)}
              </button>
              {o.isCustom && (
                <button onClick={(e) => deleteCustomOption(i, e)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(220,38,38,.7)', color: 'white', border: 'none', borderRadius: '50%', width: 13, height: 13, fontSize: 8, cursor: 'pointer', lineHeight: '13px', textAlign: 'center', padding: 0, display: 'none' }}
                  onMouseEnter={e => e.target.style.display = 'block'}
                >✕</button>
              )}
            </div>
          ))}
          <button
            onClick={() => setShowNewOptModal(true)}
            style={{ fontFamily: 'Oswald', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', padding: '9px 13px', border: 'none', cursor: 'pointer', color: 'rgba(246,190,0,.7)', background: 'transparent', borderBottom: '3px solid transparent', borderLeft: '1px solid rgba(255,255,255,.1)', marginLeft: 4, whiteSpace: 'nowrap' }}
          >＋ New Option</button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {/* SIDEBAR */}
        <div style={{ width: 230, flexShrink: 0, background: 'white', borderRight: '1px solid #e5e7eb', position: 'sticky', top: 114, maxHeight: 'calc(100vh - 114px)', overflowY: 'auto', alignSelf: 'flex-start' }}>
          <div style={{ padding: 14 }}>
            {/* Option card */}
            <div style={{ background: '#003863', color: 'white', borderRadius: 7, padding: 11, marginBottom: 10 }}>
              {opt?.isCustom ? (
                <>
                  <div contentEditable suppressContentEditableWarning onBlur={e => {
                    const val = e.currentTarget.textContent.trim();
                    update(s => ({ ...s, customOptions: s.customOptions.map(o => o.id === opt.id ? { ...o, label: val } : o) }));
                  }} style={{ fontFamily: 'Oswald', fontSize: 13, marginBottom: 4, outline: 'none', borderBottom: '1px dashed rgba(255,255,255,.3)' }}>{opt.label}</div>
                  <textarea defaultValue={opt.desc} onBlur={e => {
                    const val = e.target.value;
                    update(s => ({ ...s, customOptions: s.customOptions.map(o => o.id === opt.id ? { ...o, desc: val } : o) }));
                  }} style={{ width: '100%', fontSize: 9.5, color: 'rgba(255,255,255,.9)', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 3, padding: '2px 5px', fontFamily: 'Poppins', resize: 'vertical', marginTop: 3 }} />
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {['HIGH', 'MODERATE', 'LOWER'].map(r => {
                      const cols = { HIGH: '#dc2626', MODERATE: '#d97706', LOWER: '#15803d' };
                      return <button key={r} onClick={() => update(s => ({ ...s, customOptions: s.customOptions.map(o => o.id === opt.id ? { ...o, risk: r, riskCol: cols[r] } : o) }))}
                        style={{ fontSize: 8, padding: '2px 7px', borderRadius: 3, border: '1px solid rgba(255,255,255,.2)', background: opt.risk === r ? 'rgba(255,255,255,.2)' : 'transparent', color: 'white', cursor: 'pointer' }}>{r}</button>;
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontFamily: 'Oswald', fontSize: 13, marginBottom: 4 }}>{opt?.label}</div>
                  <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>{opt?.desc}</div>
                </>
              )}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 6, padding: '2px 7px', borderRadius: 4, fontSize: 8.5, fontWeight: 600, background: `${opt?.riskCol}22`, color: opt?.riskCol, border: `1px solid ${opt?.riskCol}44` }}>⚠ {opt?.risk} RISK</div>
            </div>

            {/* Metrics */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: 'Oswald', fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase', color: '#003863', marginBottom: 6, paddingBottom: 3, borderBottom: '2px solid #F6BE00' }}>Headcount</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {[['Active Roles', liveMetrics.active], ['New', liveMetrics.newRoles], ['Vacant', liveMetrics.vacant], ['Redundant', liveMetrics.redundant]].map(([label, val], i) => (
                  <div key={label} style={{ background: i === 3 ? '#fff5f5' : i === 2 ? '#f5f3ff' : i === 1 ? '#fffbeb' : '#f8fafc', border: `1px solid ${i === 3 ? '#fca5a5' : i === 2 ? '#ddd6fe' : i === 1 ? '#fde68a' : '#e5e7eb'}`, borderRadius: 5, padding: '6px 8px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Oswald', fontSize: 18, fontWeight: 600, color: i === 3 ? '#991b1b' : i === 2 ? '#7c3aed' : i === 1 ? '#92400e' : '#003863', lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: 8, color: '#6b7280', marginTop: 1, textTransform: 'uppercase', letterSpacing: .5 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: 'Oswald', fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase', color: '#003863', marginBottom: 6, paddingBottom: 3, borderBottom: '2px solid #F6BE00' }}>Filter</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[['all', '#9ca3af', 'All'], ['vac', '#7c3aed', 'Vacant'], ['new', '#f0b323', 'New'], ['out', '#15803d', 'Outsourced']].map(([f, color, label]) => (
                  <button key={f} onClick={() => update(s => ({ ...s, activeFilter: f }))}
                    style={{ fontSize: 9, padding: '3px 7px', borderRadius: 4, border: '1px solid', cursor: 'pointer', fontFamily: 'Poppins', display: 'flex', alignItems: 'center', gap: 3, transition: 'all .13s', borderColor: filter === f ? color : '#e5e7eb', background: filter === f ? color : 'white', color: filter === f ? (f === 'new' ? '#003863' : 'white') : '#6b7280' }}>
                    <div style={{ width: 6, height: 6, borderRadius: 2, background: filter === f ? (f === 'new' ? '#003863' : 'white') : color }} />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Export */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: 'Oswald', fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase', color: '#003863', marginBottom: 6, paddingBottom: 3, borderBottom: '2px solid #F6BE00' }}>Export</div>
              <button onClick={openExport} style={{ width: '100%', padding: 6, background: '#F6BE00', color: '#003863', border: 'none', borderRadius: 4, fontFamily: 'Oswald', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, marginBottom: 4 }}>⬇ Export Current Option</button>
              <button onClick={() => { navigator.clipboard.writeText(buildExportText(cur, state, liveMetrics)); showToast('Copied ✓'); }} style={{ width: '100%', padding: 5, background: 'white', color: '#003863', border: '1px solid #003863', borderRadius: 4, fontFamily: 'Oswald', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600 }}>⎘ Copy to Clipboard</button>
            </div>

            {/* Legend */}
            <div>
              <div style={{ fontFamily: 'Oswald', fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase', color: '#003863', marginBottom: 6, paddingBottom: 3, borderBottom: '2px solid #F6BE00' }}>Legend</div>
              {[
                ['#003863', 'CEO / ELT'],
                ['#005587', 'GM / Head'],
                ['#fef9e7', 'New / proposed', '#f0b323'],
                ['#f5f3ff', 'Vacant', '#c4b5fd'],
                ['#f0fdf4', 'Outsourced', '#86efac'],
                ['#fff5f5', 'Flagged redundant', '#fca5a5'],
                ['#1a3352', 'PMO / Office of CoS'],
              ].map(([bg, label, border]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, fontSize: 9, color: '#6b7280' }}>
                  <div style={{ width: 9, height: 9, borderRadius: 2, background: bg, border: border ? `1px solid ${border}` : undefined, flexShrink: 0 }} />
                  {label}
                </div>
              ))}
              <div style={{ fontSize: 8, color: '#9ca3af', marginTop: 6, lineHeight: 1.5 }}>
                ↕ Drag tiles between teams<br />
                ✎ Click name/level to edit<br />
                🔵 Click type badge to cycle<br />
                + Add roles via team header
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Rec banner + hint */}
          <div style={{ padding: '8px 18px 4px' }}>
            {opt?.isRec && (
              <div style={{ background: 'linear-gradient(135deg,#003863,#005587)', color: 'white', borderRadius: 7, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, borderLeft: '4px solid #F6BE00' }}>
                <span style={{ fontSize: 13 }}>★</span>
                <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,.9)' }}><strong style={{ color: '#F6BE00' }}>ELT Recommended Option</strong> — Streamlines structure, establishes formal PMO, introduces targeted Track B. Broadly cost-neutral.</span>
              </div>
            )}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 5, padding: '5px 10px', fontSize: 9, color: '#92400e' }}>
              ↕ <strong>Drag</strong> tiles between teams · ✎ <strong>Click name</strong> to rename · 🔵 <strong>Click type badge</strong> to cycle · <strong>+</strong> in team header to add a role · Changes <strong>auto-save</strong> · Click <strong>↻ Refresh</strong> to load teammates' latest changes
            </div>
          </div>

          {/* ORG CHART */}
          <div style={{ overflowX: 'auto', padding: '8px 18px 4px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Normal teams row */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                {opt?.teams.filter(t => !t.isWrap).map(team => (
                  <TeamColumn key={team.id} team={team} optId={optId} teamState={curTeamState} roleEdits={state.roleEdits} customRoles={state.customRoles || {}} filter={filter} getRoleById={getRole} isRedundantFn={isRedundant}
                    onDragStart={onDragStart} onDragEnd={onDragEnd} onDrop={onDrop}
                    onEdit={onEdit} onCycleType={onCycleType} onToggleNotes={onToggleNotes} onSaveNotes={onSaveNotes}
                    onMarkRedundant={onMarkRedundant} onUnmarkRedundant={onUnmarkRedundant} onReset={onReset} onAddRole={onAddRole}
                  />
                ))}
              </div>
              {/* Wrap teams (Option A removed) */}
              {opt?.teams.filter(t => t.isWrap).map(team => (
                <TeamColumn key={team.id} team={team} optId={optId} teamState={curTeamState} roleEdits={state.roleEdits} customRoles={state.customRoles || {}} filter={filter} getRoleById={getRole} isRedundantFn={isRedundant}
                  onDragStart={onDragStart} onDragEnd={onDragEnd} onDrop={onDrop}
                  onEdit={onEdit} onCycleType={onCycleType} onToggleNotes={onToggleNotes} onSaveNotes={onSaveNotes}
                  onMarkRedundant={onMarkRedundant} onUnmarkRedundant={onUnmarkRedundant} onReset={onReset} onAddRole={onAddRole}
                />
              ))}
            </div>
          </div>

          {/* POOLS */}
          <div style={{ background: '#f8fafc', borderTop: '1px solid #e5e7eb', padding: '8px 18px', display: 'flex', gap: 10 }}>
            {[{ id: 'unassigned', label: '📥 Unassigned / Holding', bg: '#374151', poolBg: 'white', hint: 'Drop roles here to park temporarily', hintColor: '#9ca3af', isDanger: false },
              { id: 'redundancy', label: '🗑 Redundancy', bg: '#991b1b', poolBg: '#fff5f5', hint: 'Drag roles here to flag for redundancy', hintColor: '#fca5a5', isDanger: true }].map(pool => {
              const poolIds = curTeamState[pool.id] || [];
              const poolRoles = poolIds.map(id => getRole(id)).filter(Boolean);
              return (
                <PoolZone key={pool.id} pool={pool} poolRoles={poolRoles} state={state} isRedundant={isRedundant}
                  onDrop={onDrop} onDragStart={onDragStart} onDragEnd={onDragEnd}
                  onEdit={onEdit} onCycleType={onCycleType} onToggleNotes={onToggleNotes}
                  onSaveNotes={onSaveNotes} onMarkRedundant={onMarkRedundant}
                  onUnmarkRedundant={onUnmarkRedundant} onReset={onReset} filter={filter} />
              );
            })}
          </div>

          {/* TRACK + GAP PANELS */}
          <div style={{ padding: '10px 18px 24px', background: 'white', borderTop: '1px solid #e5e7eb' }}>
            {/* Track A/B */}
            <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 12 }}>
              <div style={{ fontFamily: 'Oswald', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#003863', marginBottom: 10, paddingBottom: 5, borderBottom: '2px solid #F6BE00' }}>Track A / Track B</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[{ label: 'Track A — Within Existing Resources', items: opt?.trackA, bg: '#003863' },
                  { label: 'Track B — Strategic Investment', items: opt?.trackB, bg: '#F6BE00', textColor: '#003863' }].map(track => (
                  <div key={track.label}>
                    <div style={{ fontFamily: 'Oswald', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5, padding: '3px 7px', borderRadius: 3, background: track.bg, color: track.textColor || 'white' }}>{track.label}</div>
                    {(track.items || []).map((item, i) => (
                      <div key={i} style={{ fontSize: 9, color: '#374151', padding: '3px 6px', marginBottom: 2, borderRadius: 3, background: 'white', borderLeft: `2px solid ${track.bg === '#F6BE00' ? '#f0b323' : '#005587'}`, lineHeight: 1.4 }}>• {item}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Gap analysis */}
            <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
              <div style={{ fontFamily: 'Oswald', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#003863', marginBottom: 10, paddingBottom: 5, borderBottom: '2px solid #F6BE00' }}>Capability Gap Analysis — Strategic Plan Alignment</div>
              {GAPS.map((g, i) => {
                const addressed = g.addr[cur] ?? false;
                const color = g.rating === 'RED' ? '#dc2626' : g.rating === 'AMBER' ? '#d97706' : '#15803d';
                const label = g.rating === 'RED' ? 'Critical Gap' : g.rating === 'AMBER' ? 'Partial Gap' : 'Met';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'stretch', marginBottom: 5, borderRadius: 5, overflow: 'hidden', border: `1px solid ${addressed ? '#86efac' : '#e5e7eb'}`, background: addressed ? '#f0fdf4' : 'white' }}>
                    <div style={{ width: 4, background: color, flexShrink: 0 }} />
                    <div style={{ padding: '6px 9px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#111827' }}>{g.cap}</span>
                        <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 3, textTransform: 'uppercase', flexShrink: 0, background: color + '15', color }}>{label}</span>
                      </div>
                      <div style={{ fontSize: 9.5, color: '#6b7280', lineHeight: 1.45 }}>{g.desc}</div>
                      {addressed && <div style={{ fontSize: 9, color: '#15803d', fontWeight: 600, marginTop: 2 }}>✓ Addressed in this option</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* NEW OPTION MODAL */}
      {showNewOptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 10, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,.3)', overflow: 'hidden' }}>
            <div style={{ background: '#003863', color: 'white', padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Oswald', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' }}>Create New Option</span>
              <button onClick={() => setShowNewOptModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 18 }}>
              {[['Option Name', newOptName, setNewOptName, 'e.g. Option E: Hybrid Model', 'input'],
                ['Description', newOptDesc, setNewOptDesc, 'Brief description of this structural option...', 'textarea']].map(([label, val, setter, ph, type]) => (
                <div key={label} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
                  {type === 'input'
                    ? <input value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={{ width: '100%', fontSize: 10, fontFamily: 'Poppins', border: '1px solid #e5e7eb', borderRadius: 4, padding: '5px 8px', color: '#1f2937' }} />
                    : <textarea value={val} onChange={e => setter(e.target.value)} placeholder={ph} rows={2} style={{ width: '100%', fontSize: 10, fontFamily: 'Poppins', border: '1px solid #e5e7eb', borderRadius: 4, padding: '5px 8px', resize: 'vertical', color: '#1f2937' }} />
                  }
                </div>
              ))}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Strategic Risk</label>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[['HIGH', '#dc2626'], ['MODERATE', '#d97706'], ['LOWER', '#15803d']].map(([r, c]) => (
                    <button key={r} onClick={() => setNewOptRisk(r)} style={{ padding: '4px 10px', border: '1px solid', borderRadius: 4, fontSize: 9.5, cursor: 'pointer', fontFamily: 'Poppins', borderColor: newOptRisk === r ? c : '#e5e7eb', background: newOptRisk === r ? c + '20' : 'white', color: newOptRisk === r ? c : '#374151' }}>{r}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Start from</label>
                <select value={newOptClone} onChange={e => setNewOptClone(e.target.value)} style={{ width: '100%', fontSize: 10, fontFamily: 'Poppins', border: '1px solid #e5e7eb', borderRadius: 4, padding: '5px 8px' }}>
                  <option value="">Blank — start fresh</option>
                  {opts.map((o, i) => <option key={o.id} value={i}>Clone: {o.label}</option>)}
                </select>
                <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>Cloning copies all teams and roles as a starting point.</p>
              </div>
            </div>
            <div style={{ padding: '10px 18px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNewOptModal(false)} style={{ padding: '6px 14px', borderRadius: 4, fontFamily: 'Oswald', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, border: '1px solid #003863', background: 'white', color: '#003863' }}>Cancel</button>
              <button onClick={createNewOption} style={{ padding: '6px 14px', borderRadius: 4, fontFamily: 'Oswald', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, border: 'none', background: '#F6BE00', color: '#003863' }}>Create Option</button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 10, width: 'min(680px, 90vw)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
            <div style={{ background: '#003863', color: 'white', padding: '12px 16px', borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Oswald', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' }}>Export — {opt?.label}</span>
              <button onClick={() => setShowExportModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '14px 16px', overflowY: 'auto', flex: 1 }}>
              <pre style={{ fontFamily: 'Courier New, monospace', fontSize: 9.5, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 5, padding: 10 }}>{exportText}</pre>
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowExportModal(false)} style={{ padding: '6px 14px', borderRadius: 4, fontFamily: 'Oswald', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, border: '1px solid #003863', background: 'white', color: '#003863' }}>Close</button>
              <button onClick={() => { navigator.clipboard.writeText(exportText); showToast('Copied ✓'); }} style={{ padding: '6px 14px', borderRadius: 4, fontFamily: 'Oswald', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, border: 'none', background: '#F6BE00', color: '#003863' }}>⎘ Copy to Clipboard</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#1f2937', color: 'white', padding: '8px 14px', borderRadius: 5, fontSize: 10.5, fontWeight: 600, zIndex: 700 }}>{toast}</div>
      )}
    </div>
  );
}
