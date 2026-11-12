
// ========================================
// SPENDWISE - EXPENSE TRACKER
// ========================================

// 1. Select HTML elements
const transactionDialog = document.getElementById("transaction-dialog");
const transactionForm = document.getElementById("transaction-form");
const transactionList = document.getElementById("transaction-list");
const emptyState = document.getElementById("empty-state");
const toast = document.getElementById("toast");

const totalBalanceElement = document.getElementById("total-balance");
const totalIncomeElement = document.getElementById("total-income");
const totalExpensesElement = document.getElementById("total-expenses");
const monthlySavingsElement = document.getElementById("monthly-savings");
const monthlySavingsNote = document.getElementById("monthly-savings-note");

const titleInput = document.getElementById("transaction-title");
const amountInput = document.getElementById("transaction-amount");
const categoryInput = document.getElementById("transaction-category");
const dateInput = document.getElementById("transaction-date");

const searchInput = document.getElementById("search-input");
const typeFilter = document.getElementById("type-filter");
const monthFilter = document.getElementById("month-filter");

let transactions = [];
let editingId = null;
let categoryChart = null;
let monthlyChart = null;
let toastTimeout;

// 2. Application settings
const STORAGE_KEY = "spendwise-transactions-v1";

const categoryIcons = {
  Food: "🍔",
  Shopping: "🛍️",
  Transport: "🚕",
  Bills: "💡",
  Health: "❤️",
  Education: "📚",
  Entertainment: "🎬",
  Salary: "💼",
  Freelance: "💻",
  Investment: "📈",
  Other: "✦"
};

const chartColors = [
  "#36d6a0",
  "#77a9ff",
  "#a78bfa",
  "#ffb86b",
  "#ff7185",
  "#48c7d8",
  "#d5a6ff",
  "#b3d36b",
  "#e8c66a",
  "#ed91bc",
  "#8b9bb8"
];

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

// 3. Helper functions
function formatMoney(amount) {
  return moneyFormatter.format(amount);
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthKey(dateString) {
  return dateString.slice(0, 7);
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric"
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function getSelectedType() {
  return document.querySelector(
    'input[name="transaction-type"]:checked'
  ).value;
}

function setSelectedType(type) {
  const radio = document.querySelector(
    `input[name="transaction-type"][value="${type}"]`
  );

  if (radio) radio.checked = true;
}

// 4. Load and save data
function loadTransactions() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (!savedData) {
      transactions = [];
      return;
    }

    const parsedData = JSON.parse(savedData);

    if (!Array.isArray(parsedData)) {
      transactions = [];
      return;
    }

    transactions = parsedData.filter(item =>
      item &&
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      Number.isFinite(item.amount) &&
      item.amount > 0 &&
      ["income", "expense"].includes(item.type) &&
      typeof item.category === "string" &&
      typeof item.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.date)
    );
  } catch (error) {
    console.error("Could not load saved transactions:", error);
    transactions = [];
    showToast("Saved data could not be read.");
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error("Could not save transactions:", error);
    showToast("Could not save data. Check browser storage.");
  }
}

// 5. Calculate dashboard totals
function updateSummary() {
  const income = transactions
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const expenses = transactions
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const currentMonth = getMonthKey(getLocalDateString());

  const monthlyIncome = transactions
    .filter(item =>
      item.type === "income" &&
      getMonthKey(item.date) === currentMonth
    )
    .reduce((sum, item) => sum + item.amount, 0);

  const monthlyExpenses = transactions
    .filter(item =>
      item.type === "expense" &&
      getMonthKey(item.date) === currentMonth
    )
    .reduce((sum, item) => sum + item.amount, 0);

  const balance = income - expenses;
  const monthlySavings = monthlyIncome - monthlyExpenses;

  totalBalanceElement.textContent = formatMoney(balance);
  totalIncomeElement.textContent = formatMoney(income);
  totalExpensesElement.textContent = formatMoney(expenses);
  monthlySavingsElement.textContent = formatMoney(monthlySavings);

  monthlySavingsNote.textContent = monthlySavings >= 0
    ? "You're saving this month"
    : "Expenses exceed income this month";

  monthlySavingsElement.style.color =
    monthlySavings >= 0 ? "var(--green)" : "var(--red)";
}

