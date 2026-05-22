const DEFAULT_REFERENCE_HARVEST_DAYS = 11;
const DEFAULT_BLACK_TRAY_MULTIPLIER = 2.5;
const STORAGE_KEY = "admin-portal-yield-state-v1";

const defaultCrops = [
  { id: "radish-white", name: "Radish White", greenSeedGrams: 30, harvestDays: 11, greenTrayYieldBoxes: 1.25 },
  { id: "radish-purple", name: "Radish Purple", greenSeedGrams: 22, harvestDays: 11, greenTrayYieldBoxes: 1.25 },
  { id: "mustard", name: "Mustard", greenSeedGrams: 20, harvestDays: 12, greenTrayYieldBoxes: 0.5 },
  { id: "peas", name: "Peas", greenSeedGrams: 70, harvestDays: 11, greenTrayYieldBoxes: 1 },
  { id: "sunflower", name: "Sunflower", greenSeedGrams: 80, harvestDays: 11, greenTrayYieldBoxes: 2 },
  { id: "broccoli", name: "Broccoli", greenSeedGrams: 20, harvestDays: 11, greenTrayYieldBoxes: 1.5 },
  { id: "amaranthus-red", name: "Amaranthus Red", greenSeedGrams: 10, harvestDays: 20, greenTrayYieldBoxes: 0.5 },
  { id: "fenugreek", name: "Fenugreek", greenSeedGrams: 45, harvestDays: 14, greenTrayYieldBoxes: 1 },
  { id: "wheatgrass", name: "Wheatgrass", greenSeedGrams: 65, harvestDays: 11, greenTrayYieldBoxes: 2 },
];

const trayTypes = [
  { id: "green", shortLabel: "GT", name: "Green Tray" },
  { id: "black", shortLabel: "BT", name: "Black Tray" },
];

const today = startOfDay(new Date());
const seedingDates = Array.from({ length: 11 }, (_, index) => addDays(today, index - 3));

const state = loadState();
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const landingView = document.getElementById("landing-view");
const yieldView = document.getElementById("yield-view");
const openYieldAppButton = document.getElementById("open-yield-app");
const backToHomeButton = document.getElementById("back-to-home");
const planningWindowLabelElement = document.getElementById("planning-window-label");
const windowTotalElement = document.getElementById("window-total");
const monthTotalElement = document.getElementById("month-total");
const blackTrayMultiplierInput = document.getElementById("black-tray-multiplier");
const configTable = document.getElementById("config-table");
const seedingTable = document.getElementById("seeding-table");
const boxesTable = document.getElementById("boxes-table");
const calendarTitleElement = document.getElementById("calendar-title");
const calendarElement = document.getElementById("calendar");
const prevMonthButton = document.getElementById("prev-month");
const nextMonthButton = document.getElementById("next-month");

openYieldAppButton.addEventListener("click", () => {
  landingView.classList.add("hidden");
  yieldView.classList.remove("hidden");
});

backToHomeButton.addEventListener("click", () => {
  yieldView.classList.add("hidden");
  landingView.classList.remove("hidden");
});

prevMonthButton.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  renderCalendar();
  renderSummary();
});

nextMonthButton.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  renderCalendar();
  renderSummary();
});

blackTrayMultiplierInput.addEventListener("change", handleBlackTrayMultiplierInput);

renderAll();

function loadState() {
  const fallbackState = {
    blackTrayMultiplier: DEFAULT_BLACK_TRAY_MULTIPLIER,
    crops: structuredClone(defaultCrops),
    seeding: createEmptySeedingData(defaultCrops),
  };

  const savedState = localStorage.getItem(STORAGE_KEY);

  if (!savedState) {
    return fallbackState;
  }

  try {
    const parsed = JSON.parse(savedState);
    const crops = mergeCrops(parsed.crops);
    const blackTrayMultiplier = toPositiveNumber(parsed.blackTrayMultiplier, DEFAULT_BLACK_TRAY_MULTIPLIER);
    return {
      blackTrayMultiplier,
      crops,
      seeding: createSeedState(crops, parsed.seeding),
    };
  } catch (error) {
    return fallbackState;
  }
}

function mergeCrops(savedCrops) {
  if (!Array.isArray(savedCrops)) {
    return structuredClone(defaultCrops);
  }

  const savedById = new Map(savedCrops.map((crop) => [crop.id, crop]));

  return defaultCrops.map((crop) => {
    const saved = savedById.get(crop.id);
    if (!saved) {
      return { ...crop };
    }

    return {
      ...crop,
      name: typeof saved.name === "string" && saved.name.trim() ? saved.name.trim() : crop.name,
      greenSeedGrams: toPositiveNumber(saved.greenSeedGrams, crop.greenSeedGrams),
      harvestDays: toPositiveInteger(saved.harvestDays, crop.harvestDays),
      greenTrayYieldBoxes: toPositiveNumber(saved.greenTrayYieldBoxes, crop.greenTrayYieldBoxes),
    };
  });
}

