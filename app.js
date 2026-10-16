import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBjmJlr2Y6I_MxJLmOMwJeZEs-R8-dGyBU",
  authDomain: "kaylies-budget.firebaseapp.com",
  projectId: "kaylies-budget",
  storageBucket: "kaylies-budget.firebasestorage.app",
  messagingSenderId: "551695158826",
  appId: "1:551695158826:web:ff1a003cfd6eda0b823d53",
  measurementId: "G-B4KVDF25RY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// All entries remain in these collections until deleted.
const USER_ID = "default";

const incomeCollection = collection(
  db,
  `users/${USER_ID}/incomeEntries`
);

const expensesCollection = collection(
  db,
  `users/${USER_ID}/expenses`
);

// HTML elements
const plannedIncomeEl = document.getElementById("plannedIncome");
const totalSpentEl = document.getElementById("totalSpent");
const remainingAmountEl = document.getElementById("remainingAmount");
const remainingCard = document.getElementById("remainingCard");

const incomeForm = document.getElementById("incomeForm");
const incomeName = document.getElementById("incomeName");
const incomeAmount = document.getElementById("incomeAmount");
const addIncomeBtn = document.getElementById("addIncomeBtn");
const incomeTableBody = document.getElementById("incomeTableBody");

const expenseForm = document.getElementById("expenseForm");
const expenseName = document.getElementById("expenseName");
const expenseCategory = document.getElementById("expenseCategory");
const expenseAmount = document.getElementById("expenseAmount");
const addExpenseBtn = document.getElementById("addExpenseBtn");
const expenseTableBody = document.getElementById("expenseTableBody");

const clearMonthBtn = document.getElementById("clearMonthBtn");
const statusMessage = document.getElementById("statusMessage");

// Current totals
let totalIncome = 0;
let totalExpenses = 0;

let unsubscribeIncome = null;
let unsubscribeExpenses = null;

// Display an error message on the page.
function showError(message) {
  statusMessage.textContent = message;
  statusMessage.style.display = "block";
}

function clearError() {
  statusMessage.textContent = "";
  statusMessage.style.display = "none";
}

// Format dollar amounts.
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(amount) || 0);
}

// Format the date when an entry is added.
function formatDatePretty() {
  const date = new Date();

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "2-digit"
  });
}

// Money-rain animation after adding income.
function moneyRain() {
  const container = document.getElementById("moneyRain");

  for (let i = 0; i < 25; i++) {
    const bill = document.createElement("div");

    bill.className = "money";
    bill.textContent = "💵";
    bill.style.left = Math.random() * 100 + "vw";
    bill.style.animationDelay = Math.random() * 0.5 + "s";

    container.appendChild(bill);

    setTimeout(() => bill.remove(), 2000);
  }
}

// Update all three summary cards.
function updateTotals() {
  const remaining = totalIncome - totalExpenses;

  plannedIncomeEl.textContent = formatCurrency(totalIncome);
  totalSpentEl.textContent = formatCurrency(totalExpenses);
  remainingAmountEl.textContent = formatCurrency(remaining);

  // Red when overspending; green when balance is zero or positive.
  const isNegative = remaining < 0;

  remainingCard.classList.toggle("bad", isNegative);
  remainingCard.classList.toggle("good", !isNegative);
}

// Create a table cell safely using textContent.
function createCell(value, className = "") {
  const cell = document.createElement("td");

  cell.textContent = value;

  if (className) {
    cell.className = className;
  }

  return cell;
}

// Create a delete button.
function createDeleteButton(onClick) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "btn-danger delete-btn";
  button.textContent = "Delete";
  button.addEventListener("click", onClick);

  return button;
}

// Add income.
async function addIncome(event) {
  event.preventDefault();
  clearError();

  const name = incomeName.value.trim();
  const amount = Number(incomeAmount.value);

  if (!name || !Number.isFinite(amount) || amount <= 0) {
    showError("Enter an income name and an amount greater than zero.");
    return;
  }

  addIncomeBtn.disabled = true;

  try {
    await addDoc(incomeCollection, {
      name,
      amount,
      date: formatDatePretty(),
      createdAt: Date.now()
    });

    incomeForm.reset();
    moneyRain();
  } catch (error) {
    console.error("Could not add income:", error);
    showError("Unable to add income. Please check your connection and try again.");
  } finally {
    addIncomeBtn.disabled = false;
  }
}

// Delete one income entry.
async function deleteIncome(id) {
  clearError();

  try {
    await deleteDoc(
      doc(db, `users/${USER_ID}/incomeEntries/${id}`)
    );
  } catch (error) {
    console.error("Could not delete income:", error);
    showError("Unable to delete this income entry.");
  }
}

// Add an expense.
async function addExpense(event) {
  event.preventDefault();
  clearError();

  const name = expenseName.value.trim();
  const category = expenseCategory.value;
  const amount = Number(expenseAmount.value);

  if (!name || !Number.isFinite(amount) || amount <= 0) {
    showError("Enter an expense name and an amount greater than zero.");
    return;
  }

  addExpenseBtn.disabled = true;

  try {
    await addDoc(expensesCollection, {
      name,
      category,
      amount,
      date: formatDatePretty(),
      createdAt: Date.now()
    });

    expenseForm.reset();
  } catch (error) {
    console.error("Could not add expense:", error);
    showError("Unable to add expense. Please check your connection and try again.");
  } finally {
    addExpenseBtn.disabled = false;
  }
}

