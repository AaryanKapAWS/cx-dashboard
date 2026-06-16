import { useState, useEffect } from 'react'
import TopBar from './components/TopBar'
import Pipeline from './components/Pipeline'
import StatsRow from './components/StatsRow'
import Charts from './components/Charts'
import Timeline from './components/Timeline'
import EquipmentTable from './components/EquipmentTable'
import TestDetail from './components/TestDetail'
import UploadPanel from './components/UploadPanel'
import projects from './data/projects.json'

const equipmentModules = import.meta.glob('./data/equipment_*.json', { eager: true })

function getBaseEquipment(project) {
  const key = `./data/${project.equipmentFile}`
  return equipmentModules[key]?.default ?? []
}

const DEFAULT_PROJECT = projects.find(p => p.id === 'dub069hv-t4')

export default function App() {
  const [selectedProject, setSelectedProject] = useState(DEFAULT_PROJECT)
  const [equipment, setEquipment] = useState(() => getBaseEquipment(DEFAULT_PROJECT))
  const [selectedRow, setSelectedRow] = useState(null)
  const [toast, setToast] = useState(null) // { message }

  useEffect(() => {
    setEquipment(getBaseEquipment(selectedProject))
    setSelectedRow(null)
  }, [selectedProject])

  function handleAdd(newItems, filename) {
    setEquipment(prev => {
      const merged = [...prev, ...newItems]
      return merged.filter(item => item.name !== 'Equipment data not yet extracted')
    })
    setToast({ message: `Added ${newItems.length} item${newItems.length !== 1 ? 's' : ''} from ${filename}` })
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <TopBar projects={projects} selectedProject={selectedProject} onProjectChange={setSelectedProject} />
      <Pipeline />
      <UploadPanel onAdd={handleAdd} />
      <StatsRow equipment={equipment} />
      <Charts equipment={equipment} />
      <Timeline equipment={equipment} />
      <EquipmentTable equipment={equipment} selectedIndex={selectedRow} onSelect={setSelectedRow} />
      {selectedRow !== null && <TestDetail equipment={equipment[selectedRow]} />}
      <div style={{ height: 40 }} />

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 32,
          background: '#1e293b', color: '#fff',
          padding: '12px 20px', borderRadius: 8,
          fontSize: 13, fontWeight: 500,
          borderLeft: '4px solid var(--green)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.2s ease',
        }}>
          <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
          ✓ {toast.message}
        </div>
      )}
    </div>
  )
}
