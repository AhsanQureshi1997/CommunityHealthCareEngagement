const fileInput = document.getElementById('fileInput');
const demoBtn = document.getElementById('demoBtn');
const downloadBtn = document.getElementById('downloadBtn');
const showAllBtn = document.getElementById('showAllBtn');
const showActionBtn = document.getElementById('showActionBtn');

let currentProcessed = [];
let currentView = "all";

fileInput.addEventListener('change', handleFile);
demoBtn.addEventListener('click', loadDemo);
downloadBtn.addEventListener('click', downloadCSV);
showAllBtn.addEventListener('click', () => {
  currentView = "all";
  renderTable();
});
showActionBtn.addEventListener('click', () => {
  currentView = "action";
  renderTable();
});

function loadDemo() {
  const rows = [
    {patient_id:"P-1001", clinic:"South Phoenix", program:"Heat Outreach", last_contact_days:164, outreach_attempts:3, status:"No Response", outcome:"Not re-engaged", intervention_type:"Phone Call", days_to_reengagement:""},
    {patient_id:"P-1002", clinic:"Maryvale", program:"Lung Screening", last_contact_days:38, outreach_attempts:1, status:"Scheduled", outcome:"Re-engaged", intervention_type:"Text Message", days_to_reengagement:6},
    {patient_id:"P-1003", clinic:"South Phoenix", program:"Obesity Follow-up", last_contact_days:205, outreach_attempts:4, status:"No Response", outcome:"Not re-engaged", intervention_type:"Phone Call", days_to_reengagement:""},
    {patient_id:"P-1004", clinic:"Tempe", program:"Contraception Follow-up", last_contact_days:44, outreach_attempts:2, status:"Reached", outcome:"Re-engaged", intervention_type:"Patient Portal", days_to_reengagement:11},
    {patient_id:"P-1005", clinic:"Maryvale", program:"Heat Outreach", last_contact_days:121, outreach_attempts:2, status:"No Response", outcome:"Not re-engaged", intervention_type:"Text Message", days_to_reengagement:""},
    {patient_id:"P-1006", clinic:"Central Phoenix", program:"Anxiety App Follow-up", last_contact_days:18, outreach_attempts:1, status:"Reached", outcome:"Re-engaged", intervention_type:"App Notification", days_to_reengagement:3},
    {patient_id:"P-1007", clinic:"Tempe", program:"Suicide Prevention", last_contact_days:96, outreach_attempts:3, status:"Partial", outcome:"Scheduled", intervention_type:"Phone Call", days_to_reengagement:14},
    {patient_id:"P-1008", clinic:"Central Phoenix", program:"Lung Screening", last_contact_days:147, outreach_attempts:3, status:"No Response", outcome:"Not re-engaged", intervention_type:"Patient Portal", days_to_reengagement:""},
    {patient_id:"P-1009", clinic:"South Phoenix", program:"Heat Outreach", last_contact_days:27, outreach_attempts:1, status:"Reached", outcome:"Re-engaged", intervention_type:"Community Health Worker", days_to_reengagement:4},
    {patient_id:"P-1010", clinic:"Maryvale", program:"Obesity Follow-up", last_contact_days:76, outreach_attempts:2, status:"Partial", outcome:"Scheduled", intervention_type:"Text Message", days_to_reengagement:9}
  ];
  processData(rows);
}

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const rows = parseCSV(text);
    processData(rows);
  };
  reader.readAsText(file);
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i] !== undefined ? vals[i].trim() : "");
    return obj;
  });
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'; i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function toNum(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

function processRow(r) {
  const last = toNum(r.last_contact_days);
  const attempts = toNum(r.outreach_attempts);
  const outcome = (r.outcome || "").trim();
  const status = (r.status || "").trim();

  let priorityScore = 0;
  const reasons = [];

  if (last >= 180) { priorityScore += 4; reasons.push("Very long time since last contact"); }
  else if (last >= 120) { priorityScore += 3; reasons.push("Long time since last contact"); }
  else if (last >= 60) { priorityScore += 1; reasons.push("Moderate contact gap"); }

  if (attempts >= 4) { priorityScore += 3; reasons.push("Repeated failed outreach attempts"); }
  else if (attempts >= 2) { priorityScore += 2; reasons.push("Multiple outreach attempts"); }

  if (status.toLowerCase() === "no response") { priorityScore += 3; reasons.push("No response to outreach"); }
  else if (status.toLowerCase() === "partial") { priorityScore += 1; reasons.push("Partial engagement only"); }

  if (outcome.toLowerCase() === "not re-engaged") { priorityScore += 2; reasons.push("No successful re-engagement yet"); }

  let priority = "Low";
  let action = "Monitor routine workflow";
  if (priorityScore >= 7) {
    priority = "High";
    action = "Call today and escalate if no response";
  } else if (priorityScore >= 4) {
    priority = "Medium";
    action = "Prioritize outreach this week";
  }

  return {
    patient_id: r.patient_id || "",
    clinic: r.clinic || "",
    program: r.program || "",
    last_contact_days: last,
    outreach_attempts: attempts,
    status,
    outcome,
    intervention_type: r.intervention_type || "",
    days_to_reengagement: toNum(r.days_to_reengagement),
    priorityScore,
    priority,
    action,
    reasons
  };
}

