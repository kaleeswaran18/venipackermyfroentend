import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Plus,
  X,
  Home,
  Users,
  Building2,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
  CalendarDays,
  IndianRupee,
  UserRound,
} from "lucide-react";
import "./Property.css";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import api from "../../api/axios";

const emptyForm = {
  propertyName: "",
  doorNo: "",
  propertyType: "",
  address: "",
  rentalType: "Rent",
  monthlyRent: "",
  rentDueDay: "1",
  securityDeposit: "",
  rentRemarks: "",
  leaseAmount: "",
  leasePeriodYears: "",
  advanceAmount: "",
  agreementDocumentNo: "",
  leaseRemarks: "",
};

const emptyOccupancyForm = {
  tenantName: "",
  tenantPhone: "",
  startDate: "",
  endDate: "",
};

const emptyPaymentForm = {
  month: "",
  amount: "",
  paymentDate: "",
  remarks: "",
};

const normalizeProperty = (property = {}) => {
  const rentalType = property.rentalType || "Rent";

  const occupancyHistory = Array.isArray(property.occupancyHistory)
    ? property.occupancyHistory
    : [];

  const paymentHistory = Array.isArray(property.paymentHistory)
    ? property.paymentHistory
    : [];

  const currentOccupancy =
    occupancyHistory.length > 0
      ? occupancyHistory[occupancyHistory.length - 1]
      : null;

  return {
    ...property,
    propertyNo: property.propertyNo || property.propertyNumber || "-",

    propertyName: property.propertyName || "",

    propertyType: property.propertyType || "",

    location: property.location || property.address || "",

    rentalType,

    rentAmount:
      property.rentAmount ??
      (rentalType === "Rent"
        ? property.rentDetails?.monthlyRent
        : property.leaseDetails?.leaseAmount) ??
      0,

    monthlyRent: property.rentDetails?.monthlyRent ?? "",
    securityDeposit: property.rentDetails?.securityDeposit ?? "",
    leaseAmount: property.leaseDetails?.leaseAmount ?? "",
    leasePeriodYears: property.leaseDetails?.leasePeriodYears ?? "",

    occupy: Boolean(property.occupy),

    occupancyHistory,

    paymentHistory,

    currentOccupancy,
  };
};

const getResponseData = (response) =>
  response?.data?.data ?? response?.data ?? null;

const formatAmount = (amount) => Number(amount || 0).toLocaleString("en-IN");

const formatDate = (date) => {
  if (!date) return "—";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "—";
  }

  return value.toLocaleDateString("en-GB");
};

const getCurrentOccupancy = (property) => {
  const history = Array.isArray(property?.occupancyHistory)
    ? property.occupancyHistory
    : [];

  if (!history.length) {
    return null;
  }

  const active = history.filter((item) => !item.endDate);

  return active.length
    ? active[active.length - 1]
    : history[history.length - 1];
};

const getMonthKey = (month) => month || "";