// 6. Render transaction table
function renderTransactions() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedType = typeFilter.value;
  const selectedMonth = monthFilter.value;

  const filteredTransactions = transactions
    .filter(item => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm);

      const matchesType =
        selectedType === "all" || item.type === selectedType;

      const matchesMonth =
        selectedMonth === "all" ||
        getMonthKey(item.date) === selectedMonth;

      return matchesSearch && matchesType && matchesMonth;
    })
    .sort((a, b) =>
      b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
    );

  transactionList.innerHTML = filteredTransactions.map(item => {
    const icon = categoryIcons[item.category] || "✦";
    const sign = item.type === "income" ? "+" : "−";

    return `
      <tr>
        <td>
          <div class="transaction-name">
            <span class="transaction-symbol">${icon}</span>
            <div>
              <strong>${escapeHTML(item.title)}</strong>
              <small>${item.type === "income" ? "Income" : "Expense"}</small>
            </div>
          </div>
        </td>
        <td><span class="category-tag">${escapeHTML(item.category)}</span></td>
        <td>${formatDate(item.date)}</td>
        <td>
          <span class="transaction-amount ${item.type}">
            ${sign}${formatMoney(item.amount)}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="action-button" data-action="edit" data-id="${item.id}" aria-label="Edit ${escapeHTML(item.title)}" title="Edit">✎</button>
            <button class="action-button delete" data-action="delete" data-id="${item.id}" aria-label="Delete ${escapeHTML(item.title)}" title="Delete">×</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  const hasResults = filteredTransactions.length > 0;

  emptyState.classList.toggle("show", !hasResults);
  document.querySelector(".table-wrap").style.display =
    hasResults ? "block" : "none";
}

// 7. Update month filter options
function updateMonthFilter() {
  const previousValue = monthFilter.value;

  const months = [...new Set(
    transactions.map(item => getMonthKey(item.date))
  )].sort().reverse();

  monthFilter.innerHTML = '<option value="all">All months</option>';

  months.forEach(month => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = formatMonth(month);
    monthFilter.appendChild(option);
  });

  if (months.includes(previousValue)) {
    monthFilter.value = previousValue;
  } else {
    monthFilter.value = "all";
  }
}

// 8. Create category doughnut chart
function renderCategoryChart() {
  const canvas = document.getElementById("category-chart");
  const currentMonth = getMonthKey(getLocalDateString());

  const monthlyExpenses = transactions.filter(item =>
    item.type === "expense" &&
    getMonthKey(item.date) === currentMonth
  );

  const categoryTotals = {};

  monthlyExpenses.forEach(item => {
    categoryTotals[item.category] =
      (categoryTotals[item.category] || 0) + item.amount;
  });

  const labels = Object.keys(categoryTotals);
  const values = Object.values(categoryTotals);

  const total = values.reduce((sum, value) => sum + value, 0);

  document.getElementById("chart-total").textContent =
    formatMoney(total);

  const legend = document.getElementById("category-legend");

  if (labels.length === 0) {
    legend.innerHTML =
      '<span class="muted">No expenses recorded this month.</span>';
  } else {
    legend.innerHTML = labels.map((label, index) => `
      <span class="legend-item">
        <i class="legend-color" style="background:${chartColors[index % chartColors.length]}"></i>
        ${escapeHTML(label)}
      </span>
    `).join("");
  }

  if (typeof Chart === "undefined") return;

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map(
          (_, index) => chartColors[index % chartColors.length]
        ),
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "76%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context =>
              `${context.label}: ${formatMoney(context.raw)}`
          }
        }
      }
    }
  });
}

// 9. Create monthly income and expense chart
function renderMonthlyChart() {
  const canvas = document.getElementById("monthly-chart");

  const monthKeys = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - i);
    monthKeys.push(getMonthKey(getLocalDateString(date)));
  }

  const labels = monthKeys.map(key => {
    const [year, month] = key.split("-").map(Number);

    return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
      month: "short"
    });
  });

  const incomeData = monthKeys.map(month =>
    transactions
      .filter(item =>
        item.type === "income" &&
        getMonthKey(item.date) === month
      )
      .reduce((sum, item) => sum + item.amount, 0)
  );

  const expenseData = monthKeys.map(month =>
    transactions
      .filter(item =>
        item.type === "expense" &&
        getMonthKey(item.date) === month
      )
      .reduce((sum, item) => sum + item.amount, 0)
  );

  if (typeof Chart === "undefined") return;

  if (monthlyChart) monthlyChart.destroy();

  monthlyChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Income",
          data: incomeData,
          backgroundColor: "#36d6a0",
          borderRadius: 5,
          maxBarThickness: 19
        },
        {
          label: "Expenses",
          data: expenseData,
          backgroundColor: "#ff7185",
          borderRadius: 5,
          maxBarThickness: 19
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context =>
              `${context.dataset.label}: ${formatMoney(context.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#8793ad", font: { size: 10 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#8793ad",
            font: { size: 9 },
            callback: value => {
              if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
              if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
              return `₹${value}`;
            }
          }
        }
      }
    }
  });
}