function createEmptySeedingData(crops) {
  const data = {};

  crops.forEach((crop) => {
    data[crop.id] = {};

    trayTypes.forEach((tray) => {
      data[crop.id][tray.id] = {};

      seedingDates.forEach((date) => {
        data[crop.id][tray.id][toDateKey(date)] = 0;
      });
    });
  });

  return data;
}

function createSeedState(crops, savedSeeding) {
  const base = createEmptySeedingData(crops);

  if (!savedSeeding || typeof savedSeeding !== "object") {
    return base;
  }

  crops.forEach((crop) => {
    trayTypes.forEach((tray) => {
      seedingDates.forEach((date) => {
        const key = toDateKey(date);
        const savedValue = savedSeeding?.[crop.id]?.[tray.id]?.[key];
        base[crop.id][tray.id][key] = toPositiveInteger(savedValue, 0);
      });
    });
  });

  return base;
}

function persistState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      blackTrayMultiplier: state.blackTrayMultiplier,
      crops: state.crops,
      seeding: state.seeding,
    })
  );
}

function renderAll() {
  blackTrayMultiplierInput.value = formatNumber(state.blackTrayMultiplier);
  renderSummary();
  renderConfigTable();
  renderSeedingTable();
  renderBoxesTable();
  renderCalendar();
}

function renderSummary() {
  planningWindowLabelElement.textContent = `${formatShortDate(seedingDates[0])} to ${formatShortDate(seedingDates[seedingDates.length - 1])}`;
  windowTotalElement.textContent = formatNumber(getTotalSeededTraysInWindow());
  monthTotalElement.textContent = formatNumber(getMonthTotalBoxes(visibleMonth));
}

function renderConfigTable() {
  const rows = state.crops
    .map((crop) => {
      const blackSeed = crop.greenSeedGrams * state.blackTrayMultiplier;
      const blackYield = crop.greenTrayYieldBoxes * state.blackTrayMultiplier;

      return `
        <tr>
          <td class="sticky-column">${escapeHtml(crop.name)}</td>
          <td>
            <input class="data-input data-input--small config-input" type="text" value="${escapeAttribute(crop.name)}" data-crop-id="${crop.id}" data-field="name" aria-label="${escapeAttribute(crop.name)} name">
          </td>
          <td>
            <input class="data-input config-input" type="number" min="0" step="0.1" value="${formatNumber(crop.greenSeedGrams)}" data-crop-id="${crop.id}" data-field="greenSeedGrams" aria-label="${escapeAttribute(crop.name)} green seed grams">
          </td>
          <td>${formatNumber(blackSeed)}</td>
          <td>
            <input class="data-input config-input" type="number" min="1" step="1" value="${crop.harvestDays}" data-crop-id="${crop.id}" data-field="harvestDays" aria-label="${escapeAttribute(crop.name)} harvest days">
          </td>
          <td>
            <input class="data-input config-input" type="number" min="0" step="0.05" value="${formatNumber(crop.greenTrayYieldBoxes)}" data-crop-id="${crop.id}" data-field="greenTrayYieldBoxes" aria-label="${escapeAttribute(crop.name)} green tray box yield">
          </td>
          <td>${formatNumber(blackYield)}</td>
        </tr>
      `;
    })
    .join("");

  configTable.innerHTML = `
    <thead>
      <tr>
        <th class="sticky-column">Crop</th>
        <th>Name</th>
        <th>Green Seed (g)</th>
        <th>Black Seed (g)</th>
        <th>Harvest Days</th>
        <th>Green Yield (boxes)</th>
        <th>Black Yield (boxes)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  `;

  configTable.querySelectorAll(".config-input").forEach((input) => {
    input.addEventListener("change", handleConfigInput);
  });
}

