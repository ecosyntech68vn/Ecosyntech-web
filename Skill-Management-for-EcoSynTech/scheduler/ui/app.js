const API_BASE = window.location.origin;
let API_KEY = localStorage.getItem('scheduler_api_key') || '';

function showStatus(message, isError = false) {
  const el = document.getElementById('statusMessage');
  el.className = `status ${isError ? 'error' : 'success'}`;
  el.textContent = message;
  setTimeout(() => { el.textContent = ''; el.className = ''; }, 5000);
}

function connectWithApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key) {
    showStatus('Please enter API key', true);
    return;
  }
  API_KEY = key;
  localStorage.setItem('scheduler_api_key', API_KEY);
  loadSchedules();
}

function disconnect() {
  API_KEY = '';
  localStorage.removeItem('scheduler_api_key');
  document.getElementById('apiKeySection').classList.remove('hidden');
  document.getElementById('dashboardSection').classList.add('hidden');
}

async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Scheduler-API-Key': API_KEY,
    ...options.headers
  };
  
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });
  
  if (res.status === 401) {
    showStatus('Invalid API key', true);
    disconnect();
    throw new Error('Unauthorized');
  }
  
  if (res.status === 403) {
    showStatus('API key forbidden', true);
    throw new Error('Forbidden');
  }
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  
  return res.json();
}

async function loadSchedules() {
  try {
    const result = await apiFetch('/api/v1/skills/scheduler');
    
    document.getElementById('apiKeySection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    
    const schedules = result.data || [];
    updateStats(schedules);
    renderSchedules(schedules);
  } catch (e) {
    console.error('Failed to load schedules:', e);
    showStatus(`Error: ${e.message}`, true);
  }
}

function updateStats(schedules) {
  document.getElementById('totalSchedules').textContent = schedules.length;
  document.getElementById('enabledSchedules').textContent = schedules.filter(s => s.enabled).length;
  document.getElementById('totalRuns').textContent = schedules.reduce((sum, s) => sum + (s.runCount || 0), 0);
}

function renderSchedules(schedules) {
  const tbody = document.getElementById('schedTableBody');
  tbody.innerHTML = '';
  
  if (schedules.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;">No schedules configured</td></tr>';
    return;
  }
  
  schedules.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(s.name)}</strong>
        ${s.description ? `<div style="font-size:12px;color:#666;">${escapeHtml(s.description)}</div>` : ''}
      </td>
      <td><code>${escapeHtml(s.interval)}</code></td>
      <td>
        ${(s.skills || []).map(sk => `<span style="background:#e3f2fd;padding:2px 6px;border-radius:4px;margin:2px;display:inline-block;font-size:12px;">${escapeHtml(sk)}</span>`).join('')}
      </td>
      <td><span class="badge ${s.enabled ? 'enabled' : 'disabled'}">${s.enabled ? 'ENABLED' : 'DISABLED'}</span></td>
      <td class="last-run">${s.lastRun ? new Date(s.lastRun).toLocaleString() : 'Never'}</td>
      <td>${s.runCount || 0}</td>
      <td class="actions">
        <button class="btn ${s.enabled ? 'warning' : 'success'}" onclick="toggleSchedule('${s.id}')">
          ${s.enabled ? 'Disable' : 'Enable'}
        </button>
        <button class="btn primary" onclick="editSchedule('${s.id}')">Edit</button>
        <button class="btn danger" onclick="deleteSchedule('${s.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showAddModal() {
  document.getElementById('modalTitle').textContent = 'Add Schedule';
  document.getElementById('scheduleId').value = '';
  document.getElementById('scheduleName').value = '';
  document.getElementById('scheduleDesc').value = '';
  document.getElementById('scheduleInterval').value = '1h';
  document.getElementById('scheduleSkills').value = '';
  document.getElementById('scheduleModal').classList.add('show');
}

function editSchedule(id) {
  apiFetch(`/api/v1/skills/scheduler`)
    .then(result => {
      const s = result.data.find(sched => sched.id === id);
      if (!s) {
        showStatus('Schedule not found', true);
        return;
      }
      document.getElementById('modalTitle').textContent = 'Edit Schedule';
      document.getElementById('scheduleId').value = s.id;
      document.getElementById('scheduleName').value = s.name;
      document.getElementById('scheduleDesc').value = s.description || '';
      document.getElementById('scheduleInterval').value = s.interval;
      document.getElementById('scheduleSkills').value = (s.skills || []).join(', ');
      document.getElementById('scheduleModal').classList.add('show');
    });
}

async function saveSchedule() {
  const id = document.getElementById('scheduleId').value;
  const name = document.getElementById('scheduleName').value.trim();
  const description = document.getElementById('scheduleDesc').value.trim();
  const interval = document.getElementById('scheduleInterval').value;
  const skillsStr = document.getElementById('scheduleSkills').value.trim();
  
  if (!name || !skillsStr) {
    showStatus('Name and Skills are required', true);
    return;
  }
  
  const skills = skillsStr.split(',').map(s => s.trim()).filter(s => s);
  const payload = { name, interval, skills, description };
  
  try {
    if (id) {
      await apiFetch(`/api/v1/skills/scheduler/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showStatus('Schedule updated successfully');
    } else {
      await apiFetch('/api/v1/skills/scheduler', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showStatus('Schedule created successfully');
    }
    closeModal();
    loadSchedules();
  } catch (e) {
    showStatus(`Error: ${e.message}`, true);
  }
}

async function toggleSchedule(id) {
  try {
    await apiFetch(`/api/v1/skills/scheduler/${id}/toggle`, { method: 'POST' });
    showStatus('Schedule toggled');
    loadSchedules();
  } catch (e) {
    showStatus(`Error: ${e.message}`, true);
  }
}

async function deleteSchedule(id) {
  if (!confirm('Are you sure you want to delete this schedule?')) return;
  
  try {
    await apiFetch(`/api/v1/skills/scheduler/${id}`, { method: 'DELETE' });
    showStatus('Schedule deleted');
    loadSchedules();
  } catch (e) {
    showStatus(`Error: ${e.message}`, true);
  }
}

function closeModal() {
  document.getElementById('scheduleModal').classList.remove('show');
}

function exportConfig() {
  window.open(`${API_BASE}/api/v1/skills/scheduler/export?scheduler_api_key=${encodeURIComponent(API_KEY)}`, '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
  if (API_KEY) {
    document.getElementById('apiKeyInput').value = API_KEY;
    loadSchedules();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
