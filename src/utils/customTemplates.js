// Custom Equipment Templates — localStorage utility
// Key: cx_custom_templates
// Structure: [{ id, label, tests: [['L3', 'Test Name'], ...], createdAt }]

const STORAGE_KEY = 'cx_custom_templates'

export function getCustomTemplates() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

export function saveCustomTemplate(template) {
  const templates = getCustomTemplates()
  const idx = templates.findIndex(t => t.id === template.id)
  if (idx >= 0) {
    templates[idx] = { ...templates[idx], ...template }
  } else {
    templates.push(template)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  return templates
}

export function deleteCustomTemplate(id) {
  const templates = getCustomTemplates().filter(t => t.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  return templates
}

export function getCustomTestCount(id) {
  const templates = getCustomTemplates()
  const t = templates.find(t => t.id === id)
  return t ? t.tests.length : 0
}

export function getCustomTests(id) {
  const templates = getCustomTemplates()
  const t = templates.find(t => t.id === id)
  return t ? t.tests : []
}

export function getAllTemplatesWithCustom(builtInTemplates) {
  const combined = { ...builtInTemplates }
  const customs = getCustomTemplates()
  for (const ct of customs) {
    // Convert custom tests to same format as built-in: [['L3', 'Test Name', ''], ...]
    combined[ct.id] = ct.tests.map(t => [t[0], t[1], t[2] || ''])
  }
  return combined
}
