const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSgsCQ59YbAExP9Ik6g_vLI3WL2eIOGmY3D48S28e44cRTJjr2xwEpjKSQ4Z0GCK8q6Q9H5WStT0Xa4/pub?gid=319738758&single=true&output=csv";

let originalData = [];
let currentMargin = 0;

async function loadData() {
  currentMargin = parseFloat(document.getElementById("margin").value) || 0;

  let res = await fetch(sheetURL);
  let text = await res.text();

  let rows = text.split("\n").map(r => r.split(","));
  let headers = rows[0];

  originalData = rows.slice(1).map(r => {
    let obj = {};
    headers.forEach((h, i) => obj[h.trim()] = r[i]);
    return obj;
  });

  populateFilters();
  applyFilters();
}

function calculate(row) {
  let TP = parseFloat((row.TP || "0").replace(/,/g, "").trim());

  let SP = TP * (1 + currentMargin / 100);

  let Commission = SP * 0.37;
  let GST = Commission * 0.18;
  let TDS = SP * 0.001;

  let Gross = SP - Commission - GST - TDS;
  let Processing = 99 * 1.18;
  let Dispatch = SP < 500 ? 25 : SP < 1000 ? 30 : 35;

  let Net = Gross - Processing - Dispatch;

  let diff = Net - TP;
  let diffPer = TP ? diff / TP : 0;

  let MRP = Math.round((SP / 35) * 100);

  return { SP, MRP, diffPer };
}

function applyFilters() {
  let search = document.getElementById("search").value.toLowerCase();
  let brand = document.getElementById("brandFilter").value;
  let status = document.getElementById("statusFilter").value;

  let filtered = originalData.filter(r => {
    return (
      (!search || r.Product_Name.toLowerCase().includes(search)) &&
      (!brand || r.Brand === brand) &&
      (!status || r.Status === status)
    );
  });

  renderTable(filtered);
}

function renderTable(data) {
  let tbody = document.querySelector("#table tbody");
  tbody.innerHTML = "";

  data.forEach(row => {
    let calc = calculate(row);

    let tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row.Product_Name}</td>
      <td>${row.Brand}</td>
      <td>${row.Status}</td>
      <td>${row.TP}</td>
      <td>${calc.SP.toFixed(2)}</td>
      <td>${calc.MRP}</td>
      <td style="color:${calc.diffPer >= 0 ? 'green' : 'red'}">
        ${(calc.diffPer * 100).toFixed(2)}%
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function populateFilters() {
  let brands = [...new Set(originalData.map(d => d.Brand))];
  let statuses = [...new Set(originalData.map(d => d.Status))];

  let brandSelect = document.getElementById("brandFilter");
  let statusSelect = document.getElementById("statusFilter");

  brands.forEach(b => {
    let opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    brandSelect.appendChild(opt);
  });

  statuses.forEach(s => {
    let opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    statusSelect.appendChild(opt);
  });
}

function downloadCSV() {
  let rows = [["Product","SP","MRP"]];
  document.querySelectorAll("tbody tr").forEach(tr => {
    let td = tr.querySelectorAll("td");
    rows.push([td[0].innerText, td[4].innerText, td[5].innerText]);
  });

  let csv = rows.map(r => r.join(",")).join("\n");

  let blob = new Blob([csv]);
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pricing.csv";
  a.click();
}

function saveHistory() {
  let tableData = document.querySelector("tbody").innerHTML;
  let history = JSON.parse(localStorage.getItem("pricingHistory") || "[]");

  history.push({
    date: new Date().toLocaleString(),
    data: tableData
  });

  localStorage.setItem("pricingHistory", JSON.stringify(history));
  alert("Saved Successfully");
}
