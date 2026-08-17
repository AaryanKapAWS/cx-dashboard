/**
 * Asana API Integration (OAuth)
 * 
 * Uses OAuth token from localStorage for authentication.
 * Falls back to VITE_ASANA_PAT if present (dev mode).
 */

const CLIENT_ID = '1217191412887386'
const CLIENT_SECRET = import.meta.env.VITE_ASANA_CLIENT_SECRET || 'b60276c2d9bbb0fd1dee221457f03bec'
const REDIRECT_URI = 'https://aaryankapaws.github.io/cx-dashboard/auth'
const API_BASE = 'https://app.asana.com/api/1.0'

// ─── TOKEN MANAGEMENT ────────────────────────────────────────────────────────
export function getToken() {
  return localStorage.getItem('asana_token') || import.meta.env.VITE_ASANA_PAT || ''
}

export function setToken(token) {
  localStorage.setItem('asana_token', token)
}

export function clearToken() {
  localStorage.removeItem('asana_token')
}

export function isAuthenticated() {
  return getToken().length > 0
}

// ─── OAUTH FLOW ──────────────────────────────────────────────────────────────
export function startOAuthFlow() {
  const url = `https://app.asana.com/-/oauth_authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code`
  window.location.href = url
}

export async function exchangeCodeForToken(code) {
  const resp = await fetch('https://app.asana.com/-/oauth_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    }),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`OAuth token exchange failed: ${err}`)
  }
  const data = await resp.json()
  setToken(data.access_token)
  return data.access_token
}

// ─── API HELPERS ─────────────────────────────────────────────────────────────
async function apiCall(method, path, body = null) {
  const token = getToken()
  if (!token) throw new Error('Not connected to Asana. Click "Create Asana Project" to connect.')

  const maxRetries = 3
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const opts = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
    if (body) opts.body = JSON.stringify({ data: body })

    const resp = await fetch(`${API_BASE}${path}`, opts)
    if (resp.ok) {
      const json = await resp.json()
      return json.data
    }

    // If 401, token expired — clear it
    if (resp.status === 401) {
      clearToken()
      throw new Error('Asana session expired. Click "Create Asana Project" to reconnect.')
    }

    // Retry on server errors (500, 502, 503, 504) and rate limits (429)
    if ([429, 500, 502, 503, 504].includes(resp.status) && attempt < maxRetries - 1) {
      const wait = resp.status === 429 ? 5000 : 2000 * (attempt + 1)
      await new Promise(r => setTimeout(r, wait))
      continue
    }

    const err = await resp.text()
    throw new Error(`Asana API error (${resp.status}): ${err}`)
  }
}

// ─── API METHODS ─────────────────────────────────────────────────────────────
export async function getWorkspaces() {
  return await apiCall('GET', '/workspaces')
}

export async function getMe() {
  return await apiCall('GET', '/users/me')
}

export async function createProject(workspaceGid, name, notes = '', color = 'light-orange') {
  return await apiCall('POST', '/projects', {
    workspace: workspaceGid,
    name,
    notes,
    color,
    default_view: 'timeline',
  })
}

export async function createSection(projectGid, name) {
  return await apiCall('POST', `/projects/${projectGid}/sections`, { name })
}

export async function createTask(projectGid, sectionGid, taskData) {
  const data = { name: taskData.name, notes: taskData.notes || '' }

  if (taskData.parent) {
    data.parent = taskData.parent
  } else {
    data.projects = [projectGid]
    if (sectionGid) {
      data.memberships = [{ project: projectGid, section: sectionGid }]
    }
  }

  if (taskData.start_on) data.start_on = taskData.start_on
  if (taskData.due_on) data.due_on = taskData.due_on
  if (taskData.resource_subtype) data.resource_subtype = taskData.resource_subtype
  if (taskData.custom_fields) data.custom_fields = taskData.custom_fields

  return await apiCall('POST', '/tasks', data)
}

export async function createCustomField(workspaceGid, fieldDef) {
  return await apiCall('POST', '/custom_fields', {
    workspace: workspaceGid,
    ...fieldDef,
  })
}

export async function addCustomFieldToProject(projectGid, customFieldGid) {
  return await apiCall('POST', `/projects/${projectGid}/addCustomFieldSetting`, {
    custom_field: customFieldGid,
    is_important: true,
  })
}

export async function setDependency(taskGid, dependsOnTaskGid) {
  return await apiCall('POST', `/tasks/${taskGid}/addDependencies`, {
    dependencies: [dependsOnTaskGid],
  })
}

export async function addMembersToProject(projectGid, emails) {
  return await apiCall('POST', `/projects/${projectGid}/addMembers`, {
    members: emails,
  })
}
