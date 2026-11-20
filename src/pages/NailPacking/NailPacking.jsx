
import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import api from "../../api/axios";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import "./NailPacking.css";

function NailPacking() {
  const today = new Date();

  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const [formData, setFormData] = useState({
    products: [],
    remarks: "",
  });

  const [toast, setToast] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });

  // =====================================
  // TOAST
  // =====================================

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });

    setTimeout(() => {
      setToast({
        show: false,
        type: "",
        title: "",
        message: "",
      });
    }, 3000);
  };

  const closeToast = () => {
    setToast({
      show: false,
      type: "",
      title: "",
      message: "",
    });
  };

  // =====================================
  // GET MONTHLY REPORT
  // =====================================

  const getNailPackingReport = async () => {
    try {
      setLoading(true);

      const response = await api.get("/nail-packing", {
        params: { month, year },
      });

      setReport(response.data.data || null);
    } catch (error) {
      console.error("Get nail packing error:", error);

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to fetch nail packing report."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getNailPackingReport();
  }, [month, year]);

  // =====================================
  // MONTH OPTIONS
  // =====================================

  const monthOptions = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December",
  ];

  const yearOptions = Array.from(
    { length: 5 },
    (_, index) => today.getFullYear() - index
  );

  // =====================================
  // GET VISIBLE DATES
  // =====================================

  const visibleEntries = useMemo(() => {
    if (!report?.dailyEntries) return [];

    return report.dailyEntries.filter((entry) => {
      const date = new Date(entry.date);

      return (
        date.getUTCFullYear() < today.getFullYear() ||
        (
          date.getUTCFullYear() === today.getFullYear() &&
          date.getUTCMonth() + 1 < today.getMonth() + 1
        ) ||
        (
          date.getUTCFullYear() === today.getFullYear() &&
          date.getUTCMonth() + 1 === today.getMonth() + 1 &&
          date.getUTCDate() <= today.getDate()
        )
      );
    });
  }, [report]);

  // =====================================
  // PRODUCT ID HELPER
  // =====================================

  const getProductId = (product) => {
    return product?._id || product?.productId?._id || product?.productId;
  };

  const getProductName = (product) => {
    return product?.name || product?.productId?.name || "Product";
  };

  // =====================================
  // DAILY TOTAL
  // =====================================

  const getDayTotal = (entry) => {
    return (entry.products || []).reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );
  };

  // =====================================
  // MONTHLY PRODUCT TOTAL
  // =====================================

  const getMonthlyProductTotal = (productId) => {
    return visibleEntries.reduce((total, entry) => {
      const item = entry.products?.find(
        (product) => getProductId(product) === productId
      );

      return total + Number(item?.quantity || 0);
    }, 0);
  };

  const monthlyTotal = visibleEntries.reduce(
    (total, entry) => total + getDayTotal(entry),
    0
  );

  // =====================================
  // DATE FORMAT
  // =====================================

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const getDateKey = (date) => {
    return new Date(date).toISOString().slice(0, 10);
  };

  // =====================================
  // OPEN EDIT FORM
  // =====================================

  const handleEdit = (entry) => {
    setSelectedDate(getDateKey(entry.date));

    setFormData({
      products: (report.products || []).map((product) => {
        const productId = getProductId(product);

        const existing = entry.products?.find(
          (item) => getProductId(item) === productId
        );

        return {
          productId,
          quantity: Number(existing?.quantity || 0),
        };
      }),
      remarks: entry.remarks || "",
    });

    setShowEditForm(true);
  };

  // =====================================
  // QUANTITY CHANGE
  // =====================================

  const handleQuantityChange = (productId, value) => {
    if (value !== "" && Number(value) < 0) return;

    setFormData((current) => ({
      ...current,
      products: current.products.map((product) =>
        product.productId === productId
          ? {
              ...product,
              quantity: value === "" ? "" : Number(value),
            }
          : product
      ),
    }));
  };

  // =====================================
  // SAVE DAILY ENTRY
  // =====================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!report?._id || !selectedDate) return;

    try {
      setSaving(true);

      const payload = {
        products: formData.products.map((product) => ({
          productId: product.productId,
          quantity: Number(product.quantity || 0),
        })),
        remarks: formData.remarks,
      };

      await api.patch(
        `/nail-packing/${report._id}/date/${selectedDate}`,
        payload
      );

      showToast(
        "success",
        "Updated",
        "Daily nail packing updated successfully."
      );

      setShowEditForm(false);
      setSelectedDate(null);

      await getNailPackingReport();
    } catch (error) {
      console.error("Update nail packing error:", error);

      showToast(
        "error",
        "Update Failed",
        error.response?.data?.message ||
          "Failed to update daily report."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================
  // CLOSE EDIT FORM
  // =====================================

  const closeEditForm = () => {
    setShowEditForm(false);
    setSelectedDate(null);

    setFormData({
      products: [],
      remarks: "",
    });
  };

  // =====================================
  // RENDER
  // =====================================

  return (
    <div className="nail-packing-layout">

      {/* TOAST */}

      {toast.show && (
        <div className={`location-toast location-toast-${toast.type}`}>
          <div className="location-toast-icon">
            {toast.type === "success" ? (
              <CheckCircle size={21} />
            ) : (
              <AlertCircle size={21} />
            )}
          </div>

          <div className="location-toast-content">
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
          </div>

          <button
            type="button"
            className="location-toast-close"
            onClick={closeToast}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* EDIT FORM */}

      {showEditForm && (
        <div className="nail-packing-modal-overlay">
          <div className="nail-packing-modal">

            <div className="nail-packing-modal-header">
              <div>
                <h2>Edit Daily Packing</h2>
                <p>{selectedDate}</p>
              </div>

              <button
                type="button"
                onClick={closeEditForm}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>

              <div className="nail-packing-edit-products">

                {formData.products.map((product) => {
                  const productInfo = report.products.find(
                    (item) => getProductId(item) === product.productId
                  );

                  return (
                    <div
                      className="nail-packing-edit-row"
                      key={product.productId}
                    >
                      <label>
                        {getProductName(productInfo)}
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={product.quantity}
                        onChange={(event) =>
                          handleQuantityChange(
                            product.productId,
                            event.target.value
                          )
                        }
                      />
                    </div>
                  );
                })}

              </div>

              <div className="nail-packing-form-group">
                <label>Remarks</label>

                <textarea
                  value={formData.remarks}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      remarks: event.target.value,
                    }))
                  }
                  placeholder="Enter remarks"
                  rows="3"
                />
              </div>

              <div className="nail-packing-form-actions">

                <button
                  type="button"
                  onClick={closeEditForm}
                  className="nail-packing-cancel-btn"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="nail-packing-save-btn"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

      <Sidebar />

      <div className="nail-packing-main">

        <Header />

        <main className="nail-packing-content">

          {/* PAGE HEADER */}

          <div className="nail-packing-page-header">
            <div>
              <h1>Nail Packing Report</h1>
              <p>Daily product packing report - Mahindra City</p>
            </div>
          </div>

          {/* FILTERS */}

          <section className="nail-packing-filter-card">

            <div className="nail-packing-filter-group">
              <label>Month</label>

              <select
                value={month}
                onChange={(event) =>
                  setMonth(Number(event.target.value))
                }
              >
                {monthOptions.map((name, index) => (
                  <option key={index} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="nail-packing-filter-group">
              <label>Year</label>

              <select
                value={year}
                onChange={(event) =>
                  setYear(Number(event.target.value))
                }
              >
                {yearOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

          </section>

          {/* REPORT TABLE */}

          <section className="nail-packing-table-card">

            <div className="nail-packing-table-header">
              <div>
                <h2>Monthly Packing Details</h2>
                <p>
                  {monthOptions[month - 1]} {year}
                </p>
              </div>
            </div>

            <div className="nail-packing-table-wrapper">

              <table className="nail-packing-table">

                <thead>
                  <tr>
                    <th>Date</th>

                    {(report?.products || []).map((product) => (
                      <th key={getProductId(product)}>
                        {getProductName(product)}
                      </th>
                    ))}

                    <th>Day Wise Total</th>
                    <th>Remarks</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {loading ? (
                    <tr>
                      <td
                        colSpan={(report?.products?.length || 0) + 4}
                        className="nail-packing-empty"
                      >
                        Loading report...
                      </td>
                    </tr>
                  ) : visibleEntries.length > 0 ? (
                    visibleEntries.map((entry) => (
                      <tr key={getDateKey(entry.date)}>

                        <td className="nail-packing-date">
                          {formatDate(entry.date)}
                        </td>

                        {(report?.products || []).map((product) => {
                          const productId = getProductId(product);

                          const item = entry.products?.find(
                            (value) => getProductId(value) === productId
                          );

                          return (
                            <td key={productId}>
                              {Number(item?.quantity || 0)}
                            </td>
                          );
                        })}

                        <td className="nail-packing-day-total">
                          {getDayTotal(entry)}
                        </td>

                        <td className="nail-packing-remarks">
                          {entry.remarks || "-"}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="nail-packing-edit-btn"
                            onClick={() => handleEdit(entry)}
                            aria-label="Edit daily entry"
                          >
                            <Pencil size={16} />
                            Edit
                          </button>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={(report?.products?.length || 0) + 4}
                        className="nail-packing-empty"
                      >
                        No packing entries found.
                      </td>
                    </tr>
                  )}

                </tbody>

                {/* MONTHLY TOTAL */}

                {!loading && visibleEntries.length > 0 && (
                  <tfoot>
                    <tr>
                      <th>Monthly Total</th>

                      {(report?.products || []).map((product) => (
                        <th key={getProductId(product)}>
                          {getMonthlyProductTotal(getProductId(product))}
                        </th>
                      ))}

                      <th>{monthlyTotal}</th>
                      <th>-</th>
                      <th>-</th>
                    </tr>
                  </tfoot>
                )}

              </table>

            </div>

          </section>

        </main>

      </div>
    </div>
  );
}

export default NailPacking;
