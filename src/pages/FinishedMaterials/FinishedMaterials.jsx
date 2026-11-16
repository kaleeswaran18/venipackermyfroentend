import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import api from "../../api/axios";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import "./FinishedMaterials.css";

function FinishedMaterials() {
  // ==========================================
  // FORM
  // ==========================================

  const [showForm, setShowForm] = useState(false);

  const [finishedMaterials, setFinishedMaterials] = useState([]);
  const [categories, setCategories] = useState([]);

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    categoryId: "",
    companyName: "",
    name: "",
  });

  // ==========================================
  // TOAST
  // ==========================================

  const [toast, setToast] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });

  // ==========================================
  // DELETE MODAL
  // ==========================================

  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    name: "",
  });

  // ==========================================
  // SHOW TOAST
  // ==========================================

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

  // ==========================================
  // CLOSE TOAST
  // ==========================================

  const closeToast = () => {
    setToast({
      show: false,
      type: "",
      title: "",
      message: "",
    });
  };

  // ==========================================
  // GET FINISHED MATERIAL CATEGORIES
  // ==========================================

  const getCategories = async () => {
    try {
      const response = await api.get("/finished-materials");

      setCategories(response.data.data || []);
    } catch (error) {
      console.error("Get finished material categories error:", error);

      showToast(
        "error",
        "Load Failed",
        error.response?.data?.message ||
          "Failed to load finished material categories."
      );
    }
  };

  // ==========================================
  // GET ALL FINISHED MATERIAL STOCK
  // ==========================================

  const getFinishedMaterials = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        "/finished-material-products"
      );

      setFinishedMaterials(response.data.data || []);
    } catch (error) {
      console.error(
        "Get finished material products error:",
        error
      );

      showToast(
        "error",
        "Load Failed",
        error.response?.data?.message ||
          "Failed to load finished material products."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOAD FINISHED MATERIAL STOCK
  // ==========================================

  useEffect(() => {
    getCategories();
    getFinishedMaterials();
  }, []);

  // ==========================================
  // INPUT CHANGE
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "categoryId" &&
        categories.find((category) => category._id === value)?.name
          ?.trim()
          .toLowerCase()
          .replace(/\s+/g, "") !== "othercompany"
        ? { companyName: "" }
        : {}),
    }));
  };

  const isOtherCompanyCategory = () => {
    const selectedCategory = categories.find(
      (category) => category._id === formData.categoryId
    );

    return (
      selectedCategory?.name
      ?.trim()
      .toLowerCase()
      .replace(/\s+/g, "") === "othercompany"
    );
  };

  const getCategoryName = (item) => {
    return (
      item.categoryId?.name ||
      item.category?.name ||
      categories.find(
        (category) =>
          category._id ===
          (item.categoryId?._id ||
            item.categoryId ||
            item.category?._id ||
            item.category)
      )?.name ||
      "-"
    );
  };

  // ==========================================
  // CREATE / UPDATE
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    const categoryId = formData.categoryId.trim();
    const companyName = formData.companyName.trim();
    const name = formData.name.trim();

    const otherCompany = isOtherCompanyCategory();

    // ========================================
    // EMPTY VALIDATION
    // ========================================

    if (!categoryId) {
      showToast(
        "error",
        "Category Required",
        "Please select a category."
      );

      return;
    }

    if (otherCompany && !companyName) {
      showToast(
        "error",
        "Company Name Required",
        "Please enter a company name."
      );

      return;
    }

    if (!name) {
      showToast(
        "error",
        "Finished Material Name Required",
        "Please enter a finished material name."
      );

      return;
    }

    try {
      setLoading(true);

      // ======================================
      // UPDATE
      // ======================================

      if (editingId) {
        const response = await api.patch(
          `/finished-material-products/${editingId}`,
          {
            companyName: otherCompany ? companyName : "",
            name,
          }
        );

        setFinishedMaterials((prev) =>
          prev.map((item) =>
            item._id === editingId
              ? response.data.data
              : item
          )
        );

        showToast(
          "success",
          "Finished Material Updated",
          "Finished material updated successfully."
        );
      }

      // ======================================
      // CREATE PRODUCT
      // ======================================

      else {
        const response = await api.post(
          "/finished-material-products",
          {
            categoryId,
            companyName: otherCompany ? companyName : "",
            name,
          }
        );

        setFinishedMaterials((prev) => [
          ...prev,
          response.data.data,
        ]);

        showToast(
          "success",
          "Finished Material Created",
          "Finished material created successfully."
        );
      }

      // Reset form
      setFormData({
        categoryId: "",
        companyName: "",
        name: "",
      });

      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      console.error(
        "Save finished material product error:",
        error
      );

      showToast(
        "error",
        "Save Failed",
        error.response?.data?.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ADD FINISHED MATERIAL
  // ==========================================

  const handleAddFinishedMaterial = () => {
    setFormData({
      categoryId: "",
      companyName: "",
      name: "",
    });

    setEditingId(null);
    setShowForm(true);
  };

  // ==========================================
  // EDIT
  // ==========================================

  const handleEdit = (item) => {
    setFormData({
      categoryId:
        item.categoryId?._id ||
        item.categoryId ||
        item.category?._id ||
        item.category ||
        "",
      companyName: item.companyName || "",
      name: item.name || "",
    });

    setEditingId(item._id);
    setShowForm(true);
  };

  // ==========================================
  // OPEN DELETE MODAL
  // ==========================================

  const openDeleteModal = (item) => {
    setDeleteModal({
      show: true,
      id: item._id,
      name: item.name,
    });
  };

  // ==========================================
  // CONFIRM DELETE
  // ==========================================

  const handleDelete = async () => {
    try {
      setLoading(true);

      await api.delete(
        `/finished-material-products/${deleteModal.id}`
      );

      setFinishedMaterials((prev) =>
        prev.filter(
          (item) => item._id !== deleteModal.id
        )
      );

      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "success",
        "Finished Material Deleted",
        "Finished material deleted successfully."
      );
    } catch (error) {
      console.error(
        "Delete finished material stock error:",
        error
      );

      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "error",
        "Delete Failed",
        error.response?.data?.message ||
          "Failed to delete finished material."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // CLOSE DELETE MODAL
  // ==========================================

  const closeDeleteModal = () => {
    setDeleteModal({
      show: false,
      id: null,
      name: "",
    });
  };

  // ==========================================
  // CLOSE FORM
  // ==========================================

  const closeForm = () => {
    setShowForm(false);

    setEditingId(null);

    setFormData({
      categoryId: "",
      companyName: "",
      name: "",
    });
  };

  return (
    <div className="finished-materials-layout">
      {/* ======================================
          TOAST
      ======================================= */}

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
            aria-label="Close notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* ======================================
          SIDEBAR
      ======================================= */}

      <Sidebar />

      <div className="finished-materials-main">
        {/* ====================================
            HEADER
        ===================================== */}

        <Header />

        <main className="finished-materials-content">
          {/* ===================================
              PAGE HEADER
          ==================================== */}

          <div className="page-header">
            <div>
              <h1>Finished Materials</h1>

              <p>
                Manage all finished materials
              </p>
            </div>

            <button
              type="button"
              className="add-btn"
              onClick={
                handleAddFinishedMaterial
              }
            >
              <Plus size={18} />

              Add Finished Material
            </button>
          </div>

          {/* ===================================
              FORM
          ==================================== */}

          {showForm && (
            <div className="form-card">
              <div className="form-header">
                <h2>
                  {editingId
                    ? "Edit Finished Material"
                    : "Add Finished Material"}
                </h2>

                <button
                  type="button"
                  className="close-btn"
                  onClick={closeForm}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      Category <span>*</span>
                    </label>

                    <select
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleChange}
                      disabled={!!editingId}
                    >
                      <option value="">
                        Select category
                      </option>

                      {categories.map((category) => (
                        <option
                          key={category._id}
                          value={category._id}
                        >
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isOtherCompanyCategory() && (
                    <div className="form-group">
                      <label>
                        Company Name <span>*</span>
                      </label>

                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        placeholder="Enter company name"
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label>
                      Material Name{" "}
                      <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter material name"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={closeForm}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-btn"
                    disabled={loading}
                  >
                    {editingId
                      ? "Update Material"
                      : "Save Material"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ===================================
              TABLE
          ==================================== */}

          <div className="table-card">
            <div className="table-header">
              <div>
                <h2>
                  All Finished Materials
                </h2>

                <span>
                  {finishedMaterials.length}{" "}
                  materials
                </span>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Category</th>
                    <th>Company Name</th>
                    <th>Material Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading &&
                  finishedMaterials.length ===
                    0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="empty-row"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : finishedMaterials.length >
                    0 ? (
                    finishedMaterials.map(
                      (item, index) => (
                        <tr key={item._id}>
                          <td>{index + 1}</td>

                          <td>
                            {getCategoryName(item)}
                          </td>

                          <td>
                            {getCategoryName(item)
                              .trim()
                              .toLowerCase()
                              .replace(/\s+/g, "") === "othercompany"
                              ? item.companyName || "-"
                              : "-"}
                          </td>

                          <td>
                            <strong>
                              {item.name}
                            </strong>
                          </td>

                          <td>
                            <div className="action-buttons">
                              <button
                                type="button"
                                className="edit-btn"
                                onClick={() =>
                                  handleEdit(item)
                                }
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                type="button"
                                className="delete-btn"
                                onClick={() =>
                                  openDeleteModal(
                                    item
                                  )
                                }
                                title="Delete"
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
                        colSpan="5"
                        className="empty-row"
                      >
                        No finished materials found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* ======================================
          DELETE CONFIRMATION MODAL
      ======================================= */}

      {deleteModal.show && (
        <div
          className="delete-modal-overlay"
          onClick={closeDeleteModal}
        >
          <div
            className="delete-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="delete-modal-icon">
              <Trash2 size={25} />
            </div>

            <div className="delete-modal-content">
              <h3>
                Delete Finished Material?
              </h3>

              <p>
                Are you sure you want to delete{" "}
                <strong>
                  {deleteModal.name}
                </strong>
                ?
              </p>

              <span>
                This action cannot be undone.
              </span>
            </div>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-cancel-btn"
                onClick={closeDeleteModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-btn"
                onClick={handleDelete}
                disabled={loading}
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

export default FinishedMaterials;