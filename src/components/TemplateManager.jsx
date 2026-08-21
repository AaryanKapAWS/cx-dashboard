import { useState, useRef } from 'react'
import { getCustomTemplates, saveCustomTemplate, deleteCustomTemplate } from '../utils/customTemplates'

const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5']

const styles = {
  container: { padding: 0 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  createBtn: {
    padding: '8px 16px', fontSize: 12, fontWeight: 600, background: '#232F3E', color: '#FF9900',
    border: '1px solid #FF9900', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
  },
  card: {
    background: '#1a2332', border: '1px solid #2d3748', borderRadius: 8, padding: '12px 16px',
    marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  },
  cardName: { fontSize: 13, fontWeight: 600, color: '#e2e8f0' },
  cardMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  actionBtn: {
    padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 4, cursor: 'pointer', marginLeft: 6
  },
  emptyState: {
    textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: 13
  },
  // Modal styles
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,20,25,0.7)', backdropFilter: 'blur(3px)',
    zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  modal: {
    background: '#0f1419', border: '1px solid #2d3748', borderRadius: 12,
    width: '90vw', maxWidth: 700, maxHeight: '85vh', overflow: 'hidden',
    display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
  },
  modalHeader: {
    padding: '16px 24px', borderBottom: '1px solid #2d3748', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center'
  },
  modalTitle: { fontSize: 15, fontWeight: 700, color: '#e2e8f0' },
  modalBody: { padding: '20px 24px', overflowY: 'auto', flex: 1 },
  modalFooter: {
    padding: '14px 24px', borderTop: '1px solid #2d3748', display: 'flex',
    justifyContent: 'flex-end', gap: 10
  },
  input: {
    width: '100%', padding: '10px 14px', fontSize: 13, background: '#1a2332',
    border: '1px solid #2d3748', borderRadius: 6, color: '#e2e8f0', outline: 'none'
  },
  label: { fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' },
  testRow: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8
  },
  select: {
    padding: '8px 10px', fontSize: 12, background: '#1a2332', border: '1px solid #2d3748',
    borderRadius: 6, color: '#e2e8f0', outline: 'none', minWidth: 60
  },
  testInput: {
    flex: 1, padding: '8px 12px', fontSize: 12, background: '#1a2332',
    border: '1px solid #2d3748', borderRadius: 6, color: '#e2e8f0', outline: 'none'
  },
  deleteRowBtn: {
    padding: '6px 10px', fontSize: 11, background: '#7f1d1d', color: '#fecaca',
    border: 'none', borderRadius: 4, cursor: 'pointer'
  },
  addTestBtn: {
    padding: '6px 14px', fontSize: 11, fontWeight: 600, background: '#1a2332',
    border: '1px dashed #60a5fa', borderRadius: 6, color: '#60a5fa', cursor: 'pointer', marginTop: 4
  },
  saveBtn: {
    padding: '8px 20px', fontSize: 12, fontWeight: 600, background: '#FF9900',
    color: '#0f1419', border: 'none', borderRadius: 6, cursor: 'pointer'
  },
  cancelBtn: {
    padding: '8px 20px', fontSize: 12, fontWeight: 500, background: '#2d3748',
    color: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer'
  },
  ioBtn: {
    padding: '6px 12px', fontSize: 11, fontWeight: 500, background: '#1a2332',
    border: '1px solid #2d3748', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', marginLeft: 6
  }
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState(() => getCustomTemplates())
  const [editModal, setEditModal] = useState(null) // null or { id?, label, tests }
  const [deleteConfirm, setDeleteConfirm] = useState(null) // id to delete
  const importRef = useRef(null)

  function refresh() {
    setTemplates(getCustomTemplates())
  }

  function openCreate() {
    setEditModal({
      id: null,
      label: '',
      tests: [['L3', '']]
    })
  }

  function openEdit(tmpl) {
    setEditModal({
      id: tmpl.id,
      label: tmpl.label,
      tests: tmpl.tests.map(t => [...t])
    })
  }

  function handleSave() {
    if (!editModal) return
    const label = editModal.label.trim()
    if (!label) { alert('Equipment name is required'); return }
    const tests = editModal.tests.filter(t => t[1].trim() !== '')
    if (tests.length === 0) { alert('At least one test is required'); return }

    const template = {
      id: editModal.id || ('custom_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      label,
      tests: tests.map(t => [t[0], t[1].trim()]),
      createdAt: editModal.id ? (templates.find(t => t.id === editModal.id)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    }
    saveCustomTemplate(template)
    refresh()
    setEditModal(null)
  }

  function handleDelete(id) {
    deleteCustomTemplate(id)
    refresh()
    setDeleteConfirm(null)
  }

  function handleExport() {
    const data = JSON.stringify(templates, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'custom_equipment_templates.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result)
        if (!Array.isArray(imported)) { alert('Invalid file format'); return }
        let count = 0
        for (const tmpl of imported) {
          if (tmpl.label && Array.isArray(tmpl.tests)) {
            const t = {
              id: tmpl.id || ('custom_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
              label: tmpl.label,
              tests: tmpl.tests,
              createdAt: tmpl.createdAt || new Date().toISOString()
            }
            saveCustomTemplate(t)
            count++
          }
        }
        refresh()
        alert(`Imported ${count} template(s) successfully!`)
      } catch {
        alert('Failed to parse JSON file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function updateTest(idx, field, value) {
    if (!editModal) return
    const tests = editModal.tests.map((t, i) => {
      if (i !== idx) return t
      const row = [...t]
      if (field === 'level') row[0] = value
      if (field === 'name') row[1] = value
      return row
    })
    setEditModal({ ...editModal, tests })
  }

  function addTestRow() {
    if (!editModal) return
    setEditModal({ ...editModal, tests: [...editModal.tests, ['L3', '']] })
  }

  function removeTestRow(idx) {
    if (!editModal) return
    setEditModal({ ...editModal, tests: editModal.tests.filter((_, i) => i !== idx) })
  }

  return (
    <div style={styles.container}>
      {/* Header with actions */}
      <div style={styles.header}>
        <button style={styles.createBtn} onClick={openCreate}>
          ➕ Create New Equipment
        </button>
        <div>
          <button style={styles.ioBtn} onClick={handleExport} title="Export all custom templates as JSON">
            📤 Export
          </button>
          <button style={styles.ioBtn} onClick={() => importRef.current?.click()} title="Import templates from JSON">
            📥 Import
          </button>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </div>

      {/* Template list */}
      {templates.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📦</div>
          <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>No Custom Equipment Yet</div>
          <div>Create your own equipment types with custom test lists.<br/>They'll appear in the Bay Builder palette for use across all projects.</div>
        </div>
      ) : (
        templates.map(tmpl => (
          <div key={tmpl.id} style={styles.card}>
            <div>
              <div style={styles.cardName}>{tmpl.label}</div>
              <div style={styles.cardMeta}>
                {tmpl.tests.length} test{tmpl.tests.length !== 1 ? 's' : ''} · Created {new Date(tmpl.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div>
              <button style={{ ...styles.actionBtn, background: '#1e3a5f', color: '#60a5fa' }} onClick={() => openEdit(tmpl)}>
                ✏️ Edit
              </button>
              <button style={{ ...styles.actionBtn, background: '#7f1d1d', color: '#fecaca' }} onClick={() => setDeleteConfirm(tmpl.id)}>
                🗑️ Delete
              </button>
            </div>
          </div>
        ))
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div style={styles.overlay} onClick={() => setDeleteConfirm(null)}>
          <div style={{ ...styles.modal, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>Delete Template?</span>
            </div>
            <div style={styles.modalBody}>
              <p style={{ fontSize: 13, color: '#e2e8f0', margin: 0 }}>
                This will permanently remove "{templates.find(t => t.id === deleteConfirm)?.label}" and its tests.
                Equipment already placed in bays will keep their data.
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={{ ...styles.saveBtn, background: '#dc2626' }} onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {editModal && (
        <div style={styles.overlay} onClick={() => setEditModal(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>{editModal.id ? 'Edit Equipment' : 'Create Custom Equipment'}</span>
              <button onClick={() => setEditModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={styles.modalBody}>
              {/* Name */}
              <div style={{ marginBottom: 20 }}>
                <label style={styles.label}>Equipment Name</label>
                <input
                  style={styles.input}
                  value={editModal.label}
                  onChange={e => setEditModal({ ...editModal, label: e.target.value })}
                  placeholder="e.g. Fire Suppression Panel"
                  autoFocus
                />
              </div>

              {/* Tests table */}
              <div>
                <label style={styles.label}>Tests ({editModal.tests.length})</label>
                <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
                  {editModal.tests.map((test, idx) => (
                    <div key={idx} style={styles.testRow}>
                      <select
                        style={styles.select}
                        value={test[0]}
                        onChange={e => updateTest(idx, 'level', e.target.value)}
                      >
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <input
                        style={styles.testInput}
                        value={test[1]}
                        onChange={e => updateTest(idx, 'name', e.target.value)}
                        placeholder="Test name..."
                      />
                      <button style={styles.deleteRowBtn} onClick={() => removeTestRow(idx)}>✕</button>
                    </div>
                  ))}
                </div>
                <button style={styles.addTestBtn} onClick={addTestRow}>+ Add Test</button>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => setEditModal(null)}>Cancel</button>
              <button style={styles.saveBtn} onClick={handleSave}>
                {editModal.id ? 'Save Changes' : 'Create Equipment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
