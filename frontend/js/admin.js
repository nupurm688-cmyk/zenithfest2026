let cachedEvents = [];
let activeTab = 'events'; // 'events' or 'registrations'

// Resolve API base URL (supports web, local server, and native mobile APK)
function getApiBaseUrl() {
  const isMobileApp = window.location.protocol === 'capacitor:' || 
                      window.location.protocol === 'ionic:' || 
                      window.location.protocol === 'file:' || 
                      (window.location.hostname === 'localhost' && window.Capacitor !== undefined);
  if (isMobileApp) {
    const custom = localStorage.getItem('zenith_api_endpoint');
    return (custom ? custom : 'https://zenithfest2026.vercel.app').replace(/\/$/, '');
  }
  return '';
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupEventListeners();
  loadDashboardData();
});

function setupTabs() {
  const tabEventsBtn = document.getElementById('tab-events-btn');
  const tabRegsBtn = document.getElementById('tab-registrations-btn');
  const tabEventsContent = document.getElementById('tab-events-content');
  const tabRegsContent = document.getElementById('tab-registrations-content');

  tabEventsBtn.addEventListener('click', () => {
    activeTab = 'events';
    tabEventsBtn.className = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25 transition';
    tabRegsBtn.className = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#1e0a36] text-amber-200 hover:bg-[#2b104c] hover:text-white border border-amber-700/50 transition';

    tabEventsContent.classList.remove('hidden');
    tabRegsContent.classList.add('hidden');
  });

  tabRegsBtn.addEventListener('click', () => {
    activeTab = 'registrations';
    tabRegsBtn.className = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25 transition';
    tabEventsBtn.className = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#1e0a36] text-amber-200 hover:bg-[#2b104c] hover:text-white border border-amber-700/50 transition';

    tabRegsContent.classList.remove('hidden');
    tabEventsContent.classList.add('hidden');
    loadRegistrations();
  });
}

function setupEventListeners() {
  document.getElementById('refresh-dashboard-btn').addEventListener('click', loadDashboardData);
  document.getElementById('admin-retry-btn').addEventListener('click', loadDashboardData);

  // Registrations event filter dropdown change
  document.getElementById('reg-filter-event').addEventListener('change', (e) => {
    loadRegistrations(e.target.value);
  });

  // Stretch: Add Event Modal triggers
  const addModal = document.getElementById('add-event-modal');
  document.getElementById('open-add-event-btn').addEventListener('click', () => {
    addModal.classList.remove('hidden');
  });
  document.getElementById('close-add-event-btn').addEventListener('click', () => {
    addModal.classList.add('hidden');
  });
  document.getElementById('add-event-form').addEventListener('submit', handleAddEventSubmit);

  // Stretch: Delete Registration Modal triggers
  const deleteModal = document.getElementById('delete-reg-modal');
  document.getElementById('cancel-delete-reg-btn').addEventListener('click', () => {
    deleteModal.classList.add('hidden');
  });
  document.getElementById('confirm-delete-reg-btn').addEventListener('click', confirmDeleteRegistration);
}

// Master loader for dashboard
async function loadDashboardData() {
  const loading = document.getElementById('admin-loading');
  const errorBanner = document.getElementById('admin-error');
  const content = document.getElementById('dashboard-content');

  loading.classList.remove('hidden');
  errorBanner.classList.add('hidden');
  content.classList.add('hidden');

  try {
    // Parallel fetch: Stats and Events
    const [statsRes, eventsRes] = await Promise.all([
      fetch(`${getApiBaseUrl()}/api/stats`),
      fetch(`${getApiBaseUrl()}/api/events`),
    ]);

    if (!statsRes.ok || !eventsRes.ok) {
      throw new Error(`Stats HTTP ${statsRes.status}, Events HTTP ${eventsRes.status}`);
    }

    const stats = await statsRes.json();
    cachedEvents = await eventsRes.json();

    renderStats(stats);
    renderCategoryBreakdown(stats.events_by_category);
    renderEventsTable(cachedEvents);
    populateEventFilterDropdown(cachedEvents);

    if (activeTab === 'registrations') {
      await loadRegistrations();
    }

    loading.classList.add('hidden');
    content.classList.remove('hidden');
  } catch (err) {
    console.error('Failed to load admin dashboard:', err);
    loading.classList.add('hidden');
    errorBanner.classList.remove('hidden');
    document.getElementById('admin-error-text').textContent =
      `Connection error: ${err.message}. Make sure the FastAPI backend is running.`;
  }
}