function renderSeedingTable() {
  const headers = seedingDates.map((date) => renderDateHeader(date)).join("");
  const bodyRows = [];

  state.crops.forEach((crop) => {
    bodyRows.push(`
      <tr class="section-row">
        <td class="sticky-column">${escapeHtml(crop.name)}</td>
        <td colspan="${seedingDates.length}">Harvest ${crop.harvestDays} days after seeding | Green yield ${formatNumber(crop.greenTrayYieldBoxes)} | Black yield ${formatNumber(getTrayYieldBoxes(crop, "black"))}</td>
      </tr>
    `);

    trayTypes.forEach((tray) => {
      const cells = seedingDates
        .map((date) => {
          const key = toDateKey(date);
          const value = state.seeding[crop.id][tray.id][key];
          return `
            <td>
              <input
                class="data-input seeding-input"
                type="number"
                min="0"
                step="1"
                value="${value}"
                data-crop-id="${crop.id}"
                data-tray-id="${tray.id}"
                data-date="${key}"
                aria-label="${escapeAttribute(crop.name)} ${tray.name} on ${formatAriaDate(date)}"
              >
            </td>
          `;
        })
        .join("");

      bodyRows.push(`
        <tr>
          <td class="sticky-column">
            <div class="tray-label">
              <span>${escapeHtml(crop.name)} ${tray.shortLabel}</span>
              <small>${tray.name}</small>
            </div>
          </td>
          ${cells}
        </tr>
      `);
    });
  });

  const totalCells = seedingDates
    .map((date) => `<td>${formatNumber(getTotalSeededTraysForDate(date))}</td>`)
    .join("");

  seedingTable.innerHTML = `
    <thead>
      <tr>
        <th class="sticky-column">Seeding</th>
        ${headers}
      </tr>
    </thead>
    <tbody>
      ${bodyRows.join("")}
      <tr class="totals-row">
        <td class="sticky-column">Total Trays</td>
        ${totalCells}
      </tr>
    </tbody>
  `;

  seedingTable.querySelectorAll(".seeding-input").forEach((input) => {
    input.addEventListener("input", handleSeedingInput);
  });
}

function renderBoxesTable() {
  const harvestDates = getHarvestDatesForWindow();
  const headers = harvestDates
    .map((date) => `<th>${formatDayMonth(date)}<br><span class="rule-chip">${formatWeekday(date)}</span></th>`)
    .join("");

  const cropRows = state.crops
    .map((crop) => {
      const cells = harvestDates
        .map((date) => `<td>${formatNumber(getCropBoxesForHarvestDate(crop, date))}</td>`)
        .join("");

      return `
        <tr>
          <td class="sticky-column">${escapeHtml(crop.name)}</td>
          ${cells}
        </tr>
      `;
    })
    .join("");

  const totalCells = harvestDates
    .map((date) => `<td>${formatNumber(getTotalBoxesForHarvestDate(date))}</td>`)
    .join("");

  boxesTable.innerHTML = `
    <thead>
      <tr>
        <th class="sticky-column">Boxes</th>
        ${headers}
      </tr>
    </thead>
    <tbody>
      ${cropRows}
      <tr class="totals-row">
        <td class="sticky-column">Total Boxes</td>
        ${totalCells}
      </tr>
    </tbody>
  `;
}

