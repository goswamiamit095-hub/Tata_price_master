const sheetURL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vSgsCQ59YbAExP9Ik6g_vLI3WL2eIOGmY3D48S28e44cRTJjr2xwEpjKSQ4Z0GCK8q6Q9H5WStT0Xa4/pub?gid=319738758&single=true&output=csv";

let originalData = [];

let currentMargin = 20;

// ======================
// CSV PARSER
// ======================

function parseCSV(text) {

  let rows = [];
  let row = [];
  let current = "";
  let insideQuotes = false;

  for (let char of text) {

    if (char === '"') {

      insideQuotes = !insideQuotes;

    } else if (
      char === ',' &&
      !insideQuotes
    ) {

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

// ======================
// LOAD DATA
// ======================

async function loadData() {

  currentMargin =
    parseFloat(
      document.getElementById("margin").value
    ) || 0;

  let res =
    await fetch(sheetURL);

  let text =
    await res.text();

  let rows =
    parseCSV(text);

  let headers =
    rows[0].map(h => h.trim());

  originalData =
    rows.slice(1).map(r => {

      let obj = {};

      headers.forEach((h, i) => {

        obj[h] =
          r[i]
          ? r[i].trim()
          : "";

      });

      return obj;

    });

  populateFilters();

  applyFilters();
}

// ======================
// CALCULATE
// ======================

function calculate(row) {

  let TP =
    parseFloat(
      (row.TP || "0")
      .replace(/,/g, "")
      .trim()
    ) || 0;

  let margin =
    parseFloat(
      document.getElementById("margin").value
    ) || 0;

  let commissionRate =
    (
      parseFloat(
        document.getElementById("commission").value
      ) || 0
    ) / 100;

  let processing =
    (
      parseFloat(
        document.getElementById("processingFee").value
      ) || 0
    ) * 1.18;

  let gstRate = 0.18;

  let tdsRate = 0.001;

  let targetNet =
    TP * (1 + margin / 100);

  let dispatch = 30;

  let denominator =
    1 -
    commissionRate -
    (commissionRate * gstRate) -
    tdsRate;

  let SP =
    (
      targetNet +
      processing +
      dispatch
    ) / denominator;

  dispatch =
    SP < 500
    ? 25
    : SP < 1000
    ? 30
    : 35;

  SP =
    (
      targetNet +
      processing +
      dispatch
    ) / denominator;

  let Commission =
    SP * commissionRate;

  let GST_on_Commission =
    Commission * gstRate;

  let TDS =
    SP * tdsRate;

  let Gross_Payout =
    SP -
    Commission -
    GST_on_Commission -
    TDS;

  let Processing_Fee =
    processing;

  let Dispatch_Cost =
    dispatch;

  let Net_Payout =
    Gross_Payout -
    Processing_Fee -
    Dispatch_Cost;

  let TP_Diff_AMT =
    Net_Payout - TP;

  let TP_Diff_Per =
    TP
    ? ((TP_Diff_AMT / TP) * 100)
    : 0;

  let MRP =
    Math.round(
      (SP / 35) * 100
    );

  let TD =
    (
      (
        (MRP - SP) /
        MRP
      ) * 100
    ).toFixed(2) + "%";

  return {

    MRP:
      MRP.toFixed(0),

    TD:
      TD,

    BAU_SP:
      SP.toFixed(2),

    Commission:
      Commission.toFixed(2),

    GST_on_Commission:
      GST_on_Commission.toFixed(2),

    TDS:
      TDS.toFixed(2),

    Gross_Payout:
      Gross_Payout.toFixed(2),

    Processing_Fee:
      Processing_Fee.toFixed(2),

    Dispatch_Cost:
      Dispatch_Cost.toFixed(2),

    Net_Payout:
      Net_Payout.toFixed(2),

    TP_Diff_AMT:
      TP_Diff_AMT.toFixed(2),

    "TP_Diff_%":
      TP_Diff_Per.toFixed(2) + "%"

  };
}

// ======================
// FILTER
// ======================

function applyFilters() {

  let search =
    document.getElementById("search")
    .value
    .toLowerCase()
    .trim();

  let brand =
    document.getElementById("brandFilter")
    .value;

  let status =
    document.getElementById("statusFilter")
    .value;

  let filtered =
    originalData.filter(r => {

      let productName =
        (r.Product_Name || "")
        .toLowerCase();

      let productSKU =
        (r.Product_SKU || "")
        .toLowerCase();

      let listingID =
        (r.Listing_Id || "")
        .toLowerCase();

      return (

        (
          !search ||

          productName.includes(search) ||

          productSKU.includes(search) ||

          listingID.includes(search)
        )

        &&

        (
          !brand ||
          r.Brand === brand
        )

        &&

        (
          !status ||
          r.Status === status
        )

      );

    });

  renderTable(filtered);
}

// ======================
// TABLE
// ======================

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

  let headers = [

    "ERP_Launch_Date",
    "Tata_Launch_Date",
    "Product_Name",
    "Brand",
    "Product_SKU",
    "Listing_Id",
    "erp_sku",
    "Sku_Code",
    "Category",
    "Status",

    "TP",
    "MRP",
    "TD",
    "BAU_SP",

    "Commission",
    "GST_on_Commission",
    "TDS",
    "Gross_Payout",
    "Processing_Fee",
    "Dispatch_Cost",
    "Net_Payout",
    "TP_Diff_AMT",
    "TP_Diff_%"

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

      let val = "";

      if (
        calc[h] !== undefined
      ) {

        val = calc[h];

      }

      else if (
        row[h] !== undefined
      ) {

        val = row[h];
      }

      let className = "";

      if (
        h === "TP_Diff_%"
      ) {

        let num =
          parseFloat(
            calc["TP_Diff_%"]
          );

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

// ======================
// FILTER DROPDOWN
// ======================

function populateFilters() {

  let brands = [
    ...new Set(
      originalData.map(
        d => d.Brand
      )
    )
  ];

  let statuses = [
    ...new Set(
      originalData.map(
        d => d.Status
      )
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

// ======================
// DOWNLOAD CSV
// ======================

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

// ======================
// AUTO LOAD
// ======================

loadData();