// 10. Refresh the whole dashboard
function refreshDashboard() {
  updateSummary();
  updateMonthFilter();
  renderTransactions();
  renderCategoryChart();
  renderMonthlyChart();
}

// 11. Open the add transaction dialog
function openAddDialog() {
  editingId = null;

  transactionForm.reset();

  document.getElementById("dialog-title").textContent =
    "Add Transaction";

  document.getElementById("save-transaction").textContent =
    "Save Transaction";

  setSelectedType("expense");
  dateInput.value = getLocalDateString();

  transactionDialog.showModal();
}

// 12. Open the edit transaction dialog
function openEditDialog(id) {
  const item = transactions.find(transaction => transaction.id === id);

  if (!item) return;

  editingId = id;

  document.getElementById("dialog-title").textContent =
    "Edit Transaction";

  document.getElementById("save-transaction").textContent =
    "Update Transaction";

  titleInput.value = item.title;
  amountInput.value = item.amount;
  categoryInput.value = item.category;
  dateInput.value = item.date;

  setSelectedType(item.type);

  transactionDialog.showModal();
}

// 13. Close the dialog
function closeDialog() {
  transactionDialog.close();
  editingId = null;
}

// 14. Save a new or edited transaction
transactionForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;
  const type = getSelectedType();

  if (!title) {
    showToast("Please enter a description.");
    titleInput.focus();
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000000) {
    showToast("Please enter a valid amount.");
    amountInput.focus();
    return;
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    showToast("Please select a valid date.");
    dateInput.focus();
    return;
  }

  if (editingId) {
    transactions = transactions.map(item =>
      item.id === editingId
        ? { ...item, title, amount, category, date, type }
        : item
    );

    showToast("Transaction updated successfully!");
  } else {
    transactions.push({
      id: crypto.randomUUID(),
      title,
      amount,
      category,
      date,
      type
    });

    showToast("Transaction added successfully!");
  }

  saveTransactions();
  closeDialog();
  refreshDashboard();
});

// 15. Handle edit and delete buttons
transactionList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "edit") {
    openEditDialog(id);
  }

  if (action === "delete") {
    const item = transactions.find(transaction => transaction.id === id);

    if (!item) return;

    const confirmed = confirm(
      `Delete "${item.title}" from your transactions?`
    );

    if (!confirmed) return;

    transactions = transactions.filter(item => item.id !== id);

    saveTransactions();
    refreshDashboard();
    showToast("Transaction deleted.");
  }
});

// 16. Connect all add buttons
document.getElementById("add-top-button")
  .addEventListener("click", openAddDialog);

document.getElementById("add-list-button")
  .addEventListener("click", openAddDialog);

document.getElementById("empty-add-button")
  .addEventListener("click", openAddDialog);

// 17. Connect dialog buttons
document.getElementById("close-dialog")
  .addEventListener("click", closeDialog);

document.getElementById("cancel-dialog")
  .addEventListener("click", closeDialog);

transactionDialog.addEventListener("click", event => {
  if (event.target === transactionDialog) {
    closeDialog();
  }
});

// 18. Connect search and filters
searchInput.addEventListener("input", renderTransactions);
typeFilter.addEventListener("change", renderTransactions);
monthFilter.addEventListener("change", renderTransactions);

// 19. Initial application setup
function initializeApp() {
  document.getElementById("today-date").textContent =
    new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });

  document.getElementById("footer-year").textContent =
    new Date().getFullYear();

  loadTransactions();
  refreshDashboard();

  if (typeof Chart === "undefined") {
    showToast("Charts need an internet connection to load.");
  }
}

initializeApp();