function renderCalendar() {
  calendarTitleElement.textContent = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const monthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
  const calendarStart = addDays(monthStart, -monthStart.getDay());
  const calendarEnd = addDays(monthEnd, 6 - monthEnd.getDay());
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const weekdayMarkup = weekdays.map((day) => `<div class="calendar-weekday">${day}</div>`).join("");
  const cells = [];
  let cursor = calendarStart;

  while (cursor <= calendarEnd) {
    const breakdown = getHarvestBreakdownForDate(cursor);
    const inMonth = cursor.getMonth() === visibleMonth.getMonth();
    const isToday = isSameDate(cursor, today);
    const classes = [
      "calendar-day",
      inMonth ? "" : "calendar-day--muted",
      isToday ? "calendar-day--today" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const breakdownMarkup = breakdown.length
      ? breakdown
          .map((item) => `<span>${escapeHtml(item.name)}: ${formatNumber(item.boxes)}</span>`)
          .join("")
      : "<span>No projected boxes</span>";

    cells.push(`
      <article class="${classes}">
        <div class="calendar-date">
          <span>${cursor.getDate()}</span>
          ${isToday ? "<small>Today</small>" : ""}
        </div>
        <div class="calendar-total">
          <strong>${formatNumber(getTotalBoxesForHarvestDate(cursor))}</strong> boxes
        </div>
        <div class="calendar-breakdown">
          ${breakdownMarkup}
        </div>
      </article>
    `);

    cursor = addDays(cursor, 1);
  }

  calendarElement.innerHTML = `
    <div class="calendar-grid">
      ${weekdayMarkup}
      ${cells.join("")}
    </div>
  `;
}

function handleBlackTrayMultiplierInput(event) {
  state.blackTrayMultiplier = toPositiveNumber(event.target.value, DEFAULT_BLACK_TRAY_MULTIPLIER);
  event.target.value = formatNumber(state.blackTrayMultiplier);
  persistState();
  renderAll();
}

function handleConfigInput(event) {
  const input = event.target;
  const crop = state.crops.find((item) => item.id === input.dataset.cropId);

  if (!crop) {
    return;
  }

  if (input.dataset.field === "name") {
    crop.name = input.value.trim() || crop.name;
  }

  if (input.dataset.field === "greenSeedGrams") {
    crop.greenSeedGrams = toPositiveNumber(input.value, crop.greenSeedGrams);
  }

  if (input.dataset.field === "harvestDays") {
    crop.harvestDays = toPositiveInteger(input.value, crop.harvestDays);
  }

  if (input.dataset.field === "greenTrayYieldBoxes") {
    crop.greenTrayYieldBoxes = toPositiveNumber(input.value, crop.greenTrayYieldBoxes);
  }

  persistState();
  renderAll();
}

function handleSeedingInput(event) {
  const input = event.target;
  const cropId = input.dataset.cropId;
  const trayId = input.dataset.trayId;
  const dateKey = input.dataset.date;
  const value = toPositiveInteger(input.value, 0);

  state.seeding[cropId][trayId][dateKey] = value;
  input.value = String(value);

  persistState();
  renderSummary();
  renderBoxesTable();
  renderCalendar();
  updateSeedingTotals();
}

function updateSeedingTotals() {
  const totalCells = Array.from(seedingTable.querySelectorAll(".totals-row td")).slice(1);
  totalCells.forEach((cell, index) => {
    cell.textContent = formatNumber(getTotalSeededTraysForDate(seedingDates[index]));
  });
}

function getTotalSeededTraysInWindow() {
  return state.crops.reduce((total, crop) => {
    return total + trayTypes.reduce((trayTotal, tray) => {
      return trayTotal + seedingDates.reduce((dateTotal, date) => {
        const key = toDateKey(date);
        return dateTotal + state.seeding[crop.id][tray.id][key];
      }, 0);
    }, 0);
  }, 0);
}

function getTotalSeededTraysForDate(date) {
  const key = toDateKey(date);
  return state.crops.reduce((total, crop) => {
    return total + trayTypes.reduce((trayTotal, tray) => trayTotal + state.seeding[crop.id][tray.id][key], 0);
  }, 0);
}

function getTrayYieldBoxes(crop, trayId) {
  if (trayId === "black") {
    return crop.greenTrayYieldBoxes * state.blackTrayMultiplier;
  }

  return crop.greenTrayYieldBoxes;
}

function getHarvestDatesForWindow() {
  const maxHarvestDays = Math.max(...state.crops.map((crop) => crop.harvestDays));
  const first = addDays(seedingDates[0], DEFAULT_REFERENCE_HARVEST_DAYS);
  const last = addDays(seedingDates[seedingDates.length - 1], maxHarvestDays);
  const dates = [];
  let cursor = first;

  while (cursor <= last) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function getCropBoxesForHarvestDate(crop, harvestDate) {
  const seedingDate = addDays(harvestDate, -crop.harvestDays);
  const key = toDateKey(seedingDate);
  const greenTrays = state.seeding[crop.id].green[key] ?? 0;
  const blackTrays = state.seeding[crop.id].black[key] ?? 0;

  return (greenTrays * getTrayYieldBoxes(crop, "green")) + (blackTrays * getTrayYieldBoxes(crop, "black"));
}

function getTotalBoxesForHarvestDate(harvestDate) {
  return state.crops.reduce((total, crop) => total + getCropBoxesForHarvestDate(crop, harvestDate), 0);
}

function getHarvestBreakdownForDate(harvestDate) {
  return state.crops
    .map((crop) => ({
      name: crop.name,
      boxes: getCropBoxesForHarvestDate(crop, harvestDate),
    }))
    .filter((item) => item.boxes > 0);
}

function getMonthTotalBoxes(monthDate) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  let total = 0;
  let cursor = monthStart;

  while (cursor <= monthEnd) {
    total += getTotalBoxesForHarvestDate(cursor);
    cursor = addDays(cursor, 1);
  }

  return total;
}

function renderDateHeader(date) {
  const weekday = formatWeekday(date);
  const defaultHarvestDate = addDays(date, DEFAULT_REFERENCE_HARVEST_DAYS);
  return `
    <th>
      <div class="date-header">
        <span class="date-header__seed">${formatDayMonth(date)}</span>
        <span class="date-header__meta">${weekday}</span>
        <span class="date-header__harvest">${formatDayMonth(defaultHarvestDate)}</span>
      </div>
    </th>
  `;
}

function toPositiveNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function isSameDate(left, right) {
  return toDateKey(left) === toDateKey(right);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(date);
}

function formatDayMonth(date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(date);
}

function formatWeekday(date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function formatAriaDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatNumber(value) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return Number(value.toFixed(2)).toString();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
