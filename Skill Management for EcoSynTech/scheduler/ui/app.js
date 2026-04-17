async function loadSchedules() {
  try {
    const res = await fetch('../../config/scheduler.json');
    const cfg = await res.json();
    const list = document.querySelector('#schedTable tbody');
    list.innerHTML = '';
    (cfg.schedules || []).forEach(s => {
      const tr = document.createElement('tr');
      const tdName = document.createElement('td'); tdName.textContent = s.name || '';
      const tdInt = document.createElement('td'); tdInt.textContent = s.interval || '';
      const tdSkills = document.createElement('td'); tdSkills.textContent = (s.skills || []).join(', ');
      const tdEnabled = document.createElement('td');
      const badge = document.createElement('span'); badge.className = 'badge' + (s.enabled ? ' enabled':' disabled'); badge.textContent = s.enabled ? 'ENABLED':'DISABLED'; tdEnabled.appendChild(badge);
      const tdNext = document.createElement('td'); tdNext.textContent = '—';
      const tdAct = document.createElement('td');
      const btn = document.createElement('button'); btn.textContent = 'Toggle'; btn.className = 'btn'; btn.onclick = async () => {
        s.enabled = !s.enabled;
        await saveSchedule(cfg);
        loadSchedules();
      };
      tdAct.appendChild(btn);
      tr.appendChild(tdName); tr.appendChild(tdInt); tr.appendChild(tdSkills); tr.appendChild(tdEnabled); tr.appendChild(tdNext); tr.appendChild(tdAct);
      list.appendChild(tr);
    });
  } catch (e) {
    console.error('Failed to load schedules', e);
  }
}

async function saveSchedule(cfg) {
  // This is a placeholder for a write operation. In a real deployment, replace with an API call.
  // For now, we write to the JSON file via a local server (if available) or skip.
  console.log('Scheduler config would be updated on disk in production.');
}

document.addEventListener('DOMContentLoaded', loadSchedules);