function processData(rows) {
  currentProcessed = rows.map(processRow).sort((a,b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return b.last_contact_days - a.last_contact_days;
  });
  currentView = "all";
  renderAll();
}

function renderAll() {
  renderSummary();
  renderActionList();
  renderProblemPrograms();
  renderClinicChart();
  renderInterventionChart();
  renderTable();
}

function renderSummary() {
  const high = currentProcessed.filter(r => r.priority === "High").length;
  const medium = currentProcessed.filter(r => r.priority === "Medium").length;
  const reengaged = currentProcessed.filter(r => normalize(r.outcome) === "re-engaged").length;
  const avgRe = average(currentProcessed.filter(r => r.days_to_reengagement > 0).map(r => r.days_to_reengagement));

  document.getElementById("summary").innerHTML = `
    <div class="summary-box">
      <h3>Needs Action Today</h3>
      <div class="big">${high + medium}</div>
      <div>${high} high priority, ${medium} medium priority</div>
    </div>
    <div class="summary-box">
      <h3>Re-engaged Patients</h3>
      <div class="big">${reengaged}</div>
      <div>${pct(reengaged, currentProcessed.length)} of current panel</div>
    </div>
    <div class="summary-box">
      <h3>Average Days to Re-engage</h3>
      <div class="big">${avgRe ? avgRe.toFixed(1) : "N/A"}</div>
      <div>Among patients successfully re-engaged</div>
    </div>
    <div class="summary-box">
      <h3>Highest-Risk Site</h3>
      <div class="big">${highestRiskClinic()}</div>
      <div>Site with most action-needed patients</div>
    </div>
  `;
}

function highestRiskClinic() {
  const counts = {};
  currentProcessed.forEach(r => {
    if (r.priority !== "Low") counts[r.clinic] = (counts[r.clinic] || 0) + 1;
  });
  let best = "N/A", bestVal = -1;
  Object.entries(counts).forEach(([clinic, val]) => {
    if (val > bestVal) { best = clinic; bestVal = val; }
  });
  return best;
}

function renderActionList() {
  const target = document.getElementById("actionList");
  const rows = currentProcessed.filter(r => r.priority !== "Low").slice(0, 6);
  if (!rows.length) {
    target.innerHTML = `<div class="action-item">No patients currently flagged for action.</div>`;
    return;
  }

  target.innerHTML = rows.map(r => `
    <div class="action-item ${r.priority.toLowerCase()}">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:start;">
        <div>
          <strong>${escapeHtml(r.patient_id)}</strong> · ${escapeHtml(r.clinic)} · ${escapeHtml(r.program)}
          <div style="margin-top:6px;color:#5a6b85;">${escapeHtml(r.reasons.join(", "))}</div>
        </div>
        <span class="badge ${r.priority.toLowerCase()}">${r.priority}</span>
      </div>
      <div style="margin-top:10px;"><strong>Do now:</strong> ${escapeHtml(r.action)}</div>
    </div>
  `).join("");
}

function renderProblemPrograms() {
  const target = document.getElementById("problemPrograms");
  const grouped = {};
  currentProcessed.forEach(r => {
    const key = `${r.clinic} | ${r.program}`;
    if (!grouped[key]) grouped[key] = { clinic: r.clinic, program: r.program, total: 0, noResponse: 0, reengaged: 0 };
    grouped[key].total += 1;
    if (normalize(r.status) === "no response") grouped[key].noResponse += 1;
    if (normalize(r.outcome) === "re-engaged") grouped[key].reengaged += 1;
  });

  const rows = Object.values(grouped)
    .map(g => ({
      ...g,
      noResponseRate: g.total ? (g.noResponse / g.total) : 0,
      reengageRate: g.total ? (g.reengaged / g.total) : 0
    }))
    .sort((a,b) => b.noResponseRate - a.noResponseRate)
    .slice(0, 5);

  target.innerHTML = rows.map(r => `
    <div class="metric-item">
      <strong>${escapeHtml(r.clinic)}</strong> · ${escapeHtml(r.program)}
      <div style="margin-top:8px;">No response: <strong>${Math.round(r.noResponseRate * 100)}%</strong></div>
      <div>Re-engaged: <strong>${Math.round(r.reengageRate * 100)}%</strong></div>
    </div>
  `).join("");
}

