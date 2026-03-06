/* Garmin Running Dashboard (Totals)
   - Pure local HTML: loads files via directory picker (no server required)
   - Visuals: D3 (timeline + earth donut), Leaflet heatmap (GPS)

   Expected inputs (flexible):
   - Either a single activities list JSON (often called *activities*.json) containing an array of activities
   - And/or multiple activity detail JSON files that include GPS points / polyline

   The loader tries to infer:
   - distance (meters), duration (seconds), start time, activity type
   - GPS points from trackPoints[] or samples[] or encoded polyline strings
*/

// ------------------------------
// Small UI helpers
// ------------------------------
// 
// app.js (v4)

const EARTH_CIRCUMFERENCE_KM = 40075;
const ACTIVITY_INDEX_PATH = "data/activity_data/activity_index.json";

const state = {
  activities: [],
  gpsPoints: [],
  years: [],
  selectedYear: null,
  gpsMap: null,
  gpsLayer: null,
  tooltip: null
};

document.addEventListener("DOMContentLoaded", async () => {
  initUI();
  setStatus("Loading data from /data…");

  try {
    const data = await loadFromRepoData();
    applyLoadedData(data, "Loaded data automatically from /data");
  } catch (err) {
    console.warn("Auto-load failed:", err);
    setStatus("Could not auto-load /data. You can still use Load Folder…");
  }
});

function initUI() {
  document.getElementById("reloadBtn").addEventListener("click", async () => {
    setStatus("Reloading from /data…");
    try {
      const data = await loadFromRepoData();
      applyLoadedData(data, "Reloaded data from /data");
    } catch (err) {
      console.error(err);
      setStatus("Reload from /data failed.");
    }
  });

  document.getElementById("folderPicker").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setStatus("Parsing uploaded folder…");
    try {
      const data = await loadFromFolderFiles(files);
      applyLoadedData(data, `Loaded ${data.activities.length} running activities from selected folder`);
    } catch (err) {
      console.error(err);
      setStatus("Failed to parse uploaded folder.");
    }
  });

  document.getElementById("prevYear").addEventListener("click", () => {
    if (!state.years.length) return;
    const idx = state.years.indexOf(state.selectedYear);
    const nextIdx = idx <= 0 ? state.years.length - 1 : idx - 1;
    setSelectedYear(state.years[nextIdx]);
  });

  document.getElementById("nextYear").addEventListener("click", () => {
    if (!state.years.length) return;
    const idx = state.years.indexOf(state.selectedYear);
    const nextIdx = idx >= state.years.length - 1 ? 0 : idx + 1;
    setSelectedYear(state.years[nextIdx]);
  });

  document.getElementById("yearSelect").addEventListener("change", (e) => {
    setSelectedYear(Number(e.target.value));
  });

  state.tooltip = document.createElement("div");
  state.tooltip.className = "tooltip";
  document.body.appendChild(state.tooltip);

  window.addEventListener("resize", debounce(() => renderAll(), 100));
}

/* ---------------------------
   Loading
--------------------------- */

async function loadFromRepoData() {
  const index = await fetch(ACTIVITY_INDEX_PATH).then(assertOk).then(r => r.json());

  const activityPromises = index.map(async (relativePath) => {
    const json = await fetch(`data/activity_data/${relativePath}`).then(assertOk).then(r => r.json());
    return parseActivityCore(json);
  });

  const parsed = (await Promise.all(activityPromises)).filter(Boolean);
  const gpsPoints = [];

  return {
    activities: parsed,
    gpsPoints
  };
}

async function loadFromFolderFiles(files) {
  const activityFiles = files.filter(f => /activity_core/i.test(f.webkitRelativePath || f.name) && f.name.endsWith(".json"));
  const parsed = [];

  for (const file of activityFiles) {
    try {
      const json = JSON.parse(await file.text());
      const row = parseActivityCore(json);
      if (row) parsed.push(row);
    } catch (err) {
      console.warn("Could not parse", file.name, err);
    }
  }

  return {
    activities: parsed,
    gpsPoints: []
  };
}