// Delete one expense entry.
async function deleteExpense(id) {
  clearError();

  try {
    await deleteDoc(
      doc(db, `users/${USER_ID}/expenses/${id}`)
    );
  } catch (error) {
    console.error("Could not delete expense:", error);
    showError("Unable to delete this expense entry.");
  }
}

// Clear all income and expense entries.
async function clearAllBudgetData() {
  const confirmed = confirm(
    "Are you sure you want to permanently delete ALL income and expenses? This cannot be undone."
  );

  if (!confirmed) {
    return;
  }

  clearError();
  clearMonthBtn.disabled = true;

  try {
    // Read both collections before deleting anything.
    const [incomeSnapshot, expenseSnapshot] = await Promise.all([
      getDocs(incomeCollection),
      getDocs(expensesCollection)
    ]);

    const entries = [
      ...incomeSnapshot.docs,
      ...expenseSnapshot.docs
    ];

    // Firestore batches support up to 500 operations each.
    for (let i = 0; i < entries.length; i += 500) {
      const batch = writeBatch(db);
      const chunk = entries.slice(i, i + 500);

      for (const entry of chunk) {
        batch.delete(entry.ref);
      }

      await batch.commit();
    }
  } catch (error) {
    console.error("Could not clear budget:", error);
    showError(
      "Unable to clear all data. Some entries may remain; please check your budget."
    );
  } finally {
    clearMonthBtn.disabled = false;
  }
}

// Listen for income changes in real time.
function subscribeToIncome() {
  unsubscribeIncome = onSnapshot(
    incomeCollection,
    (snapshot) => {
      incomeTableBody.innerHTML = "";
      totalIncome = 0;

      if (snapshot.empty) {
        const row = document.createElement("tr");
        const cell = createCell("No income entries yet.", "empty-message");
        cell.colSpan = 4;
        row.appendChild(cell);
        incomeTableBody.appendChild(row);
      }

      const entries = snapshot.docs
        .map((document) => ({
          id: document.id,
          ...document.data()
        }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      for (const entry of entries) {
        totalIncome += Number(entry.amount) || 0;

        const row = document.createElement("tr");

        row.appendChild(createCell(entry.date || ""));
        row.appendChild(createCell(entry.name || ""));
        row.appendChild(
          createCell(formatCurrency(entry.amount), "right")
        );

        const actionCell = document.createElement("td");
        actionCell.appendChild(
          createDeleteButton(() => deleteIncome(entry.id))
        );

        row.appendChild(actionCell);
        incomeTableBody.appendChild(row);
      }

      updateTotals();
    },
    (error) => {
      console.error("Could not load income:", error);
      showError(
        "Unable to load income. Check your Firebase connection and security rules."
      );
    }
  );
}

// Listen for expense changes in real time.
function subscribeToExpenses() {
  unsubscribeExpenses = onSnapshot(
    expensesCollection,
    (snapshot) => {
      expenseTableBody.innerHTML = "";
      totalExpenses = 0;

      if (snapshot.empty) {
        const row = document.createElement("tr");
        const cell = createCell("No expenses yet.", "empty-message");
        cell.colSpan = 5;
        row.appendChild(cell);
        expenseTableBody.appendChild(row);
      }

      const entries = snapshot.docs
        .map((document) => ({
          id: document.id,
          ...document.data()
        }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      for (const entry of entries) {
        totalExpenses += Number(entry.amount) || 0;

        const row = document.createElement("tr");

        row.appendChild(createCell(entry.date || ""));
        row.appendChild(createCell(entry.name || ""));

        const categoryCell = document.createElement("td");
        const categoryPill = document.createElement("span");

        categoryPill.className = "category-pill";
        categoryPill.textContent = entry.category || "Other";

        categoryCell.appendChild(categoryPill);
        row.appendChild(categoryCell);

        row.appendChild(
          createCell(formatCurrency(entry.amount), "right")
        );

        const actionCell = document.createElement("td");
        actionCell.appendChild(
          createDeleteButton(() => deleteExpense(entry.id))
        );

        row.appendChild(actionCell);
        expenseTableBody.appendChild(row);
      }

      updateTotals();
    },
    (error) => {
      console.error("Could not load expenses:", error);
      showError(
        "Unable to load expenses. Check your Firebase connection and security rules."
      );
    }
  );
}

// Connect form submissions and start the live listeners.
incomeForm.addEventListener("submit", addIncome);
expenseForm.addEventListener("submit", addExpense);
clearMonthBtn.addEventListener("click", clearAllBudgetData);

subscribeToIncome();
subscribeToExpenses();

// Clean up listeners if the page is unloaded.
window.addEventListener("pagehide", () => {
  if (unsubscribeIncome) unsubscribeIncome();
  if (unsubscribeExpenses) unsubscribeExpenses();
});
