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

import "./FinishedMaterialsFiled.css";

function FinishedMaterialsFiled() {
  const [showForm, setShowForm] = useState(false);
  const [categoryFields, setCategoryFields] = useState([]);
  const [categories, setCategories] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    categoryId: "",
    fieldName: "",
  });

  const [toast, setToast] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });

  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    name: "",
  });

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

  // GET FINISHED MATERIAL CATEGORIES
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

  // GET ALL CATEGORY FIELDS
  const getCategoryFields = async () => {
    try {
      setLoading(true);

      const response = await api.get("/category-fields");

      setCategoryFields(response.data.data || []);
    } catch (error) {
      console.error("Get category fields error:", error);

      showToast(
        "error",
        "Load Failed",
        error.response?.data?.message ||
          "Failed to load category fields."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCategories();
    getCategoryFields();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // CREATE / UPDATE
  const handleSubmit = async (e) => {
    e.preventDefault();

    const categoryId = formData.categoryId.trim();
    const fieldName = formData.fieldName.trim();

    if (!categoryId) {
      showToast(
        "error",
        "Category Required",
        "Please select a category."
      );
      return;
    }

    if (!fieldName) {
      showToast(
        "error",
        "Field Name Required",
        "Please enter a field name."
      );
      return;
    }

    try {
      setLoading(true);

      if (editingId) {
        const currentField = categoryFields.find(
          (item) => item._id === editingId
        );

        const response = await api.patch(
          `/category-fields/${editingId}`,
          {
            key: fieldName.toLowerCase(),
            label: fieldName,
            type: currentField?.type || "number",
            order: currentField?.order || 1,
          }
        );

        setCategoryFields((prev) =>
          prev.map((item) =>
            item._id === editingId
              ? response.data.data
              : item
          )
        );

        showToast(
          "success",
          "Field Updated",
          "Category field updated successfully."
        );
      } else {
        const categoryFieldCount = categoryFields.filter(
          (item) =>
            String(item.categoryId?._id || item.categoryId || item.category?._id || item.category) ===
            String(categoryId)
        ).length;

        const response = await api.post(
          "/category-fields",
          {
            categoryId,
            key: fieldName.toLowerCase(),
            label: fieldName,
            type: "number",
            order: categoryFieldCount + 1,
          }
        );

        setCategoryFields((prev) => [
          ...prev,
          response.data.data,
        ]);

        showToast(
          "success",
          "Field Created",
          "Category field created successfully."
        );
      }

      setFormData({
        categoryId: "",
        fieldName: "",
      });

      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      console.error("Save category field error:", error);

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

  const handleAddField = () => {
    setFormData({
      categoryId: "",
      fieldName: "",
    });

    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setFormData({
      categoryId:
        item.categoryId?._id ||
        item.categoryId ||
        item.category?._id ||
        item.category ||
        "",
      fieldName: item.key || item.fieldName || "",
    });

    setEditingId(item._id);
    setShowForm(true);
  };

  const openDeleteModal = (item) => {
    setDeleteModal({
      show: true,
      id: item._id,
      name: item.key || item.fieldName || "",
    });
  };

  // DELETE
  const handleDelete = async () => {
    try {
      setLoading(true);

      await api.delete(
        `/category-fields/${deleteModal.id}`
      );

      setCategoryFields((prev) =>
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
        "Field Deleted",
        "Category field deleted successfully."
      );
    } catch (error) {
      console.error("Delete category field error:", error);

      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "error",
        "Delete Failed",
        error.response?.data?.message ||
          "Failed to delete category field."
      );
    } finally {
      setLoading(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      show: false,
      id: null,
      name: "",
    });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);

    setFormData({
      categoryId: "",
      fieldName: "",
    });
  };

  const getCategoryName = (item) => {
    return (
      item.categoryId?.name ||
      item.category?.name ||
      categories.find(
        (category) =>
          category._id ===
          (item.categoryId || item.category)
      )?.name ||
      "-"
    );
  };

  return (
    <div className="finished-materials-layout">
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

      <Sidebar />

      <div className="finished-materials-main">
        <Header />

        <main className="finished-materials-content">
          <div className="page-header">
            <div>
              <h1>Finished Materials Field</h1>

              <p>
                Manage fields for finished material categories
              </p>
            </div>

            <button
              type="button"
              className="add-btn"
              onClick={handleAddField}
            >
              <Plus size={18} />
              Add Field
            </button>
          </div>

          {showForm && (
            <div className="form-card">
              <div className="form-header">
                <h2>
                  {editingId
                    ? "Edit Field"
                    : "Add Field"}
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

                  <div className="form-group">
                    <label>
                      Field Name <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="fieldName"
                      value={formData.fieldName}
                      onChange={handleChange}
                      placeholder="Enter field name"
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
                      ? "Update Field"
                      : "Save Field"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="table-card">
            <div className="table-header">
              <div>
                <h2>All Category Fields</h2>

                <span>
                  {categoryFields.length} fields
                </span>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Category</th>
                    <th>Field Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading && categoryFields.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="empty-row"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : categoryFields.length > 0 ? (
                    categoryFields.map((item, index) => (
                      <tr key={item._id}>
                        <td>{index + 1}</td>

                        <td>
                          {getCategoryName(item)}
                        </td>

                        <td>
                          <strong>
                            {item.key ||
                              item.fieldName ||
                              "-"}
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
                                openDeleteModal(item)
                              }
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="empty-row"
                      >
                        No category fields found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

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
              <h3>Delete Field?</h3>

              <p>
                Are you sure you want to delete{" "}
                <strong>{deleteModal.name}</strong>?
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

export default FinishedMaterialsFiled;
