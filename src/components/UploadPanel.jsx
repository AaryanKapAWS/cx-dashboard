import { useState, useRef } from 'react'
import { parsePdf } from '../utils/pdfParser'

const IDLE = 'idle', PARSING = 'parsing', DONE = 'done', ERROR = 'error'

export default function UploadPanel({ onAdd }) {
  const [state, setState] = useState(IDLE)
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState(null) // { equipment, pageCount, filename }
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef()

  async function processFile(file) {
    if (!file || file.type !== 'application/pdf') {
      setErrorMsg('Please upload a PDF file.')
      setState(ERROR)
      return
    }
    setState(PARSING)
    setResult(null)
    try {
      const { equipment, pageCount } = await parsePdf(file)
      setResult({ equipment, pageCount, filename: file.name })
      setState(DONE)
    } catch (e) {
      setErrorMsg(`Failed to parse PDF: ${e.message}`)
      setState(ERROR)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    processFile(e.dataTransfer.files[0])
  }

  function onFileChange(e) {
    processFile(e.target.files[0])
    e.target.value = ''
  }

  function handleAdd() {
    onAdd(result.equipment, result.filename)
    setState(IDLE)
    setResult(null)
  }

  function reset() {
    setState(IDLE)
    setResult(null)
    setErrorMsg('')
  }

  const border = dragOver ? '2px dashed var(--orange)' : '2px dashed #cbd5e1'
  const bg = dragOver ? '#fff8ed' : '#f8fafc'

  return (
    <div style={{ margin: '16px 32px 0' }}>
      <div
        style={{
          border, background: bg, borderRadius: 10,
          padding: '28px 32px', textAlign: 'center',
          transition: 'all 0.15s', cursor: state === PARSING ? 'wait' : 'pointer',
        }}
        onClick={() => state !== PARSING && inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={onFileChange} />

        {state === IDLE && (
          <>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: 10 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>
              Drop SLD drawings here or click to browse
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Accepts PDF — text-based SLD schedules only
            </div>
          </>
        )}

        {state === PARSING && (
          <div style={{ color: 'var(--orange)', fontWeight: 600, fontSize: 14 }}>
            <div style={{ marginBottom: 8, fontSize: 22 }}>⏳</div>
            Parsing PDF…
          </div>
        )}

        {state === DONE && result && (
          <div onClick={e => e.stopPropagation()} style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{result.filename}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10 }}>
                  {result.pageCount} pages scanned
                </span>
              </div>
              <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}>✕</button>
            </div>

            {result.equipment.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>
                No equipment detected — this drawing may require manual review.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600, marginBottom: 10 }}>
                  ✓ Found {result.equipment.length} equipment item{result.equipment.length !== 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {result.equipment.map((e, i) => (
                    <span key={i} style={{
                      background: 'var(--blue-light)', color: 'var(--blue)',
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
                    }}>{e.type}</span>
                  ))}
                </div>
                <button
                  onClick={handleAdd}
                  style={{
                    background: 'var(--orange)', color: '#fff',
                    border: 'none', borderRadius: 6, padding: '8px 20px',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Add {result.equipment.length} items to project
                </button>
              </>
            )}
          </div>
        )}

        {state === ERROR && (
          <div onClick={e => e.stopPropagation()}>
            <div style={{ color: 'var(--red)', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              ⚠ {errorMsg}
            </div>
            <button onClick={reset} style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              padding: '6px 16px', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)',
            }}>Try again</button>
          </div>
        )}
      </div>
    </div>
  )
}
