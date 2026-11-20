import { useEffect, useMemo, useState } from "react";
import {
  Percent,
  ArrowDown,
  ArrowUp,
  Scale,
  Search,
  RotateCcw,
  Info,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
} from "lucide-react";

import api from "../../api/axios";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import "./tax.css";

/* =========================================================
   CONSTANTS / HELPERS
========================================================= */

const PAGE_SIZE = 10;

const TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "credit", label: "Credit" },
  { value: "debit", label: "Debit" },
];

const SOURCE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "purchase", label: "Purchase" },
  { value: "delivery", label: "Delivery" },
];

const toDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// First and last day of the current month
const getMonthRange = () => {
  const now = new Date();

  return {
    from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-GB").replace(/\//g, "-");
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN");

const formatMoney = (value) => `₹ ${formatNumber(value)}`;

const capitalize = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "-";

// Backend record -> table row
const normalizeTransaction = (item, index) => ({
  id: item._id || `tax-${index}`,
  date: item.transactionDate || item.createdAt,
  type: String(item.transactionType || "").toLowerCase(),
  taxAmount: Number(item.taxAmount || 0),
  usedTax: Number(item.usedTax || 0),
  externalAmount: Number(item.externalAmount || 0),
  source: String(item.sourceType || "").toLowerCase(),
  referenceNo: item.sourceId || "-",
  remarks: item.remarks || "-",
});

/* =========================================================
   SMALL UI PIECE
========================================================= */

function SectionCard({ number, title, note, children }) {
  return (
    <section className="tax-section">
      <div className="tax-section-head">
        <span>{number}.</span>

        {title}

        {note && <small>({note})</small>}
      </div>

      <div className="tax-section-body">{children}</div>
    </section>
  );
}

/* =========================================================
   PAGE
========================================================= */

function Tax() {
  const monthRange = useMemo(() => getMonthRange(), []);

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    credit: 0,
    used: 0,
    balance: 0,
  });

  // filter inputs (what the user is typing)
  const [fromDate, setFromDate] = useState(monthRange.from);
  const [toDate, setToDate] = useState(monthRange.to);
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // filters applied to the table (after clicking Search)
  const [appliedFilters, setAppliedFilters] = useState({
    from: monthRange.from,
    to: monthRange.to,
    type: "all",
    source: "all",
  });

  const [page, setPage] = useState(1);

  // ==========================================
  // TOAST
  // ==========================================

  const [toast, setToast] = useState({
    show: false,
    title: "",
    message: "",
  });

  const showError = (title, message) => {
    setToast({ show: true, title, message });

    setTimeout(() => {
      setToast({ show: false, title: "", message: "" });
    }, 3000);
  };

  // ==========================================
  // GET TAX SUMMARY
  // ==========================================

  const getTaxSummary = async () => {
    try {
      const response = await api.get("/tax/summary");
      const data = response.data?.data || {};

      setSummary({
        credit: Number(data.totalCredit || 0),
        used: Number(data.totalUsedTax || 0),
        balance: Number(data.currentTaxBalance || 0),
      });
    } catch (error) {
      console.error("Get tax summary error:", error);

      showError(
        "Error",
        error.response?.data?.message || "Failed to fetch tax summary."
      );
    }
  };

  // ==========================================
  // GET TAX TRANSACTIONS
  // ==========================================

  const getTransactions = async () => {
    try {
      setLoading(true);

      const response = await api.get("/tax");
      const list = response.data?.data || [];

      setTransactions(list.map(normalizeTransaction));
    } catch (error) {
      console.error("Get tax transactions error:", error);

      showError(
        "Error",
        error.response?.data?.message || "Failed to fetch tax transactions."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTaxSummary();
    getTransactions();
  }, []);

  // ==========================================
  // FILTERED + SORTED ROWS
  // ==========================================

  const filteredTransactions = useMemo(() => {
    const { from, to, type, source } = appliedFilters;

    return transactions
      .filter((item) => {
        const itemDate = item.date ? new Date(item.date) : null;

        const matchesFrom =
          !from ||
          (itemDate && itemDate >= new Date(`${from}T00:00:00`));

        const matchesTo =
          !to || (itemDate && itemDate <= new Date(`${to}T23:59:59`));

        const matchesType = type === "all" || item.type === type;

        const matchesSource = source === "all" || item.source === source;

        return matchesFrom && matchesTo && matchesType && matchesSource;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, appliedFilters]);

  // ==========================================
  // PAGINATION
  // ==========================================

  const totalEntries = filteredTransactions.length;

  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const pageRows = filteredTransactions.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;

  const showingTo = Math.min(startIndex + PAGE_SIZE, totalEntries);

  // ==========================================
  // SEARCH / RESET
  // ==========================================

  const handleSearch = () => {
    if (fromDate && toDate && fromDate > toDate) {
      showError(
        "Invalid Date Range",
        "From Date cannot be after To Date."
      );

      return;
    }

    setAppliedFilters({
      from: fromDate,
      to: toDate,
      type: typeFilter,
      source: sourceFilter,
    });

    setPage(1);
  };

  const handleReset = () => {
    setFromDate(monthRange.from);
    setToDate(monthRange.to);
    setTypeFilter("all");
    setSourceFilter("all");

    setAppliedFilters({
      from: monthRange.from,
      to: monthRange.to,
      type: "all",
      source: "all",
    });

    setPage(1);
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="tax-layout">
      {/* TOAST */}

      {toast.show && (
        <div className="tax-toast">
          <div className="tax-toast-icon">
            <AlertCircle size={21} />
          </div>

          <div className="tax-toast-content">
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
          </div>

          <button
            type="button"
            className="tax-toast-close"
            onClick={() =>
              setToast({ show: false, title: "", message: "" })
            }
            aria-label="Close notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* SIDEBAR (left) */}

      <Sidebar />

      <div className="tax-main">
        {/* HEADER (top right) */}

        <Header />

        {/* CONTENT (below header) */}

        <main className="tax-content">
          <div className="tax-page-header">
            <div className="tax-title">
              <Percent size={34} />

              <h1>Tax</h1>
            </div>
          </div>

          {/* 1. TAX SUMMARY */}

          <SectionCard number={1} title="Tax Summary">
            <div className="tax-summary-grid">
              <div className="tax-summary-card credit">
                <div className="tax-summary-icon">
                  <ArrowDown size={30} />
                </div>

                <div>
                  <span className="tax-summary-label">Total Tax Credit</span>

                  <strong>{formatMoney(summary.credit)}</strong>

                  <small>(From Purchase)</small>
                </div>
              </div>

              <div className="tax-summary-card used">
                <div className="tax-summary-icon">
                  <ArrowUp size={30} />
                </div>

                <div>
                  <span className="tax-summary-label">Total Used Tax</span>

                  <strong>{formatMoney(summary.used)}</strong>

                  <small>(From Delivery)</small>
                </div>
              </div>

              <div className="tax-summary-card balance">
                <div className="tax-summary-icon">
                  <Scale size={30} />
                </div>

                <div>
                  <span className="tax-summary-label">
                    Available Tax Balance
                  </span>

                  <strong>{formatMoney(summary.balance)}</strong>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* 2. TAX TRANSACTION HISTORY */}

          <SectionCard number={2} title="Tax Transaction History">
            {/* FILTERS */}

            <div className="tax-filters">
              <div className="tax-field">
                <label>From Date</label>

                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                />
              </div>

              <div className="tax-field">
                <label>To Date</label>

                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </div>

              <div className="tax-field">
                <label>Type</label>

                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tax-field">
                <label>Source</label>

                <select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                >
                  {SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tax-filter-actions">
                <button
                  type="button"
                  className="tax-search-btn"
                  onClick={handleSearch}
                >
                  <Search size={17} />
                  Search
                </button>

                <button
                  type="button"
                  className="tax-reset-btn"
                  onClick={handleReset}
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
              </div>
            </div>

            {/* TABLE */}

            <div className="tax-table-wrap">
              <table className="tax-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th className="right">Tax Amount (₹)</th>
                    <th className="right">Used Tax (₹)</th>
                    <th className="right">External Amount (₹)</th>
                    <th>Source</th>
                    <th>Reference No</th>
                    <th>Remarks</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="tax-empty">
                        Loading tax transactions...
                      </td>
                    </tr>
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="tax-empty">
                        No tax transactions found.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row, index) => (
                      <tr key={row.id}>
                        <td>{startIndex + index + 1}</td>

                        <td>{formatDate(row.date)}</td>

                        <td>
                          <span className={`tax-type-badge ${row.type}`}>
                            {row.type ? row.type.toUpperCase() : "-"}
                          </span>
                        </td>

                        <td className="right">
                          {formatNumber(row.taxAmount)}
                        </td>

                        <td className="right">{formatNumber(row.usedTax)}</td>

                        <td className="right">
                          {formatNumber(row.externalAmount)}
                        </td>

                        <td>
                          <span className={`tax-source-badge ${row.source}`}>
                            {capitalize(row.source)}
                          </span>
                        </td>

                        <td>{row.referenceNo}</td>

                        <td>{row.remarks}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* FOOTER : entries + pagination */}

            <div className="tax-table-footer">
              <span>
                Showing {showingFrom} to {showingTo} of {totalEntries} entries
              </span>

              <div className="tax-pagination">
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={17} />
                </button>

                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .filter(
                    (pageNumber) =>
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      Math.abs(pageNumber - currentPage) <= 1
                  )
                  .map((pageNumber, index, visible) => (
                    <span key={pageNumber} className="tax-page-item">
                      {index > 0 && pageNumber - visible[index - 1] > 1 && (
                        <em>…</em>
                      )}

                      <button
                        type="button"
                        className={pageNumber === currentPage ? "active" : ""}
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    </span>
                  ))}

                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </SectionCard>

          {/* 3. TAX CALCULATION */}

          <SectionCard number={3} title="Tax Calculation" note="Info">
            <div className="tax-info-box">
              <div className="tax-info-icon">
                <Info size={26} />
              </div>

              <div>
                <strong>
                  Available Tax Balance = Total Tax Credit (Purchase) – Total
                  Used Tax (Delivery)
                </strong>

                <p>
                  Tax will be added when purchase is saved and will be
                  deducted when delivery is completed.
                </p>
              </div>
            </div>
          </SectionCard>
        </main>
      </div>
    </div>
  );
}

export default Tax;
