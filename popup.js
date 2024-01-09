const entryLeaveBtn = document.getElementById('entry-leave-btn');
const downloadBtn = document.getElementById('download-btn');
const weeklyTab = document.getElementById('weekly-tab');
const monthlyTab = document.getElementById('monthly-tab');
const summaryTable = document.getElementById('summary-table');

let viewType = 'weekly'; // Default view is weekly
let currentEntry = null;
let completedCycles = [];

// Load completed cycles in the startup
async function loadCompletedCycles() {
  const data = await chrome.storage.local.get('completedCycles');
  if (data.completedCycles) {
    completedCycles = data.completedCycles.map(cycle => ({
      entry: new Date(cycle.entry), // Converta de volta para objeto Date
      leave: new Date(cycle.leave)  // Converta de volta para objeto Date
    }));
  }
  updateSummary();
}

async function displaySummary(summary) {
  // Clear previous summary table content
  summaryTable.innerHTML = '';

  for (const period in summary) {
    const row = document.createElement('tr');
    const periodCell = document.createElement('td');
    periodCell.textContent = period;
    row.appendChild(periodCell);

    const hoursCell = document.createElement('td');
    hoursCell.textContent = (summary[period] / 3600000).toFixed(2); // Convert milliseconds to hours
    row.appendChild(hoursCell);

    summaryTable.appendChild(row);
  }
}

function getPeriod(date, type) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (type === 'monthly') {
    return `${year}-${month}`;
  }

  const week = Math.floor(date.getDate() / 7) + 1;
  return `${year}-W${week}`;
}

async function updateSummary() {
  const summary = {};
  for (const cycle of completedCycles) {
    const entry = cycle.entry;
    const leave = cycle.leave;

    if (entry && leave) {
      const period = getPeriod(entry, viewType);
      const duration = leave - entry;

      if (summary[period]) {
        summary[period] += duration;
      } else {
        summary[period] = duration;
      }
    }
  }

  displaySummary(summary);
}

async function saveCompletedCycles() {
  const cyclesToSave = completedCycles.map(cycle => ({
    entry: cycle.entry.toISOString(), // Converta para string ISO
    leave: cycle.leave.toISOString()  // Converta para string ISO
  }));
  await chrome.storage.local.set({ completedCycles: cyclesToSave });
}

const clearDataBtn = document.getElementById('clear-data-btn');

clearDataBtn.addEventListener('click', async () => {
  await chrome.storage.local.clear();
  completedCycles = [];
  updateSummary();
});

function formatDate(date) {
  const gmt3Offset = -3 * 60 * 60 * 1000;
  const localDate = new Date(date.getTime() + gmt3Offset);

  const day = String(localDate.getUTCDate()).padStart(2, '0');
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const year = localDate.getUTCFullYear();

  const hours = String(localDate.getUTCHours()).padStart(2, '0');
  const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(localDate.getUTCSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function downloadCSV() {
  const header = 'Entry,Leave,Duration (hours)\n';
  const rows = completedCycles.map((cycle) => {
    if (isNaN(cycle.entry) || isNaN(cycle.leave)) {
      console.error('Invalid date found in completed cycles:', cycle);
      return '';
    }
    const durationHours = ((cycle.leave - cycle.entry) / 3600000).toFixed(2);
    return `${formatDate(cycle.entry)},${formatDate(cycle.leave)},${durationHours}\n`;
  });

  const csvContent = header + rows.join('');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'time_tracker.csv';
  link.click();
}

entryLeaveBtn.addEventListener('click', async () => {
  if (currentEntry === null) {
    currentEntry = new Date();
    entryLeaveBtn.textContent = 'Leave';
  } else {
    const leaveTime = new Date();
    const newCycle = { entry: currentEntry, leave: leaveTime };
    completedCycles.push(newCycle);
    currentEntry = null;
    entryLeaveBtn.textContent = 'Entry';
    await saveCompletedCycles(); // Atualize para chamar a função modificada
    await updateSummary();

    // Show the download button when there's at least one completed cycle
    if (completedCycles.length > 0 && downloadBtn.style.display === 'none') {
      downloadBtn.style.display = 'inline';
    }
  }
});

downloadBtn.addEventListener('click', () => {
  downloadCSV();
});

weeklyTab.addEventListener('click', async () => {
  viewType = 'weekly';
  await updateSummary();
});

monthlyTab.addEventListener('click', async () => {
  viewType = 'monthly';
  await updateSummary();
});

loadCompletedCycles();