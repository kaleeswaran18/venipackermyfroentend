
import { useEffect, useState } from "react";

import {
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Tag,
  FileText,
} from "lucide-react";

import api from "../../api/axios";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import "./FinanceTransaction.css";

function FinanceTransaction() {
  // =========================================================
  // FORM
  // =========================================================

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    entryMode: "manual",
    type: "expense",
    categoryId: "",
    locationId: "",
    amount: "",
    transactionDate: "",
    paymentMethod: "cash",
    description: "",
    referenceNumber: "",
  });

  // =========================================================
  // DATA
  // =========================================================

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // =========================================================
  // FILTERS
  // =========================================================

  const now = new Date();

  // Month and year filters default to the current month and year.
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedLocation, setSelectedLocation] = useState("all");

  const [typeFilter, setTypeFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");

  // =========================================================
  // TOAST
  // =========================================================

  const [toast, setToast] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });

  // =========================================================
  // DELETE MODAL
  // =========================================================

  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    description: "",
  });

  // =========================================================
  // SHOW TOAST
  // =========================================================

  const showToast = (type, title, message) => {
    setToast({
      show: true,
      type,
      title,
      message,
    });

    setTimeout(() => {
      setToast({
        show: false,
        type: "",
        title: "",
        message: "",
      });
    }, 3000);
  };

  // =========================================================
  // CLOSE TOAST
  // =========================================================

  const closeToast = () => {
    setToast({
      show: false,
      type: "",
      title: "",
      message: "",
    });
  };

  // =========================================================
  // GET ALL TRANSACTIONS
  // =========================================================

  const getTransactions = async () => {
    try {
      setLoading(true);

      const response = await api.get("/finance-transactions", {
        params: {
          month: selectedMonth,
          year: selectedYear,
          locationId: selectedLocation,
          type: typeFilter,
          entryMode: modeFilter,
        },
      });

      setTransactions(response.data.data || []);
    } catch (error) {
      console.error("Get transactions error:", error);

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to fetch finance transactions."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // GET FINANCE CATEGORIES
  // =========================================================

  const getCategories = async () => {
    try {
      setLoadingCategories(true);

      const response = await api.get("/finance-categories");

      setCategories(response.data.data || []);
    } catch (error) {
      console.error("Get categories error:", error);

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to fetch finance categories."
      );
    } finally {
      setLoadingCategories(false);
    }
  };

  // =========================================================
  // GET LOCATIONS
  // =========================================================

  const getLocations = async () => {
    try {
      setLoadingLocations(true);

      const response = await api.get("/locations");

      setLocations(response.data.data || []);
    } catch (error) {
      console.error("Get locations error:", error);

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to fetch locations."
      );
    } finally {
      setLoadingLocations(false);
    }
  };

  // =========================================================
  // LOAD DATA
  // =========================================================

  // Load categories and locations once.
  useEffect(() => {
    getCategories();
    getLocations();
  }, []);

  // Reload transactions whenever any filter changes.
  useEffect(() => {
    getTransactions();
  }, [
    selectedMonth,
    selectedYear,
    selectedLocation,
    typeFilter,
    modeFilter,
  ]);

  // =========================================================
  // CATEGORY FILTER BY TYPE
  // =========================================================

  const filteredCategories = categories.filter(
    (category) => category.type === formData.type
  );

  // =========================================================
  // INPUT CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // =========================================================
  // TYPE CHANGE
  // =========================================================

  const handleTypeChange = (event) => {
    const value = event.target.value;

    setFormData((current) => ({
      ...current,
      type: value,
      categoryId: "",
    }));
  };

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setFormData({
      entryMode: "manual",
      type: "expense",
      categoryId: "",
      locationId: "",
      amount: "",
      transactionDate: "",
      paymentMethod: "cash",
      description: "",
      referenceNumber: "",
    });

    setEditingId(null);
  };

  // =========================================================
  // VALIDATION
  // =========================================================

  const validateForm = () => {
    if (!formData.categoryId) {
      showToast(
        "error",
        "Category Required",
        "Please select a finance category."
      );

      return false;
    }

    if (!formData.locationId) {
      showToast(
        "error",
        "Location Required",
        "Please select a location."
      );

      return false;
    }

    if (
      formData.amount === "" ||
      !Number.isFinite(Number(formData.amount)) ||
      Number(formData.amount) <= 0
    ) {
      showToast(
        "error",
        "Invalid Amount",
        "Please enter a valid transaction amount."
      );

      return false;
    }

    if (!formData.transactionDate) {
      showToast(
        "error",
        "Date Required",
        "Please select transaction date and time."
      );

      return false;
    }

    if (!formData.description.trim()) {
      showToast(
        "error",
        "Description Required",
        "Please enter transaction description."
      );

      return false;
    }

    return true;
  };

  // =========================================================
  // CREATE / UPDATE TRANSACTION
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        entryMode: "manual",
        type: formData.type,
        categoryId: formData.categoryId,
        locationId: formData.locationId,
        amount: Number(formData.amount),
        transactionDate: new Date(
          formData.transactionDate
        ).toISOString(),
        paymentMethod: formData.paymentMethod,
        description: formData.description.trim(),
        referenceNumber: formData.referenceNumber.trim(),
      };

      // =====================================================
      // UPDATE MANUAL TRANSACTION
      // =====================================================

      if (editingId) {
        await api.patch(
          `/finance-transactions/${editingId}`,
          payload
        );

        showToast(
          "success",
          "Transaction Updated",
          "Finance transaction updated successfully."
        );
      }

      // =====================================================
      // CREATE MANUAL TRANSACTION
      // =====================================================

      else {
        await api.post(
          "/finance-transactions",
          payload
        );

        showToast(
          "success",
          "Transaction Created",
          "Finance transaction created successfully."
        );
      }

      await getTransactions();

      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error("Save transaction error:", error);

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to save finance transaction."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // ADD TRANSACTION
  // =========================================================

  const handleAddTransaction = () => {
    resetForm();
    setShowForm(true);
  };

  // =========================================================
  // EDIT TRANSACTION
  // =========================================================

  const handleEdit = (transaction) => {
    if (transaction.entryMode !== "manual") {
      showToast(
        "error",
        "Automatic Transaction",
        "Automatic transactions must be edited from their source module."
      );

      return;
    }

    const categoryId =
      transaction.categoryId?._id ||
      transaction.categoryId ||
      "";

    const locationId =
      transaction.locationId?._id ||
      transaction.locationId ||
      "";

    setFormData({
      entryMode: "manual",
      type: transaction.type || "expense",
      categoryId,
      locationId,
      amount: transaction.amount ?? "",
      transactionDate: transaction.transactionDate
        ? new Date(transaction.transactionDate)
            .toISOString()
            .slice(0, 16)
        : "",
      paymentMethod: transaction.paymentMethod || "cash",
      description: transaction.description || "",
      referenceNumber: transaction.referenceNumber || "",
    });

    setEditingId(transaction._id);
    setShowForm(true);
  };

  // =========================================================
  // CANCEL
  // =========================================================

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
  };

  // =========================================================
  // DELETE - OPEN MODAL
  // =========================================================

  const handleDelete = (transaction) => {
    if (transaction.entryMode !== "manual") {
      showToast(
        "error",
        "Automatic Transaction",
        "Automatic transactions cannot be deleted here."
      );

      return;
    }

    setDeleteModal({
      show: true,
      id: transaction._id,
      description: transaction.description || "this transaction",
    });
  };

  // =========================================================
  // CLOSE DELETE MODAL
  // =========================================================

  const closeDeleteModal = () => {
    setDeleteModal({
      show: false,
      id: null,
      description: "",
    });
  };

  // =========================================================
  // CONFIRM DELETE
  // =========================================================

  const confirmDelete = async () => {
    if (!deleteModal.id) {
      return;
    }

    try {
      await api.delete(
        `/finance-transactions/${deleteModal.id}`
      );

      closeDeleteModal();

      showToast(
        "success",
        "Transaction Deleted",
        "Finance transaction deleted successfully."
      );

      await getTransactions();

      if (editingId === deleteModal.id) {
        resetForm();
        setShowForm(false);
      }
    } catch (error) {
      console.error("Delete transaction error:", error);

      closeDeleteModal();

      showToast(
        "error",
        "Delete Failed",
        error.response?.data?.message ||
          "Failed to delete finance transaction."
      );
    }
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =========================================================
  // FORMAT AMOUNT
  // =========================================================

  const formatAmount = (amount) => {
    return Number(amount || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  };

  // =========================================================
  // CATEGORY NAME
  // =========================================================

  const getCategoryName = (transaction) => {
    if (
      transaction.categoryId &&
      typeof transaction.categoryId === "object"
    ) {
      return transaction.categoryId.name || "-";
    }

    const category = categories.find(
      (item) => item._id === transaction.categoryId
    );

    return category?.name || "-";
  };

  // =========================================================
  // LOCATION NAME
  // =========================================================

  const getLocationName = (transaction) => {
    if (
      transaction.locationId &&
      typeof transaction.locationId === "object"
    ) {
      return transaction.locationId.name || "-";
    }

    const location = locations.find(
      (item) => item._id === transaction.locationId
    );

    return location?.name || "-";
  };

  // =========================================================
  // MONTH / YEAR OPTIONS
  // =========================================================

  const monthOptions = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December",
  ];

  // Current year plus previous years (including years in existing records).
  const transactionYears = transactions
    .map((item) => {
      const date = new Date(item.transactionDate);
      return Number.isNaN(date.getTime()) ? null : date.getFullYear();
    })
    .filter((year) => year !== null);

  const earliestYear = Math.min(
    now.getFullYear() - 5,
    ...transactionYears,
    now.getFullYear()
  );

  const yearOptions = Array.from(
    { length: now.getFullYear() - earliestYear + 1 },
    (_, index) => now.getFullYear() - index
  );

  // =========================================================
  // FILTER BY SELECTED MONTH AND YEAR
  // =========================================================

  const periodTransactions = transactions.filter((transaction) => {
    if (!transaction.transactionDate) return false;

    const transactionDate = new Date(transaction.transactionDate);
    if (Number.isNaN(transactionDate.getTime())) return false;

    return (
      transactionDate.getMonth() === Number(selectedMonth) &&
      transactionDate.getFullYear() === Number(selectedYear)
    );
  });

  // =========================================================
  // FILTER BY TYPE AND ENTRY MODE
  // =========================================================

  const locationFilteredTransactions = periodTransactions.filter(
    (transaction) => {
      if (selectedLocation === "all") return true;

      const transactionLocationId =
        transaction.locationId?._id || transaction.locationId;

      return String(transactionLocationId) === String(selectedLocation);
    }
  );

  const filteredTransactions = locationFilteredTransactions.filter(
    (transaction) => {
      const matchesType =
        typeFilter === "all" || transaction.type === typeFilter;

      const matchesMode =
        modeFilter === "all" || transaction.entryMode === modeFilter;

      return matchesType && matchesMode;
    }
  );

  // =========================================================
  // SUMMARY FOR SELECTED MONTH AND YEAR
  // =========================================================

  const activeTransactions = locationFilteredTransactions.filter(
    (item) => !item.isDeleted
  );

  const totalIncome = activeTransactions
    .filter((item) => item.type === "income")
    .reduce((total, item) => total + Number(item.amount || 0), 0);

  const totalExpense = activeTransactions
    .filter((item) => item.type === "expense")
    .reduce((total, item) => total + Number(item.amount || 0), 0);

  const balance = totalIncome - totalExpense;

  // =========================================================
  // RETURN
  // =========================================================

  return (
    <div className="employees-layout">

      {/* SIDEBAR */}

      <Sidebar />

      <div className="employees-main">

        {/* HEADER */}

        <Header />

        <main className="employees-content">

          {/* PAGE HEADER */}

          <div className="finance-transaction-page-header">

            <div>
              <h1>Finance Transactions</h1>

              <p>
                Manage income and expense transactions
              </p>
            </div>

            <button
              type="button"
              className="add-transaction-btn"
              onClick={handleAddTransaction}
            >
              <Plus size={18} />
              Add Transaction
            </button>

          </div>

          {/* SUMMARY */}

          <div className="finance-transaction-summary">

            <div className="finance-transaction-summary-card">
              <div className="finance-transaction-summary-icon income">
                <TrendingUp size={22} />
              </div>

              <div>
                <p>Total Income</p>
                <h3>{formatAmount(totalIncome)}</h3>
              </div>
            </div>

            <div className="finance-transaction-summary-card">
              <div className="finance-transaction-summary-icon expense">
                <TrendingDown size={22} />
              </div>

              <div>
                <p>Total Expense</p>
                <h3>{formatAmount(totalExpense)}</h3>
              </div>
            </div>

            <div className="finance-transaction-summary-card">
              <div className="finance-transaction-summary-icon balance">
                <Wallet size={22} />
              </div>

              <div>
                <p>Net Balance</p>
                <h3>{formatAmount(balance)}</h3>
              </div>
            </div>

          </div>

          {/* FORM */}

          {showForm && (
            <section className="finance-transaction-form-card">

              <div className="finance-transaction-form-header">

                <div>
                  <h2>
                    {editingId
                      ? "Edit Transaction"
                      : "Transaction Details"}
                  </h2>

                  <p>
                    {editingId
                      ? "Update manual transaction information"
                      : "Enter the transaction information below"}
                  </p>
                </div>

                <button
                  type="button"
                  className="close-form-btn"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  <X size={18} />
                </button>

              </div>

              <form onSubmit={handleSubmit}>

                <div className="finance-transaction-form-grid">

                  {/* ENTRY MODE */}

                  <div className="finance-transaction-form-group">

                    <label>Entry Mode</label>

                    <div className="finance-transaction-input-wrapper">
                      <Wallet size={18} />

                      <input
                        type="text"
                        value="Manual"
                        disabled
                      />
                    </div>

                  </div>

                  {/* TYPE */}

                  <div className="finance-transaction-form-group">

                    <label>
                      Transaction Type <span>*</span>
                    </label>

                    <div className="finance-transaction-input-wrapper">
                      <TrendingUp size={18} />

                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleTypeChange}
                      >
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                    </div>

                  </div>

                  {/* CATEGORY */}

                  <div className="finance-transaction-form-group">

                    <label>
                      Category <span>*</span>
                    </label>

                    <div className="finance-transaction-input-wrapper">
                      <Tag size={18} />

                      <select
                        name="categoryId"
                        value={formData.categoryId}
                        onChange={handleChange}
                        disabled={loadingCategories}
                      >
                        <option value="">
                          {loadingCategories
                            ? "Loading categories..."
                            : "Select Category"}
                        </option>

                        {filteredCategories.map((category) => (
                          <option
                            key={category._id}
                            value={category._id}
                          >
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>

                  {/* LOCATION */}

                  <div className="finance-transaction-form-group">

                    <label>
                      Location <span>*</span>
                    </label>

                    <div className="finance-transaction-input-wrapper">
                      <MapPin size={18} />

                      <select
                        name="locationId"
                        value={formData.locationId}
                        onChange={handleChange}
                        disabled={loadingLocations}
                      >
                        <option value="">
                          {loadingLocations
                            ? "Loading locations..."
                            : "Select Location"}
                        </option>

                        {locations.map((location) => (
                          <option
                            key={location._id}
                            value={location._id}
                          >
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>

                  {/* AMOUNT */}

                  <div className="finance-transaction-form-group">

                    <label>
                      Amount <span>*</span>
                    </label>

                    <div className="finance-transaction-input-wrapper">
                      <span className="finance-transaction-rupee">
                        ₹
                      </span>

                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        placeholder="Enter amount"
                        min="0.01"
                        step="0.01"
                      />
                    </div>

                  </div>

                  {/* TRANSACTION DATE */}

                  <div className="finance-transaction-form-group">

                    <label>
                      Transaction Date & Time <span>*</span>
                    </label>

                    <div className="finance-transaction-input-wrapper">
                      <Calendar size={18} />

                      <input
                        type="datetime-local"
                        name="transactionDate"
                        value={formData.transactionDate}
                        onChange={handleChange}
                      />
                    </div>

                  </div>

                  {/* PAYMENT METHOD */}

                  <div className="finance-transaction-form-group">

                    <label>
                      Payment Method <span>*</span>
                    </label>

                    <div className="finance-transaction-input-wrapper">
                      <Wallet size={18} />

                      <select
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleChange}
                      >
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">
                          Bank Transfer
                        </option>
                        <option value="cheque">Cheque</option>
                      </select>
                    </div>

                  </div>

                  {/* REFERENCE NUMBER */}

                  <div className="finance-transaction-form-group">

                    <label>Reference Number (Optional)</label>

                    <div className="finance-transaction-input-wrapper">
                      <FileText size={18} />

                      <input
                        type="text"
                        name="referenceNumber"
                        value={formData.referenceNumber}
                        onChange={handleChange}
                        placeholder="Enter reference number"
                      />
                    </div>

                  </div>

                  {/* DESCRIPTION */}

                  <div className="finance-transaction-form-group full-width">

                    <label>
                      Description <span>*</span>
                    </label>

                    <div className="finance-transaction-input-wrapper">
                      <FileText size={18} />

                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Enter transaction description"
                        rows={3}
                      />
                    </div>

                  </div>

                </div>

                {/* FORM ACTIONS */}

                <div className="finance-transaction-form-actions">

                  <button
                    type="button"
                    className="finance-transaction-cancel-btn"
                    onClick={handleCancel}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="finance-transaction-save-btn"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Saving..."
                      : editingId
                      ? "Update Transaction"
                      : "Create Transaction"}
                  </button>

                </div>

              </form>

            </section>
          )}

          {/* TRANSACTION TABLE */}

          <section className="finance-transaction-table-card">

            <div className="finance-transaction-table-header">

              <div>
                <h2>Transaction List</h2>

                <p>
                  {filteredTransactions.length} transactions found
                </p>
              </div>

              <div className="finance-transaction-filters">

                <select
                  value={selectedMonth}
                  onChange={(event) =>
                    setSelectedMonth(Number(event.target.value))
                  }
                  aria-label="Filter by month"
                >
                  {monthOptions.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                      {index === now.getMonth() &&
                      Number(selectedYear) === now.getFullYear()
                        ? " (This Month)"
                        : ""}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(event) =>
                    setSelectedYear(Number(event.target.value))
                  }
                  aria-label="Filter by year"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                      {year === now.getFullYear() ? " (This Year)" : ""}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedLocation}
                  onChange={(event) =>
                    setSelectedLocation(event.target.value)
                  }
                  aria-label="Filter by location"
                >
                  <option value="all">All Locations</option>
                  {locations.map((location) => (
                    <option key={location._id} value={location._id}>
                      {location.name}
                    </option>
                  ))}
                </select>

                <select
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value)
                  }
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>

                <select
                  value={modeFilter}
                  onChange={(event) =>
                    setModeFilter(event.target.value)
                  }
                >
                  <option value="all">All Entries</option>
                  <option value="manual">Manual</option>
                  <option value="automatic">Automatic</option>
                </select>

              </div>

            </div>

            <div className="finance-transaction-table-wrapper">

              <table className="finance-transaction-table">

                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Date & Time</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Entry Mode</th>
                    <th>Payment Method</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {loading ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="finance-transaction-empty-state"
                      >
                        Loading transactions...
                      </td>
                    </tr>
                  ) : filteredTransactions.length > 0 ? (
                    filteredTransactions.map(
                      (transaction, index) => (
                        <tr key={transaction._id}>

                          <td>{index + 1}</td>

                          <td>
                            {formatDate(transaction.transactionDate)}
                          </td>

                          <td>
                            <span
                              className={`finance-transaction-type-badge ${transaction.type}`}
                            >
                              {transaction.type}
                            </span>
                          </td>

                          <td>
                            {getCategoryName(transaction)}
                          </td>

                          <td>
                            {getLocationName(transaction)}
                          </td>

                          <td>
                            <span
                              className={`finance-transaction-mode-badge ${transaction.entryMode}`}
                            >
                              {transaction.entryMode}
                            </span>
                          </td>

                          <td>
                            {String(
                              transaction.paymentMethod || "-"
                            ).replaceAll("_", " ")}
                          </td>

                          <td>
                            <strong
                              className={
                                transaction.type === "income"
                                  ? "finance-income-amount"
                                  : "finance-expense-amount"
                              }
                            >
                              {formatAmount(transaction.amount)}
                            </strong>
                          </td>

                          <td>
                            {transaction.description || "-"}
                          </td>

                          <td>

                            {transaction.entryMode === "manual" ? (
                              <div className="finance-transaction-actions">

                                <button
                                  type="button"
                                  className="finance-transaction-edit-btn"
                                  onClick={() =>
                                    handleEdit(transaction)
                                  }
                                  title="Edit Transaction"
                                >
                                  <Pencil size={16} />
                                </button>

                                <button
                                  type="button"
                                  className="finance-transaction-delete-btn"
                                  onClick={() =>
                                    handleDelete(transaction)
                                  }
                                  title="Delete Transaction"
                                >
                                  <Trash2 size={16} />
                                </button>

                              </div>
                            ) : (
                              <span className="finance-readonly-label">
                                Source Module
                              </span>
                            )}

                          </td>

                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan={10}
                        className="finance-transaction-empty-state"
                      >
                        No transactions found.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>

          </section>

        </main>
      </div>

      {/* TOAST */}

      {toast.show && (
        <div
          className={`finance-transaction-toast finance-transaction-toast-${toast.type}`}
        >

          <div className="finance-transaction-toast-icon">

            {toast.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}

          </div>

          <div className="finance-transaction-toast-content">

            <strong>{toast.title}</strong>
            <span>{toast.message}</span>

          </div>

          <button
            type="button"
            className="finance-transaction-toast-close"
            onClick={closeToast}
          >
            <X size={17} />
          </button>

        </div>
      )}

      {/* DELETE MODAL */}

      {deleteModal.show && (
        <div
          className="finance-transaction-delete-overlay"
          onClick={closeDeleteModal}
        >

          <div
            className="finance-transaction-delete-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="finance-transaction-delete-icon">
              <Trash2 size={25} />
            </div>

            <div className="finance-transaction-delete-content">

              <h3>Delete Transaction?</h3>

              <p>
                Are you sure you want to delete{" "}
                <strong>{deleteModal.description}</strong>?
              </p>

              <span>
                This transaction will be soft deleted.
              </span>

            </div>

            <div className="finance-transaction-delete-actions">

              <button
                type="button"
                className="finance-transaction-delete-cancel"
                onClick={closeDeleteModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="finance-transaction-delete-confirm"
                onClick={confirmDelete}
              >
                <Trash2 size={16} />
                Delete
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default FinanceTransaction;