function parseActivityCore(json) {
  const typeKey = json?.activityTypeDTO?.typeKey;
  if (typeKey !== "running") return null;

  const s = json?.summaryDTO || {};
  const start = s.startTimeLocal || s.startTimeGMT || s.startTime;
  if (!start) return null;

  const date = new Date(start);
  if (Number.isNaN(date.getTime())) return null;

  const distanceKm = (Number(s.distance) || 0) / 1000;
  const durationSec = Number(s.duration) || 0;
  const durationHours = durationSec / 3600;
  const avgSpeed = Number(s.averageSpeed) || null; // m/s
  const avgHR = numberOrNull(s.averageHR);
  const maxHR = numberOrNull(s.maxHR);
  const steps = numberOrNull(s.steps);

  let paceMinPerKm = null;
  if (avgSpeed && avgSpeed > 0) {
    paceMinPerKm = 1000 / avgSpeed / 60;
  } else if (distanceKm > 0 && durationSec > 0) {
    paceMinPerKm = (durationSec / 60) / distanceKm;
  }

  let cadenceSpm = null;
  if (steps && durationSec > 0) {
    cadenceSpm = steps / (durationSec / 60);
  }

  return {
    id: json.activityId || json.activityUUID || cryptoRandomish(date, distanceKm),
    date,
    dateKey: isoDate(date),
    year: date.getFullYear(),
    distanceKm,
    durationSec,
    durationHours,
    paceMinPerKm,
    avgHR,
    maxHR,
    cadenceSpm,
    steps,
    raw: json
  };
}

/* ---------------------------
   State / render
--------------------------- */

function applyLoadedData(data, statusText) {
  state.activities = data.activities.sort((a, b) => a.date - b.date);
  state.gpsPoints = data.gpsPoints || [];
  state.years = Array.from(new Set(state.activities.map(d => d.year))).sort((a, b) => a - b);
  state.selectedYear = state.years[state.years.length - 1] || null;

  populateYearSelect();
  renderAll();
  setStatus(statusText);
}

function populateYearSelect() {
  const select = document.getElementById("yearSelect");
  select.innerHTML = "";
  state.years.forEach(y => {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    if (y === state.selectedYear) opt.selected = true;
    select.appendChild(opt);
  });
  updateYearLabel();
}

function setSelectedYear(year) {
  state.selectedYear = year;
  document.getElementById("yearSelect").value = String(year);
  updateYearLabel();
  renderYearly();
}

function updateYearLabel() {
  document.getElementById("yearLabel").textContent = state.selectedYear ?? "—";
}

function renderAll() {
  renderTotals();
  renderYearly();
}

function renderTotals() {
  const acts = state.activities;
  const totalKm = d3.sum(acts, d => d.distanceKm);
  const totalHours = d3.sum(acts, d => d.durationHours);
  const totalRuns = acts.length;

  setText("totalKm", formatNumber(totalKm, 0));
  setText("totalHours", formatNumber(totalHours, 0));
  setText("totalRuns", formatNumber(totalRuns, 0));

  const prs = computeApproxPRs(acts);
  setText("prMarathon", prs.marathon || "—");
  setText("prHalf", prs.half || "—");
  setText("pr10k", prs.tenK || "—");
  setText("pr5k", prs.fiveK || "—");

  renderEarthProgress(totalKm);
  renderTotalsTimeline(acts);
  renderGpsMap(state.gpsPoints);
}

function renderYearly() {
  const year = state.selectedYear;
  const acts = state.activities.filter(d => d.year === year);

  setText("yearKm", formatNumber(d3.sum(acts, d => d.distanceKm), 0));
  setText("yearHours", formatNumber(d3.sum(acts, d => d.durationHours), 0));
  setText("yearRuns", formatNumber(acts.length, 0));

  renderYearDistance(acts, year);
  renderPaceScatter(acts, year);
  renderHrScatter(acts, year);
  renderCadenceScatter(acts, year);
  renderCalendar(acts, year);
}

/* ---------------------------
   Totals visuals
--------------------------- */

