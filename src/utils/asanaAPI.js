/**
 * Asana API Integration (OAuth OOB Flow)
 * 
 * Each user authenticates with their own Asana account.
 * Token stored in localStorage per-browser.
 * 
 * Flow:
 *   1. User clicks "Connect to Asana" → opens Asana auth page in new tab
 *   2. User approves → Asana shows authorization code on screen
 *   3. User copies code, pastes into dashboard prompt
 *   4. Dashboard exchanges code for access token (stored in localStorage)
 *   5. "Create Asana Project" uses stored token to build project via API
 */

// ─── CREDENTIALS ─────────────────────────────────────────────────────────────
// These are loaded from environment or localStorage config.
// For local dev: set in .env.local (VITE_ASANA_CLIENT_ID, VITE_ASANA_CLIENT_SECRET)
// For production: set via build-time env vars
const CLIENT_ID = import.meta.env.VITE_ASANA_CLIENT_ID || localStorage.getItem('asana_client_id') || ''
const CLIENT_SECRET = import.meta.env.VITE_ASANA_CLIENT_SECRET || localStorage.getItem('asana_client_secret') || ''
const REDIRECT_URI = 'https://aaryankpaws.github.io/cx-dashboard/auth'
const AUTH_URL = `https://app.asana.com/-/oauth_authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=default`
const TOKEN_URL = 'https://app.asana.com/-/oauth_token'
const API_BASE = 'https://app.asana.com/api/1.0'

// ─── TOKEN MANAGEMENT ────────────────────────────────────────────────────────
export function getStoredToken() {
  const data = localStorage.getItem('asana_token')
  if (!data) return null
  try {
    const parsed = JSON.parse(data)
    // Check if expired (tokens last 1 hour, refresh available)
    if (parsed.expires_at && Date.now() > parsed.expires_at) {
      // Try refresh
      return { ...parsed, expired: true }
    }
    return parsed
  } catch { return null }
}

export function clearToken() {
  localStorage.removeItem('asana_token')
}

export function isConnected() {
  const token = getStoredToken()
  return token && !token.expired
}

// ─── AUTH FLOW ───────────────────────────────────────────────────────────────
export function openAsanaAuth() {
  window.open(AUTH_URL, '_blank', 'width=600,height=700')
}

export async function exchangeCode(code) {
  // Exchange authorization code for access token
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    code: code.trim(),
  })

  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  const data = await resp.json()
  const tokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
    user_name: data.data?.name || '',
    user_email: data.data?.email || '',
  }
  localStorage.setItem('asana_token', JSON.stringify(tokenData))
  return tokenData
}

export async function refreshToken() {
  const stored = getStoredToken()
  if (!stored || !stored.refresh_token) throw new Error('No refresh token')

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: stored.refresh_token,
  })

  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!resp.ok) {
    clearToken()
    throw new Error('Refresh failed — please reconnect')
  }

  const data = await resp.json()
  const tokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || stored.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
    user_name: stored.user_name,
    user_email: stored.user_email,
  }
  localStorage.setItem('asana_token', JSON.stringify(tokenData))
  return tokenData
}

// ─── API HELPERS ─────────────────────────────────────────────────────────────
async function apiCall(method, path, body = null) {
  let token = getStoredToken()
  if (!token) throw new Error('Not connected to Asana')

  // Auto-refresh if expired
  if (token.expired) {
    token = await refreshToken()
  }

  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    },
  }
  if (body) opts.body = JSON.stringify({ data: body })

  const resp = await fetch(`${API_BASE}${path}`, opts)
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Asana API error (${resp.status}): ${err}`)
  }
  const json = await resp.json()
  return json.data
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
  const data = {
    projects: [projectGid],
    memberships: [{ project: projectGid, section: sectionGid }],
    name: taskData.name,
    notes: taskData.notes || '',
  }
  if (taskData.start_on) data.start_on = taskData.start_on
  if (taskData.due_on) data.due_on = taskData.due_on
  if (taskData.resource_subtype) data.resource_subtype = taskData.resource_subtype

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
