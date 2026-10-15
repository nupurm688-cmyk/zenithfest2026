// Zenith '26 — Student Portal JavaScript (app.js)

let currentCategory = 'All';
let currentSearch = '';
let searchDebounceTimer = null;

// Category badge color helper (Diwali Festive Palette)
function getCategoryBadgeClass(category) {
  switch (category?.toLowerCase()) {
    case 'technical':
      return 'bg-amber-950/80 text-amber-300 border-amber-600/60';
    case 'cultural':
      return 'bg-rose-950/80 text-rose-300 border-rose-600/60';
    case 'sports':
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60';
    case 'gaming':
      return 'bg-purple-950/80 text-purple-300 border-purple-600/60';
    case 'workshop':
      return 'bg-orange-950/80 text-orange-300 border-orange-600/60';
    default:
      return 'bg-[#240e3b] text-amber-200 border-amber-700/60';
  }
}

// Fetch events from API with real query parameters
async function fetchEvents() {
  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const emptyState = document.getElementById('empty-state');
  const eventsGrid = document.getElementById('events-grid');
  const resultsCount = document.getElementById('results-count');

  loadingState.classList.remove('hidden');
  errorState.classList.add('hidden');
  emptyState.classList.add('hidden');
  eventsGrid.innerHTML = '';
  resultsCount.textContent = 'Loading events...';

  try {
    const params = new URLSearchParams();
    if (currentCategory && currentCategory !== 'All') {
      params.append('category', currentCategory);
    }
    if (currentSearch && currentSearch.trim() !== '') {
      params.append('search', currentSearch.trim());
    }

    const url = `/api/events${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const events = await response.json();
    loadingState.classList.add('hidden');

    if (events.length === 0) {
      emptyState.classList.remove('hidden');
      resultsCount.textContent = '0 events found';
      return;
    }

    resultsCount.textContent = `Showing ${events.length} event${events.length === 1 ? '' : 's'}`;
    renderEventCards(events);
  } catch (err) {
    console.error('Error fetching events:', err);
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
    document.getElementById('error-message').textContent =
      `Could not connect to backend API: ${err.message}. Ensure the FastAPI server is running.`;
    resultsCount.textContent = 'Connection error';
  }
}

// Render event cards into grid
function renderEventCards(events) {
  const eventsGrid = document.getElementById('events-grid');
  eventsGrid.innerHTML = '';

  events.forEach((event, index) => {
    const isFull = event.available_seats <= 0;
    const badgeClass = getCategoryBadgeClass(event.category);
    const feeText = event.fee === 0 ? 'FREE' : `₹${event.fee}`;
    const feeClass = event.fee === 0 
      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60' 
      : 'bg-amber-950/80 text-amber-300 border-amber-800/60';

    const registeredSeats = event.capacity - event.available_seats;
    const fillPercent = Math.min(100, Math.round((registeredSeats / event.capacity) * 100));

    // Seat status indicator badge
    let seatBadgeHtml;
    if (isFull) {
      seatBadgeHtml = `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
          🔴 FULL (0 seats left)
        </span>
      `;
    } else if (event.available_seats <= Math.ceil(event.capacity * 0.15)) {
      seatBadgeHtml = `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">
          ⚡ Only ${event.available_seats} seats left
        </span>
      `;
    } else {
      seatBadgeHtml = `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          🟢 ${event.available_seats} of ${event.capacity} seats open
        </span>
      `;
    }

    const card = document.createElement('div');
    card.className = `group bg-[#180829]/85 hover:bg-[#220c38]/95 border ${
      isFull ? 'border-rose-900/50' : 'border-amber-800/40 hover:border-amber-400/80'
    } rounded-2xl p-6 flex flex-col justify-between shadow-xl hover:shadow-amber-500/15 transition-all duration-300 hover:-translate-y-1.5 animate-fade-in backdrop-blur-sm`;
    card.style.animationDelay = `${index * 40}ms`;

    card.innerHTML = `
      <div>
        <!-- Top bar: Icon, Category & Fee -->
        <div class="flex items-start justify-between gap-3 mb-4">
          <div class="w-12 h-12 rounded-xl bg-[#130521] border border-amber-600/40 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
            ${event.icon || '🪔'}
          </div>
          <div class="flex flex-wrap items-center justify-end gap-1.5">
            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full border ${badgeClass}">
              ${event.category}
            </span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full border ${feeClass}">
              ${feeText}
            </span>
          </div>
        </div>

        <!-- Event Title -->
        <h3 class="text-lg font-bold text-white tracking-tight mb-2 group-hover:text-amber-300 transition-colors">
          ${escapeHtml(event.title)}
        </h3>

        <!-- Description Snippet -->
        <p class="text-xs text-amber-100/80 leading-relaxed line-clamp-2 mb-4">
          ${escapeHtml(event.description || 'No description provided.')}
        </p>

        <!-- Metadata -->
        <div class="space-y-1.5 text-xs text-amber-300/80 mb-5 pt-3 border-t border-amber-900/50">
          <div class="flex items-center gap-2">
            <span>📅</span>
            <span>${event.event_date} · ${event.event_time}</span>
          </div>
          <div class="flex items-center gap-2">
            <span>📍</span>
            <span>${escapeHtml(event.venue)}</span>
          </div>
        </div>
      </div>

      <!-- Bottom: Live Capacity Bar & Action Button -->
      <div class="pt-2">
        <div class="mb-3">
          <div class="flex items-center justify-between mb-1.5">
            ${seatBadgeHtml}
            <span class="text-[11px] font-medium text-amber-300/70">${fillPercent}% full</span>
          </div>
          <div class="w-full bg-[#120521] h-1.5 rounded-full overflow-hidden border border-amber-900/60">
            <div class="${isFull ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-500 to-yellow-400'} h-full rounded-full transition-all duration-300" style="width: ${fillPercent}%;"></div>
          </div>
        </div>

        <button 
          data-event-id="${event.id}" 
          class="view-details-btn w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 ${
            isFull
              ? 'bg-[#220d3b] text-amber-400/60 border border-amber-900/50 cursor-pointer'
              : 'bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400 hover:from-amber-300 hover:via-orange-400 hover:to-yellow-300 active:scale-95 text-slate-950 font-black shadow-lg shadow-amber-500/25'
          }"
        >
          <span>${isFull ? 'View Details (Full)' : 'View Details & Register ✨'}</span>
          <span>→</span>
        </button>
      </div>
    `;

    eventsGrid.appendChild(card);
  });

  // Attach event listeners to View Details buttons
  document.querySelectorAll('.view-details-btn').forEach(button => {
    button.addEventListener('click', () => {
      const eventId = button.getAttribute('data-event-id');
      openEventModal(eventId);
    });
  });
}

// Open modal and load single event details
async function openEventModal(eventId) {
  const modal = document.getElementById('event-modal');
  const regForm = document.getElementById('registration-form');
  const formSuccessBanner = document.getElementById('form-success-banner');
  const formErrorBanner = document.getElementById('form-error-banner');
  const fullBanner = document.getElementById('modal-full-banner');
  const submitBtn = document.getElementById('reg-submit-btn');

  // Reset form states
  regForm.reset();
  formSuccessBanner.classList.add('hidden');
  formErrorBanner.classList.add('hidden');
  clearFormValidationErrors();

  document.getElementById('reg-event-id').value = eventId;
  modal.classList.remove('hidden');

  try {
    const res = await fetch(`/api/events/${eventId}`);
    if (!res.ok) {
      throw new Error(`Event not found (HTTP ${res.status})`);
    }
    const event = await res.json();

    document.getElementById('modal-icon').textContent = event.icon || '⚡';
    document.getElementById('modal-title').textContent = event.title;
    document.getElementById('modal-category').textContent = event.category;
    document.getElementById('modal-fee').textContent = event.fee === 0 ? 'Free' : `₹${event.fee}`;
    document.getElementById('modal-description').textContent = event.description || 'No description provided.';
    document.getElementById('modal-datetime').textContent = `${event.event_date} · ${event.event_time}`;
    document.getElementById('modal-venue').textContent = event.venue;

    const registeredSeats = event.capacity - event.available_seats;
    const fillPercent = Math.min(100, Math.round((registeredSeats / event.capacity) * 100));

    const isFull = event.available_seats <= 0;
    const seatsBadge = document.getElementById('modal-seats-badge');
    const seatsBar = document.getElementById('modal-seats-bar');

    if (isFull) {
      seatsBadge.textContent = `🔴 FULL (${event.capacity} / ${event.capacity})`;
      seatsBadge.className = 'font-bold text-rose-400';
      seatsBar.className = 'bg-rose-500 h-full rounded-full';
      seatsBar.style.width = '100%';

      fullBanner.classList.remove('hidden');
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      seatsBadge.textContent = `${event.available_seats} of ${event.capacity} seats open`;
      seatsBadge.className = 'font-bold text-emerald-400';
      seatsBar.className = 'bg-indigo-500 h-full rounded-full';
      seatsBar.style.width = `${fillPercent}%`;

      fullBanner.classList.add('hidden');
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  } catch (err) {
    console.error('Error fetching event details:', err);
    alert('Failed to load event details. Please try again.');
    modal.classList.add('hidden');
  }
}

// Close modal
function closeEventModal() {
  const modal = document.getElementById('event-modal');
  modal.classList.add('hidden');
}

// Handle Registration form submission
async function handleRegistrationSubmit(e) {
  e.preventDefault();

  clearFormValidationErrors();
  const formSuccessBanner = document.getElementById('form-success-banner');
  const formErrorBanner = document.getElementById('form-error-banner');
  formSuccessBanner.classList.add('hidden');
  formErrorBanner.classList.add('hidden');

  const eventId = document.getElementById('reg-event-id').value;
  const nameInput = document.getElementById('reg-name');
  const rollInput = document.getElementById('reg-roll');
  const emailInput = document.getElementById('reg-email');
  const phoneInput = document.getElementById('reg-phone');

  const studentName = nameInput.value.trim();
  const rollNumber = rollInput.value.trim();
  const email = emailInput.value.trim();
  const phone = phoneInput.value.trim();

  // Client-Side Validation
  let hasClientError = false;

  if (!studentName) {
    document.getElementById('err-reg-name').classList.remove('hidden');
    nameInput.classList.add('border-rose-500');
    hasClientError = true;
  }

  if (!rollNumber) {
    document.getElementById('err-reg-roll').classList.remove('hidden');
    rollInput.classList.add('border-rose-500');
    hasClientError = true;
  }

  if (!email || !email.includes('@') || email.startsWith('@') || email.endsWith('@')) {
    document.getElementById('err-reg-email').classList.remove('hidden');
    emailInput.classList.add('border-rose-500');
    hasClientError = true;
  }

  if (hasClientError) {
    return;
  }

  // Button loading state
  const submitBtn = document.getElementById('reg-submit-btn');
  const btnText = document.getElementById('reg-btn-text');
  const btnSpinner = document.getElementById('reg-btn-spinner');

  submitBtn.disabled = true;
  btnText.textContent = 'Submitting Registration...';
  btnSpinner.classList.remove('hidden');

  try {
    const response = await fetch(`/api/events/${eventId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        student_name: studentName,
        roll_number: rollNumber,
        email: email,
        phone: phone || null,
      }),
    });

    const data = await response.json();

    if (response.status === 201) {
      // Success (201 Created)
      const eventTitle = document.getElementById('modal-title').textContent;
      document.getElementById('success-headline').textContent = `Confirmed for ${eventTitle}!`;
      document.getElementById('success-subtext').textContent =
        `Registration #${data.id} confirmed for ${data.student_name}. A seat has been reserved.`;
      formSuccessBanner.classList.remove('hidden');

      // Clear input fields
      document.getElementById('registration-form').reset();

      // Refresh the modal seat details and the background cards immediately!
      await openEventModal(eventId);
      fetchEvents();

      // Close modal after 2.5 seconds so user can see confirmation
      setTimeout(() => {
        closeEventModal();
      }, 2500);
    } else {
      // Failure (400, 404, 409) — display the exact error message from server
      const errorMsg = data.detail || 'An unexpected error occurred during registration.';
      document.getElementById('form-error-text').textContent = errorMsg;
      formErrorBanner.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Registration network error:', err);
    document.getElementById('form-error-text').textContent =
      'Network communication failed. Please check backend connection.';
    formErrorBanner.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    btnText.textContent = 'Confirm Registration';
    btnSpinner.classList.add('hidden');
  }
}