function renderEarthProgress(totalKm) {
  const pct = totalKm / EARTH_CIRCUMFERENCE_KM;
  const clamped = Math.max(0, Math.min(pct, 1));
  const svg = d3.select("#earthSvg");
  svg.selectAll("*").remove();

  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = 90;

  const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

  const bgArc = d3.arc()
    .innerRadius(r - 16)
    .outerRadius(r)
    .startAngle(0)
    .endAngle(Math.PI * 2);

  const fgArc = d3.arc()
    .innerRadius(r - 20)
    .outerRadius(r + 2)
    .startAngle(-Math.PI / 2)
    .endAngle(-Math.PI / 2 + Math.PI * 2 * clamped);

  g.append("path")
    .attr("d", bgArc())
    .attr("fill", "rgba(255,255,255,0.08)");

  const gradId = "earthGrad";
  const defs = svg.append("defs");
  const grad = defs.append("linearGradient")
    .attr("id", gradId)
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "100%").attr("y2", "100%");

  grad.append("stop").attr("offset", "0%").attr("stop-color", "#56d4ff");
  grad.append("stop").attr("offset", "100%").attr("stop-color", "#6f8cff");

  g.append("path")
    .attr("d", fgArc())
    .attr("fill", `url(#${gradId})`)
    .attr("filter", "drop-shadow(0 0 10px rgba(111,140,255,0.4))");

  g.append("circle")
    .attr("r", r - 26)
    .attr("fill", "rgba(255,255,255,0.02)")
    .attr("stroke", "rgba(255,255,255,0.08)")
    .attr("stroke-width", 1);

  const angle = -Math.PI / 2 + Math.PI * 2 * clamped;
  const runnerX = Math.cos(angle) * (r + 10);
  const runnerY = Math.sin(angle) * (r + 10);

  const runner = g.append("g")
    .attr("transform", `translate(${runnerX},${runnerY}) rotate(${angle * 180 / Math.PI + 90})`);

  runner.append("circle")
    .attr("cx", 0)
    .attr("cy", -12)
    .attr("r", 4.5)
    .attr("fill", "#eef4ff");

  runner.append("line")
    .attr("x1", 0).attr("y1", -7)
    .attr("x2", 0).attr("y2", 5)
    .attr("stroke", "#eef4ff")
    .attr("stroke-width", 3)
    .attr("stroke-linecap", "round");

  runner.append("line")
    .attr("x1", 0).attr("y1", -2)
    .attr("x2", -9).attr("y2", 3)
    .attr("stroke", "#eef4ff")
    .attr("stroke-width", 3)
    .attr("stroke-linecap", "round");

  runner.append("line")
    .attr("x1", 0).attr("y1", -1)
    .attr("x2", 8).attr("y2", 5)
    .attr("stroke", "#eef4ff")
    .attr("stroke-width", 3)
    .attr("stroke-linecap", "round");

  runner.append("line")
    .attr("x1", 0).attr("y1", 5)
    .attr("x2", -8).attr("y2", 15)
    .attr("stroke", "#eef4ff")
    .attr("stroke-width", 3)
    .attr("stroke-linecap", "round");

  runner.append("line")
    .attr("x1", 0).attr("y1", 5)
    .attr("x2", 10).attr("y2", 15)
    .attr("stroke", "#eef4ff")
    .attr("stroke-width", 3)
    .attr("stroke-linecap", "round");

  runner.append("animateTransform")
    .attr("attributeName", "transform")
    .attr("type", "translate")
    .attr("values", `${runnerX},${runnerY}; ${runnerX},${runnerY - 3}; ${runnerX},${runnerY}`)
    .attr("dur", "1.2s")
    .attr("repeatCount", "indefinite");

  setText("earthPctText", `${formatNumber(pct * 100, 1)}%`);
  setText("earthSubText", "around the earth");
}

