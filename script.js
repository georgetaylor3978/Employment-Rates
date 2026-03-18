let globalData = [];
let charts = {};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('employment_data.json');
        globalData = await response.json();
        
        if (!globalData || globalData.length === 0) return;

        initSlicers();
        
        // Render Annual Table
        renderAnnualTable();

        // Render initial data (10 years)
        filterDataAndRender(10);
        document.querySelector('.time-btn[data-years="10"]').classList.add('active');

    } catch (error) {
        console.error("Failed to load dashboard data:", error);
    }
});

function initSlicers() {
    const startSelect = document.getElementById('startYear');
    const endSelect = document.getElementById('endYear');
    
    // Extract unique years
    const years = [...new Set(globalData.map(d => d.date.substring(0, 4)))];
    
    years.forEach(year => {
        startSelect.add(new Option(year, year));
        endSelect.add(new Option(year, year));
    });

    startSelect.addEventListener('change', () => applyCustomRange());
    endSelect.addEventListener('change', () => applyCustomRange());

    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const yearsToFilter = e.target.getAttribute('data-years');
            if (yearsToFilter === 'all') {
                filterDataAndRender('all');
            } else {
                filterDataAndRender(parseInt(yearsToFilter));
            }
        });
    });
}

function applyCustomRange() {
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    const startSelect = document.getElementById('startYear');
    const endSelect = document.getElementById('endYear');
    
    let startYear = startSelect.value;
    let endYear = endSelect.value;

    // Prevent invalid ranges
    if (startYear > endYear) {
        endSelect.value = startYear;
        endYear = startYear;
    }
    
    const filtered = globalData.filter(d => {
        const year = d.date.substring(0, 4);
        return year >= startYear && year <= endYear;
    });
    renderAll(filtered);
}

function filterDataAndRender(yearsCount) {
    let filtered;
    if (yearsCount === 'all') {
        filtered = globalData;
    } else {
        const monthsCount = yearsCount * 12;
        filtered = globalData.slice(-monthsCount);
    }
    
    if (filtered.length > 0) {
        document.getElementById('startYear').value = filtered[0].date.substring(0, 4);
        document.getElementById('endYear').value = filtered[filtered.length - 1].date.substring(0, 4);
    }
    
    renderAll(filtered);
}

function renderAll(filteredData) {
    if (!filteredData || filteredData.length === 0) return;
    const latest = filteredData[filteredData.length - 1];
    
    // For KPIs, MoM uses the filtered context or global context?
    // It's usually better to use the exact previous month from global context, not filtered context, to ensure MoM is always accurate even if filtered to 1 year
    const latestGlobalIdx = globalData.findIndex(d => d.date === latest.date);
    const prev = latestGlobalIdx > 0 ? globalData[latestGlobalIdx - 1] : latest;

    renderKPIs(latest, prev);
    renderEmploymentChart(filteredData);
    renderChangeChart(filteredData);
    renderFTPTChart(filteredData);
    renderUnemploymentChart(filteredData);
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

function formatChange(current, previous) {
    const diff = current - previous;
    const sign = diff > 0 ? '+' : '';
    const spanClass = diff > 0 ? 'positive' : (diff < 0 ? 'negative' : 'neutral');
    return `<span class="kpi-change ${spanClass}">${sign}${formatNumber(diff)} MoM</span>`;
}

function renderKPIs(latest, prev) {
    const container = document.getElementById('kpi-container');
    
    const unempRateLatest = ((latest.unemp / latest.labour_force) * 100).toFixed(1);
    const unempRatePrev = ((prev.unemp / prev.labour_force) * 100).toFixed(1);
    const rateDiff = (unempRateLatest - unempRatePrev).toFixed(1);
    const rateSign = rateDiff > 0 ? '+' : '';
    const rateClass = rateDiff > 0 ? 'negative' : (rateDiff < 0 ? 'positive' : 'neutral');

    const kpis = [
        { label: "Total Employed", value: formatNumber(latest.emp), change: formatChange(latest.emp, prev.emp) },
        { label: "Total Unemployed", value: formatNumber(latest.unemp), change: formatChange(latest.unemp, prev.unemp) },
        { label: "Unemployment Rate", value: unempRateLatest + '%', change: `<span class="kpi-change ${rateClass}">${rateSign}${rateDiff}% MoM</span>` },
        { label: "Full-Time Jobs", value: formatNumber(latest.full_time_employed), change: formatChange(latest.full_time_employed, prev.full_time_employed) }
    ];

    container.innerHTML = kpis.map(kpi => `
        <div class="kpi-card">
            <div class="kpi-label">${kpi.label} <span style="text-transform:none;color:#94a3b8;">(${latest.date})</span></div>
            <div class="kpi-value">${kpi.value}</div>
            ${kpi.change}
        </div>
    `).join('');
}

Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = 'Inter';

function renderEmploymentChart(data) {
    if (charts.employment) charts.employment.destroy();
    const ctx = document.getElementById('employmentChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

    charts.employment = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'Total Employed',
                data: data.map(d => d.emp),
                borderColor: '#3b82f6',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
            scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
        }
    });
}

