/**
 * Asana API Integration (PAT — Personal Access Token)
 * 
 * Uses VITE_ASANA_PAT from .env.local for authentication.
 * Simple Bearer token auth — no OAuth flow needed.
 */

const PAT = import.meta.env.VITE_ASANA_PAT || ''
const API_BASE = 'https://app.asana.com/api/1.0'

// ─── STATUS CHECK ───────────────────────────────────────────────────────────────
export function isConfigured() {
  return PAT.length > 0
}

// ─── API HELPERS ────────────────────────────────────────────────────────────────
async function apiCall(method, path, body = null) {
  if (!PAT) throw new Error('Asana integration not configured. Contact Aaryan for access.')

  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${PAT}`,
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

// ─── API METHODS ────────────────────────────────────────────────────────────────
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

  // Subtask (has parent) vs top-level task (has project + section)
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
