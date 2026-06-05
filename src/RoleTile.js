import React, { useState, useRef } from 'react';

const TYPE_CYCLE = ['existing', 'new', 'vacant', 'outsourced', 'qld'];
const TYPE_LABELS = { existing: 'ROLE', new: 'NEW', vacant: 'VAC', outsourced: 'OUT', qld: 'QLD' };
const TYPE_COLORS = {
  existing: { bg: '#f3f4f6', color: '#6b7280' },
  new: { bg: '#F6BE00', color: '#003863' },
  vacant: { bg: '#ede9fe', color: '#7c3aed' },
  outsourced: { bg: '#dcfce7', color: '#166534' },
  qld: { bg: '#fce7f3', color: '#9d174d' },
};

export default function RoleTile({ role, teamId, edits, isRedundant, onEdit, onCycleType, onToggleNotes, onSaveNotes, onMarkRedundant, onUnmarkRedundant, onReset, onDragStart, onDragEnd, filter }) {
  const [dragging, setDragging] = useState(false);
  const nameRef = useRef(null);
  const levelRef = useRef(null);

  const effectiveType = edits?.type ?? role.type;
  const isNew = effectiveType === 'new';
  const isVac = effectiveType === 'vacant';
  const isOut = effectiveType === 'outsourced';
  const isQLD = effectiveType === 'qld';
  const name = edits?.name ?? role.name;
  const level = edits?.level ?? role.level;
  const notes = edits?.notes ?? '';
  const notesOpen = edits?.notesOpen ?? false;
  const hasNotes = !!notes;
  const nameEdited = edits?.name !== undefined && edits.name !== role.name;
  const levelEdited = edits?.level !== undefined && edits.level !== role.level;
  const typeEdited = edits?.type !== undefined && edits.type !== role.type;
  const isEdited = nameEdited || levelEdited || typeEdited;
  const inPool = teamId === 'unassigned' || teamId === 'redundancy';

  // Filter hiding
  if (filter === 'vac' && !isVac) return null;
  if (filter === 'new' && !isNew) return null;
  if (filter === 'out' && !isOut) return null;
  if (filter === 'qld' && !isQLD) return null;

  const tileStyle = {
    display: 'flex', flexDirection: 'column',
    padding: '5px 7px', marginBottom: '3px',
    borderRadius: '5px', border: '1px solid #dde3ea',
    background: 'white', fontSize: '9.5px', color: '#374151',
    cursor: dragging ? 'grabbing' : 'grab',
    opacity: dragging ? 0.25 : 1,
    transition: 'box-shadow 0.13s, opacity 0.13s',
    position: 'relative',
    borderLeft: isEdited ? '3px solid #f0b323' : undefined,
    borderBottom: hasNotes ? '2px solid #93c5fd' : undefined,
    ...(isRedundant ? { borderColor: '#fca5a5', background: '#fff5f5' } :
       isNew ? { borderColor: '#f0b323', background: '#fffbeb' } :
       isVac ? { borderColor: '#c4b5fd', background: '#f5f3ff' } :
       isOut ? { borderColor: '#86efac', background: '#f0fdf4', borderStyle: 'dashed' } :
       isQLD ? { borderColor: '#f9a8d4', background: '#fdf2f8', borderStyle: 'dashed' } : {}),
  };

  const dotColor = isRedundant ? '#dc2626' : isNew ? '#f0b323' : isVac ? '#7c3aed' : isOut ? '#15803d' : isQLD ? '#db2777' : '#9ca3af';
  const typeInfo = TYPE_COLORS[effectiveType] || TYPE_COLORS.existing;

  function handleDragStart(e) {
    setDragging(true);
    onDragStart(e, role.id, teamId);
  }
  function handleDragEnd(e) {
    setDragging(false);
    onDragEnd(e);
  }

  function handleNameBlur() {
    const val = (nameRef.current?.textContent || '').trim();
    onEdit(role.id, 'name', val || role.name);
  }
  function handleLevelBlur() {
    const val = (levelRef.current?.textContent || '').trim();
    onEdit(role.id, 'level', val || role.level);
  }
  function handleKey(e, blurFn) {
    if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
    if (e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur(); }
  }

  return (
    <div style={tileStyle} draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 3 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Editable name */}
          <div
            ref={nameRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleNameBlur}
            onKeyDown={(e) => handleKey(e)}
            onClick={(e) => e.stopPropagation()}
            onDragStart={(e) => e.stopPropagation()}
            style={{
              fontSize: '9.5px', color: '#1f2937', lineHeight: 1.25,
              cursor: 'text', borderBottom: '1px dashed transparent',
              wordBreak: 'break-word', outline: 'none',
            }}
            onFocus={(e) => e.currentTarget.style.borderBottom = '1px solid #005587'}
            onBlurCapture={(e) => { e.currentTarget.style.borderBottom = '1px dashed transparent'; handleNameBlur(); }}
          >
            {name}
          </div>
          {/* Level + badges row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1, flexWrap: 'wrap' }}>
            <span
              ref={levelRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={handleLevelBlur}
              onKeyDown={(e) => handleKey(e)}
              onClick={(e) => e.stopPropagation()}
              onDragStart={(e) => e.stopPropagation()}
              style={{ fontSize: '7.5px', color: '#9ca3af', cursor: 'text', borderBottom: '1px dashed transparent', outline: 'none' }}
              onFocus={(e) => e.currentTarget.style.borderBottom = '1px solid #005587'}
              onBlurCapture={(e) => { e.currentTarget.style.borderBottom = '1px dashed transparent'; handleLevelBlur(); }}
            >
              {level}
            </span>
            {/* Clickable type badge */}
            <span
              onClick={(e) => { e.stopPropagation(); onCycleType(role.id); }}
              title="Click to change type"
              style={{
                fontSize: '6px', fontWeight: 700, padding: '1px 3px', borderRadius: 2,
                background: typeInfo.bg, color: typeInfo.color,
                cursor: 'pointer', userSelect: 'none',
              }}
            >
              {TYPE_LABELS[effectiveType] || 'ROLE'}
            </span>
            {isRedundant && <span style={{ fontSize: '6px', fontWeight: 700, padding: '1px 3px', borderRadius: 2, background: '#fee2e2', color: '#991b1b' }}>REDUNDANT</span>}
            {isEdited && <span style={{ fontSize: '6px', fontWeight: 700, padding: '1px 3px', borderRadius: 2, background: '#fef3c7', color: '#92400e' }}>EDITED</span>}
          </div>
        </div>
      </div>

      {/* Actions (not shown in pools) */}
      {!inPool && (
        <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleNotes(role.id); }}
            style={{ fontSize: '7.5px', color: notesOpen ? '#3b82f6' : '#9ca3af', background: notesOpen ? '#eff6ff' : 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', borderRadius: 3, fontFamily: 'Poppins' }}
          >
            📝{hasNotes ? ' ●' : ''}
          </button>
          {isRedundant
            ? <button onClick={(e) => { e.stopPropagation(); onUnmarkRedundant(role.id); }} style={{ fontSize: '7.5px', color: '#15803d', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', borderRadius: 3, fontFamily: 'Poppins' }}>↺ Unmark</button>
            : <button onClick={(e) => { e.stopPropagation(); onMarkRedundant(role.id); }} style={{ fontSize: '7.5px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', borderRadius: 3, fontFamily: 'Poppins' }}>🗑 Redundant</button>
          }
          {isEdited && <button onClick={(e) => { e.stopPropagation(); onReset(role.id); }} style={{ fontSize: '7.5px', color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', borderRadius: 3, fontFamily: 'Poppins' }}>↺ Reset</button>}
        </div>
      )}

      {/* Notes */}
      {!inPool && notesOpen && (
        <div style={{ marginTop: 5, paddingTop: 5, borderTop: '1px solid #e5e7eb' }}>
          <textarea
            defaultValue={notes}
            placeholder="Notes / flag for discussion..."
            onChange={(e) => onSaveNotes(role.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onDragStart={(e) => e.stopPropagation()}
            style={{ width: '100%', fontSize: '8.5px', fontFamily: 'Poppins', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 3, padding: '3px 5px', resize: 'vertical', minHeight: 40, lineHeight: 1.4, background: '#f9fafb', outline: 'none' }}
          />
        </div>
      )}
    </div>
  );
}
