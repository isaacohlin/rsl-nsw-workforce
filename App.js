import React, { useState } from 'react';
import RoleTile from './RoleTile';

const THEME_COLORS = {
  'th-elt': '#003863',
  'th-state': '#2d5016',
  'th-pmo': '#1a3352',
  'th-cos': '#1a3352',
  'th-connect': '#1d4ed8',
  'th-comm': '#9d174d',
  'th-adv': '#92400e',
  'th-enable': '#374151',
  '': '#005587',
};

function AddRoleForm({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [type, setType] = useState('new');

  return (
    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 5, padding: 7, marginTop: 4 }}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Role name" onKeyDown={e => e.key === 'Enter' && onSave(name, level, type)}
        style={{ width: '100%', fontSize: 9, fontFamily: 'Poppins', border: '1px solid #e5e7eb', borderRadius: 3, padding: '3px 5px', marginBottom: 3 }} />
      <input value={level} onChange={e => setLevel(e.target.value)} placeholder="Level (e.g. L3)"
        style={{ width: '100%', fontSize: 9, fontFamily: 'Poppins', border: '1px solid #e5e7eb', borderRadius: 3, padding: '3px 5px', marginBottom: 3 }} />
      <select value={type} onChange={e => setType(e.target.value)}
        style={{ width: '100%', fontSize: 9, fontFamily: 'Poppins', border: '1px solid #e5e7eb', borderRadius: 3, padding: '3px 5px', marginBottom: 5 }}>
        <option value="new">New / Proposed</option>
        <option value="existing">Existing</option>
        <option value="vacant">Vacant</option>
        <option value="outsourced">Outsourced</option>
      </select>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => onSave(name, level, type)} style={{ flex: 1, background: '#003863', color: 'white', border: 'none', borderRadius: 3, padding: '3px 0', fontSize: 9, cursor: 'pointer', fontFamily: 'Poppins' }}>Save</button>
        <button onClick={onCancel} style={{ flex: 1, background: 'white', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 3, padding: '3px 0', fontSize: 9, cursor: 'pointer', fontFamily: 'Poppins' }}>Cancel</button>
      </div>
    </div>
  );
}

