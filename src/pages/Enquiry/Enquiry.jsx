import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  ArrowRight,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import api from "../../api/axios";

import "./Enquiry.css";

function Enquiry() {
  const navigate = useNavigate();

  // ==========================================
  // API DATA
  // ==========================================

  const [enquiries, setEnquiries] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);

  // ==========================================
  // SEARCH / FILTER
  // ==========================================

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Status");
  const [platform, setPlatform] = useState("All Platforms");

  // ==========================================
  // POPUP
  // ==========================================

  const [popup, setPopup] = useState({
    show: false,
    type: "",
  });

  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  // ==========================================
  // CONVERT CONFIRMATION
  // ==========================================

  const [convertEnquiry, setConvertEnquiry] = useState(null);

  // ==========================================
  // TOAST
  // ==========================================

  const [toast, setToast] = useState(null);

  // Automatically close notifications after 3.5 seconds.
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast]);

  // ==========================================
  // FORM
  // ==========================================

  const emptyForm = {
    id: "",
    date: "",
    customer: "",
    companyId: "",
    companyName: "",
    phone: "",
    platform: "Just Dial",
    location: "",
    requirement: "",
    details: "",
    status: "Waiting",
  };

  const [formData, setFormData] = useState(emptyForm);

  // ==========================================
  // FORMAT DATE FOR DISPLAY
  // ==========================================

  const formatDisplayDate = (date) => {
    if (!date) return "";

    // Already in DD MMM YYYY format
    if (date.includes(" ")) {
      return date;
    }

    // YYYY-MM-DD
    const [year, month, day] = date.split("-");

    if (!year || !month || !day) {
      return date;
    }

    const dateObject = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    return dateObject.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ==========================================
  // CONVERT DATE TO INPUT FORMAT
  // ==========================================

  const formatDateForInput = (date) => {
    if (!date) return "";

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }

    // Convert "26 Oct 2026" -> "2026-10-26"
    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return "";
    }

    const year = parsedDate.getFullYear();
    const month = String(
      parsedDate.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      parsedDate.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // ==========================================
  // FILTER DATA
  // ==========================================

  const filteredEnquiries = enquiries.filter((item) => {
    const searchValue = search.toLowerCase().trim();

    const matchesSearch =
      item.id.toLowerCase().includes(searchValue) ||
      item.customer.toLowerCase().includes(searchValue) ||
      (item.companyName || "").toLowerCase().includes(searchValue) ||
      item.phone.includes(searchValue) ||
      item.location.toLowerCase().includes(searchValue) ||
      item.requirement.toLowerCase().includes(searchValue);

    const matchesStatus =
      status === "All Status" ||
      item.status === status;

    const matchesPlatform =
      platform === "All Platforms" ||
      item.platform === platform;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPlatform
    );
  });

  // ==========================================
  // API HELPERS
  // ==========================================

  const mapEnquiry = (item) => ({
    ...item,
    id: item.enquiryNo,
    customer: item.customerName,
    companyId: item.companyId?._id || item.companyId || "",
    companyName: item.companyName || item.companyId?.companyName || "",
    date: item.date
      ? new Date(item.date).toISOString().split("T")[0]
      : "",
  });

  const fetchEnquiries = async () => {
    try {
      setLoading(true);

      const response = await api.get("/enquiries");

      const data = response?.data?.data || [];

      setEnquiries(data.map(mapEnquiry));
    } catch (error) {
      setToast({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Failed to fetch enquiries.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await api.get("/company");
      const data = response?.data?.data || [];
      setCompanies(data.filter((company) => company.isActive !== false));
    } catch (error) {
      console.error("Fetch companies error:", error);
      setToast({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Failed to fetch companies.",
      });
    }
  };

  useEffect(() => {
    fetchEnquiries();
    fetchCompanies();
  }, []);

  // ==========================================
  // OPEN ADD
  // ==========================================

  const handleAddEnquiry = () => {
    setFormData({
      ...emptyForm,
      id: "",
      date: new Date().toISOString().split("T")[0],
    });

    setSelectedEnquiry(null);

    setPopup({
      show: true,
      type: "add",
    });
  };

  // ==========================================
  // OPEN VIEW
  // ==========================================

  const handleView = (enquiry) => {
    setSelectedEnquiry(enquiry);

    setPopup({
      show: true,
      type: "view",
    });
  };

  // ==========================================
  // OPEN EDIT
  // ==========================================

  const handleEdit = (enquiry) => {
    setFormData({
      ...enquiry,
      date: formatDateForInput(enquiry.date),
    });

    setSelectedEnquiry(enquiry);

    setPopup({
      show: true,
      type: "edit",
    });
  };

  // ==========================================
  // INPUT CHANGE
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // ==========================================
  // SAVE / UPDATE
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    // ==========================================
    // FRONTEND VALIDATION
    // Same rules as backend Joi validation
    // ==========================================

    const errors = {};

    // Date
    if (!formData.date) {
      errors.date = "Date is required.";
    }

    // Customer Name
    if (!formData.customer.trim()) {
      errors.customer = "Customer name is required.";
    } else if (formData.customer.trim().length < 2) {
      errors.customer =
        "Customer name must be at least 2 characters.";
    } else if (formData.customer.trim().length > 100) {
      errors.customer =
        "Customer name cannot exceed 100 characters.";
    }

    // Company
    if (!formData.companyId) {
      errors.companyName = "Company name is required.";
    }

    // Phone
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required.";
    } else if (
      formData.phone.trim().length < 10 ||
      formData.phone.trim().length > 15
    ) {
      errors.phone =
        "Phone number must be between 10 and 15 characters.";
    }

    // Platform
    const validPlatforms = [
      "Just Dial",
      "India Mart",
      "Direct",
      "Reference",
      "Other",
    ];

    if (!formData.platform) {
      errors.platform = "Platform is required.";
    } else if (!validPlatforms.includes(formData.platform)) {
      errors.platform = "Invalid platform.";
    }

    // Location
    if (!formData.location.trim()) {
      errors.location = "Location is required.";
    } else if (formData.location.trim().length < 2) {
      errors.location =
        "Location must be at least 2 characters.";
    } else if (formData.location.trim().length > 200) {
      errors.location =
        "Location cannot exceed 200 characters.";
    }

    // Requirement
    if (!formData.requirement.trim()) {
      errors.requirement = "Requirement is required.";
    } else if (formData.requirement.trim().length < 2) {
      errors.requirement =
        "Requirement must be at least 2 characters.";
    } else if (formData.requirement.trim().length > 500) {
      errors.requirement =
        "Requirement cannot exceed 500 characters.";
    }

    // Details
    if (
      formData.details &&
      formData.details.trim().length > 2000
    ) {
      errors.details =
        "Details cannot exceed 2000 characters.";
    }

    // Status
    const validStatuses = [
      "Waiting",
      "High Rate",
      "Purchased",
      "Long Distance",
      "Follow Up",
      "Converted to Order",
      "Cancelled",
    ];

    if (!validStatuses.includes(formData.status)) {
      errors.status = "Invalid status.";
    }

    // ==========================================
    // STOP SUBMIT IF VALIDATION FAILED
    // ==========================================

    if (Object.keys(errors).length > 0) {
      setToast({
        type: "error",
        message: Object.values(errors)[0],
      });

      return;
    }

    try {
      setLoading(true);

      const selectedCompany = companies.find(
        (company) => company._id === formData.companyId
      );

      const payload = {
        date: formData.date,
        customerName: formData.customer.trim(),
        companyId: formData.companyId,
        companyName: selectedCompany?.companyName || formData.companyName,
        phone: formData.phone.trim(),
        platform: formData.platform,
        location: formData.location.trim(),
        requirement: formData.requirement.trim(),
        details: formData.details?.trim() || "",
        status: formData.status,
      };

      if (popup.type === "add") {
        await api.post("/enquiries", payload);

        setToast({
          type: "success",
          message: "Enquiry added successfully.",
        });
      }

      if (popup.type === "edit") {
        await api.patch(
          `/enquiries/${selectedEnquiry._id}`,
          payload
        );

        setToast({
          type: "success",
          message: "Enquiry updated successfully.",
        });
      }

      await fetchEnquiries();
      closePopup();
    } catch (error) {
      setToast({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Failed to save enquiry.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // CLOSE POPUP
  // ==========================================

  const closePopup = () => {
    setPopup({
      show: false,
      type: "",
    });

    setSelectedEnquiry(null);

    setFormData(emptyForm);
  };

  // ==========================================
  // OPEN CONVERT CONFIRMATION
  // ==========================================

  const handleConvert = (enquiry) => {
    setConvertEnquiry(enquiry);
  };

  // ==========================================
  // CONFIRM CONVERT
  // ==========================================

  const confirmConvert = async () => {
    if (!convertEnquiry) return;

    try {
      setLoading(true);

      await api.patch(
        `/enquiries/${convertEnquiry._id}`,
        {
          status: "Converted to Order",
        }
      );

      await fetchEnquiries();

      setConvertEnquiry(null);

      setToast({
        type: "success",
        message: `${convertEnquiry.id} status updated to Converted to Order.`,
      });

      navigate("/master/createorder", {
        state: {
          enquiryId: convertEnquiry._id,
          companyId: convertEnquiry.companyId,
          companyName: convertEnquiry.companyName,
          customerName: convertEnquiry.customer,
        },
      });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Failed to update enquiry.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // CLOSE TOAST
  // ==========================================

  const closeToast = () => {
    setToast(null);
  };

  // ==========================================
  // STATUS CLASS
  // ==========================================

  const getStatusClass = (value) => {
    return value
      .toLowerCase()
      .replaceAll(" ", "-");
  };

  return (
    <div className="enquiry-layout">
      {/* ======================================
          SIDEBAR
      ======================================= */}

      <Sidebar />

      <div className="enquiry-main">
        {/* ====================================
            HEADER
        ===================================== */}

        <Header />

        <main className="enquiry-content">
          {/* ===================================
              PAGE HEADER
          ==================================== */}

          <div className="enquiry-page-header">
            <div>
              <h1>Enquiry</h1>

              <p>
                Manage customer enquiries and
                convert them into orders.
              </p>
            </div>

            <button
              type="button"
              className="add-enquiry-btn"
              onClick={handleAddEnquiry}
            >
              <Plus size={18} />
              Add Enquiry
            </button>
          </div>

          {/* ===================================
              SUMMARY
          ==================================== */}

          <div className="enquiry-summary">
            <div className="summary-card">
              <div>
                <span>Total Enquiries</span>
                <strong>{enquiries.length}</strong>
              </div>

              <div className="summary-icon blue">
                <Search size={20} />
              </div>
            </div>

            <div className="summary-card">
              <div>
                <span>Waiting</span>

                <strong>
                  {
                    enquiries.filter(
                      (item) =>
                        item.status === "Waiting"
                    ).length
                  }
                </strong>
              </div>

              <div className="summary-icon orange">
                <Search size={20} />
              </div>
            </div>

            <div className="summary-card">
              <div>
                <span>Follow Up</span>

                <strong>
                  {
                    enquiries.filter(
                      (item) =>
                        item.status === "Follow Up"
                    ).length
                  }
                </strong>
              </div>

              <div className="summary-icon purple">
                <Search size={20} />
              </div>
            </div>

            <div className="summary-card">
              <div>
                <span>Converted</span>

                <strong>
                  {
                    enquiries.filter(
                      (item) =>
                        item.status ===
                        "Converted to Order"
                    ).length
                  }
                </strong>
              </div>

              <div className="summary-icon green">
                <ArrowRight size={20} />
              </div>
            </div>
          </div>

          {/* ===================================
              TABLE CARD
          ==================================== */}

          <section className="enquiry-table-card">
            {/* FILTER */}

            <div className="enquiry-filter-section">
              <div className="search-box">
                <Search size={18} />

                <input
                  type="text"
                  placeholder="Search enquiry, customer, phone..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
              >
                <option>All Status</option>
                <option>Waiting</option>
                <option>High Rate</option>
                <option>Purchased</option>
                <option>Long Distance</option>
                <option>Follow Up</option>
                <option>Converted to Order</option>
                <option>Cancelled</option>
              </select>

              <select
                value={platform}
                onChange={(event) =>
                  setPlatform(event.target.value)
                }
              >
                <option>All Platforms</option>
                <option>Just Dial</option>
                <option>India Mart</option>
                <option>Direct</option>
                <option>Reference</option>
                <option>Other</option>
              </select>
            </div>

            {/* TABLE HEADER */}

            <div className="table-section-header">
              <div>
                <h2>All Enquiries</h2>

                <p>
                  {filteredEnquiries.length} enquiries
                  found
                </p>
              </div>
            </div>

            {/* TABLE */}

            <div className="table-wrapper">
              <table className="enquiry-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Enquiry No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Company</th>
                    <th>Phone</th>
                    <th>Platform</th>
                    <th>Location</th>
                    <th>Requirement</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading && enquiries.length === 0 ? (
                    <tr>
                      <td
                        colSpan="11"
                        className="empty-state"
                      >
                        Loading enquiries...
                      </td>
                    </tr>
                  ) : filteredEnquiries.length > 0 ? (
                    filteredEnquiries.map(
                      (item, index) => (
                        <tr key={item._id || item.id}>
                          <td>{index + 1}</td>

                          <td className="enquiry-number">
                            {item.id}
                          </td>

                          <td>
                            {formatDisplayDate(
                              item.date
                            )}
                          </td>

                          <td className="customer-name">
                            {item.customer}
                          </td>

                          <td>{item.companyName || "-"}</td>

                          <td>{item.phone}</td>

                          <td>
                            <span className="platform-badge">
                              {item.platform}
                            </span>
                          </td>

                          <td>{item.location}</td>

                          <td>{item.requirement}</td>

                          <td>
                            <span
                              className={`status-badge status-${getStatusClass(
                                item.status
                              )}`}
                            >
                              {item.status}

                              {item.status === "Converted to Order" && (
                                <CheckCircle size={14} />
                              )}
                            </span>
                          </td>

                          <td>
                            <div className="action-buttons">
                              {/* VIEW */}

                              <button
                                type="button"
                                className="view-action-btn"
                                title="View"
                                onClick={() =>
                                  handleView(item)
                                }
                              >
                                <Eye size={16} />
                              </button>

                              {/* EDIT */}

                              <button
                                type="button"
                                className="edit-action-btn"
                                title="Edit"
                                onClick={() =>
                                  handleEdit(item)
                                }
                              >
                                <Pencil size={16} />
                              </button>

                              {/* CONVERT / OPEN ORDER */}

                              {item.status === "Converted to Order" ? (
                                <button
                                  type="button"
                                  className="convert-action-btn"
                                  title="Open Order"
                                  onClick={() =>
                                    navigate(
                                      "/master/createorder",
                                      {
                                        state: {
                                          enquiryId: item._id,
                                          companyId: item.companyId,
                                          companyName: item.companyName,
                                          customerName: item.customer,
                                        },
                                      }
                                    )
                                  }
                                >
                                  <CheckCircle size={16} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="convert-action-btn"
                                  title="Convert to Order"
                                  onClick={() =>
                                    handleConvert(item)
                                  }
                                >
                                  <ArrowRight size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan="11"
                        className="empty-state"
                      >
                        No enquiries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}

            <div className="pagination">
              <span>
                Showing{" "}
                {filteredEnquiries.length > 0 ? 1 : 0}–
                {filteredEnquiries.length} of{" "}
                {enquiries.length} enquiries
              </span>

              <div className="pagination-buttons">
                <button type="button">
                  <ChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  className="active-page"
                >
                  1
                </button>

                <button type="button">2</button>

                <button type="button">3</button>

                <button type="button">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* ==========================================
          ADD / EDIT POPUP
      =========================================== */}

      {popup.show &&
        (popup.type === "add" ||
          popup.type === "edit") && (
          <div
            className="enquiry-modal-overlay"
            onClick={closePopup}
          >
            <div
              className="enquiry-modal enquiry-form-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="modal-header">
                <div>
                  <h2>
                    {popup.type === "add"
                      ? "Add Enquiry"
                      : "Edit Enquiry"}
                  </h2>

                  <p>
                    {popup.type === "add"
                      ? "Create a new customer enquiry."
                      : "Update enquiry details."}
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={closePopup}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="enquiry-form-grid">
                  {/* ENQUIRY NO */}

                  <div className="form-group">
                    <label>
                      Enquiry No
                    </label>

                    <input
                      type="text"
                      name="id"
                      value={formData.id}
                      readOnly
                      className="readonly-input"
                    />
                  </div>

                  {/* DATE */}

                  <div className="form-group">
                    <label>
                      Date <span>*</span>
                    </label>

                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                    />
                  </div>

                  {/* CUSTOMER */}

                  <div className="form-group">
                    <label>
                      Customer Name <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="customer"
                      value={formData.customer}
                      onChange={handleChange}
                      placeholder="Enter customer name"
                    />
                  </div>

                  {/* COMPANY NAME */}

                  <div className="form-group">
                    <label>
                      Company Name <span>*</span>
                    </label>

                    <select
                      name="companyId"
                      value={formData.companyId}
                      onChange={(event) => {
                        const selectedCompany = companies.find(
                          (company) => company._id === event.target.value
                        );

                        setFormData((current) => ({
                          ...current,
                          companyId: event.target.value,
                          companyName: selectedCompany?.companyName || "",
                        }));
                      }}
                    >
                      <option value="">Select Company</option>
                      {companies.map((company) => (
                        <option key={company._id} value={company._id}>
                          {company.companyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PHONE */}

                  <div className="form-group">
                    <label>
                      Phone Number <span>*</span>
                    </label>

                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter phone number"
                    />
                  </div>

                  {/* PLATFORM */}

                  <div className="form-group">
                    <label>
                      Platform <span>*</span>
                    </label>

                    <select
                      name="platform"
                      value={formData.platform}
                      onChange={handleChange}
                    >
                      <option>Just Dial</option>
                      <option>India Mart</option>
                      <option>Direct</option>
                      <option>Reference</option>
                      <option>Other</option>
                    </select>
                  </div>

                  {/* LOCATION */}

                  <div className="form-group">
                    <label>
                      Location <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="Enter location"
                    />
                  </div>

                  {/* REQUIREMENT */}

                  <div className="form-group full-width">
                    <label>
                      Requirement <span>*</span>
                    </label>

                    <textarea
                      name="requirement"
                      value={formData.requirement}
                      onChange={handleChange}
                      placeholder="Enter requirement"
                      rows="3"
                    />
                  </div>

                  {/* DETAILS */}

                  <div className="form-group full-width">
                    <label>Details</label>

                    <textarea
                      name="details"
                      value={formData.details}
                      onChange={handleChange}
                      placeholder="Enter additional details"
                      rows="4"
                    />
                  </div>

                  {/* STATUS */}

                  <div className="form-group">
                    <label>
                      Status <span>*</span>
                    </label>

                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      <option>Waiting</option>
                      <option>High Rate</option>
                      <option>Purchased</option>
                      <option>Long Distance</option>
                      <option>Follow Up</option>
                      <option>Converted to Order</option>
                      <option>Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={closePopup}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-btn"
                    disabled={loading}
                  >
                    {loading
                      ? "Saving..."
                      : popup.type === "add"
                      ? "Add Enquiry"
                      : "Update Enquiry"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* ==========================================
          VIEW POPUP
      =========================================== */}

      {popup.show && popup.type === "view" && (
        <div
          className="enquiry-modal-overlay"
          onClick={closePopup}
        >
          <div
            className="enquiry-modal enquiry-view-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>Enquiry Details</h2>

                <p>
                  View complete enquiry information.
                </p>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={closePopup}
              >
                <X size={20} />
              </button>
            </div>

            {selectedEnquiry && (
              <div className="view-details-grid">
                <div className="view-detail-item">
                  <span>Enquiry No</span>
                  <strong>
                    {selectedEnquiry.id}
                  </strong>
                </div>

                <div className="view-detail-item">
                  <span>Date</span>
                  <strong>
                    {formatDisplayDate(
                      selectedEnquiry.date
                    )}
                  </strong>
                </div>

                <div className="view-detail-item">
                  <span>Customer Name</span>
                  <strong>
                    {selectedEnquiry.customer}
                  </strong>
                </div>

                <div className="view-detail-item">
                  <span>Company Name</span>
                  <strong>{selectedEnquiry.companyName || "-"}</strong>
                </div>

                <div className="view-detail-item">
                  <span>Phone Number</span>
                  <strong>
                    {selectedEnquiry.phone}
                  </strong>
                </div>

                <div className="view-detail-item">
                  <span>Platform</span>
                  <strong>
                    {selectedEnquiry.platform}
                  </strong>
                </div>

                <div className="view-detail-item">
                  <span>Location</span>
                  <strong>
                    {selectedEnquiry.location}
                  </strong>
                </div>

                <div className="view-detail-item full-width">
                  <span>Requirement</span>
                  <strong>
                    {selectedEnquiry.requirement}
                  </strong>
                </div>

                <div className="view-detail-item full-width">
                  <span>Details</span>
                  <strong>
                    {selectedEnquiry.details || "-"}
                  </strong>
                </div>

                <div className="view-detail-item">
                  <span>Status</span>

                  <strong>
                    <span
                      className={`status-badge status-${getStatusClass(
                        selectedEnquiry.status
                      )}`}
                    >
                      {selectedEnquiry.status}
                    </span>
                  </strong>
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={closePopup}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          CONVERT CONFIRMATION POPUP
      =========================================== */}

      {convertEnquiry && (
        <div
          className="enquiry-modal-overlay"
          onClick={() =>
            !loading && setConvertEnquiry(null)
          }
        >
          <div
            className="enquiry-modal convert-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>Convert to Order</h2>

                <p>
                  Convert this enquiry into an order?
                </p>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() =>
                  !loading && setConvertEnquiry(null)
                }
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>

            <div className="convert-content">
              <div className="convert-icon">
                <ArrowRight size={24} />
              </div>

              <div className="convert-info">
                <strong>
                  {convertEnquiry.id}
                </strong>

                <span>
                  {convertEnquiry.customer}
                </span>

                <p>
                  This enquiry will be marked as
                  "Converted to Order".
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() =>
                  setConvertEnquiry(null)
                }
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="save-btn"
                onClick={confirmConvert}
                disabled={loading}
              >
                {loading
                  ? "Converting..."
                  : "Convert to Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TOAST
      =========================================== */}

      {toast && (
        <div
          className={`toast ${toast.type}`}
          role={toast.type === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          <div className="toast-icon">
            {toast.type === "error" ? <X size={17} /> : <CheckCircle size={17} />}
          </div>

          <div className="toast-content">
            <span>{toast.message}</span>
          </div>

          <button
            type="button"
            onClick={closeToast}
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default Enquiry;