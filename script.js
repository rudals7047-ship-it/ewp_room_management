// ---------------------------------------------------------------------------
// 사택 공용공간 당번 로테이션
// 순번: 윤다니엘 -> 박창수 -> 김경민 -> (반복), 매주 월요일 교대
// 기준: 2026-09-14(월) = 박창수 (order index 1)
// ---------------------------------------------------------------------------

const PEOPLE = [
  { name: "윤다니엘", initial: "윤", color: "var(--p0)" },
  { name: "박창수", initial: "박", color: "var(--p1)" },
  { name: "김경민", initial: "김", color: "var(--p2)" },
];

const TASKS = [
  { key: "toilet", icon: "🚿", label: "화장실 청소" },
  { key: "recycle", icon: "♻️", label: "분리수거" },
  { key: "vacuum", icon: "🧹", label: "진공청소기 관리" },
];

const ANCHOR_MONDAY = new Date(2026, 8, 14); // 2026-09-14, Mon
ANCHOR_MONDAY.setHours(0, 0, 0, 0);
const ANCHOR_INDEX = 1; // 박창수

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
const DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const STORAGE_KEY = "room-duty-checklist-v1";

// ---------------------------------------------------------------------------
// date helpers
// ---------------------------------------------------------------------------

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getMonday(d) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function fmtISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtRange(monday) {
  const sunday = addDays(monday, 6);
  const f = (d) => `${d.getMonth() + 1}.${d.getDate()}`;
  return `${f(monday)} (월) – ${f(sunday)} (일)`;
}

function personIndexForMonday(monday) {
  const weeks = Math.round((monday.getTime() - ANCHOR_MONDAY.getTime()) / MS_WEEK);
  return (((ANCHOR_INDEX + weeks) % 3) + 3) % 3;
}

function personForDate(d) {
  const monday = getMonday(d);
  return { monday, person: PEOPLE[personIndexForMonday(monday)] };
}

// ---------------------------------------------------------------------------
// storage
// ---------------------------------------------------------------------------

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getWeekState(monday) {
  const store = loadStore();
  const key = fmtISO(monday);
  return store[key] || { toilet: false, recycle: false, vacuum: false };
}

function toggleWeekTask(monday, taskKey) {
  const store = loadStore();
  const key = fmtISO(monday);
  const state = store[key] || { toilet: false, recycle: false, vacuum: false };
  state[taskKey] = !state[taskKey];
  store[key] = state;
  saveStore(store);
}

// ---------------------------------------------------------------------------
// state
// ---------------------------------------------------------------------------

let viewMonth = startOfDay(new Date());
viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);

let selectedMonday = getMonday(new Date());

// ---------------------------------------------------------------------------
// render: roster chips
// ---------------------------------------------------------------------------

function renderRoster() {
  const el = document.getElementById("roster");
  el.innerHTML = PEOPLE.map(
    (p) => `
    <span class="roster-chip">
      <span class="avatar" style="background:${p.color}">${p.initial}</span>
      ${p.name}
    </span>`
  ).join("");
}

// ---------------------------------------------------------------------------
// render: legend
// ---------------------------------------------------------------------------

function renderLegend() {
  const el = document.getElementById("legend");
  el.innerHTML = PEOPLE.map(
    (p) => `
    <span class="legend-item">
      <span class="legend-dot" style="background:${p.color}"></span>${p.name}
    </span>`
  ).join("");
}

// ---------------------------------------------------------------------------
// render: hero (this week)
// ---------------------------------------------------------------------------

function checkSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 12.5L9.5 18L20 6" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function taskListHTML(monday, containerId) {
  const state = getWeekState(monday);
  return TASKS.map((t) => {
    const done = !!state[t.key];
    return `
      <div class="task-item ${done ? "done" : ""}" data-task="${t.key}" data-container="${containerId}">
        <span class="task-check">${checkSvg()}</span>
        <span class="task-icon">${t.icon}</span>
        <span class="task-label">${t.label}</span>
      </div>`;
  }).join("");
}

function renderHero() {
  const today = new Date();
  const thisMonday = getMonday(today);
  const person = PEOPLE[personIndexForMonday(thisMonday)];

  document.getElementById("heroAvatar").textContent = person.initial;
  document.getElementById("heroAvatar").style.background = person.color;
  document.getElementById("heroName").textContent = person.name;
  document.getElementById("heroRange").textContent = fmtRange(thisMonday);
  document.getElementById("heroTasks").innerHTML = taskListHTML(thisMonday, "hero");
}

