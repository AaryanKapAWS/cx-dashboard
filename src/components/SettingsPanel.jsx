import { useState, useEffect } from 'react'
import ExportHistory from './ExportHistory'

export default function SettingsPanel() {
  // ── Asana connection ──
  const [asanaToken, setAsanaToken] = useState(() => localStorage.getItem('asana_token') || '')
  const [asanaEmail, setAsanaEmail] = useState(() => localStorage.getItem('asana_email') || '')

  // ── Project defaults ──
  const [defaultLocation, setDefaultLocation] = useState(() => localStorage.getItem('cor_location') || '')
  const [defaultFbnId, setDefaultFbnId] = useState(() => localStorage.getItem('cor_fbnId') || '')
  const [defaultRegion, setDefaultRegion] = useState(() => localStorage.getItem('cor_region') || 'EMEA')

  // ── Save feedback ──
  const [saved, setSaved] = useState(false)

  // ── Sub-section toggle ──
  const [showExportHistory, setShowExportHistory] = useState(false)

  function handleDisconnect() {
    localStorage.removeItem('asana_token')
    localStorage.removeItem('asana_email')
    setAsanaToken('')
    setAsanaEmail('')
  }

  function handleSaveDefaults() {
    localStorage.setItem('cor_location', defaultLocation)
    localStorage.setItem('cor_fbnId', defaultFbnId)
    localStorage.setItem('cor_region', defaultRegion)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const cardStyle = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '20px 24px',
    marginBottom: 16,
  }

  const labelStyle = {
    display: 'block',
    fontSize: 10,
    fontWeight: 600,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }

  const inputStyle = {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 12,
    width: '100%',
    maxWidth: 280,
    color: '#0f172a',
  }

  return (
    <div style={{ padding: '24px', maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 20px' }}>⚙️ Settings</h2>

      {/* ═══ ASANA CONNECTION ═══ */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>Asana Connection</h3>
          {asanaToken ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
              background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              Connected{asanaEmail ? ` as ${asanaEmail}` : ''}
            </span>
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
              background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
              Not Connected
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
          {asanaToken
            ? 'Your Asana account is connected. You can create projects directly from the Scope & Export tab.'
            : 'Connect Asana from the Scope & Export tab to push commissioning tasks directly to your workspace.'}
        </p>
        {asanaToken && (
          <button onClick={handleDisconnect} style={{
            padding: '7px 14px', fontSize: 11, fontWeight: 600,
            background: '#fff', color: '#dc2626', border: '1px solid #fecaca',
            borderRadius: 6, cursor: 'pointer',
          }}>
            Disconnect Asana
          </button>
        )}
      </div>

      {/* ═══ PROJECT DEFAULTS ═══ */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>Project Defaults</h3>
        <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 16px' }}>
          These values pre-fill the project config bar on the Scope & Export tab.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>Default Location</label>
            <input
              value={defaultLocation}
              onChange={(e) => setDefaultLocation(e.target.value)}
              placeholder="e.g. DUB069"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>FBN Build ID</label>
            <input
              value={defaultFbnId}
              onChange={(e) => setDefaultFbnId(e.target.value)}
              placeholder="e.g. DUB069HV4T.001"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>Region</label>
            <select
              value={defaultRegion}
              onChange={(e) => setDefaultRegion(e.target.value)}
              style={{ ...inputStyle, width: 140 }}
            >
              <option value="EMEA">EMEA</option>
              <option value="APAC">APAC</option>
              <option value="AMER">AMER</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleSaveDefaults} style={{
            padding: '8px 18px', fontSize: 12, fontWeight: 600,
            background: '#0f172a', color: '#fff', border: 'none',
            borderRadius: 6, cursor: 'pointer',
          }}>
            Save Defaults
          </button>
          {saved && (
            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ Saved</span>
          )}
        </div>
      </div>

      {/* ═══ EXPORT HISTORY (sub-section) ═══ */}
      <div style={cardStyle}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setShowExportHistory(!showExportHistory)}
        >
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>Export History</h3>
          <span style={{ fontSize: 12, color: '#64748b', transform: showExportHistory ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </div>
        {showExportHistory && (
          <div style={{ marginTop: 16 }}>
            <ExportHistory />
          </div>
        )}
      </div>

      {/* ═══ ABOUT ═══ */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>About</h3>
        <table style={{ fontSize: 12, color: '#334155', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 16px 4px 0', fontWeight: 600, color: '#64748b' }}>Version</td>
              <td style={{ padding: '4px 0' }}>v1.0</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 16px 4px 0', fontWeight: 600, color: '#64748b' }}>Tool</td>
              <td style={{ padding: '4px 0' }}>HV Substation Commissioning Dashboard</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 16px 4px 0', fontWeight: 600, color: '#64748b' }}>Author</td>
              <td style={{ padding: '4px 0' }}>Commissioning Engineering Team</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 16px 4px 0', fontWeight: 600, color: '#64748b' }}>GitHub</td>
              <td style={{ padding: '4px 0' }}>
                <a
                  href="https://github.com/amazon/hvss-cx-dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2563eb', textDecoration: 'none' }}
                >
                  github.com/amazon/hvss-cx-dashboard
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
