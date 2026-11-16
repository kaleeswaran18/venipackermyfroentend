import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Package,
  Plus,
  Trash2,
  User,
  Save,
  CreditCard,
  Pencil,
  X,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import api from "../../api/axios";

import "./CreateOrder.css";

// =========================================================
// MASTER APIs
// Finished Material (ex: Mahindra City)
//   -> its Products
//   -> its Fields (base, top, reaper ... )
// =========================================================

const MATERIAL_API = "/finished-materials";
const PRODUCT_API = "/finished-material-products";
const FIELD_API = "/category-fields";

const getList = (response) => {
  const payload = response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;

  return [];
};

// plain id or populated object -> id string
const idOf = (value) =>
  String(
    (value && typeof value === "object"
      ? value._id || value.id
      : value) ?? ""
  );

const getName = (record) =>
  record?.name ||
  record?.materialName ||
  record?.productName ||
  record?.fieldName ||
  record?.itemName ||
  record?.label ||
  record?.title ||
  "";

// every ObjectId a record points to (skips its own _id)
const collectIds = (record) => {
  const ids = new Set();

  Object.entries(record || {}).forEach(([key, value]) => {
    if (key === "_id" || key === "id") return;

    (Array.isArray(value) ? value : [value]).forEach((item) => {
      const id = idOf(item);

      if (/^[a-f0-9]{24}$/i.test(id)) ids.add(id);
    });
  });

  return ids;
};

// does this record point to any of the given ids?
const belongsTo = (record, ...parentIds) => {
  const ids = collectIds(record);

  return parentIds.some((id) => id && ids.has(String(id)));
};

// =========================================================
// INITIAL PRODUCT (blank row)
// =========================================================

const createInitialProduct = () => ({
  id: Date.now() + Math.random(),
  materialId: "",
  productId: "",
  productName: "",
  size: "",
  fieldValues: {}, // fieldId -> requestedQuantity
  amount: "",
});

// =========================================================
// INITIAL FORM
// =========================================================

const initialFormData = {
  customerName: "",
  companyId: "",
  companyName: "",
  phone: "",
  platform: "Direct",
  customerLocation: "",

  originalRequirement: "",
  additionalDetails: "",

  deliveryAddress: "",
  assignedLocation: "",

  startDate: "2026-10-01",
  endDate: "2026-10-15",

  remarks: "",

  taxPercentage: "",
};

// =========================================================
// DELIVERY STATUS TABS
// =========================================================

const DELIVERY_STATUS_TABS = [
  "All",
  "Pending",
  "Partially Delivered",
  "Delivered",
  "Cancelled",
];

// =========================================================
// DATE INPUT
// Click anywhere on the field (text or calendar icon)
// to open the native date picker.
// =========================================================

function DateInput({ name, value, onChange, min }) {
  const inputRef = useRef(null);

  const openPicker = () => {
    const input = inputRef.current;

    if (!input) return;

    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch (error) {
      // picker already open / not allowed -> fall back to focus
    }

    input.focus();
  };

  return (
    <div
      className="date-input"
      onClick={openPicker}
      style={{ cursor: "pointer" }}
    >
      <input
        ref={inputRef}
        type="date"
        name={name}
        value={value}
        min={min}
        onChange={onChange}
      />

      <CalendarDays size={17} style={{ pointerEvents: "none" }} />
    </div>
  );
}

// =========================================================
// CREATE ORDER
// =========================================================