function renderTotalsTimeline(acts) {
  const container = document.getElementById("totalsTimeline");
  clearNode(container);

  const daily = aggregateAllDays(acts);
  if (!daily.length) return emptyChart(container, "No data");

  const years = d3.group(acts, d => d.year);
  const yearlyAvgBars = Array.from(years, ([year, items]) => {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const days = dayDiffInclusive(start, end);
    return {
      year,
      date: new Date(year, 6, 1),
      avgKmPerDay: d3.sum(items, d => d.distanceKm) / days
    };
  });

  const svg = createSvg(container);
  const { width, height, innerW, innerH, g } = chartFrame(svg, { top: 16, right: 20, bottom: 36, left: 46 });

  const x = d3.scaleTime()
    .domain(d3.extent(daily, d => d.date))
    .range([0, innerW]);

  const y = d3.scaleLinear()
    .domain([0, d3.max([
      d3.max(daily, d => d.distanceKm),
      d3.max(yearlyAvgBars, d => d.avgKmPerDay)
    ]) * 1.12 || 1])
    .nice()
    .range([innerH, 0]);

  g.append("g")
    .attr("class", "gridline")
    .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(""));

  const barWidth = Math.max(10, innerW / Math.max(1, yearlyAvgBars.length * 3));
  g.selectAll(".yearbar")
    .data(yearlyAvgBars)
    .enter()
    .append("rect")
    .attr("x", d => x(d.date) - barWidth / 2)
    .attr("y", d => y(d.avgKmPerDay))
    .attr("width", barWidth)
    .attr("height", d => innerH - y(d.avgKmPerDay))
    .attr("rx", 8)
    .attr("fill", "rgba(111, 140, 255, 0.18)")
    .attr("stroke", "rgba(111, 140, 255, 0.35)");

  const area = d3.area()
    .x(d => x(d.date))
    .y0(innerH)
    .y1(d => y(d.distanceKm))
    .curve(d3.curveMonotoneX);

  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.distanceKm))
    .curve(d3.curveMonotoneX);

  g.append("path")
    .datum(daily)
    .attr("fill", "rgba(86, 212, 255, 0.15)")
    .attr("d", area);

  g.append("path")
    .datum(daily)
    .attr("fill", "none")
    .attr("stroke", "#56d4ff")
    .attr("stroke-width", 2.2)
    .attr("d", line);

  const xAxis = d3.axisBottom(x).ticks(Math.min(10, daily.length / 50)).tickFormat(d3.timeFormat("%Y"));
  const yAxis = d3.axisLeft(y).ticks(5);

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerH})`)
    .call(xAxis);

  g.append("g")
    .attr("class", "axis")
    .call(yAxis);

  const overlay = g.append("rect")
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("fill", "transparent");

  overlay.on("mousemove", (event) => {
    const [mx] = d3.pointer(event);
    const date = x.invert(mx);
    const bisect = d3.bisector(d => d.date).center;
    const idx = bisect(daily, date);
    const d = daily[idx];
    if (!d) return;
    showTooltip(event, `${fmtDate(d.date)}<br>${formatNumber(d.distanceKm, 2)} km`);
  }).on("mouseleave", hideTooltip);
}

function renderGpsMap(points) {
  const note = document.getElementById("gpsNote");

  if (!state.gpsMap) {
    state.gpsMap = L.map("gpsMap", {
      zoomControl: true,
      attributionControl: true
    }).setView([20, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(state.gpsMap);
  }

  if (state.gpsLayer) {
    state.gpsMap.removeLayer(state.gpsLayer);
    state.gpsLayer = null;
  }

  if (!points || !points.length) {
    note.textContent = "No GPS points loaded yet. We can wire /data/logged_data next.";
    setTimeout(() => state.gpsMap.invalidateSize(), 50);
    return;
  }

  state.gpsLayer = L.heatLayer(points, {
    radius: 10,
    blur: 12,
    maxZoom: 13
  }).addTo(state.gpsMap);

  const bounds = L.latLngBounds(points.map(p => [p[0], p[1]]));
  if (bounds.isValid()) state.gpsMap.fitBounds(bounds.pad(0.1));
  note.textContent = `${formatNumber(points.length, 0)} GPS points`;
  setTimeout(() => state.gpsMap.invalidateSize(), 50);
}

/* ---------------------------
   Yearly charts
--------------------------- */

function renderYearDistance(acts, year) {
  const container = document.getElementById("yearDistance");
  clearNode(container);
  if (!acts.length) return emptyChart(container, `No running data for ${year}`);

  const daily = fullYearDailySeries(acts, year);
  const weekly = weeklyTotalsFromDaily(daily);

  const svg = createSvg(container);
  const { innerW, innerH, g } = chartFrame(svg, { top: 10, right: 14, bottom: 28, left: 42 });

  const x = d3.scaleTime()
    .domain([new Date(year, 0, 1), new Date(year, 11, 31)])
    .range([0, innerW]);

  const maxY = Math.max(
    d3.max(daily, d => d.distanceKm) || 0,
    d3.max(weekly, d => d.totalKm) || 0
  );

  const y = d3.scaleLinear()
    .domain([0, maxY * 1.12 || 1])
    .nice()
    .range([innerH, 0]);

  g.append("g")
    .attr("class", "gridline")
    .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(""));

  const barW = Math.max(1, innerW / daily.length - 0.6);

  g.selectAll(".dailybar")
    .data(daily)
    .enter()
    .append("rect")
    .attr("x", d => x(d.date) - barW / 2)
    .attr("y", d => y(d.distanceKm))
    .attr("width", barW)
    .attr("height", d => innerH - y(d.distanceKm))
    .attr("rx", 1.2)
    .attr("fill", "rgba(111,140,255,0.62)");

  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.totalKm))
    .curve(d3.curveMonotoneX);

  g.append("path")
    .datum(weekly)
    .attr("fill", "none")
    .attr("stroke", "#56d4ff")
    .attr("stroke-width", 2.2)
    .attr("d", line);

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(d3.timeMonth.every(2)).tickFormat(d3.timeFormat("%b")));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(4));

  const overlay = g.append("rect")
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("fill", "transparent");

  overlay.on("mousemove", (event) => {
    const [mx] = d3.pointer(event);
    const date = x.invert(mx);
    const idx = d3.bisector(d => d.date).center(daily, date);
    const d = daily[idx];
    if (!d) return;
    showTooltip(event, `${fmtDate(d.date)}<br>${formatNumber(d.distanceKm, 2)} km`);
  }).on("mouseleave", hideTooltip);
}

function renderPaceScatter(acts, year) {
  const container = document.getElementById("yearPace");
  clearNode(container);

  const points = acts.filter(d => isFiniteNumber(d.paceMinPerKm));
  if (!points.length) return emptyChart(container, `No pace data for ${year}`);

  const svg = createSvg(container);
  const { innerW, innerH, g } = chartFrame(svg, { top: 10, right: 12, bottom: 28, left: 44 });

  const x = d3.scaleTime()
    .domain([new Date(year, 0, 1), new Date(year, 11, 31)])
    .range([0, innerW]);

  const y = d3.scaleLinear()
    .domain(d3.extent(points, d => d.paceMinPerKm))
    .nice()
    .range([innerH, 0]);

  g.append("g")
    .attr("class", "gridline")
    .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(""));

  g.selectAll(".dot")
    .data(points)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.date))
    .attr("cy", d => y(d.paceMinPerKm))
    .attr("r", 4.2)
    .attr("fill", "rgba(214, 95, 255, 0.62)")
    .attr("stroke", "rgba(214, 95, 255, 0.95)");

  const trend = linearTrend(points.map(d => ({ x: +d.date, y: d.paceMinPerKm })));
  if (trend) {
    const [x0, x1] = x.domain().map(d => +d);
    const trendData = [
      { date: new Date(x0), value: trend.m * x0 + trend.b },
      { date: new Date(x1), value: trend.m * x1 + trend.b }
    ];

    g.append("path")
      .datum(trendData)
      .attr("fill", "none")
      .attr("stroke", "#ff5fe6")
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", "6 4")
      .attr("d", d3.line().x(d => x(d.date)).y(d => y(d.value)));
  }

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(d3.timeMonth.every(2)).tickFormat(d3.timeFormat("%b")));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(4).tickFormat(formatPace));

  g.append("rect")
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("fill", "transparent")
    .on("mousemove", (event) => {
      const [mx] = d3.pointer(event);
      const date = x.invert(mx);
      const idx = d3.bisector(d => d.date).center(points, date);
      const d = points[idx];
      if (!d) return;
      showTooltip(event, `${fmtDate(d.date)}<br>${formatPace(d.paceMinPerKm)} min/km`);
    })
    .on("mouseleave", hideTooltip);
}

function renderHrScatter(acts, year) {
  const container = document.getElementById("yearHr");
  clearNode(container);

  const points = acts.filter(d => isFiniteNumber(d.avgHR));
  const legendEl = document.getElementById("hrLegend");
  legendEl.innerHTML = "";

  if (!points.length) return emptyChart(container, `No heart rate data for ${year}`);

  const zones = deriveHrZones(points.map(d => d.avgHR));
  renderLegend(legendEl, zones);

  const svg = createSvg(container);
  const { innerW, innerH, g } = chartFrame(svg, { top: 10, right: 12, bottom: 28, left: 44 });

  const x = d3.scaleTime()
    .domain([new Date(year, 0, 1), new Date(year, 11, 31)])
    .range([0, innerW]);

  const y = d3.scaleLinear()
    .domain(d3.extent(points, d => d.avgHR))
    .nice()
    .range([innerH, 0]);

  g.append("g")
    .attr("class", "gridline")
    .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(""));

  g.selectAll(".dot")
    .data(points)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.date))
    .attr("cy", d => y(d.avgHR))
    .attr("r", 4.2)
    .attr("fill", d => zoneColor(classifyZone(d.avgHR, zones)))
    .attr("stroke", "rgba(255,255,255,0.25)");

  const trend = linearTrend(points.map(d => ({ x: +d.date, y: d.avgHR })));
  if (trend) {
    const [x0, x1] = x.domain().map(d => +d);
    const trendData = [
      { date: new Date(x0), value: trend.m * x0 + trend.b },
      { date: new Date(x1), value: trend.m * x1 + trend.b }
    ];

    g.append("path")
      .datum(trendData)
      .attr("fill", "none")
      .attr("stroke", "#56d4ff")
      .attr("stroke-width", 2.4)
      .attr("stroke-dasharray", "6 4")
      .attr("d", d3.line().x(d => x(d.date)).y(d => y(d.value)));
  }

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(d3.timeMonth.every(2)).tickFormat(d3.timeFormat("%b")));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(4));

  g.append("rect")
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("fill", "transparent")
    .on("mousemove", (event) => {
      const [mx] = d3.pointer(event);
      const date = x.invert(mx);
      const idx = d3.bisector(d => d.date).center(points, date);
      const d = points[idx];
      if (!d) return;
      showTooltip(event, `${fmtDate(d.date)}<br>${formatNumber(d.avgHR, 0)} bpm`);
    })
    .on("mouseleave", hideTooltip);
}

function renderCadenceScatter(acts, year) {
  const container = document.getElementById("yearCadence");
  clearNode(container);

  const points = acts.filter(d => isFiniteNumber(d.cadenceSpm));
  const legendEl = document.getElementById("cadenceLegend");
  legendEl.innerHTML = "";

  if (!points.length) return emptyChart(container, `No cadence data for ${year}`);

  const zones = deriveCadenceZones(points.map(d => d.cadenceSpm));
  renderLegend(legendEl, zones);

  const svg = createSvg(container);
  const { innerW, innerH, g } = chartFrame(svg, { top: 10, right: 12, bottom: 28, left: 44 });

  const x = d3.scaleTime()
    .domain([new Date(year, 0, 1), new Date(year, 11, 31)])
    .range([0, innerW]);

  const y = d3.scaleLinear()
    .domain(d3.extent(points, d => d.cadenceSpm))
    .nice()
    .range([innerH, 0]);

  g.append("g")
    .attr("class", "gridline")
    .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(""));

  g.selectAll(".dot")
    .data(points)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.date))
    .attr("cy", d => y(d.cadenceSpm))
    .attr("r", 4.2)
    .attr("fill", d => zoneColor(classifyZone(d.cadenceSpm, zones)))
    .attr("stroke", "rgba(255,255,255,0.25)");

  const trend = linearTrend(points.map(d => ({ x: +d.date, y: d.cadenceSpm })));
  if (trend) {
    const [x0, x1] = x.domain().map(d => +d);
    const trendData = [
      { date: new Date(x0), value: trend.m * x0 + trend.b },
      { date: new Date(x1), value: trend.m * x1 + trend.b }
    ];

    g.append("path")
      .datum(trendData)
      .attr("fill", "none")
      .attr("stroke", "#7f7cff")
      .attr("stroke-width", 2.4)
      .attr("stroke-dasharray", "6 4")
      .attr("d", d3.line().x(d => x(d.date)).y(d => y(d.value)));
  }

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(d3.timeMonth.every(2)).tickFormat(d3.timeFormat("%b")));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(4));

  g.append("rect")
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("fill", "transparent")
    .on("mousemove", (event) => {
      const [mx] = d3.pointer(event);
      const date = x.invert(mx);
      const idx = d3.bisector(d => d.date).center(points, date);
      const d = points[idx];
      if (!d) return;
      showTooltip(event, `${fmtDate(d.date)}<br>${formatNumber(d.cadenceSpm, 1)} spm`);
    })
    .on("mouseleave", hideTooltip);
}

function renderCalendar(acts, year) {
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  const dailyMap = new Map();
  fullYearDailySeries(acts, year).forEach(d => dailyMap.set(d.dateKey, d.distanceKm));

  const maxVal = d3.max(Array.from(dailyMap.values())) || 1;
  const color = d3.scaleLinear()
    .domain([0, maxVal * 0.25, maxVal * 0.5, maxVal])
    .range(["rgba(255,255,255,0.05)", "rgba(111,140,255,0.25)", "rgba(111,140,255,0.55)", "rgba(86,212,255,0.95)"]);

  const dow = ["M", "T", "W", "T", "F", "S", "S"];
  const monthNames = d3.timeFormat("%B");

  for (let month = 0; month < 12; month++) {
    const block = document.createElement("div");
    block.className = "month-block";

    const title = document.createElement("div");
    title.className = "month-title";
    title.textContent = monthNames(new Date(year, month, 1));
    block.appendChild(title);

    const dowRow = document.createElement("div");
    dowRow.className = "month-dow";
    dow.forEach(label => {
      const el = document.createElement("div");
      el.textContent = label;
      dowRow.appendChild(el);
    });
    block.appendChild(dowRow);

    const daysWrap = document.createElement("div");
    daysWrap.className = "month-days";

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let offset = firstDay.getDay();
    offset = offset === 0 ? 6 : offset - 1;

    for (let i = 0; i < offset; i++) {
      const empty = document.createElement("div");
      empty.className = "day-cell empty";
      daysWrap.appendChild(empty);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const key = isoDate(date);
      const km = dailyMap.get(key) || 0;

      const cell = document.createElement("div");
      cell.className = "day-cell";
      cell.style.background = km > 0 ? color(km) : "rgba(255,255,255,0.05)";
      cell.title = `${fmtDate(date)} — ${formatNumber(km, 2)} km`;

      daysWrap.appendChild(cell);
    }

    block.appendChild(daysWrap);
    grid.appendChild(block);
  }
}

/* ---------------------------
   Helpers / derived metrics
--------------------------- */

function computeApproxPRs(acts) {
  const targets = [
    { key: "marathon", km: 42.195, tol: 1.0 },
    { key: "half", km: 21.0975, tol: 0.7 },
    { key: "tenK", km: 10, tol: 0.35 },
    { key: "fiveK", km: 5, tol: 0.2 }
  ];

  const out = {};

  for (const t of targets) {
    const candidates = acts.filter(a =>
      a.distanceKm >= t.km - t.tol &&
      a.distanceKm <= t.km + t.tol &&
      a.durationSec > 0
    );

    if (!candidates.length) {
      out[t.key] = "—";
      continue;
    }

    const best = d3.least(candidates, d => d.durationSec / d.distanceKm * t.km);
    const estimatedSec = (best.durationSec / best.distanceKm) * t.km;
    out[t.key] = formatDuration(estimatedSec);
  }

  return out;
}

function aggregateAllDays(acts) {
  if (!acts.length) return [];
  const map = new Map();

  acts.forEach(a => {
    map.set(a.dateKey, (map.get(a.dateKey) || 0) + a.distanceKm);
  });

  const start = new Date(acts[0].date.getFullYear(), acts[0].date.getMonth(), acts[0].date.getDate());
  const end = new Date(acts[acts.length - 1].date.getFullYear(), acts[acts.length - 1].date.getMonth(), acts[acts.length - 1].date.getDate());

  const out = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = new Date(d);
    out.push({
      date,
      dateKey: isoDate(date),
      distanceKm: map.get(isoDate(date)) || 0
    });
  }
  return out;
}

function fullYearDailySeries(acts, year) {
  const map = new Map();
  acts.forEach(a => {
    map.set(a.dateKey, (map.get(a.dateKey) || 0) + a.distanceKm);
  });

  const out = [];
  for (let d = new Date(year, 0, 1); d <= new Date(year, 11, 31); d.setDate(d.getDate() + 1)) {
    const date = new Date(d);
    out.push({
      date,
      dateKey: isoDate(date),
      distanceKm: map.get(isoDate(date)) || 0
    });
  }
  return out;
}

function weeklyTotalsFromDaily(daily) {
  const weekMap = new Map();

  daily.forEach(d => {
    const monday = startOfWeekMonday(d.date);
    const key = isoDate(monday);
    if (!weekMap.has(key)) {
      weekMap.set(key, { date: endOfWeekSunday(monday), totalKm: 0 });
    }
    weekMap.get(key).totalKm += d.distanceKm;
  });

  return Array.from(weekMap.values()).sort((a, b) => a.date - b.date);
}

function deriveHrZones(values) {
  const sorted = [...values].sort(d3.ascending);
  if (sorted.length < 12) {
    return [
      { label: "Zone 1", max: 120, color: "blue" },
      { label: "Zone 2", max: 140, color: "green" },
      { label: "Zone 3", max: 155, color: "yellow" },
      { label: "Zone 4", max: 170, color: "orange" },
      { label: "Zone 5", max: Infinity, color: "red" }
    ];
  }

  const q20 = d3.quantileSorted(sorted, 0.2);
  const q40 = d3.quantileSorted(sorted, 0.4);
  const q60 = d3.quantileSorted(sorted, 0.6);
  const q80 = d3.quantileSorted(sorted, 0.8);

  return [
    { label: "Zone 1", max: q20, color: "blue" },
    { label: "Zone 2", max: q40, color: "green" },
    { label: "Zone 3", max: q60, color: "yellow" },
    { label: "Zone 4", max: q80, color: "orange" },
    { label: "Zone 5", max: Infinity, color: "red" }
  ];
}

function deriveCadenceZones(values) {
  const sorted = [...values].sort(d3.ascending);
  if (sorted.length < 12) {
    return [
      { label: "<165", max: 165, color: "blue" },
      { label: "165–170", max: 170, color: "green" },
      { label: "170–175", max: 175, color: "yellow" },
      { label: "175–180", max: 180, color: "orange" },
      { label: "180+", max: Infinity, color: "red" }
    ];
  }

  const q20 = d3.quantileSorted(sorted, 0.2);
  const q40 = d3.quantileSorted(sorted, 0.4);
  const q60 = d3.quantileSorted(sorted, 0.6);
  const q80 = d3.quantileSorted(sorted, 0.8);

  return [
    { label: `≤${formatNumber(q20, 0)}`, max: q20, color: "blue" },
    { label: `≤${formatNumber(q40, 0)}`, max: q40, color: "green" },
    { label: `≤${formatNumber(q60, 0)}`, max: q60, color: "yellow" },
    { label: `≤${formatNumber(q80, 0)}`, max: q80, color: "orange" },
    { label: `>${formatNumber(q80, 0)}`, max: Infinity, color: "red" }
  ];
}

function classifyZone(value, zones) {
  for (const z of zones) {
    if (value <= z.max) return z.color;
  }
  return "blue";
}

function zoneColor(zoneName) {
  switch (zoneName) {
    case "blue": return getCss("--zone-blue");
    case "green": return getCss("--zone-green");
    case "yellow": return getCss("--zone-yellow");
    case "orange": return getCss("--zone-orange");
    case "red": return getCss("--zone-red");
    default: return "#ccc";
  }
}

function renderLegend(el, zones) {
  zones.forEach(z => {
    const item = document.createElement("div");
    item.className = "legend-item";

    const swatch = document.createElement("span");
    swatch.className = "legend-swatch";
    swatch.style.background = zoneColor(z.color);

    const label = document.createElement("span");
    label.textContent = z.label;

    item.appendChild(swatch);
    item.appendChild(label);
    el.appendChild(item);
  });
}

function linearTrend(points) {
  if (!points.length) return null;
  const n = points.length;
  const sumX = d3.sum(points, d => d.x);
  const sumY = d3.sum(points, d => d.y);
  const sumXY = d3.sum(points, d => d.x * d.y);
  const sumXX = d3.sum(points, d => d.x * d.x);

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;

  const m = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;
  return { m, b };
}

/* ---------------------------
   Chart plumbing
--------------------------- */

function createSvg(container) {
  return d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${container.clientWidth} ${container.clientHeight}`)
    .attr("preserveAspectRatio", "none");
}

