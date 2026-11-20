import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Package,
  Hammer,
  Droplets,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import api from "../../api/axios";

import "./OpeningStock.css";

const TYPE_TO_TAB = {
  item: "items",
  nail: "nails",
  consumable: "consumables",
};

const TAB_TO_TYPE = {
  items: "item",
  nails: "nail",
  consumables: "consumable",
};

const CFT_TO_CUBIC_METER = 0.0283168;
const CUBIC_METER_TO_CFT = 35.3147;

/*
 * Empty states for the piece modals
 */

const EMPTY_PIECE_MODAL = {
  show: false,
  openingStockId: null,
  pieceId: null,
  itemName: "",
  width: "",
  height: "",
  inch: "",
  count: "",
};

const EMPTY_PIECE_DELETE = {
  show: false,
  openingStockId: null,
  pieceId: null,
  label: "",
};

/*
 * Inline styles for the nested pieces table
 */

const pieceThStyle = {
  padding: "5px",
  borderBottom: "1px solid #ddd",
  textAlign: "left",
};

const pieceTdStyle = {
  padding: "5px",
  borderBottom: "1px solid #eee",
};

// Piece dimensions are stored in inches.
// CFT = (Width × Height × Inch × Count) / 1728.
const calculatePieceCft = (piece) => {
  const width = Number(piece?.width) || 0;
  const height = Number(piece?.height) || 0;
  const inch = Number(piece?.inch) || 0;
  const count = Number(piece?.count) || 0;

  return (width * height * inch * count) / 1728;
};

const calculatePieceCubicMeter = (piece) =>
  calculatePieceCft(piece) * CFT_TO_CUBIC_METER;

const calculatePiecesTotal = (pieces = []) => {
  return pieces.reduce(
    (total, piece) => {
      const cft = calculatePieceCft(piece);

      return {
        cft: total.cft + cft,
        cubicMeter:
          total.cubicMeter +
          cft * CFT_TO_CUBIC_METER,
      };
    },
    { cft: 0, cubicMeter: 0 }
  );
};