// Render the 4 key stat cards
function renderStats(stats) {
  document.getElementById('stat-total-events').textContent = stats.total_events;
  document.getElementById('stat-total-registrations').textContent = stats.total_registrations;
  document.getElementById('stat-total-capacity').textContent = stats.total_capacity;
  document.getElementById('stat-utilization-pct').textContent = `${stats.overall_utilization_pct}%`;
  document.getElementById('stat-upcoming-events').textContent = stats.upcoming_events_count;

  const bar = document.getElementById('stat-utilization-bar');
  bar.style.width = `${Math.min(100, stats.overall_utilization_pct)}%`;
  if (stats.overall_utilization_pct >= 90) {
    bar.className = 'bg-rose-500 h-full rounded-full transition-all duration-500';
  } else {
    bar.className = 'bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500';
  }
}

// Render category breakdown pills
function renderCategoryBreakdown(categoryMap) {
  const container = document.getElementById('category-breakdown-container');
  container.innerHTML = '';

  const categoryIcons = {
    Technical: '💻',
    Cultural: '🎭',
    Sports: '⚽',
    Gaming: '🎮',
    Workshop: '🎨',
  };

  const categories = Object.keys(categoryMap || {});
  if (categories.length === 0) {
    container.innerHTML = '<div class="text-xs text-amber-400/60 col-span-full">No category records.</div>';
    return;
  }

  categories.forEach(cat => {
    const count = categoryMap[cat];
    const icon = categoryIcons[cat] || '🪔';
    const card = document.createElement('div');
    card.className = 'bg-[#1e0a36]/90 border border-amber-800/50 rounded-xl p-3 flex items-center justify-between shadow-inner';
    card.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-lg">${icon}</span>
        <span class="text-xs font-bold text-amber-200">${cat}</span>
      </div>
      <span class="text-xs font-black text-amber-300 bg-[#120521] px-2.5 py-0.5 rounded-lg border border-amber-700/60 shadow-sm">
        ${count}
      </span>
    `;
    container.appendChild(card);
  });
}

// Render Events & Capacity matrix table (sorted by utilization % descending)
function renderEventsTable(events) {
  const tbody = document.getElementById('events-table-body');
  tbody.innerHTML = '';

  // Calculate utilization for each event and sort descending
  const eventsWithMetrics = events.map(ev => {
    const registered = ev.capacity - ev.available_seats;
    const utilizationPct = ev.capacity > 0 ? (registered / ev.capacity) * 100 : 0;
    return {
      ...ev,
      registered,
      utilizationPct: parseFloat(utilizationPct.toFixed(1)),
    };
  });

  eventsWithMetrics.sort((a, b) => b.utilizationPct - a.utilizationPct);

  if (eventsWithMetrics.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-slate-400">No events found in database.</td>
      </tr>
    `;
    return;
  }

  eventsWithMetrics.forEach(ev => {
    const isOver90 = ev.utilizationPct >= 90;
    const isFull = ev.available_seats <= 0;

    const row = document.createElement('tr');
    row.className = `hover:bg-slate-800/80 transition ${
      isOver90 ? 'bg-rose-950/20 text-rose-100 font-medium' : 'text-slate-300'
    }`;

    // Warning tag
    let utilBadgeHtml = `<span class="font-bold">${ev.utilizationPct}%</span>`;
    if (isFull) {
      utilBadgeHtml = `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-rose-900 text-rose-200 border border-rose-700 animate-pulse">
          FULL 100%
        </span>
      `;
    } else if (isOver90) {
      utilBadgeHtml = `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-700">
          ⚠️ ${ev.utilizationPct}%
        </span>
      `;
    }

    row.innerHTML = `
      <td class="py-3 px-4">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">${ev.icon || '⚡'}</span>
          <div>
            <div class="font-bold text-white tracking-tight">${escapeHtml(ev.title)}</div>
            <div class="text-[11px] text-slate-400">ID #${ev.id} · ${ev.fee === 0 ? 'Free' : '₹' + ev.fee}</div>
          </div>
        </div>
      </td>
      <td class="py-3 px-3">
        <span class="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700">
          ${ev.category}
        </span>
      </td>
      <td class="py-3 px-3 text-slate-300">
        <div>${ev.event_date}</div>
        <div class="text-[11px] text-slate-400">${ev.event_time}</div>
      </td>
      <td class="py-3 px-3 text-slate-300">
        ${escapeHtml(ev.venue)}
      </td>
      <td class="py-3 px-3 text-center">
        <span class="font-bold ${isOver90 ? 'text-rose-400' : 'text-white'}">${ev.registered}</span>
        <span class="text-slate-400">/ ${ev.capacity}</span>
      </td>
      <td class="py-3 px-3 text-right">
        ${utilBadgeHtml}
      </td>
    `;

    tbody.appendChild(row);
  });
}

// Populate the event dropdown filter on registrations tab
function populateEventFilterDropdown(events) {
  const dropdown = document.getElementById('reg-filter-event');
  const currentVal = dropdown.value;
  dropdown.innerHTML = '<option value="">All Events</option>';

  events.forEach(ev => {
    const opt = document.createElement('option');
    opt.value = ev.id;
    opt.textContent = `${ev.title} (ID: ${ev.id})`;
    dropdown.appendChild(opt);
  });

  if (currentVal) {
    dropdown.value = currentVal;
  }
}

// Load registrations list from GET /api/registrations
async function loadRegistrations(eventIdFilter = '') {
  const tbody = document.getElementById('registrations-table-body');
  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center py-8 text-slate-400">Loading registration records...</td>
    </tr>
  `;

  try {
    let url = `${getApiBaseUrl()}/api/registrations`;
    if (eventIdFilter) {
      url += `?event_id=${eventIdFilter}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const registrations = await res.json();
    renderRegistrationsTable(registrations);
  } catch (err) {
    console.error('Failed to load registrations:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-6 text-rose-400">Error loading registrations: ${err.message}</td>
      </tr>
    `;
  }
}

// Render registrations rows
function renderRegistrationsTable(registrations) {
  const tbody = document.getElementById('registrations-table-body');
  tbody.innerHTML = '';

  if (registrations.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-10 text-slate-400">No student registrations recorded yet.</td>
      </tr>
    `;
    return;
  }

  registrations.forEach(r => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-slate-800/80 transition text-slate-300';

    const dateFormatted = formatTimestamp(r.registered_at);

    row.innerHTML = `
      <td class="py-3 px-4 font-bold text-white">
        ${escapeHtml(r.student_name)}
      </td>
      <td class="py-3 px-3 font-mono text-indigo-300 text-xs">
        ${escapeHtml(r.roll_number)}
      </td>
      <td class="py-3 px-3 text-xs">
        <div>${escapeHtml(r.email)}</div>
        ${r.phone ? `<div class="text-slate-400 text-[11px]">📞 ${escapeHtml(r.phone)}</div>` : ''}
      </td>
      <td class="py-3 px-3">
        <span class="font-semibold text-white">${escapeHtml(r.event_title)}</span>
        <span class="text-[11px] text-slate-400 block">Event ID: ${r.event_id}</span>
      </td>
      <td class="py-3 px-3 text-xs text-slate-400">
        ${dateFormatted}
      </td>
      <td class="py-3 px-3 text-right">
        <button 
          data-reg-id="${r.id}"
          data-student="${escapeHtml(r.student_name)}"
          data-event="${escapeHtml(r.event_title)}"
          class="delete-reg-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition"
        >
          Cancel
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });

  // Attach delete buttons
  document.querySelectorAll('.delete-reg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const regId = btn.getAttribute('data-reg-id');
      const student = btn.getAttribute('data-student');
      const eventTitle = btn.getAttribute('data-event');
      openDeleteRegistrationModal(regId, student, eventTitle);
    });
  });
}

// Format ISO timestamp nicely
function formatTimestamp(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return isoStr;
  }
}

// Stretch Goal: Handle Add Event Submission
async function handleAddEventSubmit(e) {
  e.preventDefault();
  const errorBox = document.getElementById('add-event-error');
  errorBox.classList.add('hidden');

  const title = document.getElementById('new-event-title').value.trim();
  const category = document.getElementById('new-event-category').value;
  const icon = document.getElementById('new-event-icon').value.trim();
  const description = document.getElementById('new-event-desc').value.trim();
  const event_date = document.getElementById('new-event-date').value;
  const event_time = document.getElementById('new-event-time').value.trim();
  const capacity = parseInt(document.getElementById('new-event-cap').value, 10);
  const fee = parseInt(document.getElementById('new-event-fee').value, 10);
  const venue = document.getElementById('new-event-venue').value.trim();

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        category,
        icon: icon || '🎯',
        description,
        event_date,
        event_time,
        capacity,
        fee,
        venue,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to create event');
    }

    document.getElementById('add-event-form').reset();
    document.getElementById('add-event-modal').classList.add('hidden');
    await loadDashboardData();
  } catch (err) {
    errorBox.textContent = `Validation error: ${err.message}`;
    errorBox.classList.remove('hidden');
  }
}

// Stretch Goal: Open Delete Registration Confirmation Modal
function openDeleteRegistrationModal(regId, studentName, eventTitle) {
  document.getElementById('delete-target-reg-id').value = regId;
  document.getElementById('delete-reg-desc').textContent =
    `Are you sure you want to cancel the registration for ${studentName} (${eventTitle})? The seat will be released immediately.`;
  document.getElementById('delete-reg-modal').classList.remove('hidden');
}

// Stretch Goal: Confirm Delete Registration
async function confirmDeleteRegistration() {
  const regId = document.getElementById('delete-target-reg-id').value;
  const modal = document.getElementById('delete-reg-modal');

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/registrations/${regId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || 'Failed to cancel registration');
    }

    modal.classList.add('hidden');
    // Refresh both registrations and metrics
    const currentFilter = document.getElementById('reg-filter-event').value;
    await loadRegistrations(currentFilter);
    await loadDashboardData();
  } catch (err) {
    alert(`Could not cancel registration: ${err.message}`);
    modal.classList.add('hidden');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
