const entryBtn = document.getElementById('entry-btn');
const leaveBtn = document.getElementById('leave-btn');
const weeklyTab = document.getElementById('weekly-tab');
const monthlyTab = document.getElementById('monthly-tab');
const summaryTable = document.getElementById('summary-table');

let viewType = 'weekly'; // Default view is weekly

async function displaySummary(summary) {
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

  displaySummary(summary);
}

async function saveTimeEntry(entryType) {
  const now = new Date();
  const key = `${entryType}_${now.toISOString()}`;
  await chrome.storage.local.set({ [key]: now });
}

entryBtn.addEventListener('click', async () => {
  await saveTimeEntry('entry');
  await updateSummary();
});

leaveBtn.addEventListener('click', async () => {
  await saveTimeEntry('leave');
  await updateSummary();
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