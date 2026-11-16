
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
  Tag,
  FileText,
} from "lucide-react";

import api from "../../api/axios";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import "./FinanceCategory.css";

function FinanceCategory() {
  // =========================================================
  // FORM
  // =========================================================

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "expense",
    description: "",
  });

  // =========================================================
  // CATEGORIES
  // =========================================================

  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [filter, setFilter] = useState("all");

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
    name: "",
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
  // GET ALL CATEGORIES
  // =========================================================

  const getCategories = async () => {
    try {
      setLoading(true);

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
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD DATA
  // =========================================================

  useEffect(() => {
    getCategories();
  }, []);

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
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setFormData({
      name: "",
      type: "expense",
      description: "",
    });

    setEditingId(null);
  };

  // =========================================================
  // VALIDATION
  // =========================================================

  const validateForm = () => {
    if (!formData.name.trim()) {
      showToast(
        "error",
        "Category Name Required",
        "Please enter category name."
      );

      return false;
    }

    if (!["income", "expense"].includes(formData.type)) {
      showToast(
        "error",
        "Invalid Category Type",
        "Please select a valid category type."
      );

      return false;
    }

    return true;
  };

  // =========================================================
  // CREATE / UPDATE CATEGORY
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description.trim(),
      };

      // =====================================================
      // UPDATE
      // =====================================================

      if (editingId) {
        await api.patch(
          `/finance-categories/${editingId}`,
          payload
        );

        showToast(
          "success",
          "Category Updated",
          "Finance category updated successfully."
        );
      }

      // =====================================================
      // CREATE
      // =====================================================

      else {
        await api.post("/finance-categories", payload);

        showToast(
          "success",
          "Category Created",
          "Finance category created successfully."
        );
      }

      // Refresh table
      await getCategories();

      // Reset form
      resetForm();

      setShowForm(false);
    } catch (error) {
      console.error("Save category error:", error);

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to save finance category."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // ADD CATEGORY
  // =========================================================

  const handleAddCategory = () => {
    resetForm();

    setShowForm(true);
  };

  // =========================================================
  // EDIT CATEGORY
  // =========================================================

  const handleEdit = (category) => {
    setFormData({
      name: category.name || "",
      type: category.type || "expense",
      description: category.description || "",
    });

    setEditingId(category._id);

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

  const handleDelete = (category) => {
    setDeleteModal({
      show: true,
      id: category._id,
      name: category.name,
    });
  };

  // =========================================================
  // CLOSE DELETE MODAL
  // =========================================================

  const closeDeleteModal = () => {
    setDeleteModal({
      show: false,
      id: null,
      name: "",
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
        `/finance-categories/${deleteModal.id}`
      );

      closeDeleteModal();

      showToast(
        "success",
        "Category Deleted",
        "Finance category deleted successfully."
      );

      await getCategories();

      if (editingId === deleteModal.id) {
        resetForm();
        setShowForm(false);
      }
    } catch (error) {
      console.error("Delete category error:", error);

      closeDeleteModal();

      showToast(
        "error",
        "Delete Failed",
        error.response?.data?.message ||
          "Failed to delete finance category."
      );
    }
  };

  // =========================================================
  // FILTER CATEGORIES
  // =========================================================

  const filteredCategories = categories.filter((category) => {
    if (filter === "all") {
      return true;
    }

    return category.type === filter;
  });

  // =========================================================
  // SUMMARY
  // =========================================================

  const incomeCount = categories.filter(
    (item) => item.type === "income"
  ).length;

  const expenseCount = categories.filter(
    (item) => item.type === "expense"
  ).length;

  // =========================================================
  // RETURN
  // =========================================================

  return (
    <div className="employees-layout">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <Sidebar />

      <div className="employees-main">

        {/* ===================================================
            HEADER
        =================================================== */}

        <Header />

        <main className="employees-content">

          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <div className="finance-category-page-header">

            <div>
              <h1>Finance Categories</h1>

              <p>
                Manage income and expense categories
              </p>
            </div>

            <button
              type="button"
              className="add-category-btn"
              onClick={handleAddCategory}
            >
              <Plus size={18} />
              Add Category
            </button>

          </div>

          {/* =================================================
              SUMMARY
          ================================================= */}

          <div className="finance-category-summary">

            <div className="finance-summary-card">
              <div className="finance-summary-icon total">
                <Wallet size={22} />
              </div>

              <div>
                <p>Total Categories</p>
                <h3>{categories.length}</h3>
              </div>
            </div>

            <div className="finance-summary-card">
              <div className="finance-summary-icon income">
                <TrendingUp size={22} />
              </div>

              <div>
                <p>Income Categories</p>
                <h3>{incomeCount}</h3>
              </div>
            </div>

            <div className="finance-summary-card">
              <div className="finance-summary-icon expense">
                <TrendingDown size={22} />
              </div>

              <div>
                <p>Expense Categories</p>
                <h3>{expenseCount}</h3>
              </div>
            </div>

          </div>

          {/* =================================================
              FORM
          ================================================= */}

          {showForm && (
            <section className="finance-category-form-card">

              <div className="finance-category-form-header">

                <div>
                  <h2>
                    {editingId
                      ? "Edit Category"
                      : "Category Details"}
                  </h2>

                  <p>
                    {editingId
                      ? "Update category information"
                      : "Enter the category information below"}
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

                <div className="finance-category-form-grid">

                  {/* CATEGORY NAME */}

                  <div className="finance-category-form-group">

                    <label>
                      Category Name <span>*</span>
                    </label>

                    <div className="finance-category-input-wrapper">
                      <Tag size={19} />

                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter category name"
                      />
                    </div>

                  </div>

                  {/* CATEGORY TYPE */}

                  <div className="finance-category-form-group">

                    <label>
                      Category Type <span>*</span>
                    </label>

                    <div className="finance-category-input-wrapper">
                      <Wallet size={19} />

                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                      >
                        <option value="income">
                          Income
                        </option>

                        <option value="expense">
                          Expense
                        </option>
                      </select>
                    </div>

                  </div>

                  {/* DESCRIPTION */}

                  <div className="finance-category-form-group full-width">

                    <label>
                      Description
                    </label>

                    <div className="finance-category-input-wrapper">
                      <FileText size={19} />

                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Enter category description"
                        rows={3}
                      />
                    </div>

                  </div>

                </div>

                {/* FORM ACTIONS */}

                <div className="finance-category-form-actions">

                  <button
                    type="button"
                    className="finance-category-cancel-btn"
                    onClick={handleCancel}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="finance-category-save-btn"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Saving..."
                      : editingId
                      ? "Update Category"
                      : "Create Category"}
                  </button>

                </div>

              </form>

            </section>
          )}

          {/* =================================================
              CATEGORY TABLE
          ================================================= */}

          <section className="finance-category-table-card">

            <div className="finance-category-table-header">

              <div>
                <h2>Category List</h2>

                <p>
                  {filteredCategories.length} categories found
                </p>
              </div>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value)
                }
              >
                <option value="all">All Categories</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>

            </div>

            <div className="finance-category-table-wrapper">

              <table className="finance-category-table">

                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Category Name</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="finance-category-empty-state"
                      >
                        Loading categories...
                      </td>
                    </tr>
                  ) : filteredCategories.length > 0 ? (
                    filteredCategories.map(
                      (category, index) => (
                        <tr key={category._id}>

                          <td>{index + 1}</td>

                          <td>
                            <span className="finance-category-name">
                              {category.name}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`finance-category-badge ${category.type}`}
                            >
                              {category.type}
                            </span>
                          </td>

                          <td>
                            {category.description || "-"}
                          </td>

                          <td>

                            <div className="finance-category-actions">

                              <button
                                type="button"
                                className="finance-category-edit-btn"
                                onClick={() =>
                                  handleEdit(category)
                                }
                                title="Edit Category"
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                type="button"
                                className="finance-category-delete-btn"
                                onClick={() =>
                                  handleDelete(category)
                                }
                                title="Delete Category"
                              >
                                <Trash2 size={16} />
                              </button>

                            </div>

                          </td>

                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="finance-category-empty-state"
                      >
                        No categories found.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>

          </section>

        </main>
      </div>

      {/* =====================================================
          TOAST
      ===================================================== */}

      {toast.show && (
        <div
          className={`finance-category-toast finance-category-toast-${toast.type}`}
        >

          <div className="finance-category-toast-icon">

            {toast.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}

          </div>

          <div className="finance-category-toast-content">

            <strong>{toast.title}</strong>

            <span>{toast.message}</span>

          </div>

          <button
            type="button"
            className="finance-category-toast-close"
            onClick={closeToast}
          >
            <X size={17} />
          </button>

        </div>
      )}

      {/* =====================================================
          DELETE CONFIRMATION MODAL
      ===================================================== */}

      {deleteModal.show && (
        <div
          className="finance-category-delete-modal-overlay"
          onClick={closeDeleteModal}
        >

          <div
            className="finance-category-delete-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="finance-category-delete-modal-icon">
              <Trash2 size={25} />
            </div>

            <div className="finance-category-delete-modal-content">

              <h3>Delete Category?</h3>

              <p>
                Are you sure you want to delete{" "}
                <strong>{deleteModal.name}</strong>?
              </p>

              <span>
                This category should not be deleted if it is
                already used by finance transactions.
              </span>

            </div>

            <div className="finance-category-delete-modal-actions">

              <button
                type="button"
                className="finance-category-delete-cancel-btn"
                onClick={closeDeleteModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="finance-category-delete-confirm-btn"
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

export default FinanceCategory;