const OpeningStock = () => {
  const [activeTab, setActiveTab] = useState("items");

  // Items sub-tab
  const [itemSubTab, setItemSubTab] = useState("newitem");

  const [location, setLocation] = useState("");
  const [locations, setLocations] = useState([]);

  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    category: "",
    name: "",
    quantity: "",
    unit: "kg",
    cft: "",
    cubicMeter: "",
  });

  const [editingId, setEditingId] = useState(null);

  const [dropdownData, setDropdownData] = useState({
    itemCategories: [],
    items: [],
    nails: [],
    consumables: [],
  });

  const [stockData, setStockData] = useState({
    items: [],
    nails: [],
    consumables: [],
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

  // Piece edit / delete
  const [pieceModal, setPieceModal] = useState(EMPTY_PIECE_MODAL);
  const [pieceDeleteModal, setPieceDeleteModal] =
    useState(EMPTY_PIECE_DELETE);
  const [pieceSaving, setPieceSaving] = useState(false);

  const tabs = [
    {
      id: "items",
      label: "Items",
      icon: <Package size={18} />,
    },
    {
      id: "nails",
      label: "Nails",
      icon: <Hammer size={18} />,
    },
    {
      id: "consumables",
      label: "Consumables",
      icon: <Droplets size={18} />,
    },
  ];

  const getList = (response) => {
    const payload = response?.data;

    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.results)) return payload.results;

    return [];
  };

  const getOptionId = (item) =>
    item?._id || item?.id;

  const getOptionName = (item) =>
    item?.name ||
    item?.itemName ||
    item?.nailName ||
    item?.consumableName ||
    item?.item?.name ||
    "";

  const getId = (value) => {
    if (!value) return "";

    if (typeof value === "object") {
      return value?._id || value?.id || "";
    }

    return value;
  };

  const getPieceId = (piece) =>
    piece?._id || piece?.id;

  const getDisplayName = (id, list = []) => {
    const found = list.find(
      (item) =>
        String(getOptionId(item)) === String(id)
    );

    return found
      ? getOptionName(found)
      : id || "";
  };

  const buildStockData = (
    records,
    locationList = locations,
    masterData = dropdownData
  ) => {
    const result = {
      items: [],
      nails: [],
      consumables: [],
    };

    records.forEach((record) => {
      const recordLocationId =
        getId(record.location);

      if (
        location &&
        recordLocationId &&
        String(recordLocationId) !== String(location)
      ) {
        return;
      }

      const tab =
        TYPE_TO_TAB[record.type] || record.type;

      if (!result[tab]) return;

      const referenceId =
        getId(record.referenceId);

      const categoryId =
        getId(record.category);

      const categoryList =
        masterData.itemCategories;

      const nameList =
        tab === "items"
          ? masterData.items
          : tab === "nails"
          ? masterData.nails
          : masterData.consumables;

      result[tab].push({
        id: record._id || record.id,
        apiId: record._id || record.id,

        categoryId,
        referenceId,

        category: getDisplayName(
          categoryId,
          categoryList
        ),

        name: getDisplayName(
          referenceId,
          nameList
        ),

        quantity: record.quantity,
        currentStock: record.currentStock,

        unit: record.unit || "kg",

        cft: record.cft,
        cubicMeter: record.cubicMeter,

        pieces: record.pieces || [],

        createdAt: record.createdAt,
      });
    });

    return result;
  };

  const refreshOpeningStocks = async () => {
    try {
      const response =
        await api.get("/opening-stock");

      setStockData(
        buildStockData(getList(response))
      );
    } catch (error) {
      console.error(
        "Get opening stock error:",
        error
      );

      showToast(
        "error",
        "Data Load Failed",
        error.response?.data?.message ||
          "Failed to load opening stock data."
      );
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [
          locationsResponse,
          itemCategoriesResponse,
          itemsResponse,
          nailsResponse,
          consumablesResponse,
          openingStockResponse,
        ] = await Promise.all([
          api.get("/locations"),
          api.get("/item-categories"),
          api.get("/items"),
          api.get("/nails"),
          api.get("/consumables"),
          api.get("/opening-stock"),
        ]);

        const locationList =
          getList(locationsResponse);

        const masterData = {
          itemCategories:
            getList(itemCategoriesResponse),

          items: getList(itemsResponse),

          nails: getList(nailsResponse),

          consumables:
            getList(consumablesResponse),
        };

        setLocations(locationList);

        setDropdownData(masterData);

        setStockData(
          buildStockData(
            getList(openingStockResponse),
            locationList,
            masterData
          )
        );

        if (locationList.length > 0) {
          setLocation((current) =>
            current ||
            getOptionId(locationList[0])
          );
        }
      } catch (error) {
        console.error(
          "Opening Stock API error:",
          error
        );

        showToast(
          "error",
          "Data Load Failed",
          error.response?.data?.message ||
            "Failed to load opening stock data."
        );
      }
    };

    loadInitialData();
  }, []);

  const showToast = (
    type,
    title,
    message
  ) => {
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

  const getActiveData = () =>
    stockData[activeTab] || [];

  const getActiveLabel = () =>
    tabs.find(
      (tab) => tab.id === activeTab
    )?.label || "Opening Stock";

  const hasCategory =
    activeTab === "items";

  const getCategoryLabel = () =>
    "Category";

  const getNameLabel = () => {
    switch (activeTab) {
      case "items":
        return "Item Name";

      case "nails":
        return "Nail Name";

      case "consumables":
        return "Consumable Name";

      default:
        return "Name";
    }
  };

  /*
   * ==========================================
   * SELECTED ITEM CATEGORY
   * ==========================================
   */

  const selectedCategory =
    dropdownData.itemCategories.find(
      (category) =>
        String(getOptionId(category)) ===
        String(formData.category)
    );

  const selectedCategoryName =
    getOptionName(selectedCategory)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

  const isUsedItem =
    activeTab === "items" &&
    selectedCategoryName === "useditem";

  const isNewItem =
    activeTab === "items" &&
    selectedCategoryName === "newitem";

  const selectedLocationName =
    getOptionName(
      locations.find(
        (item) =>
          String(getOptionId(item)) ===
          String(location)
      )
    ) || "this location";

  /*
   * ==========================================
   * FORM CHANGE
   * ==========================================
   */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  /*
   * ==========================================
   * CFT -> CUBIC METER
   * ==========================================
   */

  const handleCftChange = (event) => {
    const value = event.target.value;

    setFormData((current) => ({
      ...current,

      cft: value,

      cubicMeter:
        value === ""
          ? ""
          : (
              Number(value) *
              CFT_TO_CUBIC_METER
            ).toFixed(6),
    }));
  };

  /*
   * ==========================================
   * CUBIC METER -> CFT
   * ==========================================
   */

  const handleCubicMeterChange = (event) => {
    const value = event.target.value;

    setFormData((current) => ({
      ...current,

      cubicMeter: value,

      cft:
        value === ""
          ? ""
          : (
              Number(value) *
              CUBIC_METER_TO_CFT
            ).toFixed(4),
    }));
  };

  /*
   * ==========================================
   * RESET FORM
   * ==========================================
   */

  const resetForm = () => {
    setFormData({
      category: "",
      name: "",
      quantity: "",
      unit: "kg",
      cft: "",
      cubicMeter: "",
    });

    setEditingId(null);
  };

  const handleAddOpeningStock = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (stock) => {
    setFormData({
      category: stock.categoryId || "",
      name: stock.referenceId || "",

      quantity:
        stock.quantity !== undefined &&
        stock.quantity !== null
          ? String(stock.quantity)
          : "",

      unit: stock.unit || "kg",

      cft:
        stock.cft !== undefined &&
        stock.cft !== null
          ? String(stock.cft)
          : "",

      cubicMeter:
        stock.cubicMeter !== undefined &&
        stock.cubicMeter !== null
          ? String(stock.cubicMeter)
          : "",
    });

    setEditingId(
      stock.apiId || stock.id
    );

    setShowForm(true);
  };

  /*
   * ==========================================
   * SUBMIT
   * ==========================================
   */

  const handleSubmit = async (event) => {
    event.preventDefault();

    const category =
      formData.category.trim();

    const name =
      formData.name.trim();

    if (!location) {
      showToast(
        "error",
        "Location Required",
        "Please select a location."
      );

      return;
    }

    if (
      activeTab === "items" &&
      !category
    ) {
      showToast(
        "error",
        "Category Required",
        "Please select a category."
      );

      return;
    }

    if (!name) {
      showToast(
        "error",
        `${getNameLabel()} Required`,
        `Please select ${getNameLabel().toLowerCase()}.`
      );

      return;
    }

    /*
     * Used Item validation
     */

    if (isUsedItem) {
      const quantity =
        String(formData.quantity).trim();

      const quantityNumber =
        Number(formData.quantity);

      if (
        quantity === "" ||
        Number.isNaN(quantityNumber) ||
        quantityNumber < 0
      ) {
        showToast(
          "error",
          "Opening Stock Required",
          "Please enter a valid opening stock quantity."
        );

        return;
      }

      if (!formData.unit) {
        showToast(
          "error",
          "Unit Required",
          "Please select a unit."
        );

        return;
      }
    }

    /*
     * New Item validation
     */

    if (isNewItem) {
      const cft =
        String(formData.cft).trim();

      const cubicMeter =
        String(formData.cubicMeter).trim();

      if (
        cft === "" &&
        cubicMeter === ""
      ) {
        showToast(
          "error",
          "Measurement Required",
          "Please enter CFT or Cubic Meter."
        );

        return;
      }
    }

    const type =
      TAB_TO_TYPE[activeTab];

    const payload = {
      location,
      type,
      referenceId: name,
    };

    /*
     * Item
     */

    if (activeTab === "items") {
      payload.category = category;

      /*
       * Used Item
       */

      if (isUsedItem) {
        payload.quantity =
          Number(formData.quantity);

        payload.unit =
          formData.unit;
      }

      /*
       * New Item
       */

      if (isNewItem) {
        payload.cft =
          formData.cft === ""
            ? undefined
            : Number(formData.cft);

        payload.cubicMeter =
          formData.cubicMeter === ""
            ? undefined
            : Number(
                formData.cubicMeter
              );
      }
    }

    /*
     * ==========================================
     * NAILS / CONSUMABLES
     *
     * NO CHANGE
     * ==========================================
     */

    if (
      activeTab === "nails" ||
      activeTab === "consumables"
    ) {
      payload.quantity =
        Number(formData.quantity);

      payload.unit =
        formData.unit;
    }

    console.log(
      "Opening Stock Payload:",
      payload
    );

    try {
      if (editingId) {
        await api.patch(
          `/opening-stock/${editingId}`,
          payload
        );

        showToast(
          "success",
          "Opening Stock Updated",
          "Opening stock updated successfully."
        );
      } else {
        await api.post(
          "/opening-stock",
          payload
        );

        showToast(
          "success",
          "Opening Stock Created",
          "Opening stock added successfully."
        );
      }

      await refreshOpeningStocks();

      resetForm();

      setShowForm(false);
    } catch (error) {
      console.error(
        "Save opening stock error:",
        error
      );

      showToast(
        "error",
        editingId
          ? "Update Failed"
          : "Create Failed",
        error.response?.data?.message ||
          "Failed to save opening stock."
      );
    }
  };

  /*
   * ==========================================
   * DELETE  (MAIN OPENING STOCK)
   * DELETE /opening-stock/:id
   * ==========================================
   */

  const handleDelete = (stock) => {
    setDeleteModal({
      show: true,
      id: stock.apiId || stock.id,
      name: stock.name,
    });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(
        `/opening-stock/${deleteModal.id}`
      );

      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "success",
        "Opening Stock Deleted",
        "Opening stock deleted successfully."
      );

      await refreshOpeningStocks();
    } catch (error) {
      console.error(
        "Delete opening stock error:",
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
          "Failed to delete opening stock."
      );
    }
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      show: false,
      id: null,
      name: "",
    });
  };

  /*
   * ==========================================
   * PIECE EDIT
   * PATCH /opening-stock/:openingStockId/pieces/:pieceId
   * ==========================================
   */

  const handleEditPiece = (stock, piece) => {
    if (!getPieceId(piece)) {
      showToast(
        "error",
        "Piece Not Found",
        "This piece has no ID, please refresh and try again."
      );

      return;
    }

    setPieceModal({
      show: true,
      openingStockId: stock.apiId || stock.id,
      pieceId: getPieceId(piece),
      itemName: stock.name,
      width: String(piece.width ?? ""),
      height: String(piece.height ?? ""),
      inch: String(piece.inch ?? ""),
      count: String(piece.count ?? ""),
    });
  };

  const handlePieceFieldChange = (event) => {
    const { name, value } = event.target;

    setPieceModal((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const closePieceModal = () => {
    setPieceModal(EMPTY_PIECE_MODAL);
  };

  const submitPieceEdit = async (event) => {
    event.preventDefault();

    // Only Count is editable in the Pieces section.
    const fields = [["count", "Count"]];

    for (const [key, label] of fields) {
      const value = String(pieceModal[key]).trim();

      if (
        value === "" ||
        Number.isNaN(Number(value)) ||
        Number(value) < 0
      ) {
        showToast(
          "error",
          `${label} Required`,
          `Please enter a valid ${label.toLowerCase()}.`
        );

        return;
      }
    }

    // Do not update dimensions from this screen.
    const payload = {
      count: Number(pieceModal.count),
    };

    try {
      setPieceSaving(true);

      await api.patch(
        `/opening-stock/${pieceModal.openingStockId}/pieces/${pieceModal.pieceId}`,
        payload
      );

      showToast(
        "success",
        "Piece Updated",
        "Piece updated successfully."
      );

      closePieceModal();

      await refreshOpeningStocks();
    } catch (error) {
      console.error(
        "Update piece error:",
        error
      );

      showToast(
        "error",
        "Update Failed",
        error.response?.data?.message ||
          "Failed to update piece."
      );
    } finally {
      setPieceSaving(false);
    }
  };

  /*
   * ==========================================
   * PIECE DELETE
   * DELETE /opening-stock/:openingStockId/pieces/:pieceId
   * ==========================================
   */

  const handleDeletePiece = (stock, piece) => {
    if (!getPieceId(piece)) {
      showToast(
        "error",
        "Piece Not Found",
        "This piece has no ID, please refresh and try again."
      );

      return;
    }

    setPieceDeleteModal({
      show: true,
      openingStockId: stock.apiId || stock.id,
      pieceId: getPieceId(piece),
      label: `${piece.width} × ${piece.height} × ${piece.inch}`,
    });
  };

  const closePieceDeleteModal = () => {
    setPieceDeleteModal(EMPTY_PIECE_DELETE);
  };

  const confirmPieceDelete = async () => {
    try {
      await api.delete(
        `/opening-stock/${pieceDeleteModal.openingStockId}/pieces/${pieceDeleteModal.pieceId}`
      );

      closePieceDeleteModal();

      showToast(
        "success",
        "Piece Deleted",
        "Piece deleted successfully."
      );

      await refreshOpeningStocks();
    } catch (error) {
      console.error(
        "Delete piece error:",
        error
      );

      closePieceDeleteModal();

      showToast(
        "error",
        "Delete Failed",
        error.response?.data?.message ||
          "Failed to delete piece."
      );
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    resetForm();
  };

  /*
   * ==========================================
   * MAIN TAB CHANGE
   * ==========================================
   */

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setShowForm(false);
    resetForm();
  };

  /*
   * ==========================================
   * ITEM SUB TAB CHANGE
   * ==========================================
   */

  const handleItemSubTabChange = (
    subTab
  ) => {
    setItemSubTab(subTab);
    setShowForm(false);
    resetForm();
  };

  useEffect(() => {
    if (location) {
      refreshOpeningStocks();
    }
  }, [location]);

  const categoryOptions =
    dropdownData.itemCategories;

  const nameOptions =
    activeTab === "items"
      ? dropdownData.items
      : activeTab === "nails"
      ? dropdownData.nails
      : dropdownData.consumables;

  /*
   * ==========================================
   * FILTER ITEM DATA
   * ==========================================
   */

  const itemData =
    stockData.items || [];

  const filteredItemData =
    itemData.filter((stock) => {
      const categoryName =
        String(stock.category || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "");

      if (itemSubTab === "newitem") {
        return categoryName === "newitem";
      }

      if (itemSubTab === "useditem") {
        return categoryName === "useditem";
      }

      return true;
    });

  /*
   * ==========================================
   * ACTIVE TABLE DATA
   * ==========================================
   */

  const tableData =
    activeTab === "items"
      ? filteredItemData
      : getActiveData();

  return (
    <div className="opening-stock-layout">

      {/* =====================================
          TOAST
      ===================================== */}

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
            onClick={closeToast}
            aria-label="Close notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* =====================================
          DELETE MODAL  (MAIN OPENING STOCK)
      ===================================== */}

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
                Delete Opening Stock?
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
                onClick={confirmDelete}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================
          DELETE MODAL  (PIECE)
      ===================================== */}

      {pieceDeleteModal.show && (
        <div
          className="delete-modal-overlay"
          onClick={closePieceDeleteModal}
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
              <h3>Delete Piece?</h3>

              <p>
                Are you sure you want to
                delete piece{" "}
                <strong>
                  {pieceDeleteModal.label}
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
                onClick={
                  closePieceDeleteModal
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-btn"
                onClick={confirmPieceDelete}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================
          EDIT MODAL  (PIECE)
      ===================================== */}

      {pieceModal.show && (
        <div
          className="delete-modal-overlay"
          onClick={closePieceModal}
        >
          <div
            className="piece-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="piece-modal-header">
              <div>
                <h3>Edit Piece</h3>

                <p>
                  Update piece for{" "}
                  {pieceModal.itemName}.
                </p>
              </div>

              <button
                type="button"
                className="close-form-btn"
                onClick={closePieceModal}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitPieceEdit}>
              <div className="piece-modal-grid">
                <div className="form-group">
                  <label htmlFor="piece-width">
                    Width <span>*</span>
                  </label>

                  <input
                    id="piece-width"
                    type="number"
                    min="0"
                    step="any"
                    name="width"
                    value={pieceModal.width}
                    readOnly
                    aria-readonly="true"
                    placeholder="Enter width"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="piece-height">
                    Height <span>*</span>
                  </label>

                  <input
                    id="piece-height"
                    type="number"
                    min="0"
                    step="any"
                    name="height"
                    value={pieceModal.height}
                    readOnly
                    aria-readonly="true"
                    placeholder="Enter height"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="piece-inch">
                    Inch <span>*</span>
                  </label>

                  <input
                    id="piece-inch"
                    type="number"
                    min="0"
                    step="any"
                    name="inch"
                    value={pieceModal.inch}
                    readOnly
                    aria-readonly="true"
                    placeholder="Enter inch"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="piece-count">
                    Count <span>*</span>
                  </label>

                  <input
                    id="piece-count"
                    type="number"
                    min="0"
                    step="any"
                    name="count"
                    value={pieceModal.count}
                    onChange={
                      handlePieceFieldChange
                    }
                    placeholder="Enter count"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closePieceModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-opening-stock-btn"
                  disabled={pieceSaving}
                >
                  Update Piece
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Sidebar />

      <div className="opening-stock-main">
        <Header />

        <main className="opening-stock-content">

          {/* =====================================
              PAGE HEADER
          ===================================== */}

          <div className="opening-stock-page-header">
            <div>
              <h1>
                Opening Stock
              </h1>

              <p>
                Manage opening stock for each
                location.
              </p>
            </div>

            <button
              type="button"
              className="add-opening-stock-btn"
              onClick={
                handleAddOpeningStock
              }
            >
              <Plus size={18} />
              Add Opening Stock
            </button>
          </div>

          {/* =====================================
              LOCATION
          ===================================== */}

          <div className="opening-stock-location">
            <label htmlFor="location">
              Location
            </label>

            <select
              id="location"
              value={location}
              onChange={(event) =>
                setLocation(
                  event.target.value
                )
              }
            >
              {locations.map((item) => (
                <option
                  key={getOptionId(item)}
                  value={getOptionId(item)}
                >
                  {getOptionName(item)}
                </option>
              ))}
            </select>
          </div>

          {/* =====================================
              MAIN TABS
          ===================================== */}

          <div className="opening-stock-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`opening-stock-tab ${
                  activeTab === tab.id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleTabChange(tab.id)
                }
              >
                {tab.icon}

                <span>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>

          {/* =====================================
              ITEMS SUB TABS
              ONLY FOR ITEMS
          ===================================== */}

          {activeTab === "items" && (
            <div
              className="opening-stock-item-sub-tabs"
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "12px",
                marginBottom: "18px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  handleItemSubTabChange(
                    "newitem"
                  )
                }
                style={{
                  padding: "9px 18px",
                  borderRadius: "7px",
                  border:
                    itemSubTab === "newitem"
                      ? "1px solid #222"
                      : "1px solid #ddd",
                  background:
                    itemSubTab === "newitem"
                      ? "#222"
                      : "#fff",
                  color:
                    itemSubTab === "newitem"
                      ? "#fff"
                      : "#333",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                New Item
              </button>

              <button
                type="button"
                onClick={() =>
                  handleItemSubTabChange(
                    "useditem"
                  )
                }
                style={{
                  padding: "9px 18px",
                  borderRadius: "7px",
                  border:
                    itemSubTab === "useditem"
                      ? "1px solid #222"
                      : "1px solid #ddd",
                  background:
                    itemSubTab === "useditem"
                      ? "#222"
                      : "#fff",
                  color:
                    itemSubTab === "useditem"
                      ? "#fff"
                      : "#333",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Used Item
              </button>
            </div>
          )}

          {/* =====================================
              FORM
          ===================================== */}

          {showForm && (
            <section className="opening-stock-form-card">
              <div className="form-header">
                <div>
                  <h2>
                    {editingId
                      ? `Edit ${getActiveLabel()}`
                      : `Add ${getActiveLabel()}`}
                  </h2>

                  <p>
                    {editingId
                      ? `Update opening stock for ${selectedLocationName}.`
                      : `Create opening stock for ${selectedLocationName}.`}
                  </p>
                </div>

                <button
                  type="button"
                  className="close-form-btn"
                  onClick={
                    handleCloseForm
                  }
                  aria-label="Close form"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
              >
                <div className="form-grid">

                  {/* CATEGORY */}

                  {hasCategory && (
                    <div className="form-group">
                      <label htmlFor="stock-category">
                        Category{" "}
                        <span>*</span>
                      </label>

                      <select
                        id="stock-category"
                        name="category"
                        value={
                          formData.category
                        }
                        onChange={
                          handleChange
                        }
                      >
                        <option value="">
                          Select Category
                        </option>

                        {categoryOptions.map(
                          (category) => (
                            <option
                              key={getOptionId(
                                category
                              )}
                              value={getOptionId(
                                category
                              )}
                            >
                              {getOptionName(
                                category
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  )}

                  {/* ITEM / NAIL / CONSUMABLE */}

                  <div className="form-group">
                    <label htmlFor="stock-name">
                      {getNameLabel()}{" "}
                      <span>*</span>
                    </label>

                    <select
                      id="stock-name"
                      name="name"
                      value={formData.name}
                      onChange={
                        handleChange
                      }
                    >
                      <option value="">
                        Select{" "}
                        {getNameLabel()}
                      </option>

                      {nameOptions.map(
                        (item) => (
                          <option
                            key={getOptionId(
                              item
                            )}
                            value={getOptionId(
                              item
                            )}
                          >
                            {getOptionName(
                              item
                            )}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* USED ITEM */}

                  {isUsedItem && (
                    <>
                      <div className="form-group">
                        <label htmlFor="stock-quantity">
                          Opening Stock{" "}
                          <span>*</span>
                        </label>

                        <input
                          id="stock-quantity"
                          type="number"
                          min="0"
                          name="quantity"
                          value={
                            formData.quantity
                          }
                          onChange={
                            handleChange
                          }
                          placeholder="Enter opening stock"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="stock-unit">
                          Unit{" "}
                          <span>*</span>
                        </label>

                        <select
                          id="stock-unit"
                          name="unit"
                          value={
                            formData.unit
                          }
                          onChange={
                            handleChange
                          }
                        >
                          <option value="kg">
                            Kilogram (kg)
                          </option>

                          <option value="g">
                            Gram (g)
                          </option>

                          <option value="pcs">
                            Pieces (pcs)
                          </option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* NEW ITEM */}

                  {isNewItem && (
                    <>
                      <div className="form-group">
                        <label htmlFor="stock-cft">
                          CFT{" "}
                          <span>*</span>
                        </label>

                        <input
                          id="stock-cft"
                          type="number"
                          min="0"
                          step="any"
                          name="cft"
                          value={
                            formData.cft
                          }
                          onChange={
                            handleCftChange
                          }
                          placeholder="Enter CFT"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="stock-cubic-meter">
                          Cubic Meter{" "}
                          <span>*</span>
                        </label>

                        <input
                          id="stock-cubic-meter"
                          type="number"
                          min="0"
                          step="any"
                          name="cubicMeter"
                          value={
                            formData.cubicMeter
                          }
                          onChange={
                            handleCubicMeterChange
                          }
                          placeholder="Enter cubic meter"
                        />
                      </div>
                    </>
                  )}

                  {/* NAIL / CONSUMABLE
                      NO CHANGE */}

                  {(activeTab === "nails" ||
                    activeTab ===
                      "consumables") && (
                    <>
                      <div className="form-group">
                        <label htmlFor="stock-quantity">
                          Opening Stock{" "}
                          <span>*</span>
                        </label>

                        <input
                          id="stock-quantity"
                          type="number"
                          min="0"
                          name="quantity"
                          value={
                            formData.quantity
                          }
                          onChange={
                            handleChange
                          }
                          placeholder="Enter opening stock"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="stock-unit">
                          Unit{" "}
                          <span>*</span>
                        </label>

                        <select
                          id="stock-unit"
                          name="unit"
                          value={
                            formData.unit
                          }
                          onChange={
                            handleChange
                          }
                        >
                          <option value="kg">
                            Kilogram (kg)
                          </option>

                          <option value="g">
                            Gram (g)
                          </option>

                          <option value="pcs">
                            Pieces (pcs)
                          </option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={
                      handleCloseForm
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-opening-stock-btn"
                  >
                    {editingId
                      ? "Update Opening Stock"
                      : "Save Opening Stock"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* =====================================
              STOCK TABLE
          ===================================== */}

          <section className="opening-stock-table-card">
            <div className="table-section-header">
              <div>
                <h2>
                  {activeTab === "items"
                    ? itemSubTab ===
                      "newitem"
                      ? "New Items"
                      : "Used Items"
                    : getActiveLabel()}
                </h2>

                <p>
                  {tableData.length}{" "}
                  {tableData.length === 1
                    ? "item"
                    : "items"}{" "}
                  available in{" "}
                  {selectedLocationName}
                </p>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="opening-stock-table">

                {/* =================================
                    TABLE HEADER
                ================================= */}

                <thead>
                  <tr>
                    <th>S.No</th>

                    {activeTab === "items" && (
                      <th>Category</th>
                    )}

                    <th>
                      {getNameLabel()}
                    </th>

                    {/* NEW ITEM COLUMNS */}

                    {activeTab === "items" &&
                      itemSubTab ===
                        "newitem" && (
                        <>
                          <th>CFT</th>
                          <th>
                            Cubic Meter
                          </th>
                          <th>Pieces</th>
                        </>
                      )}

                    {/* USED ITEM / NAIL /
                        CONSUMABLE */}

                    {!(
                      activeTab === "items" &&
                      itemSubTab ===
                        "newitem"
                    ) && (
                      <>
                        <th>Opening Stock</th>
                        <th>Current Stock</th>
                      </>
                    )}

                    <th>Created At</th>

                    <th>Actions</th>
                  </tr>
                </thead>

                {/* =================================
                    TABLE BODY
                ================================= */}

                <tbody>
                  {tableData.length > 0 ? (
                    tableData.map(
                      (stock, index) => (
                        <tr
                          key={
                            stock.apiId ||
                            stock.id
                          }
                        >
                          <td>
                            {index + 1}
                          </td>

                          {/* CATEGORY */}

                          {activeTab ===
                            "items" && (
                            <td>
                              <span className="stock-category">
                                {
                                  stock.category
                                }
                              </span>
                            </td>
                          )}

                          {/* NAME */}

                          <td className="stock-name">
                            {stock.name}
                          </td>

                          {/* =====================
                              NEW ITEM
                              ===================== */}

                          {activeTab ===
                            "items" &&
                            itemSubTab ===
                              "newitem" && (
                              <>
                                <td>
                                  {stock.pieces?.length
                                    ? calculatePiecesTotal(
                                        stock.pieces
                                      ).cft.toFixed(4)
                                    : "0.0000"}
                                </td>

                                <td>
                                  {stock.pieces?.length
                                    ? calculatePiecesTotal(
                                        stock.pieces
                                      ).cubicMeter.toFixed(6)
                                    : "0.000000"}
                                </td>

                                {/* PIECES */}

                                <td
                                  style={{
                                    minWidth:
                                      "360px",
                                  }}
                                >
                                  {stock.pieces &&
                                  stock.pieces
                                    .length >
                                    0 ? (
                                    <div
                                      style={{
                                        display:
                                          "flex",
                                        flexDirection:
                                          "column",
                                        gap: "6px",
                                      }}
                                    >
                                      <table
                                        style={{
                                          width:
                                            "100%",
                                          borderCollapse:
                                            "collapse",
                                          fontSize:
                                            "12px",
                                        }}
                                      >
                                        <thead>
                                          <tr>
                                            <th style={pieceThStyle}>
                                              Width
                                            </th>

                                            <th style={pieceThStyle}>
                                              Height
                                            </th>

                                            <th style={pieceThStyle}>
                                              Inch
                                            </th>

                                            <th style={pieceThStyle}>
                                              Count
                                            </th>

                                            <th style={pieceThStyle}>
                                              CFT
                                            </th>

                                            <th style={pieceThStyle}>
                                              Cubic Meter
                                            </th>

                                            <th style={pieceThStyle}>
                                              Actions
                                            </th>
                                          </tr>
                                        </thead>

                                        <tbody>
                                          {stock.pieces.map(
                                            (
                                              piece,
                                              pieceIndex
                                            ) => (
                                              <tr
                                                key={
                                                  getPieceId(piece) ||
                                                  pieceIndex
                                                }
                                              >
                                                <td style={pieceTdStyle}>
                                                  {
                                                    piece.width
                                                  }
                                                </td>

                                                <td style={pieceTdStyle}>
                                                  {
                                                    piece.height
                                                  }
                                                </td>

                                                <td style={pieceTdStyle}>
                                                  {
                                                    piece.inch
                                                  }
                                                </td>

                                                <td
                                                  style={{
                                                    ...pieceTdStyle,
                                                    fontWeight: 600,
                                                  }}
                                                >
                                                  {
                                                    piece.count
                                                  }
                                                </td>

                                                <td style={pieceTdStyle}>
                                                  {calculatePieceCft(
                                                    piece
                                                  ).toFixed(4)}
                                                </td>

                                                <td style={pieceTdStyle}>
                                                  {calculatePieceCubicMeter(
                                                    piece
                                                  ).toFixed(6)}
                                                </td>

                                                {/* PIECE ACTIONS */}

                                                <td style={pieceTdStyle}>
                                                  <div className="piece-actions">
                                                    <button
                                                      type="button"
                                                      className="piece-edit-btn"
                                                      onClick={() =>
                                                        handleEditPiece(
                                                          stock,
                                                          piece
                                                        )
                                                      }
                                                      aria-label="Edit piece"
                                                      title="Edit piece"
                                                    >
                                                      <Pencil
                                                        size={14}
                                                      />
                                                    </button>

                                                    <button
                                                      type="button"
                                                      className="piece-delete-btn"
                                                      onClick={() =>
                                                        handleDeletePiece(
                                                          stock,
                                                          piece
                                                        )
                                                      }
                                                      aria-label="Delete piece"
                                                      title="Delete piece"
                                                    >
                                                      <Trash2
                                                        size={14}
                                                      />
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            )
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              </>
                            )}

                          {/* =====================
                              USED ITEM
                              NAIL
                              CONSUMABLE
                              ===================== */}

                          {!(
                            activeTab ===
                              "items" &&
                            itemSubTab ===
                              "newitem"
                          ) && (
                            <>
                              <td className="stock-quantity">
                                {stock.quantity !==
                                undefined
                                  ? `${stock.quantity} ${
                                      stock.unit ||
                                      ""
                                    }`
                                  : "-"}
                              </td>

                              <td className="stock-quantity">
                                {stock.currentStock !==
                                  undefined &&
                                stock.currentStock !==
                                  null
                                  ? `${stock.currentStock} ${
                                      stock.unit ||
                                      ""
                                    }`
                                  : "-"}
                              </td>
                            </>
                          )}

                          {/* CREATED AT */}

                          <td>
                            {stock.createdAt
                              ? new Date(
                                  stock.createdAt
                                ).toLocaleString(
                                  "en-GB"
                                )
                              : "-"}
                          </td>

                          {/* ACTIONS  (MAIN OPENING STOCK) */}

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
                                aria-label={`Edit ${stock.name}`}
                              >
                                <Pencil
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                className="delete-btn"
                                onClick={() =>
                                  handleDelete(
                                    stock
                                  )
                                }
                                aria-label={`Delete ${stock.name}`}
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
                        colSpan={
                          activeTab ===
                          "items"
                            ? itemSubTab ===
                              "newitem"
                              ? 8
                              : 7
                            : 6
                        }
                        className="empty-state"
                      >
                        No opening stock
                        found.
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
};

export default OpeningStock;
