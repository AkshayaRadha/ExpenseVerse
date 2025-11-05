// ===== DOM references =====
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const addExpenseBtn = document.getElementById("addExpense");

const viewButtons = document.querySelectorAll(".btn-view");
const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");
const showButton = document.getElementById("showButton");

const sortAmountBtn = document.getElementById("sortAmountBtn");
const sortDateBtn = document.getElementById("sortDateBtn");

const expenseTable = document.getElementById("expenseTable");
const totalAmountEl = document.getElementById("totalAmount");
const ctxCanvas = document.getElementById("expenseChart");
const darkModeToggle = document.getElementById("darkModeToggle");

// ===== State =====
let expenses = JSON.parse(localStorage.getItem("expenses") || "[]");
let currentView = "daily";
let chart = null;
let sortAmountAsc = true;
let sortDateAsc = true;
let editIndex = null; // 🔹 Track which expense is being edited

// ===== Helpers =====
function saveLocal() {
  localStorage.setItem("expenses", JSON.stringify(expenses));
}

function escapeHtml(str) {
  return str?.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) || "";
}

function getLegendColor() {
  return document.body.classList.contains("dark-mode") ? "#fff" : "#000";
}

// ===== Populate years 2021–2030 =====
function populateYears() {
  yearSelect.innerHTML = '<option value="">Select Year</option>';
  for (let y = 2021; y <= 2030; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  }
}
populateYears();

// ===== Add / Save Expense =====
addExpenseBtn.addEventListener("click", () => {
  const desc = descriptionInput.value.trim();
  const amt = parseFloat(amountInput.value);
  const cat = categoryInput.value;
  const date = dateInput.value;

  if (!desc || !cat || !date || Number.isNaN(amt) || amt <= 0) {
    alert("Please provide valid values for all fields.");
    return;
  }

  if (editIndex !== null) {
    // 🔹 Save edited expense
    expenses[editIndex] = { description: desc, amount: amt, category: cat, date };
    editIndex = null;
    addExpenseBtn.textContent = "Add"; // revert button text
    addExpenseBtn.classList.remove("btn-success");
    addExpenseBtn.classList.add("btn-gradient");
  } else {
    // 🔹 Add new expense
    expenses.push({ description: desc, amount: amt, category: cat, date });
  }

  saveLocal();
  clearInputs();
  renderExpenses();
});

function clearInputs() {
  descriptionInput.value = "";
  amountInput.value = "";
  categoryInput.value = "";
  dateInput.value = "";
}

// ===== Edit / Delete =====
expenseTable.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const idx = Number(btn.dataset.index);

  if (btn.classList.contains("delete-btn")) {
    expenses.splice(idx, 1);
    saveLocal();
    renderExpenses();
  } else if (btn.classList.contains("edit-btn")) {
    startEdit(idx);
  }
});

function startEdit(index) {
  const e = expenses[index];
  if (!e) return;
  descriptionInput.value = e.description;
  amountInput.value = e.amount;
  categoryInput.value = e.category;
  dateInput.value = e.date;

  editIndex = index; // store which one is being edited
  addExpenseBtn.textContent = "Save";
  addExpenseBtn.classList.remove("btn-gradient");
  addExpenseBtn.classList.add("btn-success");
}

