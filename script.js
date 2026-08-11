// Exam data will be populated dynamically from JSON files
let exams = [];
let pinnedExams = new Set(JSON.parse(localStorage.getItem('pinnedExams') || '[]'));

window.togglePin = (examId) => {
    if (pinnedExams.has(examId)) {
        pinnedExams.delete(examId);
    } else {
        pinnedExams.add(examId);
    }
    localStorage.setItem('pinnedExams', JSON.stringify([...pinnedExams]));
    renderExams();
};

// Helper to format date with time
const formatDateTime = (dateString) => {
    const options = { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const date = new Date(dateString);
    return date.toLocaleString('en-US', options);
};

// Calculate exact remaining time
const getRemainingTime = (targetDateString) => {
    const targetDate = new Date(targetDateString).getTime();
    const now = new Date().getTime();
    const diffTime = targetDate - now;
    
    if (diffTime <= 0) {
        return { isPast: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);

    return { isPast: false, days, hours, minutes, seconds };
};

// Determine status class based on remaining days
const getStatusClass = (timeObj) => {
    if (timeObj.isPast) return 'status-passed';
    if (timeObj.days === 0) return 'status-today';
    if (timeObj.days <= 15) return 'status-danger';
    if (timeObj.days <= 45) return 'status-warning';
    return 'status-safe';
};

// Generate HTML for a list of exams without sections
const generateExamsHTML = (examsList) => {
    if (examsList.length === 0) {
        return `<p style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">No exams found matching your criteria.</p>`;
    }

    const gridHTML = examsList.map((exam, index) => {
        const timeObj = getRemainingTime(exam.date);
        const statusClass = getStatusClass(timeObj);
        const animationDelay = index * 0.1;
        
        // Include an indicator for Central vs State inside the card header
        const typeBadge = exam.type === 'central' 
            ? `<span style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.2rem 0.5rem; background: rgba(255, 69, 58, 0.15); color: var(--danger); border: 1px solid rgba(255, 69, 58, 0.3); border-radius: 4px; margin-left: 0.75rem; vertical-align: middle;">Central</span>` 
            : `<span style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.2rem 0.5rem; background: rgba(50, 215, 75, 0.15); color: var(--success); border: 1px solid rgba(50, 215, 75, 0.3); border-radius: 4px; margin-left: 0.75rem; vertical-align: middle;">${exam.stateName ? exam.stateName : 'State'}</span>`;

        const isPinned = pinnedExams.has(exam.id);
        const pinClass = isPinned ? 'pinned' : '';
        const pinIcon = `<button class="pin-btn ${pinClass}" onclick="togglePin('${exam.id}')" title="${isPinned ? 'Unpin' : 'Pin to top'}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
        </button>`;

        return `
            <article class="exam-card ${statusClass} ${pinClass}" style="animation-delay: ${animationDelay}s" data-exam-id="${exam.id}" data-exam-date="${exam.date}">
                <div class="card-left">
                    <div class="exam-header">
                        <h2 class="exam-title">${exam.name} ${typeBadge} ${pinIcon}</h2>
                    </div>
                    
                    <div class="exam-date">
                        <svg viewBox="0 0 24 24">
                            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/>
                        </svg>
                        ${formatDateTime(exam.date)}
                    </div>
                </div>
                
                <div class="countdown">
                    ${timeObj.isPast ? `
                        <div class="time-box"><span class="num">--</span><span class="lbl">Days</span></div>
                        <div class="time-box" style="grid-column: span 4; justify-content:center; text-align:center;"><span class="num" style="font-size:1.2rem; color:var(--text-secondary);">COMPLETED</span></div>
                    ` : `
                        <div class="time-box"><span class="num js-days">${String(timeObj.days).padStart(2, '0')}</span><span class="lbl">Days</span></div>
                        <div class="time-box"><span class="num js-hours">${String(timeObj.hours).padStart(2, '0')}</span><span class="lbl">Hrs</span></div>
                        <div class="time-box"><span class="num js-mins">${String(timeObj.minutes).padStart(2, '0')}</span><span class="lbl">Min</span></div>
                        <div class="time-box"><span class="num js-secs">${String(timeObj.seconds).padStart(2, '0')}</span><span class="lbl">Sec</span></div>
                    `}
                </div>
            </article>
        `;
    }).join('');

    return `
        <section class="exams-grid">
            ${gridHTML}
        </section>
    `;
};

// Active filters store (empty means show all)
let activeFilters = new Set();

// Render exams based on filters
const renderExams = () => {
    const container = document.getElementById('dynamic-exams-container');
    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    
    // Sort logic (Priority: Pinned first, then Upcoming nearest first, then past exams)
    const sortLogic = (a, b) => {
        const aPinned = pinnedExams.has(a.id);
        const bPinned = pinnedExams.has(b.id);
        
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;

        const timeA = getRemainingTime(a.date);
        const timeB = getRemainingTime(b.date);
        
        if (!timeA.isPast && !timeB.isPast) return timeA.days - timeB.days;
        if (timeA.isPast && timeB.isPast) return new Date(b.date).getTime() - new Date(a.date).getTime();
        return !timeA.isPast ? -1 : 1;
    };

    // Filter logic
    const filteredExams = exams.filter(exam => {
        const matchesSearch = exam.name.toLowerCase().includes(searchQuery);
        let matchesCategory = true;
        
        if (activeFilters.size > 0) {
            if (exam.type === 'central') {
                matchesCategory = activeFilters.has('central');
            } else if (exam.type === 'state') {
                matchesCategory = activeFilters.has(exam.stateName);
            }
        }
        
        return matchesSearch && matchesCategory;
    });

    // Sort ALL filtered exams in a single list
    const sortedExams = filteredExams.sort(sortLogic);

    if (container) {
        container.innerHTML = generateExamsHTML(sortedExams);
    }
};

// Live countdown tick
const tickCountdown = () => {
    const cards = document.querySelectorAll('.exam-card:not(.status-passed)');
    
    cards.forEach(card => {
        const dateStr = card.getAttribute('data-exam-date');
        if (!dateStr) return;

        const timeObj = getRemainingTime(dateStr);
        if (timeObj.isPast) {
            return; 
        }

        const elDays = card.querySelector('.js-days');
        const elHours = card.querySelector('.js-hours');
        const elMins = card.querySelector('.js-mins');
        const elSecs = card.querySelector('.js-secs');

        if (elDays) elDays.textContent = String(timeObj.days).padStart(2, '0');
        if (elHours) elHours.textContent = String(timeObj.hours).padStart(2, '0');
        if (elMins) elMins.textContent = String(timeObj.minutes).padStart(2, '0');
        if (elSecs) elSecs.textContent = String(timeObj.seconds).padStart(2, '0');
    });
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    const container = document.getElementById('dynamic-exams-container');
    
    // Fetch data
    try {
        const [centralRes, stateRes] = await Promise.all([
            fetch('data/central.json'),
            fetch('data/state.json')
        ]);
        
        if (!centralRes.ok || !stateRes.ok) {
            throw new Error("Failed to fetch one or more JSON files");
        }
        
        const centralData = await centralRes.json();
        const stateData = await stateRes.json();
        
        exams = [...centralData, ...stateData];
    } catch (error) {
        console.error("Error loading exam data:", error);
        if (container) {
            container.innerHTML = `<p style="text-align: center; color: var(--danger); margin-top: 2rem;">Failed to load exam data. Please ensure you are running a local server.</p>`;
        }
        return; // Stop initialization if data fails to load
    }

    // Populate filter chips dynamically
    const chipsContainer = document.getElementById('filter-chips-container');
    if (chipsContainer) {
        // Add Central Govt chip
        const centralChip = document.createElement('button');
        centralChip.className = 'filter-chip';
        centralChip.textContent = 'Central Govt';
        centralChip.dataset.filterValue = 'central';
        chipsContainer.appendChild(centralChip);
        
        // Add State chips
        const uniqueStates = [...new Set(exams.filter(e => e.type === 'state' && e.stateName).map(e => e.stateName))];
        uniqueStates.sort().forEach(stateName => {
            const stateChip = document.createElement('button');
            stateChip.className = 'filter-chip';
            stateChip.textContent = stateName;
            stateChip.dataset.filterValue = stateName;
            chipsContainer.appendChild(stateChip);
        });

        // Add event listeners to chips
        const chips = chipsContainer.querySelectorAll('.filter-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                const val = chip.dataset.filterValue;
                if (activeFilters.has(val)) {
                    activeFilters.delete(val);
                    chip.classList.remove('active');
                } else {
                    activeFilters.add(val);
                    chip.classList.add('active');
                }
                renderExams();
            });
        });
    }

    // Initial Render
    renderExams();
    
    // Setup Event Listeners for search
    document.getElementById('search-input').addEventListener('input', renderExams);
    
    // View toggles
    const gridBtn = document.getElementById('view-grid');
    const listBtn = document.getElementById('view-list');

    gridBtn.addEventListener('click', () => {
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
        container.classList.remove('layout-list');
        container.classList.add('layout-grid');
    });

    listBtn.addEventListener('click', () => {
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
        container.classList.remove('layout-grid');
        container.classList.add('layout-list');
    });

    // Start live timer
    setInterval(tickCountdown, 1000);
});
