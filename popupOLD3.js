const entryLeaveBtn = document.getElementById('entry-leave-btn');
const weeklyTab = document.getElementById('weekly-tab');
const monthlyTab = document.getElementById('monthly-tab');
const summaryTable = document.getElementById('summary-table');

let viewType = 'weekly'; // Default view is weekly
let currentEntry = null;
let completedCycles = [];

async function displaySummary(summary) {
    const row = document.createElement('tr');
    const periodCell = document.createElement('td');
    periodCell.textContent = period;
    row.appendChild(periodCell);

    const hoursCell = document.createElement('td');
    hoursCell.textContent = (summary[period] / 3600000).toFixed(2); // Convert milliseconds to hours
    row.appendChild(hoursCell);

    summaryTable.appendChild(row);
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
  const entries = await chrome.storage.local.get(null);

  const summary = {};
  let currentEntry = null;

  for (const key in entries) {
    const entryType = key.split('_')[0];
    const timestamp = new Date(entries[key]);

    if (entryType === 'entry') {
      currentEntry = timestamp;
    } else if (entryType === 'leave' && currentEntry) {
      const period = getPeriod(currentEntry, viewType);
      const duration = timestamp - currentEntry;

      if (summary[period]) {
        summary[period] += duration;
      } else {
        summary[period] = duration;
      }

      currentEntry = null;
    }
  }
  const { completedCycles: storedCycles } = await chrome.storage.local.get('completedCycles');
  if (storedCycles) {
    completedCycles = storedCycles.map(({ entry, leave }) => ({ entry: new Date(entry), leave: new Date(leave) }));
  }
  displaySummary(summary);
}

async function saveCompletedCycles() {
  await chrome.storage.local.set({ completedCycles });
}

function downloadCSV() {
  const header = 'Entry,Leave,Duration (hours)\n';
  const rows = completedCycles.map((cycle) => {
    const durationHours = ((cycle.leave - cycle.entry) / 3600000).toFixed(2);
    return `${cycle.entry.toISOString()},${cycle.leave.toISOString()},${durationHours}\n`;
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
    completedCycles.push({ entry: currentEntry, leave: leaveTime });
    currentEntry = null;
    entryLeaveBtn.textContent = 'Entry';
    await saveCompletedCycles(); // Save completed cycles to local storage
    downloadCSV();
    await updateSummary();
  }
});

weeklyTab.addEventListener('click', async () => {
  viewType = 'weekly';
  await updateSummary();
});

monthlyTab.addEventListener('click', async () => {
  viewType = 'monthly';
  await updateSummary();
});

updateSummary();
