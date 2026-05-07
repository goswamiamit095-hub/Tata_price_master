const sheetURL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vSgsCQ59YbAExP9Ik6g_vLI3WL2eIOGmY3D48S28e44cRTJjr2xwEpjKSQ4Z0GCK8q6Q9H5WStT0Xa4/pub?gid=319738758&single=true&output=csv";

let originalData = [];
let currentMargin = 20;

// =========================
// CSV PARSER
// =========================

function parseCSV(text) {

  let rows = [];
  let row = [];
  let current = "";
  let insideQuotes = false;

  for (let char of text) {

    if (char === '"') {

      insideQuotes = !insideQuotes;

    } else if (char === ',' && !insideQuotes) {

      row.push(current);
      current = "";

    } else if (
      (char === '\n' || char === '\r') &&
      !insideQuotes
    ) {

      if (current || row.length) {

        row.push(current);

        rows.push(row);

        row = [];
        current = "";
      }

    } else {

      current += char;

    }
  }

  if (current || row.length) {

    row.push(current);

    rows.push(row);

  }

  return rows;
}

// =========================
// LOAD DATA
// =========================

async function loadData() {

  currentMargin =
    parseFloat(
      document.getElementById("margin").value
    ) || 0;

  let res = await fetch(sheetURL);

  let text = await res.text();

  let rows = parseCSV(text);

  let headers = rows[0].map(h => h.trim());

  originalData = rows.slice(1).map(r => {

    let obj = {};

    headers.forEach((h, i) => {

      obj[h] = r[i]
        ? r[i].trim()
        : "";

    });

    return obj;

  });

  populateFilters();

  applyFilters();
}

// =========================
// CALCULATE
// =========================

function calculate(row) {

  let TP =
    parseFloat(
      (row.TP || "0")
      .replace(/,/g, "")
      .trim()
    ) || 0;

  let margin = currentMargin;

  if (!TP) {

    return {
      SP: 0,
      MRP: 0
    };

  }

  let commissionRate = 0.37;
  let gstRate = 0.18;
  let tdsRate = 0.001;

  let processing = 99 * 1.18;

  let targetNet =
    TP * (1 + margin / 100);

  let dispatch = 30;

  let denominator =
    1 -
    commissionRate -
    (commissionRate * gstRate) -
    tdsRate;

  let SP =
    (targetNet + processing + dispatch)
    / denominator;

  dispatch =
    SP < 500
    ? 25
    : SP < 1000
    ? 30
    : 35;

  SP =
    (targetNet + processing + dispatch)
    / denominator;

  let Commission =
    SP * commissionRate;

  let GST =
    Commission * gstRate;

  let TDS =
    SP * tdsRate;

  let Net =
    SP -
    Commission -
    GST -
    TDS -
    processing -
    dispatch;

  let Profit =
    Net - TP;

  let ProfitPercent =
    TP
    ? ((Profit / TP) * 100)
    : 0;

  let MRP =
    Math.round((SP / 35) * 100);

  return {

    SP: SP.toFixed(2),

    MRP: MRP,

    Commission:
      Commission.toFixed(2),

    GST:
      GST.toFixed(2),

    TDS:
      TDS.toFixed(2),

    Processing:
      processing.toFixed(2),

    Dispatch:
      dispatch.toFixed(2),

    Net:
      Net.toFixed(2),

    Profit:
      Profit.toFixed(2),

    ProfitPercent:
      ProfitPercent.toFixed(2) + "%"

  };
}

// =========================
// FILTERS
// =========================

function applyFilters() {

  currentMargin =
    parseFloat(
      document.getElementById("margin").value
    ) || 0;

  let search =
    document.getElementById("search")
    .value
    .toLowerCase();

  let brand =
    document.getElementById("brandFilter")
    .value;

  let status =
    document.getElementById("statusFilter")
    .value;

  let filtered = originalData.filter(r => {

    let product =
      (r.Product_Name || "")
      .toLowerCase();

    return (

      (!search ||
        product.includes(search))

      &&

      (!brand ||
        r.Brand === brand)

      &&

      (!status ||
        r.Status === status)

    );

  });

  renderTable(filtered);
}

// =========================
// TABLE
// =========================

function renderTable(data) {

  let table =
    document.getElementById("table");

  let thead =
    table.querySelector("thead");

  let tbody =
    table.querySelector("tbody");

  tbody.innerHTML = "";

  if (!data.length) {

    thead.innerHTML = "";

    return;
  }

  let calcKeys =
    Object.keys(calculate(data[0]));

  let inputKeys =
    Object.keys(data[0]);

  let headers = [
    ...inputKeys,
    ...calcKeys
  ];

  thead.innerHTML =
    "<tr>" +
    headers
    .map(h => `<th>${h}</th>`)
    .join("") +
    "</tr>";

  data.forEach(row => {

    let calc =
      calculate(row);

    let tr =
      document.createElement("tr");

    headers.forEach(h => {

      let val =
        row[h] ??
        calc[h] ??
        "";

      let className = "";

      if (h === "ProfitPercent") {

        let num =
          parseFloat(calc.Profit);

        className =
          num >= 0
          ? "profit"
          : "loss";
      }

      tr.innerHTML += `
        <td class="${className}">
          ${val}
        </td>
      `;
    });

    tbody.appendChild(tr);

  });
}

// =========================
// FILTERS
// =========================

function populateFilters() {

  let brands = [
    ...new Set(
      originalData.map(d => d.Brand)
    )
  ];

  let statuses = [
    ...new Set(
      originalData.map(d => d.Status)
    )
  ];

  let brandSelect =
    document.getElementById("brandFilter");

  let statusSelect =
    document.getElementById("statusFilter");

  brandSelect.innerHTML =
    `<option value="">All Brands</option>`;

  statusSelect.innerHTML =
    `<option value="">All Status</option>`;

  brands.forEach(b => {

    if (!b) return;

    let opt =
      document.createElement("option");

    opt.value = b;

    opt.textContent = b;

    brandSelect.appendChild(opt);

  });

  statuses.forEach(s => {

    if (!s) return;

    let opt =
      document.createElement("option");

    opt.value = s;

    opt.textContent = s;

    statusSelect.appendChild(opt);

  });
}

// =========================
// DOWNLOAD CSV
// =========================

function downloadCSV() {

  let rows = [];

  let headers = [];

  document
    .querySelectorAll("thead th")
    .forEach(th => {

      headers.push(
        th.innerText
      );

    });

  rows.push(headers);

  document
    .querySelectorAll("tbody tr")
    .forEach(tr => {

      let row = [];

      tr.querySelectorAll("td")
      .forEach(td => {

        row.push(
          td.innerText
        );

      });

      rows.push(row);

    });

  let csv =
    rows
    .map(r => r.join(","))
    .join("\n");

  let blob =
    new Blob([csv]);

  let a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  a.download =
    "tata_pricing_output.csv";

  a.click();
}

// AUTO LOAD

loadData();