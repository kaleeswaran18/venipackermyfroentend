
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Briefcase,
  CreditCard,
  Wallet,
} from "lucide-react";

import api from "../../api/axios";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import "./ContractWork.css";

function ContractWork() {
  const today = new Date().toISOString().slice(0, 10);

  const [contracts, setContracts] = useState([]);
  const [locations, setLocations] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    contractorName: "",
    location: "",
    workDescription: "",
    startingDate: today,
    endingDate: "",
    contractAmount: "",
    advanceAmount: "",
    remarks: "",
  });

  // Payment States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [paymentEditId, setPaymentEditId] = useState(null);

  const [paymentForm, setPaymentForm] = useState({
    paymentType: "payment",
    amount: "",
    paymentDate: today,
    paymentMode: "Cash",
    remarks: "",
  });

  const [savingPayment, setSavingPayment] = useState(false);

  // Toast
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

  const closeToast = () => {
    setToast({
      show: false,
      type: "",
      title: "",
      message: "",
    });
  };

  // =====================================
  // FORMAT HELPERS
  // =====================================

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const formatInputDate = (date) => {
    if (!date) return "";

    return new Date(date).toISOString().slice(0, 10);
  };

  // =====================================
  // GET LOCATIONS
  // =====================================

  const getLocations = async () => {
    try {
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
    }
  };

  // =====================================
  // GET CONTRACT WORKS
  // =====================================

  const getContracts = async () => {
    try {
      setLoading(true);

      const params = {};

      if (selectedLocation) {
        params.location = selectedLocation;
      }

      const response = await api.get("/contract-work", {
        params,
      });

      setContracts(response.data.data || []);
    } catch (error) {
      console.error("Get contract works error:", error);

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to fetch contract works."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // INITIAL API
  // =====================================

  useEffect(() => {
    getLocations();
  }, []);

  useEffect(() => {
    getContracts();
  }, [selectedLocation]);

  // =====================================
  // FILTER CONTRACTS
  // =====================================

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        contract.contractorName
          ?.toLowerCase()
          .includes(searchText) ||
        contract.workDescription
          ?.toLowerCase()
          .includes(searchText);

      return matchesSearch;
    });
  }, [contracts, search]);

  // =====================================
  // PAYMENT CALCULATIONS
  // =====================================

  const getPaymentSummary = (contract) => {
    const payments = contract.payments || [];

    const advanceAmount = payments
      .filter((payment) => payment.paymentType === "advance")
      .reduce(
        (total, payment) => total + Number(payment.amount || 0),
        0
      );

    const paidAmount = payments.reduce(
      (total, payment) => total + Number(payment.amount || 0),
      0
    );

    const balanceAmount =
      Number(contract.contractAmount || 0) - paidAmount;

    return {
      advanceAmount,
      paidAmount,
      balanceAmount,
    };
  };

  // =====================================
  // RESET CONTRACT FORM
  // =====================================

  const resetForm = () => {
    setFormData({
      contractorName: "",
      location: "",
      workDescription: "",
      startingDate: today,
      endingDate: "",
      contractAmount: "",
      advanceAmount: "",
      remarks: "",
    });

    setEditId(null);
  };

  // =====================================
  // OPEN ADD FORM
  // =====================================

  const handleAdd = () => {
    resetForm();
    setShowForm(true);
  };

  // =====================================
  // OPEN EDIT FORM
  // =====================================

  const handleEdit = (contract) => {
    setEditId(contract._id);

    setFormData({
      contractorName: contract.contractorName || "",
      location:
        contract.location?._id || contract.location || "",
      workDescription: contract.workDescription || "",
      startingDate: formatInputDate(contract.startingDate),
      endingDate: formatInputDate(contract.endingDate),
      contractAmount: contract.contractAmount ?? "",
      advanceAmount: "",
      remarks: contract.remarks || "",
    });

    setShowForm(true);
  };

  // =====================================
  // CONTRACT INPUT CHANGE
  // =====================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // =====================================
  // SAVE CONTRACT
  // =====================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.location) {
      showToast(
        "error",
        "Required",
        "Please select a location."
      );
      return;
    }

    if (
      !formData.contractorName.trim() ||
      !formData.workDescription.trim() ||
      !formData.startingDate ||
      formData.contractAmount === ""
    ) {
      showToast(
        "error",
        "Required",
        "Please fill all required fields."
      );
      return;
    }

    const contractAmount = Number(formData.contractAmount);

    if (!Number.isFinite(contractAmount) || contractAmount <= 0) {
      showToast(
        "error",
        "Invalid Amount",
        "Contract amount must be greater than zero."
      );
      return;
    }

    const advanceAmount =
      formData.advanceAmount === "" ? 0 : Number(formData.advanceAmount);

    if (!Number.isFinite(advanceAmount) || advanceAmount < 0) {
      showToast(
        "error",
        "Invalid Advance",
        "Advance amount cannot be negative."
      );
      return;
    }

    if (!editId && advanceAmount > contractAmount) {
      showToast(
        "error",
        "Invalid Advance",
        "Advance amount cannot exceed the contract amount."
      );
      return;
    }

    const payload = {
      contractorName: formData.contractorName.trim(),
      location: formData.location,
      workDescription: formData.workDescription.trim(),
      startingDate: formData.startingDate,
      endingDate: formData.endingDate || null,
      contractAmount,
      remarks: formData.remarks.trim(),
    };

    // Add an advance payment only when an amount is entered while creating.
    // The payment date defaults to the contract starting date and mode to Cash.
    if (!editId && advanceAmount > 0) {
      payload.payments = [
        {
          paymentType: "advance",
          amount: advanceAmount,
          paymentDate: formData.startingDate,
          paymentMode: "Cash",
          remarks: "Advance Payment",
        },
      ];
    }

    try {
      setSaving(true);

      if (editId) {
        await api.patch(
          `/contract-work/${editId}`,
          payload
        );

        showToast(
          "success",
          "Updated",
          "Contract work updated successfully."
        );
      } else {
        await api.post("/contract-work", payload);

        showToast(
          "success",
          "Created",
          "Contract work created successfully."
        );
      }

      setShowForm(false);
      resetForm();

      await getContracts();
    } catch (error) {
      console.error("Save contract error:", error);

      showToast(
        "error",
        "Save Failed",
        error.response?.data?.message ||
          "Failed to save contract work."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================
  // DELETE CONTRACT
  // =====================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this contract work?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/contract-work/${id}`);

      showToast(
        "success",
        "Deleted",
        "Contract work deleted successfully."
      );

      await getContracts();
    } catch (error) {
      console.error("Delete contract error:", error);

      showToast(
        "error",
        "Delete Failed",
        error.response?.data?.message ||
          "Failed to delete contract work."
      );
    }
  };

  // =====================================
  // CLOSE CONTRACT FORM
  // =====================================

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  // =====================================
  // OPEN PAYMENT MODAL
  // =====================================

  const openPaymentModal = (contract) => {
    setSelectedContract(contract);
    setPaymentEditId(null);

    setPaymentForm({
      paymentType: "payment",
      amount: "",
      paymentDate: today,
      paymentMode: "Cash",
      remarks: "",
    });

    setShowPaymentModal(true);
  };

  // =====================================
  // RESET PAYMENT FORM
  // =====================================

  const resetPaymentForm = () => {
    setPaymentForm({
      paymentType: "payment",
      amount: "",
      paymentDate: today,
      paymentMode: "Cash",
      remarks: "",
    });

    setPaymentEditId(null);
  };

  // =====================================
  // PAYMENT INPUT CHANGE
  // =====================================

  const handlePaymentChange = (event) => {
    const { name, value } = event.target;

    setPaymentForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // =====================================
  // EDIT PAYMENT
  // =====================================

  const handleEditPayment = (payment) => {
    setPaymentEditId(payment.paymentId);

    setPaymentForm({
      paymentType: payment.paymentType || "payment",
      amount: payment.amount ?? "",
      paymentDate: formatInputDate(payment.paymentDate),
      paymentMode: payment.paymentMode || "Cash",
      remarks: payment.remarks || "",
    });
  };

  // =====================================
  // SAVE PAYMENT
  // =====================================

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();

    if (!selectedContract) return;

    const amount = Number(paymentForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast(
        "error",
        "Invalid Amount",
        "Payment amount must be greater than zero."
      );
      return;
    }

    const existingPayments = selectedContract.payments || [];

    const totalPaid = existingPayments.reduce(
      (total, payment) => {
        if (
          paymentEditId &&
          payment.paymentId === paymentEditId
        ) {
          return total;
        }

        return total + Number(payment.amount || 0);
      },
      0
    );

    const contractAmount = Number(
      selectedContract.contractAmount || 0
    );

    if (totalPaid + amount > contractAmount) {
      showToast(
        "error",
        "Invalid Payment",
        "Payment amount cannot exceed the remaining contract balance."
      );
      return;
    }

    const payload = {
      paymentType: paymentForm.paymentType,
      amount,
      paymentDate: paymentForm.paymentDate,
      paymentMode: paymentForm.paymentMode,
      remarks: paymentForm.remarks.trim(),
    };

    try {
      setSavingPayment(true);

      if (paymentEditId) {
        await api.patch(
          `/contract-work/${selectedContract._id}/payments/${paymentEditId}`,
          payload
        );

        showToast(
          "success",
          "Updated",
          "Payment updated successfully."
        );
      } else {
        await api.post(
          `/contract-work/${selectedContract._id}/payments`,
          payload
        );

        showToast(
          "success",
          "Added",
          "Payment added successfully."
        );
      }

      resetPaymentForm();

      await refreshSelectedContract(selectedContract._id);
    } catch (error) {
      console.error("Save payment error:", error);

      showToast(
        "error",
        "Payment Failed",
        error.response?.data?.message ||
          "Failed to save payment."
      );
    } finally {
      setSavingPayment(false);
    }
  };

  // =====================================
  // REFRESH SELECTED CONTRACT
  // =====================================

  const refreshSelectedContract = async (id) => {
    try {
      const response = await api.get(`/contract-work/${id}`);

      setSelectedContract(response.data.data);

      await getContracts();
    } catch (error) {
      console.error("Refresh contract error:", error);

      showToast(
        "error",
        "Error",
        "Failed to refresh contract details."
      );
    }
  };

  // =====================================
  // DELETE PAYMENT
  // =====================================

  const handleDeletePayment = async (paymentId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this payment?"
    );

    if (!confirmed || !selectedContract) return;

    try {
      await api.delete(
        `/contract-work/${selectedContract._id}/payments/${paymentId}`
      );

      showToast(
        "success",
        "Deleted",
        "Payment deleted successfully."
      );

      if (paymentEditId === paymentId) {
        resetPaymentForm();
      }

      await refreshSelectedContract(selectedContract._id);
    } catch (error) {
      console.error("Delete payment error:", error);

      showToast(
        "error",
        "Delete Failed",
        error.response?.data?.message ||
          "Failed to delete payment."
      );
    }
  };

  // =====================================
  // CLOSE PAYMENT MODAL
  // =====================================

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedContract(null);
    setPaymentEditId(null);
  };

  // =====================================
  // RENDER
  // =====================================

  return (
    <div className="contract-work-layout">

      {/* TOAST */}

      {toast.show && (
        <div
          className={`location-toast location-toast-${toast.type}`}
        >
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

      {/* ADD / EDIT CONTRACT MODAL */}

      {showForm && (
        <div className="contract-work-modal-overlay">
          <div className="contract-work-modal">

            <div className="contract-work-modal-header">
              <div>
                <h2>
                  {editId ? "Edit Contract Work" : "Add Contract Work"}
                </h2>
                <p>Enter contractor and work details</p>
              </div>

              <button type="button" onClick={closeForm}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="contract-work-form-grid">

                <div className="contract-work-form-group">
                  <label>Contractor Name *</label>
                  <input
                    type="text"
                    name="contractorName"
                    value={formData.contractorName}
                    onChange={handleChange}
                    placeholder="Enter contractor name"
                    required
                  />
                </div>

                <div className="contract-work-form-group">
                  <label>Location *</label>
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Location</option>

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

                <div className="contract-work-form-group full-width">
                  <label>Work Description *</label>
                  <textarea
                    name="workDescription"
                    value={formData.workDescription}
                    onChange={handleChange}
                    placeholder="Enter work description"
                    rows="3"
                    required
                  />
                </div>

                <div className="contract-work-form-group">
                  <label>Starting Date *</label>
                  <input
                    type="date"
                    name="startingDate"
                    value={formData.startingDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="contract-work-form-group">
                  <label>Ending Date</label>
                  <input
                    type="date"
                    name="endingDate"
                    value={formData.endingDate}
                    min={formData.startingDate || undefined}
                    onChange={handleChange}
                  />
                </div>

                <div className="contract-work-form-group">
                  <label>Contract Amount *</label>
                  <input
                    type="number"
                    name="contractAmount"
                    value={formData.contractAmount}
                    onChange={handleChange}
                    placeholder="Enter contract amount"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>

                {!editId && (
                  <div className="contract-work-form-group">
                    <label>Advance Amount (Optional)</label>
                    <input
                      type="number"
                      name="advanceAmount"
                      value={formData.advanceAmount}
                      onChange={handleChange}
                      placeholder="Enter advance amount (optional)"
                      min="0"
                      step="0.01"
                    />
                    <small>
                      Leave empty if no advance payment is made.
                    </small>
                  </div>
                )}

                <div className="contract-work-form-group">
                  <label>Remarks</label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                    placeholder="Enter remarks"
                    rows="2"
                  />
                </div>

              </div>

              <div className="contract-work-form-actions">
                <button
                  type="button"
                  onClick={closeForm}
                  className="contract-work-cancel-btn"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="contract-work-save-btn"
                >
                  {saving
                    ? "Saving..."
                    : editId
                      ? "Update"
                      : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}

      {showPaymentModal && selectedContract && (
        <div className="contract-work-modal-overlay">
          <div className="contract-work-modal contract-payment-modal">

            <div className="contract-work-modal-header">
              <div>
                <h2>Payment Details</h2>
                <p>{selectedContract.contractorName}</p>
              </div>

              <button
                type="button"
                onClick={closePaymentModal}
              >
                <X size={20} />
              </button>
            </div>

            <div className="contract-payment-summary">

              <div>
                <span>Contract Amount</span>
                <strong>
                  {formatCurrency(selectedContract.contractAmount)}
                </strong>
              </div>

              <div>
                <span>Advance Amount</span>
                <strong>
                  {formatCurrency(
                    getPaymentSummary(selectedContract).advanceAmount
                  )}
                </strong>
              </div>

              <div>
                <span>Total Paid</span>
                <strong>
                  {formatCurrency(
                    getPaymentSummary(selectedContract).paidAmount
                  )}
                </strong>
              </div>

              <div>
                <span>Balance Amount</span>
                <strong className="contract-balance">
                  {formatCurrency(
                    getPaymentSummary(selectedContract).balanceAmount
                  )}
                </strong>
              </div>

            </div>

            {/* PAYMENT FORM */}

            <form
              className="contract-payment-form"
              onSubmit={handlePaymentSubmit}
            >
              <h3>
                {paymentEditId ? "Edit Payment" : "Add New Payment"}
              </h3>

              <div className="contract-work-form-grid">

                <div className="contract-work-form-group">
                  <label>Payment Type *</label>
                  <select
                    name="paymentType"
                    value={paymentForm.paymentType}
                    onChange={handlePaymentChange}
                    required
                  >
                    <option value="advance">Advance</option>
                    <option value="payment">Payment</option>
                  </select>
                </div>

                <div className="contract-work-form-group">
                  <label>Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    value={paymentForm.amount}
                    onChange={handlePaymentChange}
                    placeholder="Enter amount"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>

                <div className="contract-work-form-group">
                  <label>Payment Date *</label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={paymentForm.paymentDate}
                    onChange={handlePaymentChange}
                    required
                  />
                </div>

                <div className="contract-work-form-group">
                  <label>Payment Mode *</label>
                  <select
                    name="paymentMode"
                    value={paymentForm.paymentMode}
                    onChange={handlePaymentChange}
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div className="contract-work-form-group full-width">
                  <label>Remarks</label>
                  <textarea
                    name="remarks"
                    value={paymentForm.remarks}
                    onChange={handlePaymentChange}
                    placeholder="Enter payment remarks"
                    rows="2"
                  />
                </div>

              </div>

              <div className="contract-work-form-actions">
                {paymentEditId && (
                  <button
                    type="button"
                    className="contract-work-cancel-btn"
                    onClick={resetPaymentForm}
                  >
                    Cancel Edit
                  </button>
                )}

                <button
                  type="submit"
                  disabled={savingPayment}
                  className="contract-work-save-btn"
                >
                  {savingPayment
                    ? "Saving..."
                    : paymentEditId
                      ? "Update Payment"
                      : "Add Payment"}
                </button>
              </div>
            </form>

            {/* PAYMENT HISTORY */}

            <div className="contract-payment-history">
              <h3>Payment History</h3>

              <div className="contract-payment-table-wrapper">
                <table className="contract-payment-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Mode</th>
                      <th>Remarks</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(selectedContract.payments || []).length > 0 ? (
                      [...selectedContract.payments]
                        .sort(
                          (a, b) =>
                            new Date(b.paymentDate) -
                            new Date(a.paymentDate)
                        )
                        .map((payment, index) => (
                          <tr key={payment.paymentId}>
                            <td>{index + 1}</td>

                            <td>{formatDate(payment.paymentDate)}</td>

                            <td>
                              <span
                                className={`contract-payment-type contract-payment-type-${payment.paymentType}`}
                              >
                                {payment.paymentType === "advance"
                                  ? "Advance"
                                  : "Payment"}
                              </span>
                            </td>

                            <td>{formatCurrency(payment.amount)}</td>

                            <td>{payment.paymentMode}</td>

                            <td>{payment.remarks || "-"}</td>

                            <td>
                              <div className="daily-logs-actions">
                                <button
                                  type="button"
                                  className="daily-logs-edit-btn"
                                  title="Edit Payment"
                                  onClick={() =>
                                    handleEditPayment(payment)
                                  }
                                >
                                  <Pencil size={15} />
                                </button>

                                <button
                                  type="button"
                                  className="daily-logs-delete-btn"
                                  title="Delete Payment"
                                  onClick={() =>
                                    handleDeletePayment(payment.paymentId)
                                  }
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="daily-logs-empty">
                          No payments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SIDEBAR */}

      <Sidebar />

      <div className="contract-work-main">
        <Header />

        <main className="contract-work-content">

          {/* PAGE HEADER */}

          <div className="contract-work-page-header">
            <div>
              <h1>Contract Work</h1>
              <p>Manage contractor details and payments</p>
            </div>

            <button
              type="button"
              className="contract-work-add-btn"
              onClick={handleAdd}
            >
              <Plus size={18} />
              Add Contract
            </button>
          </div>

          {/* SUMMARY */}

          <div className="contract-work-summary">

            <div className="contract-summary-card">
              <div className="contract-summary-icon">
                <Briefcase size={21} />
              </div>
              <div>
                <span>Total Contracts</span>
                <strong>{contracts.length}</strong>
              </div>
            </div>

            <div className="contract-summary-card">
              <div className="contract-summary-icon">
                <CreditCard size={21} />
              </div>
              <div>
                <span>Total Contract Amount</span>
                <strong>
                  {formatCurrency(
                    contracts.reduce(
                      (total, item) =>
                        total + Number(item.contractAmount || 0),
                      0
                    )
                  )}
                </strong>
              </div>
            </div>

            <div className="contract-summary-card">
              <div className="contract-summary-icon">
                <Wallet size={21} />
              </div>
              <div>
                <span>Total Paid</span>
                <strong>
                  {formatCurrency(
                    contracts.reduce(
                      (total, item) =>
                        total + getPaymentSummary(item).paidAmount,
                      0
                    )
                  )}
                </strong>
              </div>
            </div>

            <div className="contract-summary-card">
              <div className="contract-summary-icon">
                <CreditCard size={21} />
              </div>
              <div>
                <span>Total Balance</span>
                <strong>
                  {formatCurrency(
                    contracts.reduce(
                      (total, item) =>
                        total + getPaymentSummary(item).balanceAmount,
                      0
                    )
                  )}
                </strong>
              </div>
            </div>

          </div>

          {/* FILTERS */}

          <section className="contract-work-filter-card">

            <div className="contract-work-form-group">
              <label>Search Contractor / Work</label>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search contractor or work..."
              />
            </div>

            <div className="contract-work-form-group">
              <label>Location</label>
              <select
                value={selectedLocation}
                onChange={(event) =>
                  setSelectedLocation(event.target.value)
                }
              >
                <option value="">All Locations</option>

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

            <button
              type="button"
              className="contract-work-clear-btn"
              onClick={() => {
                setSearch("");
                setSelectedLocation("");
              }}
            >
              Clear Filters
            </button>

          </section>

          {/* CONTRACT TABLE */}

          <section className="contract-work-table-card">

            <div className="contract-work-table-header">
              <div>
                <h2>Contract Details</h2>
                <p>Contractor and payment information</p>
              </div>

              <span className="contract-work-count">
                {filteredContracts.length} Records
              </span>
            </div>

            <div className="contract-work-table-wrapper">
              <table className="contract-work-table">

                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Contractor</th>
                    <th>Location</th>
                    <th>Work Description</th>
                    <th>Starting Date</th>
                    <th>Contract Amount</th>
                    <th>Advance</th>
                    <th>Paid Amount</th>
                    <th>Balance</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="daily-logs-empty">
                        Loading contracts...
                      </td>
                    </tr>
                  ) : filteredContracts.length > 0 ? (
                    filteredContracts.map((contract, index) => {
                      const summary = getPaymentSummary(contract);

                      return (
                        <tr key={contract._id}>
                          <td>{index + 1}</td>

                          <td className="contract-contractor-name">
                            {contract.contractorName}
                          </td>

                          <td>
                            {contract.location?.name || "-"}
                          </td>

                          <td className="contract-description">
                            {contract.workDescription}
                          </td>

                          <td>{formatDate(contract.startingDate)}</td>

                          <td>
                            {formatCurrency(contract.contractAmount)}
                          </td>

                          <td>
                            {formatCurrency(summary.advanceAmount)}
                          </td>

                          <td>
                            {formatCurrency(summary.paidAmount)}
                          </td>

                          <td className="contract-balance">
                            {formatCurrency(summary.balanceAmount)}
                          </td>

                          <td>
                            <div className="contract-work-actions">

                              <button
                                type="button"
                                className="contract-payment-btn"
                                title="Manage Payments"
                                onClick={() =>
                                  openPaymentModal(contract)
                                }
                              >
                                <CreditCard size={16} />
                              </button>

                              <button
                                type="button"
                                className="daily-logs-edit-btn"
                                title="Edit"
                                onClick={() => handleEdit(contract)}
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                type="button"
                                className="daily-logs-delete-btn"
                                title="Delete"
                                onClick={() =>
                                  handleDelete(contract._id)
                                }
                              >
                                <Trash2 size={16} />
                              </button>

                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="10" className="daily-logs-empty">
                        No contract works found.
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}

export default ContractWork;