function chartFrame(svg, margin) {
  const node = svg.node();
  const width = node.clientWidth || node.getBoundingClientRect().width || 600;
  const height = node.clientHeight || node.getBoundingClientRect().height || 240;
  const innerW = Math.max(10, width - margin.left - margin.right);
  const innerH = Math.max(10, height - margin.top - margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  return { width, height, innerW, innerH, g };
}

function emptyChart(container, text) {
  const svg = createSvg(container);
  svg.append("text")
    .attr("x", "50%")
    .attr("y", "50%")
    .attr("text-anchor", "middle")
    .attr("fill", "rgba(255,255,255,0.45)")
    .attr("font-size", 14)
    .text(text);
}

/* ---------------------------
   Tooltip
--------------------------- */

function showTooltip(event, html) {
  state.tooltip.innerHTML = html;
  state.tooltip.style.opacity = "1";
  state.tooltip.style.left = `${event.pageX}px`;
  state.tooltip.style.top = `${event.pageY}px`;
}

function hideTooltip() {
  state.tooltip.style.opacity = "0";
}

/* ---------------------------
   Utility
--------------------------- */

function setStatus(text) {
  setText("statusText", text);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function assertOk(r) {
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${r.url}`);
  return r;
}

function isoDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fmtDate(d) {
  return d3.timeFormat("%b %d, %Y")(d);
}

function formatNumber(n, digits = 1) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatDuration(sec) {
  sec = Math.round(sec || 0);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatPace(minPerKm) {
  const whole = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - whole) * 60);
  return `${whole}:${String(sec).padStart(2, "0")}`;
}

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

function endOfWeekSunday(monday) {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d;
}

function dayDiffInclusive(start, end) {
  const ms = new Date(end).setHours(0, 0, 0, 0) - new Date(start).setHours(0, 0, 0, 0);
  return Math.floor(ms / 86400000) + 1;
}

function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

function numberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getCss(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function cryptoRandomish(date, distanceKm) {
  return `${date.getTime()}_${Math.round(distanceKm * 1000)}`;
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}