const Property = () => {
  const [properties, setProperties] = useState([]);

  const [activeTab, setActiveTab] = useState("all");

  const [propertyTypeFilter, setPropertyTypeFilter] = useState("");

  const [rentalTypeFilter, setRentalTypeFilter] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    ...emptyForm,
  });

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const toastTimer = useRef(null);

  const [deletePropertyTarget, setDeletePropertyTarget] = useState(null);

  // vacate confirmation (in-page dialog instead of browser confirm)
  const [vacateTarget, setVacateTarget] = useState(null);
  const [vacateReturnAmount, setVacateReturnAmount] = useState("");

  const [viewProperty, setViewProperty] = useState(null);

  const [showOccupancyModal, setShowOccupancyModal] = useState(false);

  const [occupancyProperty, setOccupancyProperty] = useState(null);

  const [occupancyForm, setOccupancyForm] = useState({
    ...emptyOccupancyForm,
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [paymentProperty, setPaymentProperty] = useState(null);

  const [paymentForm, setPaymentForm] = useState({
    ...emptyPaymentForm,
  });

  const showToast = (message, type = "success") => {
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }

    setToast({
      show: true,
      type,
      message,
    });

    toastTimer.current = window.setTimeout(() => {
      setToast((prev) => ({
        ...prev,
        show: false,
      }));
    }, 3000);
  };

  const loadProperties = async () => {
    try {
      setLoading(true);

      const response = await api.get("/properties");

      const data = getResponseData(response);

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.properties)
        ? data.properties
        : [];

      setProperties(list.map(normalizeProperty));
    } catch (error) {
      console.error("Get properties error:", error);

      showToast(
        error.response?.data?.message || "Failed to load properties.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const availableCount = properties.filter(
    (property) => !property.occupy
  ).length;

  const occupiedCount = properties.filter(
    (property) => property.occupy
  ).length;

  const totalCount = properties.length;

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const tabMatch =
        activeTab === "all"
          ? true
          : activeTab === "available"
          ? !property.occupy
          : property.occupy;

      const propertyTypeMatch =
        propertyTypeFilter === ""
          ? true
          : property.propertyType === propertyTypeFilter;

      const rentalTypeMatch =
        rentalTypeFilter === ""
          ? true
          : property.rentalType === rentalTypeFilter;

      return tabMatch && propertyTypeMatch && rentalTypeMatch;
    });
  }, [properties, activeTab, propertyTypeFilter, rentalTypeFilter]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRentalTypeChange = (type) => {
    setFormData((prev) => ({
      ...prev,
      rentalType: type,
    }));
  };

  const resetFilters = () => {
    setActiveTab("all");
    setPropertyTypeFilter("");
    setRentalTypeFilter("");
  };

  const openAddModal = () => {
    setEditingId(null);

    setFormData({
      ...emptyForm,
    });

    setShowModal(true);
  };

  const openEditModal = async (property) => {
    try {
      setLoading(true);

      const response = await api.get(`/properties/${property._id}`);

      const item = normalizeProperty(getResponseData(response) || property);

      const rentalType = item.rentalType || "Rent";

      setFormData({
        ...emptyForm,

        propertyName: item.propertyName || "",

        doorNo: item.doorNo || "",

        propertyType: item.propertyType || "",

        address: item.address || item.location || "",

        rentalType,

        monthlyRent:
          rentalType === "Rent"
            ? item.rentDetails?.monthlyRent ?? item.rentAmount ?? ""
            : "",

        securityDeposit:
          rentalType === "Rent"
            ? item.rentDetails?.securityDeposit ?? ""
            : "",

        leaseAmount:
          rentalType === "Lease"
            ? item.leaseDetails?.leaseAmount ?? item.rentAmount ?? ""
            : "",

        leasePeriodYears:
          rentalType === "Lease"
            ? item.leaseDetails?.leasePeriodYears ?? item.leasePeriodYears ?? ""
            : "",
      });

      setEditingId(item._id);

      setShowModal(true);
    } catch (error) {
      console.error("Get property error:", error);

      showToast(
        error.response?.data?.message || "Failed to load property.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (property) => {
    try {
      setLoading(true);

      const response = await api.get(`/properties/${property._id}`);

      const item = normalizeProperty(getResponseData(response) || property);

      setViewProperty(item);
    } catch (error) {
      console.error("View property error:", error);

      showToast(
        error.response?.data?.message || "Failed to load property details.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const openDeletePopup = (property) => {
    if (!property?._id) {
      return;
    }

    setDeletePropertyTarget(property);
  };

  const closeDeletePopup = () => {
    if (loading) {
      return;
    }

    setDeletePropertyTarget(null);
  };

  const handleDelete = async () => {
    if (!deletePropertyTarget?._id) {
      return;
    }

    try {
      setLoading(true);

      await api.delete(`/properties/${deletePropertyTarget._id}`);

      setProperties((prev) =>
        prev.filter((item) => item._id !== deletePropertyTarget._id)
      );

      setDeletePropertyTarget(null);

      showToast("Property deleted successfully.");
    } catch (error) {
      console.error("Delete property error:", error);

      showToast(
        error.response?.data?.message || "Failed to delete property.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const buildPayload = () => {
    const payload = {
      propertyName: formData.propertyName.trim(),

      doorNo: formData.doorNo.trim(),

      propertyType: formData.propertyType,

      address: formData.address.trim(),

      rentalType: formData.rentalType,
    };

    if (formData.rentalType === "Rent") {
      payload.rentAmount = Number(formData.monthlyRent);
      payload.securityDeposit =
        formData.securityDeposit === "" ? 0 : Number(formData.securityDeposit);
    } else {
      payload.leaseAmount = Number(formData.leaseAmount);

      payload.leasePeriodYears = Number(formData.leasePeriodYears);
    }

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const payload = buildPayload();

      if (editingId) {
        const response = await api.patch(
          `/properties/${editingId}`,
          payload
        );

        const updated = normalizeProperty(getResponseData(response));

        setProperties((prev) =>
          prev.map((item) => (item._id === editingId ? updated : item))
        );

        showToast("Property updated successfully.");
      } else {
        const response = await api.post("/properties", payload);

        const created = normalizeProperty(getResponseData(response));

        setProperties((prev) => [...prev, created]);

        showToast("Property created successfully.");
      }

      setFormData({
        ...emptyForm,
      });

      setEditingId(null);

      setShowModal(false);
    } catch (error) {
      console.error("Save property error:", error);

      showToast(
        error.response?.data?.message || "Failed to save property.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const openOccupyModal = async (property) => {
    if (!property?._id) {
      return;
    }

    try {
      setLoading(true);

      const response = await api.get(`/properties/${property._id}`);

      const item = normalizeProperty(getResponseData(response) || property);

      setOccupancyProperty(item);

      setOccupancyForm({
        ...emptyOccupancyForm,

        startDate: new Date().toISOString().slice(0, 10),
      });

      setShowOccupancyModal(true);
    } catch (error) {
      console.error("Get occupancy property error:", error);

      showToast(
        error.response?.data?.message || "Failed to load property.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOccupancyChange = (e) => {
    const { name, value } = e.target;

    setOccupancyForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOccupy = async (e) => {
    e.preventDefault();

    if (!occupancyProperty?._id) {
      return;
    }

    try {
      setLoading(true);

      const history = Array.isArray(occupancyProperty.occupancyHistory)
        ? occupancyProperty.occupancyHistory
        : [];

      const newOccupancy = {
        tenantName: occupancyForm.tenantName.trim(),

        tenantPhone: occupancyForm.tenantPhone.trim(),

        startDate: occupancyForm.startDate,

        endDate:
          occupancyProperty.rentalType === "Lease"
            ? occupancyForm.endDate || null
            : null,
      };

      const payload = {
        occupy: true,

        occupancyHistory: [...history, newOccupancy],
      };

      const response = await api.patch(
        `/properties/${occupancyProperty._id}`,
        payload
      );

      const updated = normalizeProperty(getResponseData(response));

      setProperties((prev) =>
        prev.map((item) =>
          item._id === occupancyProperty._id ? updated : item
        )
      );

      setShowOccupancyModal(false);

      setOccupancyProperty(null);

      setOccupancyForm({
        ...emptyOccupancyForm,
      });

      showToast("Property occupied successfully.");
    } catch (error) {
      console.error("Occupy property error:", error);

      showToast(
        error.response?.data?.message || "Failed to occupy property.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // opens the in-page vacate confirmation
  const handleVacate = (property) => {
    if (!property?._id) {
      return;
    }

    const defaultReturnAmount =
      property.rentalType === "Rent"
        ? property.rentDetails?.securityDeposit ?? property.securityDeposit ?? ""
        : property.leaseDetails?.leaseAmount ?? property.leaseAmount ?? "";

    setVacateReturnAmount(
      defaultReturnAmount === null || defaultReturnAmount === undefined
        ? ""
        : String(defaultReturnAmount)
    );
    setVacateTarget(property);
  };

  const closeVacatePopup = () => {
    if (loading) {
      return;
    }

    setVacateTarget(null);
    setVacateReturnAmount("");
  };

  const confirmVacate = async () => {
    const property = vacateTarget;

    if (!property?._id) {
      return;
    }

    const returnAmount = Number(vacateReturnAmount);

    if (!Number.isFinite(returnAmount) || returnAmount <= 0) {
      showToast("Please enter a valid return amount.", "error");
      return;
    }

    try {
      setLoading(true);

      const history = Array.isArray(property.occupancyHistory)
        ? property.occupancyHistory.map((item) => ({
            ...item,
          }))
        : [];

      const activeIndex = history.findIndex((item) => !item.endDate);

      if (activeIndex !== -1) {
        history[activeIndex].endDate = new Date();
      }

      const response = await api.patch(`/properties/${property._id}`, {
        occupy: false,
        returnAmount,
        occupancyHistory: history,
      });

      const updated = normalizeProperty(getResponseData(response));

      setProperties((prev) =>
        prev.map((item) => (item._id === property._id ? updated : item))
      );

      if (viewProperty?._id === property._id) {
        setViewProperty(updated);
      }

      setVacateTarget(null);
      setVacateReturnAmount("");

      showToast("Property vacated successfully.");
    } catch (error) {
      console.error("Vacate property error:", error);

      showToast(
        error.response?.data?.message || "Failed to vacate property.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = async (property) => {
    if (!property?._id || property.rentalType !== "Rent") {
      return;
    }

    if (!property.occupy) {
      showToast(
        "Payment can be added only for an occupied property.",
        "error"
      );

      return;
    }

    try {
      setLoading(true);

      const response = await api.get(`/properties/${property._id}`);

      const item = normalizeProperty(getResponseData(response) || property);

      const today = new Date();

      const month = today.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      setPaymentProperty(item);

      setPaymentForm({
        ...emptyPaymentForm,

        month,

        paymentDate: today.toISOString().slice(0, 10),
      });

      setShowPaymentModal(true);
    } catch (error) {
      console.error("Get payment property error:", error);

      showToast(
        error.response?.data?.message || "Failed to load property.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;

    setPaymentForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const calculateMonthPaid = (history, month) =>
    (Array.isArray(history) ? history : [])
      .filter(
        (payment) => getMonthKey(payment.month) === getMonthKey(month)
      )
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    if (!paymentProperty?._id) {
      return;
    }

    const amount = Number(paymentForm.amount);
    const monthlyRent = Number(paymentProperty.rentAmount || 0);

    if (!amount || amount <= 0) {
      showToast("Please enter a valid payment amount.", "error");
      return;
    }

    if (!paymentForm.month.trim()) {
      showToast("Please select a payment month.", "error");
      return;
    }

    if (!paymentForm.paymentDate) {
      showToast("Please select a payment date.", "error");
      return;
    }

    const existingHistory = Array.isArray(paymentProperty.paymentHistory)
      ? paymentProperty.paymentHistory
      : [];

    const previousPaid = calculateMonthPaid(
      existingHistory,
      paymentForm.month
    );

    const totalPaid = previousPaid + amount;

    if (monthlyRent > 0 && totalPaid > monthlyRent) {
      showToast(
        `Payment exceeds the monthly rent. Remaining amount is ₹${formatAmount(
          monthlyRent - previousPaid
        )}.`,
        "error"
      );
      return;
    }

    const status = totalPaid >= monthlyRent ? "Paid" : "Partially Paid";

    try {
      setLoading(true);

      // Save rent payment and create its Finance Income transaction.
      const response = await api.post(
        `/properties/${paymentProperty._id}/rent-payment`,
        {
          month: paymentForm.month.trim(),
          amount,
          paymentDate: paymentForm.paymentDate,
          remarks: paymentForm.remarks.trim(),
        }
      );

      const result = getResponseData(response);
      const updated = normalizeProperty(result?.property);

      if (!result?.property) {
        throw new Error("Rent payment response did not include updated property data.");
      }

      setProperties((prev) =>
        prev.map((item) => (item._id === paymentProperty._id ? updated : item))
      );

      setPaymentProperty(updated);
      setShowPaymentModal(false);
      setViewProperty(updated);

      setPaymentForm({
        ...emptyPaymentForm,
      });

      showToast(
        status === "Paid"
          ? "Rent payment saved as Paid. Finance Income created."
          : "Partial rent payment saved. Finance Income created."
      );
    } catch (error) {
      console.error("Rent payment error:", error);

      showToast(
        error.response?.data?.message || error.message || "Failed to save rent payment.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  return (
    <div className="property-layout">
      {toast.show && (
        <div
          className={`property-toast ${
            toast.type === "error" ? "error" : "success"
          }`}
        >
          <span>{toast.message}</span>

          <button
            type="button"
            className="property-toast-close"
            onClick={() =>
              setToast((prev) => ({
                ...prev,
                show: false,
              }))
            }
            aria-label="Close notification"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <Sidebar />

      <div className="property-main">
        <Header />

        <main className="property-content">
          <div className="property-page-header">
            <h1>Properties</h1>

            <button className="add-property-btn" onClick={openAddModal}>
              <Plus size={21} />
              Add Property
            </button>
          </div>

          <div className="property-summary-grid">
            <div className="summary-card available-card">
              <div className="summary-icon">
                <Home size={38} />
              </div>

              <div>
                <h3>Available Properties</h3>

                <strong>{availableCount}</strong>
              </div>
            </div>

            <div className="summary-card occupied-card">
              <div className="summary-icon">
                <Users size={38} />
              </div>

              <div>
                <h3>Occupied Properties</h3>

                <strong>{occupiedCount}</strong>
              </div>
            </div>

            <div className="summary-card total-card">
              <div className="summary-icon">
                <Building2 size={38} />
              </div>

              <div>
                <h3>Total Properties</h3>

                <strong>{totalCount}</strong>
              </div>
            </div>
          </div>

          <div className="property-filter-row">
            <div className="property-tabs">
              <button
                className={
                  activeTab === "all" ? "property-tab active" : "property-tab"
                }
                onClick={() => setActiveTab("all")}
              >
                All ({totalCount})
              </button>

              <button
                className={
                  activeTab === "available"
                    ? "property-tab active"
                    : "property-tab"
                }
                onClick={() => setActiveTab("available")}
              >
                Available ({availableCount})
              </button>

              <button
                className={
                  activeTab === "occupied"
                    ? "property-tab active"
                    : "property-tab"
                }
                onClick={() => setActiveTab("occupied")}
              >
                Occupied ({occupiedCount})
              </button>
            </div>

            <div className="property-filters">
              <div className="select-wrapper">
                <select
                  value={propertyTypeFilter}
                  onChange={(e) => setPropertyTypeFilter(e.target.value)}
                >
                  <option value="">Property Type</option>

                  <option value="House">House</option>

                  <option value="Godown">Godown</option>

                  <option value="Shop">Shop</option>

                  <option value="Office">Office</option>

                  <option value="Land">Land</option>

                  <option value="Other">Other</option>
                </select>

                <ChevronDown size={20} />
              </div>

              <div className="select-wrapper">
                <select
                  value={rentalTypeFilter}
                  onChange={(e) => setRentalTypeFilter(e.target.value)}
                >
                  <option value="">Rent/Lease</option>

                  <option value="Rent">Rent</option>

                  <option value="Lease">Lease</option>
                </select>

                <ChevronDown size={20} />
              </div>

              <button className="reset-btn" onClick={resetFilters}>
                Reset
              </button>
            </div>
          </div>

          <div className="property-table-wrapper">
            <table className="property-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Property No</th>
                  <th>Property Name</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Rental Type</th>
                  <th>Monthly Rent</th>
                  <th>Security Deposit</th>
                  <th>Lease Amount</th>
                  <th>Lease Period</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Occupancy</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredProperties.length === 0 ? (
                  <tr>
                    <td colSpan="15" className="no-property">
                      No properties found
                    </td>
                  </tr>
                ) : (
                  filteredProperties.map((property, index) => {
                    const currentOccupancy = getCurrentOccupancy(property);

                    const startDate = currentOccupancy?.startDate;

                    const endDate = currentOccupancy?.endDate;

                    return (
                      <tr key={property._id || property.propertyNo}>
                        <td>{index + 1}</td>

                        <td>{property.propertyNo}</td>

                        <td>{property.propertyName}</td>

                        <td>{property.propertyType}</td>

                        <td>{property.location}</td>

                        <td>{property.rentalType}</td>

                        <td>
                          {property.rentalType === "Rent"
                            ? `₹${formatAmount(property.rentDetails?.monthlyRent ?? property.rentAmount)}`
                            : "—"}
                        </td>

                        <td>
                          {property.rentalType === "Rent"
                            ? `₹${formatAmount(property.rentDetails?.securityDeposit)}`
                            : "—"}
                        </td>

                        <td>
                          {property.rentalType === "Lease"
                            ? `₹${formatAmount(property.leaseDetails?.leaseAmount ?? property.rentAmount)}`
                            : "—"}
                        </td>

                        <td>
                          {property.rentalType === "Lease"
                            ? `${property.leaseDetails?.leasePeriodYears ?? property.leasePeriodYears ?? "—"} Years`
                            : "—"}
                        </td>

                        <td>{formatDate(startDate)}</td>

                        <td>
                          {property.rentalType === "Lease"
                            ? formatDate(endDate)
                            : "—"}
                        </td>

                        <td>
                          <span
                            className={
                              property.occupy
                                ? "status-badge occupied"
                                : "status-badge available"
                            }
                          >
                            {property.occupy ? "Occupied" : "Available"}
                          </span>
                        </td>

                        <td>
                          <div className="action-buttons">
                            {property.occupy ? (
                              <button
                                type="button"
                                title="Vacate"
                                onClick={() => handleVacate(property)}
                                disabled={loading}
                              >
                                Vacate
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Occupy"
                                onClick={() => openOccupyModal(property)}
                                disabled={loading}
                              >
                                Occupy
                              </button>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="action-buttons">
                            <button
                              title="View"
                              onClick={() => handleView(property)}
                              disabled={loading}
                            >
                              <Eye size={21} />
                            </button>

                            <button
                              title="Edit"
                              onClick={() => openEditModal(property)}
                              disabled={loading}
                            >
                              <Pencil size={20} />
                            </button>

                            <button
                              title="Delete"
                              onClick={() => openDeletePopup(property)}
                              disabled={loading}
                            >
                              <Trash2 size={20} />
                            </button>

                            {property.occupy &&
                              property.rentalType === "Rent" && (
                                <button
                                  title="Rent Payment"
                                  onClick={() => openPaymentModal(property)}
                                  disabled={loading}
                                >
                                  <IndianRupee size={20} />
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* ADD / EDIT PROPERTY MODAL */}

      {showModal && (
        <div
          className="property-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="property-modal">
            <div className="property-modal-header">
              <h2>
                {editingId ? "Edit Property" : "Add Property"} (
                {formData.rentalType})
              </h2>

              <button className="modal-close-btn" onClick={closeModal}>
                <X size={31} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="property-modal-body">
                <div className="property-common-fields">
                  <div className="form-group">
                    <label>
                      Property Name <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="propertyName"
                      value={formData.propertyName}
                      onChange={handleChange}
                      placeholder="e.g. Shop - A1"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Door / Plot No <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="doorNo"
                      value={formData.doorNo}
                      onChange={handleChange}
                      placeholder="e.g. 12B"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Property Type <span>*</span>
                    </label>

                    <div className="input-select-wrapper">
                      <select
                        name="propertyType"
                        value={formData.propertyType}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Type</option>

                        <option value="House">House</option>

                        <option value="Godown">Godown</option>

                        <option value="Shop">Shop</option>

                        <option value="Office">Office</option>

                        <option value="Land">Land</option>

                        <option value="Other">Other</option>
                      </select>

                      <ChevronDown size={21} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      Location / Address <span>*</span>
                    </label>

                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Enter full address"
                      required
                    />
                  </div>
                </div>

                <div className="property-rental-section">
                  <div className="form-group">
                    <label>
                      Rental Type <span>*</span>
                    </label>

                    <div className="rental-radio-group">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="rentalType"
                          checked={formData.rentalType === "Rent"}
                          onChange={() => handleRentalTypeChange("Rent")}
                        />

                        <span className="custom-radio" />

                        <span>Rent</span>
                      </label>

                      <label className="radio-option">
                        <input
                          type="radio"
                          name="rentalType"
                          checked={formData.rentalType === "Lease"}
                          onChange={() => handleRentalTypeChange("Lease")}
                        />

                        <span className="custom-radio" />

                        <span>Lease</span>
                      </label>
                    </div>
                  </div>

                  {/* RENT */}

                  {formData.rentalType === "Rent" && (
                    <div className="rental-details-box">
                      <h3>Rent Details</h3>

                      <div className="rental-fields-grid">
                        <div className="form-group">
                          <label>
                            Monthly Rent <span>*</span>
                          </label>

                          <div className="currency-input">
                            <span>₹</span>

                            <input
                              type="number"
                              name="monthlyRent"
                              value={formData.monthlyRent}
                              onChange={handleChange}
                              placeholder="e.g. 15000"
                              min="0"
                              required
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>
                            Rent Due Day (Monthly) <span>*</span>
                          </label>

                          <div className="input-select-wrapper">
                            <select
                              name="rentDueDay"
                              value={formData.rentDueDay}
                              onChange={handleChange}
                            >
                              {Array.from({ length: 31 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                  {i + 1}
                                </option>
                              ))}
                            </select>

                            <ChevronDown size={20} />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Security Deposit</label>

                          <div className="currency-input">
                            <span>₹</span>

                            <input
                              type="number"
                              name="securityDeposit"
                              value={formData.securityDeposit}
                              onChange={handleChange}
                              placeholder="e.g. 30000"
                              min="0"
                            />
                          </div>
                        </div>

                        <div className="form-group full-width">
                          <label>Remarks (Optional)</label>

                          <textarea
                            name="rentRemarks"
                            value={formData.rentRemarks}
                            onChange={handleChange}
                            placeholder="e.g. Owner contact, agreement details, etc."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LEASE */}

                  {formData.rentalType === "Lease" && (
                    <div className="rental-details-box">
                      <h3>Lease Details</h3>

                      <div className="rental-fields-grid">
                        <div className="form-group">
                          <label>
                            Lease Amount <span>*</span>
                          </label>

                          <div className="currency-input">
                            <span>₹</span>

                            <input
                              type="number"
                              name="leaseAmount"
                              value={formData.leaseAmount}
                              onChange={handleChange}
                              placeholder="e.g. 500000"
                              min="0"
                              required
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>
                            Lease Period (Years) <span>*</span>
                          </label>

                          <input
                            type="number"
                            name="leasePeriodYears"
                            value={formData.leasePeriodYears}
                            onChange={handleChange}
                            placeholder="e.g. 3"
                            min="1"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>Advance Amount</label>

                          <div className="currency-input">
                            <span>₹</span>

                            <input
                              type="number"
                              name="advanceAmount"
                              value={formData.advanceAmount}
                              onChange={handleChange}
                              placeholder="e.g. 100000"
                              min="0"
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Agreement Document No.</label>

                          <input
                            type="text"
                            name="agreementDocumentNo"
                            value={formData.agreementDocumentNo}
                            onChange={handleChange}
                            placeholder="e.g. AG-2025-01"
                          />
                        </div>

                        <div className="form-group full-width">
                          <label>Remarks (Optional)</label>

                          <textarea
                            name="leaseRemarks"
                            value={formData.leaseRemarks}
                            onChange={handleChange}
                            placeholder="e.g. Agreement details, renewal terms, etc."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="property-modal-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? "Saving..." : editingId ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PROPERTY MODAL */}

      {viewProperty && (
        <div
          className="property-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setViewProperty(null);
            }
          }}
        >
          <div className="property-view-modal">
            <div className="property-modal-header">
              <h2>Property Details</h2>

              <button
                className="modal-close-btn"
                onClick={() => setViewProperty(null)}
              >
                <X size={31} />
              </button>
            </div>

            <div className="property-view-body">
              <div className="view-item">
                <span>Property No</span>

                <strong>{viewProperty.propertyNo}</strong>
              </div>

              <div className="view-item">
                <span>Property Name</span>

                <strong>{viewProperty.propertyName}</strong>
              </div>

              <div className="view-item">
                <span>Property Type</span>

                <strong>{viewProperty.propertyType}</strong>
              </div>

              <div className="view-item">
                <span>Location</span>

                <strong>{viewProperty.location}</strong>
              </div>

              <div className="view-item">
                <span>Rental Type</span>

                <strong>{viewProperty.rentalType}</strong>
              </div>

              <div className="view-item">
                <span>
                  {viewProperty.rentalType === "Rent"
                    ? "Monthly Rent"
                    : "Lease Amount"}
                </span>

                <strong>₹{formatAmount(viewProperty.rentAmount)}</strong>
              </div>

              {viewProperty.rentalType === "Rent" ? (
                <div className="view-item">
                  <span>Security Deposit</span>
                  <strong>
                    ₹{formatAmount(viewProperty.rentDetails?.securityDeposit)}
                  </strong>
                </div>
              ) : (
                <div className="view-item">
                  <span>Lease Period</span>
                  <strong>
                    {viewProperty.leaseDetails?.leasePeriodYears ??
                      viewProperty.leasePeriodYears ??
                      "—"}{" "}
                    Years
                  </strong>
                </div>
              )}

              <div className="view-item">
                <span>Status</span>

                <strong
                  className={
                    viewProperty.occupy
                      ? "view-status occupied"
                      : "view-status available"
                  }
                >
                  {viewProperty.occupy ? "Occupied" : "Available"}
                </strong>
              </div>

              {/* CURRENT TENANT */}

              {viewProperty.occupy && (
                <>
                  <div className="view-item full">
                    <span>Current Tenant</span>

                    <strong>
                      {getCurrentOccupancy(viewProperty)?.tenantName || "—"}
                    </strong>
                  </div>

                  <div className="view-item">
                    <span>Tenant Phone</span>

                    <strong>
                      {getCurrentOccupancy(viewProperty)?.tenantPhone || "—"}
                    </strong>
                  </div>

                  <div className="view-item">
                    <span>Start Date</span>

                    <strong>
                      {formatDate(getCurrentOccupancy(viewProperty)?.startDate)}
                    </strong>
                  </div>

                  <div className="view-item">
                    <span>End Date</span>

                    <strong>
                      {viewProperty.rentalType === "Lease"
                        ? formatDate(getCurrentOccupancy(viewProperty)?.endDate)
                        : "—"}
                    </strong>
                  </div>
                </>
              )}

              {/* OCCUPANCY HISTORY */}

              <div className="view-item full">
                <span>Occupancy History</span>

                {viewProperty.occupancyHistory?.length ? (
                  <div className="history-table-wrapper">
                    <table className="property-history-table">
                      <thead>
                        <tr>
                          <th>Tenant</th>

                          <th>Phone</th>

                          <th>Start Date</th>

                          <th>End Date</th>
                        </tr>
                      </thead>

                      <tbody>
                        {viewProperty.occupancyHistory.map((item, index) => (
                          <tr key={item._id || index}>
                            <td>{item.tenantName}</td>

                            <td>{item.tenantPhone}</td>

                            <td>{formatDate(item.startDate)}</td>

                            <td>
                              {viewProperty.rentalType === "Lease"
                                ? formatDate(item.endDate)
                                : item.endDate
                                ? formatDate(item.endDate)
                                : "Current"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <strong>No occupancy history</strong>
                )}
              </div>

              {/* RENT PAYMENT HISTORY */}

              {viewProperty.rentalType === "Rent" && (
                <div className="view-item full">
                  <div className="view-history-header">
                    <span>Rent Payment History</span>

                    {viewProperty.occupy && (
                      <button
                        type="button"
                        onClick={() => openPaymentModal(viewProperty)}
                        disabled={loading}
                      >
                        <IndianRupee size={17} />
                        Add Payment
                      </button>
                    )}
                  </div>

                  {viewProperty.paymentHistory?.length ? (
                    <div className="history-table-wrapper">
                      <table className="property-history-table">
                        <thead>
                          <tr>
                            <th>Month</th>

                            <th>Rent</th>

                            <th>Paid</th>

                            <th>Balance</th>

                            <th>Payment Date</th>

                            <th>Status</th>
                          </tr>
                        </thead>

                        <tbody>
                          {Array.from(
                            new Set(
                              viewProperty.paymentHistory.map(
                                (payment) => payment.month
                              )
                            )
                          ).map((month) => {
                            const monthPayments =
                              viewProperty.paymentHistory.filter(
                                (payment) => payment.month === month
                              );

                            const paid = monthPayments.reduce(
                              (sum, payment) =>
                                sum + Number(payment.amount || 0),
                              0
                            );

                            const rent = Number(viewProperty.rentAmount || 0);

                            const balance = Math.max(rent - paid, 0);

                            const latest =
                              monthPayments[monthPayments.length - 1];

                            return (
                              <tr key={month}>
                                <td>{month}</td>

                                <td>₹{formatAmount(rent)}</td>

                                <td>₹{formatAmount(paid)}</td>

                                <td>₹{formatAmount(balance)}</td>

                                <td>{formatDate(latest?.paymentDate)}</td>

                                <td>
                                  {balance === 0 ? "Paid" : "Partially Paid"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <strong>No payment history</strong>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OCCUPY MODAL */}

      {showOccupancyModal && occupancyProperty && (
        <div
          className="property-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowOccupancyModal(false);
            }
          }}
        >
          <div className="property-modal">
            <div className="property-modal-header">
              <h2>Occupy Property</h2>

              <button
                className="modal-close-btn"
                onClick={() => setShowOccupancyModal(false)}
              >
                <X size={31} />
              </button>
            </div>

            <form onSubmit={handleOccupy}>
              <div className="property-modal-body single-column-modal">
                <div className="form-group">
                  <label>
                    Tenant Name <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="tenantName"
                    value={occupancyForm.tenantName}
                    onChange={handleOccupancyChange}
                    placeholder="Enter tenant name"
                    minLength="2"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Tenant Phone <span>*</span>
                  </label>

                  <input
                    type="tel"
                    name="tenantPhone"
                    value={occupancyForm.tenantPhone}
                    onChange={handleOccupancyChange}
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Start Date <span>*</span>
                  </label>

                  <div className="date-input">
                    <input
                      type="date"
                      name="startDate"
                      value={occupancyForm.startDate}
                      onChange={handleOccupancyChange}
                      required
                    />

                    <CalendarDays size={21} />
                  </div>
                </div>

                {occupancyProperty.rentalType === "Lease" && (
                  <div className="form-group">
                    <label>End Date</label>

                    <div className="date-input">
                      <input
                        type="date"
                        name="endDate"
                        value={occupancyForm.endDate}
                        onChange={handleOccupancyChange}
                        min={occupancyForm.startDate || undefined}
                      />

                      <CalendarDays size={21} />
                    </div>
                  </div>
                )}

                <div className="view-item">
                  <span>
                    {occupancyProperty.rentalType === "Rent"
                      ? "Monthly Rent"
                      : "Lease Amount"}
                  </span>

                  <strong>₹{formatAmount(occupancyProperty.rentAmount)}</strong>
                </div>
              </div>

              <div className="property-modal-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowOccupancyModal(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? "Saving..." : "Occupy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENT PAYMENT MODAL */}

      {showPaymentModal && paymentProperty && (
        <div
          className="property-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowPaymentModal(false);
            }
          }}
        >
          <div className="property-modal">
            <div className="property-modal-header">
              <h2>Rent Payment / Receipt</h2>

              <button
                className="modal-close-btn"
                onClick={() => setShowPaymentModal(false)}
              >
                <X size={31} />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div className="property-modal-body single-column-modal">
                <div className="view-item">
                  <span>Tenant</span>

                  <strong>
                    {getCurrentOccupancy(paymentProperty)?.tenantName || "—"}
                  </strong>
                </div>

                <div className="view-item">
                  <span>Monthly Rent</span>

                  <strong>₹{formatAmount(paymentProperty.rentAmount)}</strong>
                </div>

                <div className="form-group">
                  <label>
                    Month <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="month"
                    value={paymentForm.month}
                    onChange={handlePaymentChange}
                    placeholder="e.g. November 2026"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Paid Amount <span>*</span>
                  </label>

                  <div className="currency-input">
                    <span>₹</span>

                    <input
                      type="number"
                      name="amount"
                      value={paymentForm.amount}
                      onChange={handlePaymentChange}
                      placeholder="Enter paid amount"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    Payment Date <span>*</span>
                  </label>

                  <div className="date-input">
                    <input
                      type="date"
                      name="paymentDate"
                      value={paymentForm.paymentDate}
                      onChange={handlePaymentChange}
                      required
                    />

                    <CalendarDays size={21} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Remarks</label>

                  <textarea
                    name="remarks"
                    value={paymentForm.remarks}
                    onChange={handlePaymentChange}
                    placeholder="Optional payment remarks"
                  />
                </div>
              </div>

              <div className="property-modal-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VACATE CONFIRMATION POPUP */}

      {vacateTarget && (
        <div
          className="property-modal-overlay delete-confirm-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !loading) {
              setVacateTarget(null);
            }
          }}
        >
          <div className="delete-confirm-modal">
            <div className="delete-confirm-icon">
              <Users size={28} />
            </div>

            <h2>Vacate Property?</h2>

            <p>
              Are you sure you want to vacate
              <strong> {vacateTarget.propertyName}</strong>?
            </p>

            <span className="delete-confirm-warning">
              The current tenant&apos;s end date will be set to today.
            </span>

            <div className="form-group vacate-return-field">
              <label htmlFor="vacateReturnAmount">Return Amount</label>
              <div className="currency-input">
                <span>₹</span>
                <input
                  id="vacateReturnAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={vacateReturnAmount}
                  onChange={(e) => setVacateReturnAmount(e.target.value)}
                  placeholder="Enter amount to return"
                  disabled={loading}
                  required
                />
              </div>
              <small>
                {vacateTarget.rentalType === "Rent"
                  ? "Default: Security Deposit"
                  : "Default: Lease Amount"}
              </small>
            </div>

            <div className="delete-confirm-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={closeVacatePopup}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-btn"
                onClick={confirmVacate}
                disabled={loading}
              >
                {loading ? "Vacating..." : "Vacate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION POPUP */}

      {deletePropertyTarget && (
        <div
          className="property-modal-overlay delete-confirm-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !loading) {
              setDeletePropertyTarget(null);
            }
          }}
        >
          <div className="delete-confirm-modal">
            <div className="delete-confirm-icon">
              <Trash2 size={28} />
            </div>

            <h2>Delete Property?</h2>

            <p>
              Are you sure you want to delete
              <strong> {deletePropertyTarget.propertyName}</strong>?
            </p>

            <span className="delete-confirm-warning">
              This action cannot be undone.
            </span>

            <div className="delete-confirm-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={closeDeletePopup}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-btn"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Property;