// ---------------------------------------------------------------------------
// render: selected week panel
// ---------------------------------------------------------------------------

function renderSelected() {
  const person = PEOPLE[personIndexForMonday(selectedMonday)];
  document.getElementById("selectedRange").textContent = fmtRange(selectedMonday);
  document.getElementById("selectedPerson").innerHTML = `
    <span class="avatar" style="background:${person.color}">${person.initial}</span>
    <span class="name">${person.name}</span>
  `;
  document.getElementById("selectedTasks").innerHTML = taskListHTML(selectedMonday, "selected");
}

// ---------------------------------------------------------------------------
// render: calendar
// ---------------------------------------------------------------------------

function renderCalendar() {
  const label = document.getElementById("monthLabel");
  label.textContent = `${viewMonth.getFullYear()}년 ${viewMonth.getMonth() + 1}월`;

  const grid = document.getElementById("calendar");
  grid.innerHTML = "";

  DOW_LABELS.forEach((d) => {
    const cell = document.createElement("div");
    cell.className = "cal-dow";
    cell.textContent = d;
    grid.appendChild(cell);
  });

  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startDate = addDays(firstOfMonth, -firstOfMonth.getDay()); // back up to Sunday
  const today = startOfDay(new Date());
  const todayMonday = getMonday(today);

  for (let i = 0; i < 42; i++) {
    const d = addDays(startDate, i);
    const { monday, person } = personForDate(d);

    const cell = document.createElement("div");
    cell.className = "cal-day";
    if (d.getMonth() !== viewMonth.getMonth()) cell.classList.add("outside");
    if (fmtISO(d) === fmtISO(today)) cell.classList.add("today");
    if (fmtISO(monday) === fmtISO(selectedMonday)) cell.classList.add("selected");

    cell.style.background = `color-mix(in srgb, ${person.color} 12%, white)`;
    cell.dataset.monday = fmtISO(monday);

    cell.innerHTML = `
      <span class="num">${d.getDate()}</span>
      <span class="dot" style="background:${person.color}"></span>
    `;

    cell.addEventListener("click", () => {
      selectedMonday = getMonday(new Date(cell.dataset.monday));
      renderCalendar();
      renderSelected();
    });

    grid.appendChild(cell);
  }
}

// ---------------------------------------------------------------------------
// render: upcoming preview
// ---------------------------------------------------------------------------

function renderUpcoming() {
  const el = document.getElementById("upcomingList");
  const thisMonday = getMonday(new Date());
  let rows = "";
  for (let i = 0; i < 6; i++) {
    const monday = addDays(thisMonday, i * 7);
    const person = PEOPLE[personIndexForMonday(monday)];
    rows += `
      <div class="upcoming-row ${i === 0 ? "current" : ""}">
        <span class="avatar" style="background:${person.color}">${person.initial}</span>
        <span class="name">${person.name}</span>
        <span class="range">${fmtRange(monday)}${i === 0 ? " · 이번 주" : ""}</span>
      </div>`;
  }
  el.innerHTML = rows;
}

// ---------------------------------------------------------------------------
// events
// ---------------------------------------------------------------------------

function bindTaskClicks() {
  document.body.addEventListener("click", (e) => {
    const item = e.target.closest(".task-item");
    if (!item) return;
    const taskKey = item.dataset.task;
    const container = item.dataset.container;
    const monday = container === "hero" ? getMonday(new Date()) : selectedMonday;
    toggleWeekTask(monday, taskKey);
    renderHero();
    renderSelected();
  });
}

function bindCalendarNav() {
  document.getElementById("prevMonth").addEventListener("click", () => {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById("nextMonth").addEventListener("click", () => {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    renderCalendar();
  });
  document.getElementById("todayBtn").addEventListener("click", () => {
    const today = new Date();
    viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    selectedMonday = getMonday(today);
    renderCalendar();
    renderSelected();
  });
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

function init() {
  renderRoster();
  renderLegend();
  renderHero();
  renderSelected();
  renderCalendar();
  renderUpcoming();
  bindTaskClicks();
  bindCalendarNav();
}

document.addEventListener("DOMContentLoaded", init);
