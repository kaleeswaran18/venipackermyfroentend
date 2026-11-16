import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, CheckCircle, AlertCircle } from "lucide-react";
import api from "../../api/axios";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import "./Companies.css";

const emptyForm = {
  companyName: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  gstNumber: "",
  remarks: "",
};

function Companies() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: "", title: "", message: "" });
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: "" });

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => setToast({ show: false, type: "", title: "", message: "" }), 3000);
  };

  const getCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.get("/company");
      setCompanies(response.data.data || []);
    } catch (error) {
      console.error("Get companies error:", error);
      showToast("error", "Error", error.response?.data?.message || "Failed to fetch companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCompanies();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [key, value.trim()])
    );

    if (!payload.companyName) {
      showToast("error", "Company Name Required", "Please enter a company name.");
      return;
    }

    try {
      if (editingId) {
        await api.patch(`/company/${editingId}`, payload);
        showToast("success", "Company Updated", "Company updated successfully.");
      } else {
        await api.post("/company", payload);
        showToast("success", "Company Created", "Company added successfully.");
      }
      await getCompanies();
      resetForm();
    } catch (error) {
      console.error("Save company error:", error);
      showToast("error", "Error", error.response?.data?.message || "Failed to save company.");
    }
  };

  const handleAddCompany = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (company) => {
    setFormData({
      companyName: company.companyName || "",
      contactPerson: company.contactPerson || "",
      phone: company.phone || "",
      email: company.email || "",
      address: company.address || "",
      gstNumber: company.gstNumber || "",
      remarks: company.remarks || "",
    });
    setEditingId(company._id);
    setShowForm(true);
  };

  const handleDelete = (company) => {
    setDeleteModal({ show: true, id: company._id, name: company.companyName });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/company/${deleteModal.id}`);
      setDeleteModal({ show: false, id: null, name: "" });
      showToast("success", "Company Deactivated", "Company deactivated successfully.");
      await getCompanies();
    } catch (error) {
      console.error("Deactivate company error:", error);
      setDeleteModal({ show: false, id: null, name: "" });
      showToast("error", "Action Failed", error.response?.data?.message || "Failed to deactivate company.");
    }
  };

  return (
    <div className="companies-layout">
      {toast.show && (
        <div className={`company-toast company-toast-${toast.type}`}>
          <div className="company-toast-icon">
            {toast.type === "success" ? <CheckCircle size={21} /> : <AlertCircle size={21} />}
          </div>
          <div className="company-toast-content">
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
          </div>
          <button type="button" className="company-toast-close"
            onClick={() => setToast({ show: false, type: "", title: "", message: "" })}
            aria-label="Close notification"><X size={17} /></button>
        </div>
      )}

      {deleteModal.show && (
        <div className="company-delete-overlay" onClick={() => setDeleteModal({ show: false, id: null, name: "" })}>
          <div className="company-delete-modal" onClick={(event) => event.stopPropagation()}>
            <div className="company-delete-icon"><Trash2 size={25} /></div>
            <div className="company-delete-content">
              <h3>Deactivate Company?</h3>
              <p>Are you sure you want to deactivate <strong>{deleteModal.name}</strong>?</p>
              <span>The company record will be retained for existing enquiries and orders.</span>
            </div>
            <div className="company-delete-actions">
              <button type="button" className="company-delete-cancel"
                onClick={() => setDeleteModal({ show: false, id: null, name: "" })}>Cancel</button>
              <button type="button" className="company-delete-confirm" onClick={confirmDelete}>
                <Trash2 size={16} /> Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar />
      <div className="companies-main">
        <Header />
        <main className="companies-content">
          <div className="companies-page-header">
            <div>
              <h1>Companies</h1>
              <p>Manage all customer companies.</p>
            </div>
            <button type="button" className="add-company-btn" onClick={handleAddCompany}>
              <Plus size={18} /> Add Company
            </button>
          </div>

          {showForm && (
            <section className="company-form-card">
              <div className="company-form-header">
                <div>
                  <h2>{editingId ? "Edit Company" : "Add Company"}</h2>
                  <p>{editingId ? "Update company details." : "Create a new company."}</p>
                </div>
                <button type="button" className="company-close-form" onClick={resetForm}
                  aria-label="Close form"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="company-form-grid">
                  <div className="company-form-group">
                    <label htmlFor="companyName">Company Name <span>*</span></label>
                    <input id="companyName" name="companyName" value={formData.companyName}
                      onChange={handleChange} placeholder="Enter company name" required />
                  </div>
                  <div className="company-form-group">
                    <label htmlFor="contactPerson">Contact Person</label>
                    <input id="contactPerson" name="contactPerson" value={formData.contactPerson}
                      onChange={handleChange} placeholder="Enter contact person" />
                  </div>
                  <div className="company-form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input id="phone" type="tel" name="phone" value={formData.phone}
                      onChange={handleChange} placeholder="Enter phone number" />
                  </div>
                  <div className="company-form-group">
                    <label htmlFor="email">Email</label>
                    <input id="email" type="email" name="email" value={formData.email}
                      onChange={handleChange} placeholder="Enter email address" />
                  </div>
                  <div className="company-form-group">
                    <label htmlFor="gstNumber">GST Number</label>
                    <input id="gstNumber" name="gstNumber" value={formData.gstNumber}
                      onChange={handleChange} placeholder="Enter GST number" />
                  </div>
                  <div className="company-form-group company-full-width">
                    <label htmlFor="address">Address</label>
                    <textarea id="address" name="address" rows="2" value={formData.address}
                      onChange={handleChange} placeholder="Enter company address" />
                  </div>
                  <div className="company-form-group company-full-width">
                    <label htmlFor="remarks">Remarks</label>
                    <textarea id="remarks" name="remarks" rows="2" value={formData.remarks}
                      onChange={handleChange} placeholder="Enter remarks" />
                  </div>
                </div>
                <div className="company-form-actions">
                  <button type="button" className="company-cancel-btn" onClick={resetForm}>Cancel</button>
                  <button type="submit" className="save-company-btn">
                    {editingId ? "Update Company" : "Save Company"}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="companies-table-card">
            <div className="company-table-header">
              <div>
                <h2>All Companies</h2>
                <p>{companies.length} {companies.length === 1 ? "company" : "companies"} available</p>
              </div>
            </div>
            <div className="company-table-wrapper">
              <table className="companies-table">
                <thead>
                  <tr>
                    <th>S.No</th><th>Company</th><th>Contact Person</th>
                    <th>Phone</th><th>Email</th><th>GST Number</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" className="company-empty-state">Loading companies...</td></tr>
                  ) : companies.length ? (
                    companies.map((company, index) => (
                      <tr key={company._id}>
                        <td>{index + 1}</td>
                        <td className="company-name">{company.companyName}</td>
                        <td>{company.contactPerson || "-"}</td>
                        <td>{company.phone || "-"}</td>
                        <td>{company.email || "-"}</td>
                        <td>{company.gstNumber || "-"}</td>
                        <td>
                          <span className={company.isActive ? "company-active" : "company-inactive"}>
                            {company.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div className="company-action-buttons">
                            <button type="button" className="company-edit-btn"
                              onClick={() => handleEdit(company)} aria-label={`Edit ${company.companyName}`}>
                              <Pencil size={16} />
                            </button>
                            {company.isActive !== false && (
                              <button type="button" className="company-delete-btn"
                                onClick={() => handleDelete(company)}
                                aria-label={`Deactivate ${company.companyName}`}>
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="8" className="company-empty-state">No companies found.</td></tr>
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

export default Companies;