// ===== Filtering =====
function filterByCurrentView() {
  const now = new Date();

  if (currentView === "daily") {
    return expenses.filter(exp => new Date(exp.date).toDateString() === now.toDateString());
  }

  if (currentView === "monthly") {
    const m = monthSelect.value ? Number(monthSelect.value) : now.getMonth();
    const y = yearSelect.value ? Number(yearSelect.value) : now.getFullYear();
    return expenses.filter(exp => {
      const d = new Date(exp.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
  }

  if (currentView === "yearly") {
    const y = yearSelect.value ? Number(yearSelect.value) : now.getFullYear();
    return expenses.filter(exp => new Date(exp.date).getFullYear() === y);
  }

  return expenses;
}

// ===== Render Table & Chart =====
function renderExpenses(filtered = null) {
  const list = filtered || filterByCurrentView();
  expenseTable.innerHTML = "";

  if (!list.length) {
    expenseTable.innerHTML = `<tr><td colspan="5" class="text-muted">No expenses found.</td></tr>`;
    updateChart([]);
    totalAmountEl.textContent = "0.00";
    return;
  }

  let total = 0;
  list.forEach(exp => {
    const idx = expenses.findIndex(e =>
      e.description === exp.description &&
      e.date === exp.date &&
      e.amount === exp.amount &&
      e.category === exp.category
    );

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(exp.description)}</td>
      <td>${escapeHtml(exp.category)}</td>
      <td>₹${exp.amount.toFixed(2)}</td>
      <td>${escapeHtml(exp.date)}</td>
      <td>
        <button class="btn btn-warning btn-sm edit-btn me-2" data-index="${idx}">
          <i class="fa fa-edit"></i>
        </button>
        <button class="btn btn-danger btn-sm delete-btn" data-index="${idx}">
          <i class="fa fa-trash"></i>
        </button>
      </td>
    `;
    expenseTable.appendChild(tr);
    total += exp.amount;
  });

  totalAmountEl.textContent = total.toFixed(2);
  updateChart(list);
}

// ===== Chart.js =====
function updateChart(list) {
  if (chart) chart.destroy();

  if (!list.length) {
    chart = new Chart(ctxCanvas, {
      type: "pie",
      data: { labels: ["No Data"], datasets: [{ data: [1], backgroundColor: ["#ccc"] }] },
      options: { plugins: { legend: { labels: { color: getLegendColor() } } }, maintainAspectRatio: false }
    });
    return;
  }

  const categories = [...new Set(list.map(e => e.category))];
  const totals = categories.map(cat =>
    list.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
  );

  chart = new Chart(ctxCanvas, {
    type: "pie",
    data: {
      labels: categories,
      datasets: [{ data: totals, backgroundColor: [
        "#007bff","#28a745","#ffc107","#dc3545","#17a2b8","#6610f2","#fd7e14","#20c997","#6f42c1"
      ]}]
    },
    options: { plugins: { legend: { labels: { color: getLegendColor() } } }, maintainAspectRatio: false }
  });
}

// ===== View Buttons =====
viewButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    viewButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentView = btn.dataset.view;

    if (currentView === "monthly") {
      monthSelect.classList.remove("d-none");
      yearSelect.classList.remove("d-none");
      showButton.classList.remove("d-none");
      const now = new Date();
      monthSelect.value = now.getMonth();
      yearSelect.value = now.getFullYear();
    } else if (currentView === "yearly") {
      monthSelect.classList.add("d-none");
      yearSelect.classList.remove("d-none");
      showButton.classList.remove("d-none");
      yearSelect.value = new Date().getFullYear();
    } else {
      monthSelect.classList.add("d-none");
      yearSelect.classList.add("d-none");
      showButton.classList.add("d-none");
    }

    renderExpenses();
  });
});

showButton.addEventListener("click", () => {
  const filtered = filterByCurrentView(); // reapply filter using selected month/year
  renderExpenses(filtered);               // pass filtered data to renderer
});


// ===== Sorting =====
sortAmountBtn.addEventListener("click", () => {
  const list = filterByCurrentView();
  if (!list.length) return;
  list.sort((a,b) => sortAmountAsc ? a.amount - b.amount : b.amount - a.amount);
  sortAmountAsc = !sortAmountAsc;
  sortAmountBtn.textContent = sortAmountAsc ? "Sort by Amount ↑" : "Sort by Amount ↓";
  renderExpenses(list);
});

sortDateBtn.addEventListener("click", () => {
  const list = filterByCurrentView();
  if (!list.length) return;
  list.sort((a,b) => sortDateAsc ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date));
  sortDateAsc = !sortDateAsc;
  sortDateBtn.textContent = sortDateAsc ? "Sort by Date ↑" : "Sort by Date ↓";
  renderExpenses(list);
});

// ===== Dark Mode =====
darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  darkModeToggle.innerHTML = isDark
    ? '<i class="fa-solid fa-sun"></i> Light Mode'
    : '<i class="fa-solid fa-moon"></i> Dark Mode';
  renderExpenses();
});

// ===== Initialize =====
renderExpenses();