function renderChangeChart(data) {
    if (charts.change) charts.change.destroy();
    const ctx = document.getElementById('employmentChangeChart').getContext('2d');
    
    const labels = [];
    const changes = [];
    for(let i = 0; i < data.length; i++) {
        const item = data[i];
        const idx = globalData.findIndex(d => d.date === item.date);
        if (idx > 0) {
            labels.push(item.date);
            changes.push(item.emp - globalData[idx - 1].emp);
        }
    }

    charts.change = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'MoM Employment Change',
                data: changes,
                backgroundColor: changes.map(val => val > 0 ? '#10B981' : '#EF4444'),
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
            scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
        }
    });
}

function renderFTPTChart(data) {
    if (charts.ftpt) charts.ftpt.destroy();
    const ctx = document.getElementById('ftPtChart').getContext('2d');

    const startFt = data[0].full_time_employed;
    const startPt = data[0].part_time_employed;

    charts.ftpt = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [
                {
                    label: 'Full-Time (% Change)',
                    data: data.map(d => (((d.full_time_employed - startFt) / startFt) * 100).toFixed(2)),
                    borderColor: '#8B5CF6',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4
                },
                {
                    label: 'Part-Time (% Change)',
                    data: data.map(d => (((d.part_time_employed - startPt) / startPt) * 100).toFixed(2)),
                    borderColor: '#14B8A6',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: { 
                    mode: 'index', 
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y + '%';
                        }
                    }
                }
            },
            scales: {
                y: { 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { callback: function(value) { return value + "%"; } }
                },
                x: { grid: { display: false } }
            }
        }
    });
    
    // Update title specifically to denote change relative to start period
    document.querySelector('#ftPtChart').closest('.chart-card').querySelector('h2').innerText = `Full-Time vs Part-Time (% Change since ${data[0].date})`;
}

function renderUnemploymentChart(data) {
    if (charts.unemployment) charts.unemployment.destroy();
    const ctx = document.getElementById('unemploymentChart').getContext('2d');

    charts.unemployment = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'Unemployment Rate (%)',
                data: data.map(d => ((d.unemp / d.labour_force) * 100).toFixed(1)),
                borderColor: '#F59E0B',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 2,
                fill: true,
                pointRadius: 0,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
            scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
        }
    });
}

function renderAnnualTable() {
    const annual = {};
    globalData.forEach(d => {
        const year = d.date.substring(0, 4);
        if (!annual[year]) {
            annual[year] = { ft: 0, pt: 0, count: 0 };
        }
        annual[year].ft += d.full_time_employed;
        annual[year].pt += d.part_time_employed;
        annual[year].count++;
    });

    const tbody = document.querySelector('#annualTable tbody');
    tbody.innerHTML = Object.keys(annual).reverse().map(year => {
        const d = annual[year];
        const avgFt = d.ft / d.count;
        const avgPt = d.pt / d.count;
        return `
            <tr>
                <td>${year}</td>
                <td>${formatNumber(avgFt)}</td>
                <td>${formatNumber(avgPt)}</td>
            </tr>
        `;
    }).join('');
}