// Clear client-side inline validation errors
function clearFormValidationErrors() {
  document.getElementById('err-reg-name').classList.add('hidden');
  document.getElementById('err-reg-roll').classList.add('hidden');
  document.getElementById('err-reg-email').classList.add('hidden');

  document.getElementById('reg-name').classList.remove('border-rose-500');
  document.getElementById('reg-roll').classList.remove('border-rose-500');
  document.getElementById('reg-email').classList.remove('border-rose-500');
}

// HTML escape helper
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Event Listeners initialization
document.addEventListener('DOMContentLoaded', () => {
  // Initial fetch
  fetchEvents();

  // Search input with debounce
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');

  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    if (currentSearch.trim() !== '') {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      fetchEvents();
    }, 300);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearch = '';
    clearSearchBtn.classList.add('hidden');
    fetchEvents();
  });

  // Category filter pill clicks
  const categoryButtons = document.querySelectorAll('.filter-btn');
  const activeClassList = ['active-filter', 'bg-gradient-to-r', 'from-amber-500', 'to-orange-500', 'text-slate-950', 'font-bold', 'shadow-lg', 'shadow-amber-500/25'];
  const inactiveClassList = ['bg-[#1d0b33]', 'text-amber-200', 'hover:bg-[#2b104c]', 'hover:text-amber-100', 'border', 'border-amber-800/60', 'font-semibold'];

  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryButtons.forEach(b => {
        b.classList.remove(...activeClassList);
        b.classList.add(...inactiveClassList);
      });

      btn.classList.add(...activeClassList);
      btn.classList.remove(...inactiveClassList);

      currentCategory = btn.getAttribute('data-category');
      fetchEvents();
    });
  });

  // Retry and Reset filter buttons
  document.getElementById('retry-btn').addEventListener('click', fetchEvents);
  document.getElementById('reset-filters-btn').addEventListener('click', () => {
    currentSearch = '';
    currentCategory = 'All';
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');

    categoryButtons.forEach(b => {
      if (b.getAttribute('data-category') === 'All') {
        b.classList.add(...activeClassList);
        b.classList.remove(...inactiveClassList);
      } else {
        b.classList.remove(...activeClassList);
        b.classList.add(...inactiveClassList);
      }
    });

    fetchEvents();
  });

  // Modal close handlers
  document.getElementById('modal-close-btn').addEventListener('click', closeEventModal);
  document.getElementById('event-modal').addEventListener('click', (e) => {
    if (e.target.id === 'event-modal') {
      closeEventModal();
    }
  });

  // Registration form submission
  document.getElementById('registration-form').addEventListener('submit', handleRegistrationSubmit);
});