export default function TeamColumn({ team, optId, teamState, roleEdits, customRoles, filter, getRoleById, isRedundantFn,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  onEdit, onCycleType, onToggleNotes, onSaveNotes, onMarkRedundant, onUnmarkRedundant, onReset, onAddRole }) {

  const [showAddForm, setShowAddForm] = useState(false);
  const [showSubAddForm, setShowSubAddForm] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [subDragOver, setSubDragOver] = useState({});

  const bgColor = THEME_COLORS[team.theme] || '#005587';
  const ids = teamState[team.id] || [];
  const roles = ids.map(id => getRoleById(id)).filter(Boolean);

  function handleAddSave(name, level, type) {
    if (!name.trim()) return;
    onAddRole(team.id, name.trim(), level.trim() || 'L3', type);
    setShowAddForm(false);
  }

  function handleSubAddSave(sgId, name, level, type) {
    if (!name.trim()) return;
    onAddRole(sgId, name.trim(), level.trim() || 'L3', type);
    setShowSubAddForm(null);
  }

  const tileProps = (role) => ({
    role, edits: roleEdits[role.id], isRedundant: isRedundantFn(role.id),
    onEdit, onCycleType, onToggleNotes, onSaveNotes, onMarkRedundant, onUnmarkRedundant, onReset,
    onDragStart, onDragEnd, filter,
  });

  // CoS special rendering
  if (team.isCOS) {
    return (
      <div style={{ minWidth: 165, maxWidth: 200, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#0d1f33', border: '1.5px dashed rgba(246,190,0,.55)', borderRadius: 7, overflow: 'hidden', flex: 1 }}>
          <div style={{ padding: '4px 8px', fontFamily: 'Oswald', fontSize: 7.5, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(246,190,0,.65)', textAlign: 'center', borderBottom: '1px solid rgba(246,190,0,.2)' }}>
            Office of Chief of Staff
          </div>
          <div style={{ background: '#1a3352', padding: '5px 9px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'Oswald', fontSize: 9.5, fontWeight: 600, letterSpacing: .5, textTransform: 'uppercase', color: 'white' }}>{team.label}</span>
            <button onClick={() => setShowAddForm(!showAddForm)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', borderRadius: 3, padding: '1px 5px', fontSize: 9, cursor: 'pointer' }}>+</button>
          </div>
          <div
            style={{ padding: 5, minHeight: 48, background: 'rgba(255,255,255,.04)', transition: 'background .13s', ...(dragOver ? { background: 'rgba(147,197,253,.15)' } : {}) }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { setDragOver(false); onDrop(e, team.id); }}
          >
            {roles.map(r => <RoleTile key={r.id} teamId={team.id} {...tileProps(r)} />)}
            {showAddForm && <AddRoleForm onSave={handleAddSave} onCancel={() => setShowAddForm(false)} />}
          </div>
        </div>
      </div>
    );
  }

  // Wrap layout (Option A removed)
  if (team.isWrap) {
    return (
      <div style={{ width: '100%', marginTop: 10 }}>
        <div style={{ background: bgColor, borderRadius: '5px 5px 0 0', padding: '5px 9px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Oswald', fontSize: 9.5, fontWeight: 600, letterSpacing: .5, textTransform: 'uppercase', color: 'white' }}>
            {team.label} ({ids.length} roles — drag into active teams above to include)
          </span>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', borderRadius: 3, padding: '1px 5px', fontSize: 9, cursor: 'pointer' }}>+</button>
        </div>
        <div
          style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 5px 5px', padding: 6, display: 'flex', flexWrap: 'wrap', gap: 5, minHeight: 48, transition: 'background .13s', ...(dragOver ? { background: '#dbeafe', borderColor: '#93c5fd' } : {}) }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { setDragOver(false); onDrop(e, team.id); }}
        >
          {roles.map(r => (
            <div key={r.id} style={{ minWidth: 150, maxWidth: 185, flexShrink: 0 }}>
              <RoleTile teamId={team.id} {...tileProps(r)} />
            </div>
          ))}
          {showAddForm && <AddRoleForm onSave={handleAddSave} onCancel={() => setShowAddForm(false)} />}
        </div>
      </div>
    );
  }

  // Standard column
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: team.subGroups ? 195 : 165, maxWidth: team.subGroups ? 235 : 200 }}>
      <div style={{ background: bgColor, borderRadius: '5px 5px 0 0', padding: '5px 9px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontFamily: 'Oswald', fontSize: 9.5, fontWeight: 600, letterSpacing: .5, textTransform: 'uppercase', color: 'white' }}>{team.label}</span>
        <button onClick={() => setShowAddForm(!showAddForm)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', borderRadius: 3, padding: '1px 5px', fontSize: 9, cursor: 'pointer' }}>+</button>
      </div>
      <div
        style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 5px 5px', padding: 4, flex: 1, transition: 'background .13s', ...(dragOver ? { background: '#dbeafe', borderColor: '#93c5fd' } : {}) }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { setDragOver(false); onDrop(e, team.id); }}
      >
        {roles.map(r => <RoleTile key={r.id} teamId={team.id} {...tileProps(r)} />)}

        {/* Sub-groups */}
        {team.subGroups && team.subGroups.map(sg => {
          const sgIds = teamState[sg.id] || [];
          const sgRoles = sgIds.map(id => getRoleById(id)).filter(Boolean);
          return (
            <div key={sg.id} style={{ marginTop: 5, border: '1px solid #e5e7eb', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ background: '#e8eef4', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'Oswald', fontSize: 8.5, letterSpacing: .5, textTransform: 'uppercase', color: '#003863' }}>{sg.label}</span>
                <button onClick={() => setShowSubAddForm(showSubAddForm === sg.id ? null : sg.id)} style={{ background: 'rgba(0,56,99,.12)', border: 'none', color: '#003863', borderRadius: 3, padding: '1px 4px', fontSize: 8.5, cursor: 'pointer' }}>+</button>
              </div>
              <div
                style={{ padding: 3, minHeight: 30, background: '#f8fafc', transition: 'background .13s', ...(subDragOver[sg.id] ? { background: '#dbeafe' } : {}) }}
                onDragOver={(e) => { e.preventDefault(); setSubDragOver(p => ({ ...p, [sg.id]: true })); }}
                onDragLeave={() => setSubDragOver(p => ({ ...p, [sg.id]: false }))}
                onDrop={(e) => { setSubDragOver(p => ({ ...p, [sg.id]: false })); onDrop(e, sg.id); }}
              >
                {sgRoles.map(r => <RoleTile key={r.id} teamId={sg.id} {...tileProps(r)} />)}
                {showSubAddForm === sg.id && <AddRoleForm onSave={(n, l, t) => handleSubAddSave(sg.id, n, l, t)} onCancel={() => setShowSubAddForm(null)} />}
              </div>
            </div>
          );
        })}

        {showAddForm && <AddRoleForm onSave={handleAddSave} onCancel={() => setShowAddForm(false)} />}
      </div>
    </div>
  );
}