function CreateOrder() {
  const location = useLocation();

  // ENQUIRIES
  const [enquiries, setEnquiries] = useState([]);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  // FORM
  const [formData, setFormData] = useState(initialFormData);

  // LOCATIONS (Location Master)
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // PRODUCTS (dynamic)
  const [materials, setMaterials] = useState([]);
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [categoryFields, setCategoryFields] = useState([]);
  const [productError, setProductError] = useState("");
  const [products, setProducts] = useState([createInitialProduct()]);

  // PAYMENTS
  const createEmptyPayment = () => ({
    _id: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentAmount: "",
    paymentMode: "Cash",
    referenceNumber: "",
    remarks: "",
  });

  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentModal, setPaymentModal] = useState({
    open: false,
    editingIndex: null,
    form: createEmptyPayment(),
  });

  // ORDERS TABLE
  const [orders, setOrders] = useState([]);
  const [activeDeliveryStatus, setActiveDeliveryStatus] = useState("All");
  const [loadingOrders, setLoadingOrders] = useState(false);

  // SUBMITTING
  const [isSubmitting, setIsSubmitting] = useState(false);

  // EDITING
  const [editingOrderId, setEditingOrderId] = useState(null);

  // TOAST
  const [toast, setToast] = useState({
    show: false,
    type: "",
    message: "",
  });

  const toastTimer = useRef(null);

  const getDeliveryStatus = (order) => order.deliveryStatus || "Pending";

  const filteredOrders =
    activeDeliveryStatus === "All"
      ? orders
      : orders.filter(
          (order) => getDeliveryStatus(order) === activeDeliveryStatus
        );

  const closeToast = () =>
    setToast({ show: false, type: "", message: "" });

  const showToast = (type, message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);

    setToast({ show: true, type, message });

    toastTimer.current = setTimeout(closeToast, 3500);
  };

  // DELETE CONFIRMATION (in-page dialog, no browser popup)
  const [deleteTarget, setDeleteTarget] = useState(null);

  // =======================================================
  // GET MASTER DATA (materials, products, fields)
  // =======================================================

  const getProductOptions = async () => {
    try {
      setProductError("");

      const [materialResponse, productResponse, fieldResponse] =
        await Promise.all([
          api.get(MATERIAL_API),
          api.get(PRODUCT_API),
          api.get(FIELD_API),
        ]);

      setMaterials(getList(materialResponse));
      setFinishedProducts(getList(productResponse));
      setCategoryFields(getList(fieldResponse));
    } catch (error) {
      console.error("Get product master error:", error);

      setProductError(
        error?.response?.data?.message ||
          "Failed to load finished materials / products / fields."
      );
    }
  };

  // =======================================================
  // GET LOCATIONS
  // =======================================================

  const getLocations = async () => {
    try {
      setLoadingLocations(true);

      const response = await api.get("/locations");

      setLocations(getList(response));
    } catch (error) {
      console.error("Get locations error:", error);

      showToast(
        "error",
        error?.response?.data?.message || "Failed to fetch locations."
      );
    } finally {
      setLoadingLocations(false);
    }
  };

  // =======================================================
  // GET ENQUIRIES
  // =======================================================

  const getEnquiries = async () => {
    try {
      const response = await api.get("/enquiries");

      const enquiryData = response.data.data || [];

      setEnquiries(enquiryData);

      // If an enquiry was selected from the Enquiry page,
      // apply that exact enquiry. Otherwise select the first enquiry.
      if (enquiryData.length > 0) {
        const enquiryIdFromState = location.state?.enquiryId;

        const enquiry = enquiryIdFromState
          ? enquiryData.find(
              (item) =>
                item._id === enquiryIdFromState ||
                item.id === enquiryIdFromState
            )
          : !selectedEnquiry
          ? enquiryData[0]
          : null;

        if (enquiry) {
          applyEnquiry(enquiry);
        }
      }
    } catch (error) {
      console.error("Get enquiries error:", error);
    }
  };

  // =======================================================
  // GET ORDERS
  // =======================================================

  const getOrders = async () => {
    try {
      setLoadingOrders(true);

      const response = await api.get("/orders");

      setOrders(response.data.data || []);
    } catch (error) {
      console.error("Get orders error:", error);

      showToast(
        "error",
        error?.response?.data?.message || "Failed to fetch orders."
      );
    } finally {
      setLoadingOrders(false);
    }
  };

  // INITIAL LOAD
  useEffect(() => {
    getProductOptions();
    getEnquiries();
    getOrders();
    getLocations();
  }, []);

  // =======================================================
  // APPLY ENQUIRY
  // =======================================================

  const applyEnquiry = (enquiry) => {
    if (!enquiry) return;

    setSelectedEnquiry(enquiry);

    setFormData((prev) => ({
      ...prev,
      customerName: enquiry.customerName || "",
      companyId: idOf(enquiry.companyId),
      // Prefer the populated Company Master name; keep the legacy
      // enquiry.companyName fallback for older enquiry records.
      companyName:
        enquiry.companyId?.companyName || enquiry.companyName || "",
      phone: enquiry.phone || "",
      platform: enquiry.platform || "Direct",
      customerLocation: enquiry.location || "",
      originalRequirement: enquiry.requirement || "",
      additionalDetails: enquiry.details || "",
    }));
  };

  const handleEnquiryChange = (e) => {
    const enquiryId = e.target.value;

    const enquiry = enquiries.find(
      (item) => item._id === enquiryId || item.id === enquiryId
    );

    if (!enquiry) return;

    applyEnquiry(enquiry);
  };

  // FORM CHANGE
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // PRODUCT CHANGE
  const handleProductChange = (id, field, value) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === id ? { ...product, [field]: value } : product
      )
    );
  };

  // =======================================================
  // MATERIAL -> PRODUCT -> FIELDS
  // =======================================================

  // products of the selected material, minus the ones already used
  // in another row (same material + same product is not allowed twice)
  const getRowProducts = (row) =>
    row.materialId
      ? finishedProducts.filter(
          (item) =>
            belongsTo(item, row.materialId) &&
            !products.some(
              (other) =>
                other.id !== row.id &&
                other.materialId === row.materialId &&
                other.productId === idOf(item)
            )
        )
      : [];

  // true when an earlier row already has the same material + product
  const isDuplicateProduct = (row, rowIndex) =>
    !!row.productId &&
    products.some(
      (other, otherIndex) =>
        otherIndex < rowIndex &&
        other.materialId === row.materialId &&
        other.productId === row.productId
    );

  // fields for the selected product
  // 1) fields linked to the product
  // 2) fields linked to the material
  // 3) fields linked to something the material/product points to
  const getRowFields = (row) => {
    if (!row.productId) return [];

    const byProduct = categoryFields.filter((field) =>
      belongsTo(field, row.productId)
    );

    if (byProduct.length > 0) return byProduct;

    const byMaterial = categoryFields.filter((field) =>
      belongsTo(field, row.materialId)
    );

    if (byMaterial.length > 0) return byMaterial;

    const material = materials.find(
      (item) => idOf(item) === row.materialId
    );

    const product = finishedProducts.find(
      (item) => idOf(item) === row.productId
    );

    const linkedIds = [...collectIds(material), ...collectIds(product)];

    return linkedIds.length > 0
      ? categoryFields.filter((field) => belongsTo(field, ...linkedIds))
      : [];
  };

  // size comes from the product master (ex: "30x20x10")
  const getRowSize = (row) => {
    const master = finishedProducts.find(
      (item) => idOf(item) === row.productId
    );

    return String(master?.size ?? row.size ?? "").trim();
  };

  const handleMaterialChange = (id, materialId) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === id
          ? {
              ...product,
              materialId,
              productId: "",
              productName: "",
              size: "",
              fieldValues: {},
            }
          : product
      )
    );
  };

  const handleProductSelect = (id, productId) => {
    if (productId === "__saved") return;

    const master = finishedProducts.find(
      (item) => idOf(item) === productId
    );

    setProducts((prev) =>
      prev.map((product) =>
        product.id === id
          ? {
              ...product,
              productId,
              productName: getName(master),
              size: "",
              fieldValues: {},
            }
          : product
      )
    );
  };

  const handleFieldChange = (id, fieldId, value) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === id
          ? {
              ...product,
              fieldValues: {
                ...product.fieldValues,
                [fieldId]: value,
              },
            }
          : product
      )
    );
  };

  // ADD PRODUCT
  const handleAddProduct = () => {
    setProducts((prev) => [...prev, createInitialProduct()]);
  };

  // DELETE PRODUCT
  const handleDeleteProduct = (id) => {
    if (products.length === 1) {
      showToast("error", "At least one product is required.");

      return;
    }

    setProducts((prev) => prev.filter((product) => product.id !== id));
  };

  // PRODUCT AMOUNT
  const getProductAmount = (product) => Number(product.amount || 0);

  // =======================================================
  // SUB TOTAL + TAX + TOTAL
  // =======================================================

  const subTotal = useMemo(() => {
    return products.reduce(
      (total, product) => total + getProductAmount(product),
      0
    );
  }, [products]);

  const taxAmount = useMemo(() => {
    const percentage = Number(formData.taxPercentage || 0);

    return Math.round(subTotal * percentage) / 100;
  }, [subTotal, formData.taxPercentage]);

  // grand total (payment validation uses this)
  const totalAmount = useMemo(
    () => Math.round((subTotal + taxAmount) * 100) / 100,
    [subTotal, taxAmount]
  );

  // FORMAT AMOUNT
  const formatAmount = (amount) => {
    return Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // =======================================================
  // PAYMENT HISTORY + PAYMENT SUMMARY
  // Payment history is the source of truth for paid amount.
  // =======================================================

  const alreadyPaidAmount = useMemo(() => {
    return Math.round(
      paymentHistory.reduce(
        (total, payment) => total + Number(payment.paymentAmount || 0),
        0
      ) * 100
    ) / 100;
  }, [paymentHistory]);

  const calculatedPendingAmount = useMemo(() => {
    const total = Number(totalAmount || 0);

    return Math.max(
      Math.round((total - alreadyPaidAmount) * 100) / 100,
      0
    );
  }, [totalAmount, alreadyPaidAmount]);

  const calculatedPaymentStatus = useMemo(() => {
    const total = Number(totalAmount || 0);

    if (alreadyPaidAmount <= 0) {
      return "Not Received";
    }

    if (total > 0 && alreadyPaidAmount >= total) {
      return "Fully Received";
    }

    return "Partially Received";
  }, [totalAmount, alreadyPaidAmount]);

  const paymentError = useMemo(() => {
    if (alreadyPaidAmount < 0) {
      return "Paid amount cannot be negative.";
    }

    if (alreadyPaidAmount > Number(totalAmount || 0)) {
      return "Total paid amount cannot be more than total amount.";
    }

    return "";
  }, [alreadyPaidAmount, totalAmount]);

  const openAddPayment = () => {
    setPaymentModal({
      open: true,
      editingIndex: null,
      form: createEmptyPayment(),
    });
  };

  const openEditPayment = (index) => {
    const payment = paymentHistory[index];

    if (!payment) return;

    setPaymentModal({
      open: true,
      editingIndex: index,
      form: {
        _id: payment._id || "",
        paymentDate: payment.paymentDate
          ? String(payment.paymentDate).slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        paymentAmount: payment.paymentAmount ?? "",
        paymentMode: payment.paymentMode || "Cash",
        referenceNumber: payment.referenceNumber || "",
        remarks: payment.remarks || "",
      },
    });
  };

  const closePaymentModal = () => {
    setPaymentModal({
      open: false,
      editingIndex: null,
      form: createEmptyPayment(),
    });
  };

  const handlePaymentModalChange = (e) => {
    const { name, value } = e.target;

    setPaymentModal((prev) => ({
      ...prev,
      form: {
        ...prev.form,
        [name]: value,
      },
    }));
  };

  const savePayment = () => {
    const form = paymentModal.form;
    const amount = Number(form.paymentAmount || 0);

    if (!form.paymentDate) {
      showToast("error", "Please select payment date.");
      return;
    }

    if (amount <= 0) {
      showToast("error", "Payment amount must be greater than 0.");
      return;
    }

    if (!form.paymentMode) {
      showToast("error", "Please select payment mode.");
      return;
    }

    const otherPaymentsTotal = paymentHistory.reduce(
      (total, payment, index) => {
        if (index === paymentModal.editingIndex) return total;

        return total + Number(payment.paymentAmount || 0);
      },
      0
    );

    const newTotalPaid =
      Math.round((otherPaymentsTotal + amount) * 100) / 100;

    if (newTotalPaid > Number(totalAmount || 0)) {
      const available = Math.max(
        Math.round((Number(totalAmount || 0) - otherPaymentsTotal) * 100) / 100,
        0
      );

      showToast(
        "error",
        `Payment cannot exceed the remaining amount of ₹${formatAmount(available)}.`
      );
      return;
    }

    const payment = {
      _id: form._id || undefined,
      paymentDate: form.paymentDate,
      paymentAmount: amount,
      paymentMode: form.paymentMode,
      referenceNumber: form.referenceNumber?.trim() || "",
      remarks: form.remarks?.trim() || "",
    };

    setPaymentHistory((prev) => {
      if (paymentModal.editingIndex === null) {
        return [...prev, payment];
      }

      return prev.map((item, index) =>
        index === paymentModal.editingIndex ? payment : item
      );
    });

    closePaymentModal();
  };

  const deletePayment = (index) => {
    setPaymentHistory((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  // RESET FORM
  const resetForm = () => {
    setSelectedEnquiry(null);

    setFormData(initialFormData);

    setProducts([createInitialProduct()]);

    setPaymentHistory([]);
    closePaymentModal();

    setEditingOrderId(null);

    // Load first enquiry again
    if (enquiries.length > 0) {
      applyEnquiry(enquiries[0]);
    }
  };

  // =======================================================
  // CREATE / UPDATE ORDER
  // =======================================================

  const handleCreateOrder = async (e) => {
    e.preventDefault();

    // VALIDATION
    if (!formData.customerName) {
      showToast("error", "Please select an enquiry.");
      return;
    }

    if (!formData.companyId) {
      showToast("error", "Please select an enquiry with a valid company.");
      return;
    }

    if (!formData.originalRequirement) {
      showToast("error", "Please enter original requirement.");
      return;
    }

    if (!formData.deliveryAddress) {
      showToast("error", "Please enter delivery address.");
      return;
    }

    if (!formData.assignedLocation) {
      showToast("error", "Please select assigned location.");
      return;
    }

    if (!formData.startDate) {
      showToast("error", "Please select start date.");
      return;
    }

    if (!formData.endDate) {
      showToast("error", "Please select end date.");
      return;
    }

    if (formData.endDate <= formData.startDate) {
      showToast("error", "End date must be greater than start date.");
      return;
    }

    if (products.length === 0) {
      showToast("error", "Please add at least one product.");
      return;
    }

    const hasDuplicateProduct = products.some((product, index) =>
      isDuplicateProduct(product, index)
    );

    if (hasDuplicateProduct) {
      showToast(
        "error",
        "Same finished material and product is added more than once. Please remove the duplicate row."
      );
      return;
    }

    const invalidProduct = products.some((product) => {
      const rowFields = getRowFields(product);

      const hasEmptyField = rowFields.some(
        (field) => Number(product.fieldValues?.[idOf(field)] || 0) <= 0
      );

      return (
        !product.productName ||
        hasEmptyField ||
        Number(product.amount || 0) <= 0
      );
    });

    if (invalidProduct) {
      showToast(
        "error",
        "Please select product, fill all field quantities and enter amount for every row."
      );
      return;
    }

    const taxPercentage = Number(formData.taxPercentage || 0);

    if (taxPercentage < 0 || taxPercentage > 100) {
      showToast("error", "Tax percentage must be between 0 and 100.");
      return;
    }

    if (paymentError) {
      showToast("error", paymentError);
      return;
    }

    // -----------------------------------------------------
    // PRODUCTS (new payload shape)
    // -----------------------------------------------------

    const orderProducts = products.map((product) => {
      const material = materials.find(
        (item) => idOf(item) === product.materialId
      );

      const amount = Number(product.amount || 0);

      return {
        finishedMaterialCategoryId: product.materialId,
        finishedMaterialCategoryName: getName(material),

        productId: product.productId,
        productName: product.productName,
        size: getRowSize(product),

        fields: getRowFields(product).map((field) => ({
          fieldId: idOf(field),
          fieldName: getName(field),
          requestedQuantity: Number(
            product.fieldValues?.[idOf(field)] || 0
          ),
        })),

        ratePerPiece: amount,
        amount,
      };
    });

    // PAYLOAD
    const orderData = {
      source: "From Enquiry",

      enquiryId: selectedEnquiry?._id || null,

      enquiryNo: selectedEnquiry?.enquiryNo || null,

      customerName: formData.customerName,

      // Store only the Company ObjectId. Company name comes from populate().
      companyId: formData.companyId,

      phone: formData.phone,

      platform: formData.platform,

      customerLocation: formData.customerLocation,

      originalRequirement: formData.originalRequirement,

      additionalDetails: formData.additionalDetails,

      deliveryAddress: formData.deliveryAddress,

      assignedLocation: formData.assignedLocation,

      startDate: formData.startDate,

      endDate: formData.endDate,

      products: orderProducts,

      subTotal,

      taxPercentage,

      taxAmount,

      totalAmount,

      remarks: formData.remarks,

      alreadyPaidAmount,

      pendingAmount: calculatedPendingAmount,

      paymentStatus: calculatedPaymentStatus,

      paymentHistory: paymentHistory.map((payment) => {
        const payload = {
          paymentDate: payment.paymentDate,
          paymentAmount: Number(payment.paymentAmount || 0),
          paymentMode: payment.paymentMode,
          referenceNumber: payment.referenceNumber || "",
          remarks: payment.remarks || "",
        };

        if (payment._id) {
          payload._id = payment._id;
        }

        return payload;
      }),
    };

    // API
    try {
      setIsSubmitting(true);

      if (editingOrderId) {
        await api.patch(`/orders/${editingOrderId}`, orderData);

        showToast("success", "Order updated successfully.");
      } else {
        await api.post("/orders", orderData);

        showToast("success", "Order created successfully.");
      }

      await getOrders();

      resetForm();
    } catch (error) {
      console.error("Order save error:", error);

      showToast(
        "error",
        error?.response?.data?.message || "Failed to save order."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =======================================================
  // SAVED PRODUCT -> FORM ROW
  // Saved order keeps ids + fields[], so no name matching.
  // =======================================================

  const resolveSavedProduct = (savedProduct) => {
    const row = {
      materialId: idOf(savedProduct.finishedMaterialCategoryId),
      productId: idOf(savedProduct.productId),
      productName: savedProduct.productName || "",
      size: String(savedProduct.size || ""),
      fieldValues: {},
    };

    // fieldId -> requestedQuantity
    (savedProduct.fields || []).forEach((field) => {
      row.fieldValues[idOf(field.fieldId)] = field.requestedQuantity ?? "";
    });

    return row;
  };

  // =======================================================
  // EDIT ORDER
  // =======================================================

  const handleEditOrder = (order) => {
    setEditingOrderId(order._id);

    // ENQUIRY
    const enquiry = enquiries.find((item) => item._id === order.enquiryId);

    setSelectedEnquiry(
      enquiry ||
        (order.enquiryId
          ? {
              _id: order.enquiryId,
              enquiryNo: order.enquiryNo,
              customerName: order.customerName,
              companyId: order.companyId || null,
              companyName: order.companyName || "",
              phone: order.phone,
              platform: order.platform,
              location: order.customerLocation,
              requirement: order.originalRequirement,
              details: order.additionalDetails,
            }
          : null)
    );

    // FORM
    setFormData({
      customerName: order.customerName || "",

      companyId: idOf(order.companyId),

      companyName: order.companyName || order.companyId?.companyName || "",

      phone: order.phone || "",

      platform: order.platform || "Direct",

      customerLocation: order.customerLocation || "",

      originalRequirement: order.originalRequirement || "",

      additionalDetails: order.additionalDetails || "",

      deliveryAddress: order.deliveryAddress || "",

      // Supports populated Location objects and legacy location names.
      assignedLocation:
        locations.find(
          (item) => item.name === (order.assignedLocation?.name || order.assignedLocation)
        )?._id || idOf(order.assignedLocation),

      startDate: order.startDate ? order.startDate.slice(0, 10) : "",

      endDate: order.endDate ? order.endDate.slice(0, 10) : "",

      remarks: order.remarks || "",

      taxPercentage: order.taxPercentage || "",
    });

    // PAYMENT HISTORY
    // New orders use paymentHistory directly. For older orders that only
    // have alreadyPaidAmount, preserve that amount as a legacy payment row
    // instead of losing it when the order is edited.
    const savedPayments = Array.isArray(order.paymentHistory)
      ? order.paymentHistory
      : [];

    if (savedPayments.length > 0) {
      setPaymentHistory(
        savedPayments.map((payment) => ({
          _id: payment._id || "",
          paymentDate: payment.paymentDate
            ? String(payment.paymentDate).slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          paymentAmount: payment.paymentAmount ?? "",
          paymentMode: payment.paymentMode || "Other",
          referenceNumber: payment.referenceNumber || "",
          remarks: payment.remarks || "",
        }))
      );
    } else {
      const legacyPaidAmount = Number(
        order.alreadyPaidAmount ?? order.advanceAmount ?? 0
      );

      setPaymentHistory(
        legacyPaidAmount > 0
          ? [
              {
                _id: "",
                paymentDate: order.createdAt
                  ? String(order.createdAt).slice(0, 10)
                  : new Date().toISOString().slice(0, 10),
                paymentAmount: legacyPaidAmount,
                paymentMode: "Other",
                referenceNumber: "",
                remarks: "Existing payment migrated from order summary.",
              },
            ]
          : []
      );
    }

    closePaymentModal();

    // PRODUCTS
    setProducts(
      order.products?.length
        ? order.products.map((product) => ({
            id: product._id || Date.now() + Math.random(),

            ...resolveSavedProduct(product),

            amount: product.amount ?? product.ratePerPiece ?? "",
          }))
        : [createInitialProduct()]
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // DELETE ORDER
  const handleDeleteOrder = (order) => {
    setDeleteTarget(order);
  };

  const confirmDeleteOrder = async () => {
    const orderId = deleteTarget?._id;

    if (!orderId) return;

    setDeleteTarget(null);

    try {
      await api.delete(`/orders/${orderId}`);

      showToast("success", "Order deleted successfully.");

      await getOrders();

      if (editingOrderId === orderId) {
        resetForm();
      }
    } catch (error) {
      console.error("Delete order error:", error);

      showToast(
        "error",
        error?.response?.data?.message || "Failed to delete order."
      );
    }
  };

  // BACK
  const handleBack = () => {
    window.history.back();
  };

  // DATE DISPLAY
  const formatDate = (date) => {
    if (!date) return "-";

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return "-";
    }

    return value.toLocaleDateString("en-GB");
  };

  // PAYMENT STATUS CLASS
  const getPaymentStatusClass = (status) => {
    if (status === "Fully Received") {
      return "payment-fully";
    }

    if (status === "Partially Received") {
      return "payment-partial";
    }

    return "payment-not";
  };

  // tax amount from API (older orders without tax -> 0)
  const getOrderTax = (order) => Number(order.taxAmount || 0);

  // Payment summary values.
  // Prefer paymentHistory for new orders; fall back to legacy summary
  // fields for older records that do not have paymentHistory yet.
  const getAlreadyPaidAmount = (order) => {
    if (Array.isArray(order.paymentHistory) && order.paymentHistory.length > 0) {
      return Math.round(
        order.paymentHistory.reduce(
          (total, payment) => total + Number(payment.paymentAmount || 0),
          0
        ) * 100
      ) / 100;
    }

    return Number(order.alreadyPaidAmount ?? order.advanceAmount ?? 0);
  };

  const getPendingAmount = (order) => {
    const total = Number(order.totalAmount || 0);
    const alreadyPaid = getAlreadyPaidAmount(order);

    return Math.max(
      Math.round((total - alreadyPaid) * 100) / 100,
      0
    );
  };
  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="create-order-layout">
      {/* TOAST */}

      {toast.show && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 99999,
            minWidth: "320px",
            maxWidth: "420px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 16px",
            background: "#ffffff",
            borderRadius: "12px",
            boxShadow:
              "0 12px 35px rgba(0,0,0,0.14), 0 3px 10px rgba(0,0,0,0.08)",
            borderLeft: `4px solid ${
              toast.type === "success" ? "#16a34a" : "#dc2626"
            }`,
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: toast.type === "success" ? "#dcfce7" : "#fee2e2",
              color: toast.type === "success" ? "#16a34a" : "#dc2626",
            }}
          >
            {toast.type === "success" ? (
              <CheckCircle size={21} />
            ) : (
              <AlertCircle size={21} />
            )}
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "3px",
            }}
          >
            <strong style={{ fontSize: "14px", color: "#111827" }}>
              {toast.type === "success" ? "Success" : "Error"}
            </strong>

            <span
              style={{
                fontSize: "13px",
                color: "#6b7280",
                lineHeight: 1.4,
              }}
            >
              {toast.message}
            </span>
          </div>

          <button
            type="button"
            onClick={closeToast}
            aria-label="Close notification"
            style={{
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              borderRadius: "7px",
              background: "transparent",
              color: "#9ca3af",
              cursor: "pointer",
            }}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* DELETE CONFIRMATION */}

      {deleteTarget && (
        <div
          onClick={() => setDeleteTarget(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15, 23, 42, 0.45)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(420px, 90vw)",
              padding: "24px",
              background: "#ffffff",
              borderRadius: "14px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                margin: "0 auto 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#dc2626",
              }}
            >
              <Trash2 size={24} />
            </div>

            <h3 style={{ margin: "0 0 8px", color: "#111827" }}>
              Delete Order?
            </h3>

            <p
              style={{
                margin: "0 0 20px",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.orderNo}</strong>? This action cannot be
              undone.
            </p>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  background: "#ffffff",
                  color: "#374151",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteOrder}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar />

      <div className="create-order-main">
        <Header />

        <main className="create-order-content">
          {/* PAGE HEADER */}

          <section className="create-order-page-header">
            <div className="create-order-page-title">
              <div className="create-order-title-icon">
                <FileText size={28} />
              </div>

              <div>
                <h1>{editingOrderId ? "Edit Order" : "Create Order"}</h1>

                <p>
                  {editingOrderId
                    ? "Update existing order details."
                    : "Create new order. Select customer or create from enquiry."}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="back-orders-btn"
              onClick={handleBack}
            >
              <ArrowLeft size={17} />
              Back to Orders
            </button>
          </section>

          {/* CUSTOMER & ENQUIRY INFORMATION */}

          <section className="create-order-card">
            <div className="create-order-card-header">
              <div className="card-header-title">
                <div className="card-header-icon blue-icon">
                  <User size={19} />
                </div>

                <h2>Customer & Enquiry Information</h2>
              </div>

              {selectedEnquiry && (
                <div className="source-section">
                  <div className="enquiry-number">
                    Enquiry No : <strong>{selectedEnquiry.enquiryNo}</strong>
                  </div>
                </div>
              )}
            </div>

            {enquiries.length > 0 && (
              <div className="enquiry-selector-row">
                <div className="form-field">
                  <label>Select Enquiry</label>

                  <select
                    value={selectedEnquiry?._id || ""}
                    onChange={handleEnquiryChange}
                  >
                    <option value="">Select Enquiry</option>

                    {enquiries.map((enquiry) => (
                      <option key={enquiry._id} value={enquiry._id}>
                        {enquiry.enquiryNo} - {enquiry.customerName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="customer-enquiry-body">
              <div className="form-field">
                <label>
                  Customer Name <span>*</span>
                </label>

                <input
                  type="text"
                  value={formData.customerName}
                  placeholder="Select an enquiry"
                  readOnly
                />
              </div>

              <div className="form-field">
                <label>Company Name</label>

                <input
                  type="text"
                  value={formData.companyName}
                  placeholder="Company name from enquiry"
                  readOnly
                />
              </div>

              <div className="form-field">
                <label>Phone Number</label>

                <input type="text" value={formData.phone} readOnly />
              </div>

              <div className="form-field">
                <label>Platform</label>

                <input type="text" value={formData.platform} readOnly />
              </div>

              <div className="form-field">
                <label>Customer Location</label>

                <input
                  type="text"
                  value={formData.customerLocation}
                  readOnly
                />
              </div>

              <div className="form-field field-span-2">
                <label>
                  Original Requirement <span>*</span>
                </label>

                <input
                  type="text"
                  name="originalRequirement"
                  value={formData.originalRequirement}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field field-span-2">
                <label>Additional Details</label>

                <input
                  type="text"
                  name="additionalDetails"
                  value={formData.additionalDetails}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field field-span-2">
                <label>
                  Delivery Address <span>*</span>
                </label>

                <input
                  type="text"
                  name="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={handleChange}
                  placeholder="Enter delivery address"
                />
              </div>

              <div className="form-field field-span-2">
                <label>
                  Assigned Location <span>*</span>
                </label>

                <select
                  name="assignedLocation"
                  value={formData.assignedLocation}
                  onChange={handleChange}
                  disabled={loadingLocations}
                >
                  <option value="">
                    {loadingLocations ? "Loading locations..." : "Select Location"}
                  </option>

                  {locations.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ORDER SCHEDULE */}

          <section className="create-order-card schedule-card">
            <div className="create-order-card-header">
              <div className="card-header-title">
                <div className="card-header-icon blue-icon">
                  <CalendarDays size={19} />
                </div>

                <h2>Order Schedule</h2>
              </div>
            </div>

            <div className="schedule-body">
              <div className="form-field">
                <label>
                  Start Date <span>*</span>
                </label>

                <DateInput
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field">
                <label>
                  Expected / End Date <span>*</span>
                </label>

                <DateInput
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate}
                />
              </div>
            </div>
          </section>

          {/* PRODUCT / ITEM DETAILS */}

          <section className="create-order-card product-card">
            <div className="create-order-card-header">
              <div className="card-header-title">
                <div className="card-header-icon purple-icon">
                  <Package size={19} />
                </div>

                <h2>Product / Item Details</h2>
              </div>

              <button
                type="button"
                className="add-product-btn"
                onClick={handleAddProduct}
              >
                <Plus size={17} />
                Add Product
              </button>
            </div>

            {productError && (
              <p
                style={{
                  margin: "0 20px 10px",
                  color: "#b91c1c",
                  fontSize: "13px",
                }}
              >
                {productError}
              </p>
            )}

            <div className="product-table-wrapper">
              <table className="product-table">
                <thead>
                  <tr>
                    <th>S.No</th>

                    <th>
                      Finished Material <span>*</span>
                    </th>

                    <th>
                      Product <span>*</span>
                    </th>

                    <th>
                      Size / Fields <span>*</span>
                    </th>

                    <th>
                      Amount (₹) <span>*</span>
                    </th>

                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product, index) => {
                    const rowProducts = getRowProducts(product);

                    const rowFields = getRowFields(product);

                    const isDuplicate = isDuplicateProduct(product, index);

                    // fallback when productId is missing but a name exists
                    const isSavedProduct =
                      !product.productId && product.productName;

                    return (
                      <tr key={product.id}>
                        <td className="serial-cell">{index + 1}</td>

                        {/* FINISHED MATERIAL */}

                        <td>
                          <select
                            value={product.materialId}
                            onChange={(e) =>
                              handleMaterialChange(
                                product.id,
                                e.target.value
                              )
                            }
                          >
                            <option value="">Select Material</option>

                            {materials.map((material) => (
                              <option
                                key={idOf(material)}
                                value={idOf(material)}
                              >
                                {getName(material)}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* PRODUCT (of selected material) */}

                        <td>
                          <select
                            value={
                              product.productId ||
                              (isSavedProduct ? "__saved" : "")
                            }
                            onChange={(e) =>
                              handleProductSelect(
                                product.id,
                                e.target.value
                              )
                            }
                            disabled={
                              !product.materialId && !isSavedProduct
                            }
                          >
                            <option value="">
                              {product.materialId
                                ? "Select Product"
                                : "Select Material first"}
                            </option>

                            {isSavedProduct && (
                              <option value="__saved">
                                {product.productName}
                              </option>
                            )}

                            {/* keep the current selection visible even if
                                the duplicate filter removed it from the list */}
                            {product.productId &&
                              !rowProducts.some(
                                (item) => idOf(item) === product.productId
                              ) && (
                                <option value={product.productId}>
                                  {product.productName}
                                </option>
                              )}

                            {rowProducts.map((item) => (
                              <option key={idOf(item)} value={idOf(item)}>
                                {getName(item)}
                              </option>
                            ))}
                          </select>

                          {product.materialId &&
                            rowProducts.length === 0 &&
                            !product.productId && (
                              <small style={{ color: "#b91c1c" }}>
                                No products available for this material
                              </small>
                            )}
                        </td>

                        {/* FIELDS (requested quantity per field) */}

                        <td>
                          {isDuplicate ? (
                            <small style={{ color: "#b91c1c" }}>
                              This product is already added in another row.
                              Please remove this row or select a different
                              product.
                            </small>
                          ) : rowFields.length > 0 ? (
                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                flexWrap: "wrap",
                              }}
                            >
                              {rowFields.map((field) => {
                                const fieldId = idOf(field);
                                const label = getName(field);

                                return (
                                  <input
                                    key={fieldId}
                                    type="number"
                                    min="0"
                                    title={label}
                                    placeholder={label}
                                    value={
                                      product.fieldValues?.[fieldId] ?? ""
                                    }
                                    onChange={(e) =>
                                      handleFieldChange(
                                        product.id,
                                        fieldId,
                                        e.target.value
                                      )
                                    }
                                    style={{
                                      minWidth: "80px",
                                      flex: 1,
                                    }}
                                  />
                                );
                              })}
                            </div>
                          ) : (
                            <input
                              type="text"
                              placeholder="e.g. 57x32x80"
                              value={product.size}
                              onChange={(e) =>
                                handleProductChange(
                                  product.id,
                                  "size",
                                  e.target.value
                                )
                              }
                            />
                          )}
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Enter amount"
                            value={product.amount}
                            onChange={(e) =>
                              handleProductChange(
                                product.id,
                                "amount",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          <button
                            type="button"
                            className="delete-product-btn"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* SUB TOTAL / TAX / TOTAL */}

            <div
              className="product-total"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                }}
              >
                <span>Sub Total (₹)</span>
                <strong>{formatAmount(subTotal)}</strong>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                }}
              >
                <span>Tax (%)</span>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  name="taxPercentage"
                  value={formData.taxPercentage}
                  onChange={handleChange}
                  placeholder="0"
                  style={{ width: "90px" }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                }}
              >
                <span>Tax Amount (₹)</span>
                <strong>{formatAmount(taxAmount)}</strong>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                  fontSize: "18px",
                }}
              >
                <span>Total Amount (₹)</span>
                <strong>{formatAmount(totalAmount)}</strong>
              </div>
            </div>
          </section>

          {/* BOTTOM INFORMATION */}

          <div className="bottom-information-grid">
            <section className="create-order-card">
              <div className="create-order-card-header">
                <div className="card-header-title">
                  <div className="card-header-icon purple-icon">
                    <FileText size={19} />
                  </div>

                  <h2>Additional Information</h2>
                </div>
              </div>

              <div className="additional-information-body">
                <div className="form-field">
                  <label>Remarks</label>

                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                    placeholder="Enter remarks"
                  />
                </div>
              </div>
            </section>

            <section className="create-order-card">
              <div className="create-order-card-header">
                <div className="card-header-title">
                  <div className="card-header-icon green-icon">
                    <CreditCard size={19} />
                  </div>

                  <h2>Payment Details</h2>
                </div>
              </div>

              <div
                className="payment-details-body"
                style={{ display: "flex", flexDirection: "column", gap: "14px" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", color: "#6b7280" }}>
                      Total Amount
                    </div>
                    <strong style={{ fontSize: "20px", color: "#111827" }}>
                      ₹ {formatAmount(totalAmount)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={openAddPayment}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "7px",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      background: "#16a34a",
                      color: "#ffffff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={16} />
                    Add Payment
                  </button>
                </div>

                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    overflow: "hidden",
                    background: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 12px",
                      background: "#f8fafc",
                      borderBottom: "1px solid #e5e7eb",
                      fontWeight: 700,
                      color: "#111827",
                    }}
                  >
                    Payment History
                  </div>

                  {paymentHistory.length === 0 ? (
                    <div
                      style={{
                        padding: "18px 12px",
                        textAlign: "center",
                        color: "#6b7280",
                        fontSize: "13px",
                      }}
                    >
                      No payment received yet. Click <strong>Add Payment</strong> to record the first payment.
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "620px" }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", padding: "9px 10px", fontSize: "12px", color: "#6b7280" }}>Date</th>
                            <th style={{ textAlign: "right", padding: "9px 10px", fontSize: "12px", color: "#6b7280" }}>Amount</th>
                            <th style={{ textAlign: "left", padding: "9px 10px", fontSize: "12px", color: "#6b7280" }}>Mode</th>
                            <th style={{ textAlign: "left", padding: "9px 10px", fontSize: "12px", color: "#6b7280" }}>Reference</th>
                            <th style={{ textAlign: "center", padding: "9px 10px", fontSize: "12px", color: "#6b7280" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentHistory.map((payment, index) => (
                            <tr key={payment._id || `${payment.paymentDate}-${index}`}>
                              <td style={{ padding: "10px", borderTop: "1px solid #f1f5f9" }}>
                                {formatDate(payment.paymentDate)}
                              </td>
                              <td style={{ padding: "10px", borderTop: "1px solid #f1f5f9", textAlign: "right", fontWeight: 700 }}>
                                ₹ {formatAmount(payment.paymentAmount)}
                              </td>
                              <td style={{ padding: "10px", borderTop: "1px solid #f1f5f9" }}>
                                {payment.paymentMode}
                              </td>
                              <td style={{ padding: "10px", borderTop: "1px solid #f1f5f9" }}>
                                {payment.referenceNumber || "-"}
                              </td>
                              <td style={{ padding: "10px", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
                                <div style={{ display: "inline-flex", gap: "6px" }}>
                                  <button
                                    type="button"
                                    title="Edit Payment"
                                    onClick={() => openEditPayment(index)}
                                    style={{
                                      width: "32px",
                                      height: "32px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      border: "1px solid #dbeafe",
                                      borderRadius: "7px",
                                      background: "#eff6ff",
                                      color: "#2563eb",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <Pencil size={15} />
                                  </button>

                                  <button
                                    type="button"
                                    title="Delete Payment"
                                    onClick={() => deletePayment(index)}
                                    style={{
                                      width: "32px",
                                      height: "32px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      border: "1px solid #fecaca",
                                      borderRadius: "7px",
                                      background: "#fef2f2",
                                      color: "#dc2626",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: "10px",
                  }}
                >
                  <div style={{ padding: "12px", borderRadius: "8px", background: "#f8fafc" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>Already Paid</div>
                    <strong>₹ {formatAmount(alreadyPaidAmount)}</strong>
                  </div>

                  <div style={{ padding: "12px", borderRadius: "8px", background: "#fff7ed" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>Pending Amount</div>
                    <strong>₹ {formatAmount(calculatedPendingAmount)}</strong>
                  </div>

                  <div style={{ padding: "12px", borderRadius: "8px", background: "#f0fdf4" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>Payment Status</div>
                    <strong>{calculatedPaymentStatus}</strong>
                  </div>
                </div>

                {paymentError && (
                  <p
                    style={{
                      margin: 0,
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "#fef2f2",
                      color: "#b91c1c",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    {paymentError}
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* PAYMENT MODAL */}
          {paymentModal.open && (
            <div
              onClick={closePaymentModal}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 100000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                background: "rgba(15, 23, 42, 0.45)",
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "min(560px, 96vw)",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  background: "#ffffff",
                  borderRadius: "14px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "18px 20px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, color: "#111827" }}>
                      {paymentModal.editingIndex === null
                        ? "Add Payment"
                        : "Edit Payment"}
                    </h3>
                    <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "13px" }}>
                      Record the payment received for this order.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closePaymentModal}
                    style={{
                      width: "32px",
                      height: "32px",
                      border: "none",
                      borderRadius: "7px",
                      background: "#f3f4f6",
                      color: "#6b7280",
                      cursor: "pointer",
                    }}
                  >
                    <X size={17} />
                  </button>
                </div>

                <div
                  style={{
                    padding: "20px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div className="form-field">
                    <label>Payment Date *</label>
                    <DateInput
                      name="paymentDate"
                      value={paymentModal.form.paymentDate}
                      onChange={handlePaymentModalChange}
                    />
                  </div>

                  <div className="form-field">
                    <label>Payment Amount (₹) *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      name="paymentAmount"
                      value={paymentModal.form.paymentAmount}
                      onChange={handlePaymentModalChange}
                      placeholder="Enter payment amount"
                    />
                  </div>

                  <div className="form-field">
                    <label>Payment Mode *</label>
                    <select
                      name="paymentMode"
                      value={paymentModal.form.paymentMode}
                      onChange={handlePaymentModalChange}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Reference Number</label>
                    <input
                      type="text"
                      name="referenceNumber"
                      value={paymentModal.form.referenceNumber}
                      onChange={handlePaymentModalChange}
                      placeholder="UPI / bank / cheque reference"
                    />
                  </div>

                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Remarks</label>
                    <textarea
                      name="remarks"
                      value={paymentModal.form.remarks}
                      onChange={handlePaymentModalChange}
                      placeholder="Enter payment remarks"
                      rows={3}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    padding: "0 20px 20px",
                  }}
                >
                  <button
                    type="button"
                    onClick={closePaymentModal}
                    style={{
                      padding: "10px 18px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      background: "#ffffff",
                      color: "#374151",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={savePayment}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "7px",
                      padding: "10px 18px",
                      border: "none",
                      borderRadius: "8px",
                      background: "#2563eb",
                      color: "#ffffff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Save size={16} />
                    {paymentModal.editingIndex === null
                      ? "Save Payment"
                      : "Update Payment"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FORM FOOTER */}

          <div className="create-order-footer">
            {editingOrderId && (
              <button
                type="button"
                className="cancel-edit-btn"
                onClick={resetForm}
              >
                <X size={16} />
                Cancel Edit
              </button>
            )}

            <button
              type="button"
              className="cancel-order-btn"
              onClick={handleBack}
            >
              Cancel
            </button>

            <button
              type="button"
              className="create-order-btn"
              onClick={handleCreateOrder}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={17} className="spin-icon" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={17} />

                  {editingOrderId ? "Update Order" : "Create Order"}
                </>
              )}
            </button>
          </div>

          {/* ORDERS TABLE */}

          <section className="orders-list-card">
            <div className="orders-list-header">
              <div>
                <h2>All Orders</h2>

                <p>{filteredOrders.length} orders found</p>
              </div>

              <button
                type="button"
                className="refresh-orders-btn"
                onClick={getOrders}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            <div
              className="delivery-status-tabs"
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                padding: "0 20px 16px",
              }}
            >
              {DELIVERY_STATUS_TABS.map((status) => {
                const count =
                  status === "All"
                    ? orders.length
                    : orders.filter(
                        (order) => getDeliveryStatus(order) === status
                      ).length;

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setActiveDeliveryStatus(status)}
                    style={{
                      padding: "8px 14px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      background:
                        activeDeliveryStatus === status
                          ? "#2563eb"
                          : "#ffffff",
                      color:
                        activeDeliveryStatus === status
                          ? "#ffffff"
                          : "#374151",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {status} ({count})
                  </button>
                );
              })}
            </div>

            <div className="orders-table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Order No</th>
                    <th>Source</th>
                    <th>Customer</th>
                    <th>Company</th>
                    <th>Phone</th>
                    <th>Assigned Location</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Total Amount</th>
                    <th>Tax</th>
                    <th>Already Paid</th>
                    <th>Pending</th>
                    <th>Payment Status</th>
                    <th>Delivery</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingOrders ? (
                    <tr>
                      <td colSpan="16" className="orders-empty">
                        Loading orders...
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="16" className="orders-empty">
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order, index) => (
                      <tr key={order._id}>
                        <td>{index + 1}</td>

                        <td className="order-number-cell">
                          {order.orderNo}
                        </td>

                        <td>
                          <span
                            className={
                              order.source === "From Enquiry"
                                ? "source-badge enquiry-source"
                                : "source-badge direct-source"
                            }
                          >
                            {order.source}
                          </span>
                        </td>

                        <td>
                          <div className="order-customer-cell">
                            <strong>{order.customerName}</strong>

                            <span>{order.customerLocation}</span>
                          </div>
                        </td>

                        <td>
                          {order.companyId &&
                          typeof order.companyId === "object"
                            ? order.companyId.companyName || "-"
                            : order.companyName || "-"}
                        </td>

                        <td>{order.phone}</td>

                        <td>
                          <span className="location-badge">
                            {order.assignedLocation?.name || order.assignedLocation || "-"}
                          </span>
                        </td>

                        <td>{formatDate(order.startDate)}</td>

                        <td>{formatDate(order.endDate)}</td>

                        <td className="table-amount">
                          ₹ {formatAmount(order.totalAmount)}
                        </td>

                        <td>
                          ₹ {formatAmount(getOrderTax(order))}

                          {Number(order.taxPercentage || 0) > 0 && (
                            <small
                              style={{ display: "block", color: "#6b7280" }}
                            >
                              ({order.taxPercentage}%)
                            </small>
                          )}
                        </td>

                        <td
                          className="table-amount"
                          style={{ fontWeight: 600 }}
                        >
                          ₹ {formatAmount(getAlreadyPaidAmount(order))}
                        </td>

                        <td
                          className="table-amount"
                          style={{
                            color:
                              getPendingAmount(order) > 0
                                ? "#b91c1c"
                                : "#15803d",
                            fontWeight: 600,
                          }}
                        >
                          ₹ {formatAmount(getPendingAmount(order))}
                        </td>

                        <td>
                          <span
                            className={`payment-status-badge ${getPaymentStatusClass(
                              Array.isArray(order.paymentHistory) && order.paymentHistory.length > 0
                                ? getAlreadyPaidAmount(order) >= Number(order.totalAmount || 0) && Number(order.totalAmount || 0) > 0
                                  ? "Fully Received"
                                  : getAlreadyPaidAmount(order) > 0
                                    ? "Partially Received"
                                    : "Not Received"
                                : order.paymentStatus
                            )}`}
                          >
                            {Array.isArray(order.paymentHistory) && order.paymentHistory.length > 0
                              ? getAlreadyPaidAmount(order) >= Number(order.totalAmount || 0) && Number(order.totalAmount || 0) > 0
                                ? "Fully Received"
                                : getAlreadyPaidAmount(order) > 0
                                  ? "Partially Received"
                                  : "Not Received"
                              : order.paymentStatus || "Not Received"}
                          </span>
                        </td>

                        <td>
                          <span className="delivery-status-badge">
                            {getDeliveryStatus(order)}
                          </span>
                        </td>

                        <td>
                          <div className="order-actions">
                            <button
                              type="button"
                              className="edit-order-btn"
                              title="Edit"
                              onClick={() => handleEditOrder(order)}
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              className="delete-order-btn"
                              title="Delete"
                              onClick={() => handleDeleteOrder(order)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="orders-total">
              Total: {filteredOrders.length} Orders
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default CreateOrder;
