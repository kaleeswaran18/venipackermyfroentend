import { useEffect, useMemo, useState } from "react";
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
import "./FinishedMaterialsoverallstock.css";

const OVERALL_STOCK_API = "/finished-material-product-stock";

function FinishedMaterialsoverallstock() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [stocks, setStocks] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    categoryId: "",
    productId: "",
  });

  const [editValues, setEditValues] = useState({});

  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);

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

  // --------------------------------------------------
  // Toast
  // --------------------------------------------------

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

  // --------------------------------------------------
  // Get Categories
  // --------------------------------------------------

  const getCategories = async () => {
    try {
      const response = await api.get("/finished-materials");

      setCategories(response.data.data || []);
    } catch (error) {
      showToast(
        "error",
        "Load Failed",
        error.response?.data?.message ||
          "Failed to load categories."
      );
    }
  };

  // --------------------------------------------------
  // Get Products By Category
  // --------------------------------------------------

  const getProductsByCategory = async (categoryId) => {
    if (!categoryId) {
      setProducts([]);
      return;
    }

    try {
      setProductsLoading(true);

      const response = await api.get(
        `/finished-material-products?categoryId=${categoryId}`
      );

      setProducts(response.data.data || []);
    } catch (error) {
      setProducts([]);

      showToast(
        "error",
        "Load Failed",
        error.response?.data?.message ||
          "Failed to load products."
      );
    } finally {
      setProductsLoading(false);
    }
  };

  // --------------------------------------------------
  // Get Overall Stocks
  // --------------------------------------------------

  const getOverallStocks = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        OVERALL_STOCK_API
      );

      setStocks(response.data.data || []);
    } catch (error) {
      showToast(
        "error",
        "Load Failed",
        error.response?.data?.message ||
          "Failed to load overall stocks."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Initial Load
  // --------------------------------------------------

  useEffect(() => {
    getCategories();
    getOverallStocks();
  }, []);

  // --------------------------------------------------
  // Category Change
  // --------------------------------------------------

  const handleCategoryChange = async (e) => {
    const categoryId = e.target.value;

    setFormData({
      categoryId,
      productId: "",
    });

    await getProductsByCategory(categoryId);
  };

  // --------------------------------------------------
  // Product Change
  // --------------------------------------------------

  const handleProductChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      productId: e.target.value,
    }));
  };

  // --------------------------------------------------
  // Add
  // --------------------------------------------------

  const handleAdd = () => {
    setEditingId(null);

    setFormData({
      categoryId: "",
      productId: "",
    });

    setProducts([]);
    setEditValues({});
    setShowForm(true);
  };

  // --------------------------------------------------
  // Close Form
  // --------------------------------------------------

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);

    setFormData({
      categoryId: "",
      productId: "",
    });

    setProducts([]);
    setEditValues({});
  };

  // --------------------------------------------------
  // Submit
  // --------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.categoryId) {
      return showToast(
        "error",
        "Category Required",
        "Please select a category."
      );
    }

    if (!formData.productId) {
      return showToast(
        "error",
        "Product Required",
        "Please select a product."
      );
    }

    try {
      setLoading(true);

      if (editingId) {
        await api.patch(
          `${OVERALL_STOCK_API}/${editingId}`,
          {
            values: editValues,
          }
        );

        showToast(
          "success",
          "Stock Updated",
          "Overall stock updated successfully."
        );
      } else {
        await api.post(OVERALL_STOCK_API, {
          categoryId: formData.categoryId,
          productId: formData.productId,
        });

        showToast(
          "success",
          "Stock Created",
          "Overall stock created for all active locations."
        );
      }

      closeForm();

      await getOverallStocks();
    } catch (error) {
      showToast(
        "error",
        editingId
          ? "Update Failed"
          : "Create Failed",
        error.response?.data?.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Edit
  // --------------------------------------------------

  const handleEdit = async (stock) => {
    const categoryId =
      stock.categoryId?._id ||
      stock.categoryId ||
      "";

    setEditingId(stock._id);

    setFormData({
      categoryId,
      productId:
        stock.productId?._id ||
        stock.productId ||
        "",
    });

    setEditValues(
      stock.values
        ? Object.fromEntries(
            Object.entries(stock.values)
          )
        : {}
    );

    await getProductsByCategory(categoryId);

    setShowForm(true);
  };

  // --------------------------------------------------
  // Value Change
  // --------------------------------------------------

  const handleValueChange = (key, value) => {
    setEditValues((prev) => ({
      ...prev,
      [key]:
        value === ""
          ? 0
          : Number(value),
    }));
  };

  // --------------------------------------------------
  // Delete Modal
  // --------------------------------------------------

  const openDeleteModal = (stock) => {
    setDeleteModal({
      show: true,
      id: stock._id,
      name: `${
        stock.productId?.name ||
        "Product"
      } - ${
        stock.locationId?.name ||
        "Location"
      }`,
    });
  };

  // --------------------------------------------------
  // Delete
  // --------------------------------------------------

  const handleDelete = async () => {
    try {
      setLoading(true);

      await api.delete(
        `${OVERALL_STOCK_API}/${deleteModal.id}`
      );

      setStocks((prev) =>
        prev.filter(
          (item) =>
            item._id !==
            deleteModal.id
        )
      );

      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "success",
        "Stock Deleted",
        "Overall stock deleted successfully."
      );
    } catch (error) {
      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "error",
        "Delete Failed",
        error.response?.data?.message ||
          "Failed to delete overall stock."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Edit Values
  // --------------------------------------------------

  const normalizedValues = useMemo(
    () =>
      Object.entries(
        editValues || {}
      ),
    [editValues]
  );

  // --------------------------------------------------
  // JSX
  // --------------------------------------------------

  return (
    <div className="finished-materials-layout">

      {/* Toast */}
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
            <strong>
              {toast.title}
            </strong>

            <span>
              {toast.message}
            </span>
          </div>

          <button
            type="button"
            className="location-toast-close"
            onClick={() =>
              setToast({
                show: false,
                type: "",
                title: "",
                message: "",
              })
            }
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar />

      <div className="finished-materials-main">

        {/* Header */}
        <Header />

        <main className="finished-materials-content">

          {/* Page Header */}
          <div className="page-header">
            <div>
              <h1>
                Finished Materials Overall Stock
              </h1>

              <p>
                Manage overall stock by
                category, product and
                location
              </p>
            </div>

            <button
              type="button"
              className="add-btn"
              onClick={handleAdd}
            >
              <Plus size={18} />
              Add Overall Stock
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="form-card">

              <div className="form-header">
                <h2>
                  {editingId
                    ? "Edit Overall Stock"
                    : "Add Overall Stock"}
                </h2>

                <button
                  type="button"
                  className="close-btn"
                  onClick={closeForm}
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
              >
                <div className="form-grid">

                  {/* Category */}
                  <div className="form-group">
                    <label>
                      Category{" "}
                      <span>*</span>
                    </label>

                    <select
                      value={
                        formData.categoryId
                      }
                      onChange={
                        handleCategoryChange
                      }
                      disabled={!!editingId}
                    >
                      <option value="">
                        Select category
                      </option>

                      {categories.map(
                        (category) => (
                          <option
                            key={
                              category._id
                            }
                            value={
                              category._id
                            }
                          >
                            {category.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Product */}
                  <div className="form-group">
                    <label>
                      Product Name{" "}
                      <span>*</span>
                    </label>

                    <select
                      value={
                        formData.productId
                      }
                      onChange={
                        handleProductChange
                      }
                      disabled={
                        !formData.categoryId ||
                        productsLoading ||
                        !!editingId
                      }
                    >
                      <option value="">
                        {productsLoading
                          ? "Loading products..."
                          : !formData.categoryId
                          ? "Select category first"
                          : "Select product"}
                      </option>

                      {products.map(
                        (product) => (
                          <option
                            key={
                              product._id
                            }
                            value={
                              product._id
                            }
                          >
                            {product.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {/* Edit Values */}
                {editingId &&
                  normalizedValues.length >
                    0 && (
                    <div className="form-grid">

                      {normalizedValues.map(
                        ([key, value]) => (
                          <div
                            className="form-group"
                            key={key}
                          >
                            <label>
                              {key}
                            </label>

                            <input
                              type="number"
                              value={
                                value ?? 0
                              }
                              onChange={(e) =>
                                handleValueChange(
                                  key,
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        )
                      )}

                    </div>
                  )}

                {/* Form Actions */}
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
                      ? "Update Stock"
                      : "Create Stock"}
                  </button>

                </div>
              </form>
            </div>
          )}

          {/* Table */}
          <div className="table-card">

            <div className="table-header">
              <div>
                <h2>
                  Overall Stock
                </h2>

                <span>
                  {stocks.length} records
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
                    <th>Product</th>
                    <th>Location</th>
                    <th>Values</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {/* Loading */}
                  {loading &&
                  stocks.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="empty-row"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : stocks.length > 0 ? (

                    stocks.map(
                      (stock, index) => (
                        <tr
                          key={stock._id}
                        >

                          {/* S.No */}
                          <td>
                            {index + 1}
                          </td>

                          {/* Category */}
                          <td>
                            {
                              stock
                                .categoryId
                                ?.name ||
                              "-"
                            }
                          </td>

                          {/* Company Name */}
                          <td>
                            {
                              stock
                                .productId
                                ?.companyName ||
                              "-"
                            }
                          </td>

                          {/* Product */}
                          <td>
                            <strong>
                              {
                                stock
                                  .productId
                                  ?.name ||
                                "-"
                              }
                            </strong>
                          </td>

                          {/* Location */}
                          <td>
                            {
                              stock
                                .locationId
                                ?.name ||
                              "-"
                            }
                          </td>

                          {/* Values */}
                          <td>
                            {Object.entries(
                              stock.values ||
                                {}
                            ).map(
                              (
                                [
                                  key,
                                  value,
                                ]
                              ) => (
                                <div
                                  key={key}
                                >
                                  <strong>
                                    {key}:
                                  </strong>{" "}
                                  {String(
                                    value
                                  )}
                                </div>
                              )
                            )}
                          </td>

                          {/* Actions */}
                          <td>
                            <div className="action-buttons">

                              <button
                                type="button"
                                className="edit-btn"
                                onClick={() =>
                                  handleEdit(
                                    stock
                                  )
                                }
                                title="Edit"
                              >
                                <Pencil
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                className="delete-btn"
                                onClick={() =>
                                  openDeleteModal(
                                    stock
                                  )
                                }
                                title="Delete"
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>

                            </div>
                          </td>

                        </tr>
                      )
                    )

                  ) : (

                    <tr>
                      <td
                        colSpan="7"
                        className="empty-row"
                      >
                        No overall stock found
                      </td>
                    </tr>

                  )}

                </tbody>

              </table>

            </div>
          </div>

        </main>
      </div>

      {/* Delete Modal */}
      {deleteModal.show && (
        <div
          className="delete-modal-overlay"
          onClick={() =>
            !loading &&
            setDeleteModal({
              show: false,
              id: null,
              name: "",
            })
          }
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
                Delete Overall Stock?
              </h3>

              <p>
                Are you sure you want to
                delete{" "}
                <strong>
                  {deleteModal.name}
                </strong>
                ?
              </p>

              <span>
                This action cannot be
                undone.
              </span>

            </div>

            <div className="delete-modal-actions">

              <button
                type="button"
                className="delete-cancel-btn"
                onClick={() =>
                  !loading &&
                  setDeleteModal({
                    show: false,
                    id: null,
                    name: "",
                  })
                }
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

export default FinishedMaterialsoverallstock;