function renderClinicChart() {
  const grouped = {};
  currentProcessed.forEach(r => {
    if (!grouped[r.clinic]) grouped[r.clinic] = { total:0, action:0 };
    grouped[r.clinic].total += 1;
    if (r.priority !== "Low") grouped[r.clinic].action += 1;
  });
  const labels = Object.keys(grouped);
  const values = labels.map(l => grouped[l].action);
  drawBarChart(document.getElementById("clinicChart"), labels, values, "#AB0520", "Needs action");
}

function renderInterventionChart() {
  const grouped = {};
  currentProcessed.forEach(r => {
    if (!grouped[r.intervention_type]) grouped[r.intervention_type] = { total:0, re:0 };
    grouped[r.intervention_type].total += 1;
    if (normalize(r.outcome) === "re-engaged") grouped[r.intervention_type].re += 1;
  });
  const labels = Object.keys(grouped);
  const values = labels.map(l => grouped[l].total ? Math.round((grouped[l].re / grouped[l].total) * 100) : 0);
  drawBarChart(document.getElementById("interventionChart"), labels, values, "#0C234B", "Re-engaged %");
}

function renderTable() {
  const tbody = document.querySelector("#resultsTable tbody");
  const rows = currentView === "action" ? currentProcessed.filter(r => r.priority !== "Low") : currentProcessed;
  document.getElementById("tableMode").textContent = currentView === "action" ? "Showing action-needed patients only" : "Showing all patients";
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.patient_id)}</td>
      <td>${escapeHtml(r.clinic)}</td>
      <td>${escapeHtml(r.program)}</td>
      <td>${escapeHtml(r.status)}<br><span style="color:#5a6b85;">${r.last_contact_days} days since contact</span></td>
      <td><span class="badge ${r.priority.toLowerCase()}">${r.priority}</span><br><span style="color:#5a6b85;">Score ${r.priorityScore}</span></td>
      <td>${escapeHtml(r.action)}</td>
      <td>${escapeHtml(r.intervention_type)}<br><span style="color:#5a6b85;">${r.outreach_attempts} attempts</span></td>
      <td>${escapeHtml(r.outcome)}${r.days_to_reengagement ? `<br><span style="color:#5a6b85;">${r.days_to_reengagement} days to re-engage</span>` : ""}</td>
    </tr>
  `).join("");
}

function drawBarChart(canvas, labels, values, color, yTitle) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  ctx.font = "14px Arial";

  const pad = {top:20,right:20,bottom:60,left:50};
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const maxVal = Math.max(...values, 1);

  ctx.strokeStyle = "#cfd7e3";
  ctx.fillStyle = "#5a6b85";
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + chartH * i / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    const val = (maxVal * (4 - i) / 4).toFixed(0);
    ctx.fillText(val, 8, y + 4);
  }

  labels.forEach((label, i) => {
    const slot = chartW / labels.length;
    const barW = slot * 0.58;
    const x = pad.left + slot * i + (slot - barW) / 2;
    const barH = (values[i] / maxVal) * chartH;
    const y = h - pad.bottom - barH;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = "#13294b";
    wrapText(ctx, label, x, h - 36, barW, 14);
    ctx.fillText(String(values[i]), x + barW/4, y - 6);
  });

  ctx.save();
  ctx.translate(14, h/2);
  ctx.rotate(-Math.PI/2);
  ctx.fillStyle = "#13294b";
  ctx.fillText(yTitle, 0, 0);
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  let line = "";
  let lineY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, lineY);
      line = words[n] + " ";
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, lineY);
}

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a,b) => a+b, 0) / arr.length;
}

function pct(part, whole) {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

function normalize(s) {
  return String(s || "").trim().toLowerCase();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function downloadCSV() {
  if (!currentProcessed.length) {
    alert("Load demo data or upload a CSV first.");
    return;
  }
  const headers = ["patient_id","clinic","program","last_contact_days","outreach_attempts","status","outcome","intervention_type","days_to_reengagement","priority_score","priority","action","reasons"];
  const lines = [headers.join(",")];
  currentProcessed.forEach(r => {
    lines.push([
      r.patient_id, r.clinic, r.program, r.last_contact_days, r.outreach_attempts, r.status, r.outcome,
      r.intervention_type, r.days_to_reengagement || "", r.priorityScore, r.priority,
      `"${r.action.replaceAll('"','""')}"`,
      `"${r.reasons.join("; ").replaceAll('"','""')}"`
    ].join(","));
  });
  const blob = new Blob([lines.join("\n")], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pbrn_outreach_analysis.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

loadDemo();
