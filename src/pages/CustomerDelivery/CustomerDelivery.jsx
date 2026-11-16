import React, { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Pencil,
  Search,
  RefreshCw,
  X,
  Save,
  PackageCheck,
  CalendarDays,
  User,
  FileText,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import api from "../../api/axios";

import "./CustomerDelivery.css";

const DELIVERY_STATUSES = [
  "All",
  "Pending",
  "Partially Delivered",
  "Delivered",
  "Cancelled",
];

const getList = (response) => {
  const payload = response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;

  return [];
};

const getId = (value) => {
  if (value && typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value || "");
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB");
};

const getStatusClass = (status) => {
  switch (status) {
    case "Delivered":
      return "status-delivered";
    case "Partially Delivered":
      return "status-partial";
    case "Cancelled":
      return "status-cancelled";
    default:
      return "status-pending";
  }
};

function CustomerDelivery() {
  const [deliveries, setDeliveries] = useState([]);
  const [activeStatus, setActiveStatus] = useState("All");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [viewDelivery, setViewDelivery] = useState(null);
  const [editDelivery, setEditDelivery] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [stockValidationErrors, setStockValidationErrors] = useState([]);

  // Bulk payment state
  const [showBulkPayment, setShowBulkPayment] = useState(false);
  const [bulkCompanyId, setBulkCompanyId] = useState("");
  const [bulkReceivedAmount, setBulkReceivedAmount] = useState("");
  const [bulkPendingOrders, setBulkPendingOrders] = useState([]);
  const [bulkPaymentDate, setBulkPaymentDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [bulkPaymentMode, setBulkPaymentMode] = useState("Cash");
  const [bulkReferenceNumber, setBulkReferenceNumber] = useState("");
  const [bulkRemarks, setBulkRemarks] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState("");

  // Bulk payment history and view/edit state
  const [bulkPayments, setBulkPayments] = useState([]);
  const [bulkHistoryLoading, setBulkHistoryLoading] = useState(false);
  const [viewBulkPayment, setViewBulkPayment] = useState(null);
  const [editBulkPayment, setEditBulkPayment] = useState(null);
  const [bulkEditSaving, setBulkEditSaving] = useState(false);
  const [bulkEditMessage, setBulkEditMessage] = useState("");

  const fetchDeliveries = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get("/customer-delivery");
      setDeliveries(getList(response));
    } catch (err) {
      console.error("Failed to fetch customer deliveries:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load customer deliveries."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBulkPendingOrders = async (companyId) => {
    if (!companyId) {
      setBulkPendingOrders([]);
      return;
    }

    try {
      setBulkLoading(true);
      setBulkError("");
      const response = await api.get(
        `/customer-delivery/bulk-payment/pending-orders/${companyId}`
      );
      const data = response.data?.data;
      const orders = Array.isArray(data?.orders)
        ? data.orders
        : Array.isArray(data)
          ? data
          : getList(response);
      setBulkPendingOrders(orders);
    } catch (err) {
      console.error("Failed to fetch pending orders:", err);
      setBulkPendingOrders([]);
      setBulkError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load pending orders."
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const fetchBulkPayments = async () => {
    try {
      setBulkHistoryLoading(true);
      const response = await api.get("/customer-delivery/bulk-payment");
      setBulkPayments(getList(response));
    } catch (err) {
      console.error("Failed to fetch bulk payment history:", err);
      setBulkPayments([]);
      setBulkError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load bulk payment history."
      );
    } finally {
      setBulkHistoryLoading(false);
    }
  };

  const openBulkPaymentView = async (payment) => {
    try {
      setBulkEditMessage("");
      const response = await api.get(
        `/customer-delivery/bulk-payment/${payment._id}`
      );
      setViewBulkPayment(response.data?.data || payment);
    } catch (err) {
      setBulkEditMessage(
        err.response?.data?.message ||
          err.message ||
          "Failed to load bulk payment details."
      );
    }
  };

  const openBulkPaymentEdit = async (payment) => {
    try {
      setBulkEditMessage("");
      const response = await api.get(
        `/customer-delivery/bulk-payment/${payment._id}`
      );
      const data = response.data?.data || payment;
      setEditBulkPayment({
        ...data,
        paymentDate: data.paymentDate
          ? String(data.paymentDate).slice(0, 10)
          : "",
        receivedAmount: String(data.receivedAmount ?? ""),
        paymentMode: data.paymentMode || "Cash",
        referenceNumber: data.referenceNumber || "",
        remarks: data.remarks || "",
      });
    } catch (err) {
      setBulkEditMessage(
        err.response?.data?.message ||
          err.message ||
          "Failed to load bulk payment for editing."
      );
    }
  };

  const handleUpdateBulkPayment = async () => {
    if (!editBulkPayment?._id) return;

    const receivedAmount = Number(editBulkPayment.receivedAmount);
    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
      setBulkEditMessage("Please enter a valid received amount.");
      return;
    }
    if (!editBulkPayment.paymentDate) {
      setBulkEditMessage("Please select payment date.");
      return;
    }

    try {
      setBulkEditSaving(true);
      setBulkEditMessage("");

      const payload = {
        receivedAmount,
        paymentDate: editBulkPayment.paymentDate,
        paymentMode: editBulkPayment.paymentMode,
        referenceNumber: editBulkPayment.referenceNumber?.trim() || "",
        remarks: editBulkPayment.remarks?.trim() || "",
      };

      await api.patch(
        `/customer-delivery/bulk-payment/${editBulkPayment._id}`,
        payload
      );

      const companyId = getId(editBulkPayment.companyId);
      setEditBulkPayment(null);
      setBulkEditMessage("Bulk payment updated successfully.");
      await fetchBulkPayments();
      if (companyId) await fetchBulkPendingOrders(companyId);
      await fetchDeliveries(true);
    } catch (err) {
      console.error("Failed to update bulk payment:", err);
      setBulkEditMessage(
        err.response?.data?.message ||
          err.message ||
          "Failed to update bulk payment."
      );
    } finally {
      setBulkEditSaving(false);
    }
  };

  const handleBulkCompanyChange = (companyId) => {
    setBulkCompanyId(companyId);
    setBulkReceivedAmount("");
    setBulkError("");
    setBulkSuccess("");
    fetchBulkPendingOrders(companyId);
  };

  useEffect(() => {
    fetchDeliveries();
    fetchBulkPayments();
  }, []);

  const getOrderNo = (delivery) => {
    const order = delivery?.orderId;

    if (order && typeof order === "object") {
      return order.orderNo || order._id || "-";
    }

    return order || "-";
  };

  // Location is obtained through CustomerDelivery.orderId -> Order.assignedLocation.
  const getLocationName = (delivery) => {
    return delivery?.orderId?.assignedLocation?.name || "-";
  };

  const getCompanyName = (delivery) => {
    const company = delivery?.companyId;

    if (company && typeof company === "object") {
      return company.companyName || "-";
    }

    return "-";
  };

  const filteredDeliveries = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return deliveries.filter((delivery) => {
      const status = delivery.deliveryStatus || "Pending";

      const matchesStatus =
        activeStatus === "All" || status === activeStatus;

      if (!matchesStatus) return false;

      if (!searchText) return true;

      const deliveryNo = String(delivery.deliveryNo || "").toLowerCase();
      const orderNo = String(getOrderNo(delivery)).toLowerCase();
      const customerName = String(
        delivery.customerName || ""
      ).toLowerCase();

      return (
        deliveryNo.includes(searchText) ||
        orderNo.includes(searchText) ||
        customerName.includes(searchText)
      );
    });
  }, [deliveries, activeStatus, search]);

  const statusCounts = useMemo(() => {
    return DELIVERY_STATUSES.reduce((result, status) => {
      if (status === "All") {
        result[status] = deliveries.length;
      } else {
        result[status] = deliveries.filter(
          (delivery) =>
            (delivery.deliveryStatus || "Pending") === status
        ).length;
      }

      return result;
    }, {});
  }, [deliveries]);


  // Company options are derived from the populated companyId in deliveries.
  const bulkCompanies = useMemo(() => {
    const companyMap = new Map();

    deliveries.forEach((delivery) => {
      const company = delivery.companyId;
      const id = getId(company);

      if (id && company && typeof company === "object") {
        companyMap.set(id, {
          _id: id,
          companyName: company.companyName || "Unnamed Company",
        });
      }
    });

    return Array.from(companyMap.values());
  }, [deliveries]);

  const bulkTotalPending = useMemo(
    () => bulkPendingOrders.reduce(
      (total, order) => total + Number(order.pendingAmount || 0),
      0
    ),
    [bulkPendingOrders]
  );

  const bulkReceived = Math.max(0, Number(bulkReceivedAmount) || 0);

  const bulkAllocations = useMemo(() => {
    let remainingPayment = Math.round(bulkReceived * 100);

    return bulkPendingOrders.map((order) => {
      const pending = Math.round(Number(order.pendingAmount || 0) * 100);
      const allocated = Math.min(pending, remainingPayment);
      remainingPayment -= allocated;

      return {
        ...order,
        allocatedAmount: allocated / 100,
        remainingPending: (pending - allocated) / 100,
      };
    });
  }, [bulkPendingOrders, bulkReceived]);

  const bulkAllocatedAmount = bulkAllocations.reduce(
    (total, order) => total + Number(order.allocatedAmount || 0),
    0
  );

  const handleCreateBulkPayment = async () => {
    const receivedAmount = Number(bulkReceivedAmount);

    if (!bulkCompanyId) {
      setBulkError("Please select a company.");
      return;
    }
    if (!bulkPendingOrders.length) {
      setBulkError("No pending orders available for this company.");
      return;
    }
    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
      setBulkError("Please enter a valid received payment amount.");
      return;
    }
    if (!bulkPaymentDate) {
      setBulkError("Please select payment date.");
      return;
    }
    if (bulkAllocatedAmount <= 0) {
      setBulkError("Payment amount cannot be allocated to pending orders.");
      return;
    }

    try {
      setBulkSaving(true);
      setBulkError("");
      setBulkSuccess("");

      const payload = {
        companyId: bulkCompanyId,
        receivedAmount,
        paymentDate: bulkPaymentDate,
        paymentMode: bulkPaymentMode,
        referenceNumber: bulkReferenceNumber.trim(),
        remarks: bulkRemarks.trim(),
      };

      const response = await api.post(
        "/customer-delivery/bulk-payment",
        payload
      );

      setBulkSuccess(
        response.data?.message || "Bulk payment saved successfully."
      );
      setBulkReceivedAmount("");
      setBulkReferenceNumber("");
      setBulkRemarks("");
      await Promise.all([
        fetchBulkPendingOrders(bulkCompanyId),
        fetchBulkPayments(),
        fetchDeliveries(true),
      ]);
    } catch (err) {
      console.error("Failed to save bulk payment:", err);
      setBulkError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save bulk payment."
      );
    } finally {
      setBulkSaving(false);
    }
  };

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  const openEdit = (delivery) => {
    setSaveMessage("");
    setStockValidationErrors([]);

    setEditDelivery({
      ...delivery,
      expectedDeliveryDate: delivery.expectedDeliveryDate
        ? String(delivery.expectedDeliveryDate).slice(0, 10)
        : "",
      actualDeliveryDate: delivery.actualDeliveryDate
        ? String(delivery.actualDeliveryDate).slice(0, 10)
        : "",
      products: (delivery.products || []).map((product) => ({
        ...product,
        fields: (product.fields || []).map((field) => ({
          ...field,
          deliveredQuantity: Number(field.deliveredQuantity || 0),
          pendingQuantity: Number(
            field.pendingQuantity ??
              Number(field.orderedQuantity || 0) -
                Number(field.deliveredQuantity || 0)
          ),
        })),
      })),
    });
  };

  const updateDeliveredQuantity = (
    productIndex,
    fieldIndex,
    value
  ) => {
    setEditDelivery((previous) => {
      if (!previous) return previous;

      const products = [...(previous.products || [])];
      const product = {
        ...products[productIndex],
        fields: [...(products[productIndex]?.fields || [])],
      };

      const field = {
        ...product.fields[fieldIndex],
      };

      const ordered = Number(field.orderedQuantity || 0);
      const delivered = Math.max(
        0,
        Math.min(Number(value) || 0, ordered)
      );

      field.deliveredQuantity = delivered;
      field.pendingQuantity = Math.max(0, ordered - delivered);

      product.fields[fieldIndex] = field;
      products[productIndex] = product;

      return {
        ...previous,
        products,
      };
    });
  };

  const calculateStatus = (delivery) => {
    if (delivery.deliveryStatus === "Cancelled") {
      return "Cancelled";
    }

    const fields = (delivery.products || []).flatMap(
      (product) => product.fields || []
    );

    if (!fields.length) return "Pending";

    const totalOrdered = fields.reduce(
      (sum, field) => sum + Number(field.orderedQuantity || 0),
      0
    );

    const totalDelivered = fields.reduce(
      (sum, field) => sum + Number(field.deliveredQuantity || 0),
      0
    );

    if (totalDelivered <= 0) return "Pending";
    if (totalDelivered >= totalOrdered) return "Delivered";

    return "Partially Delivered";
  };

  const handleSave = async () => {
    if (!editDelivery?._id) return;

    try {
      setSaving(true);
      setSaveMessage("");
      setStockValidationErrors([]);

      // FRONTEND STOCK VALIDATION
      // Check every requested delivered quantity against the selected order location.
      const locationId = getId(editDelivery.orderId?.assignedLocation);

      if (!locationId) {
        setStockValidationErrors(["Assigned location not found. Cannot validate stock."]);
        return;
      }

      const stockResponse = await api.get("/finished-material-product-stock");
      const stockList = getList(stockResponse);

      // Aggregate duplicate product/field entries before checking availability.
      const requiredStock = new Map();

      (editDelivery.products || []).forEach((product) => {
        const categoryId = getId(product.finishedMaterialCategoryId);
        const productId = getId(product.productId);

        (product.fields || []).forEach((field) => {
          const deliveredQuantity = Number(field.deliveredQuantity || 0);
          if (deliveredQuantity <= 0) return;

          const fieldKey = String(field.fieldName || "").trim().toLowerCase();
          if (!categoryId || !productId || !fieldKey) {
            requiredStock.set(`invalid-${product._id}-${field.fieldId}`, {
              invalid: true,
              productName: product.productName || "Product",
              fieldName: field.fieldName || "Unknown field",
            });
            return;
          }

          const key = `${categoryId}|${productId}|${locationId}|${fieldKey}`;
          const existing = requiredStock.get(key);

          requiredStock.set(key, {
            categoryId,
            productId,
            locationId,
            fieldKey,
            required: deliveredQuantity + Number(existing?.required || 0),
            productName: product.productName || "Product",
            fieldName: field.fieldName || fieldKey,
          });
        });
      });

      const insufficientStock = [];

      requiredStock.forEach((required) => {
        if (required.invalid) {
          insufficientStock.push(
            `${required.productName} - ${required.fieldName}: stock mapping not found`
          );
          return;
        }

        const stockRecord = stockList.find(
          (stock) =>
            getId(stock.locationId) === required.locationId &&
            getId(stock.categoryId) === required.categoryId &&
            getId(stock.productId) === required.productId
        );

        const available = Number(
          stockRecord?.values?.[required.fieldKey] ?? 0
        );

        if (!stockRecord || available < required.required) {
          insufficientStock.push(
            `${required.productName} - ${required.fieldName}: Required ${required.required}, Available ${available}`
          );
        }
      });

      if (insufficientStock.length > 0) {
        setStockValidationErrors(insufficientStock);
        return; // Do not call the Customer Delivery update API.
      }

      const status = calculateStatus(editDelivery);

      const payload = {
          taxAmount: Number(
    editDelivery.orderId?.taxAmount || editDelivery.taxAmount || 0
  ),
        expectedDeliveryDate:
          editDelivery.expectedDeliveryDate || undefined,
        actualDeliveryDate:
          editDelivery.actualDeliveryDate || null,
        deliveryStatus: status,
        products: (editDelivery.products || []).map((product) => ({
          _id: product._id,
          fields: (product.fields || []).map((field) => ({
            fieldId: field.fieldId,
            deliveredQuantity: Number(
              field.deliveredQuantity || 0
            ),
            pendingQuantity: Number(
              field.pendingQuantity || 0
            ),
          })),
        })),
        remarks: editDelivery.remarks || "",
      };

      const response = await api.patch(
        `/customer-delivery/${editDelivery._id}`,
        payload
      );

      const updated = response.data?.data;

      setDeliveries((previous) =>
        previous.map((item) =>
          item._id === editDelivery._id ? updated || item : item
        )
      );

      setEditDelivery(null);
      setSaveMessage("Customer delivery updated successfully.");

      setTimeout(() => {
        setSaveMessage("");
      }, 3000);
    } catch (err) {
      console.error("Failed to update customer delivery:", err);

      setSaveMessage(
        err.response?.data?.message ||
          err.message ||
          "Failed to update customer delivery."
      );
    } finally {
      setSaving(false);
    }
  };

  const renderProducts = (delivery, editable = false) => {
    return (delivery?.products || []).map((product, productIndex) => (
      <div className="delivery-product-card" key={product._id || productIndex}>
        <div className="delivery-product-header">
          <div>
            <strong>{product.productName || "-"}</strong>
            <span>
              {product.finishedMaterialCategoryName || "-"}
              {product.size ? ` • ${product.size}` : ""}
            </span>
          </div>

          <div className="product-amount">
            Amount: ₹{Number(product.amount || 0).toLocaleString("en-IN")}
          </div>
        </div>

        <div className="delivery-fields-table-wrap">
          <table className="delivery-fields-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Ordered</th>
                <th>Delivered</th>
                <th>Pending</th>
              </tr>
            </thead>

            <tbody>
              {(product.fields || []).map((field, fieldIndex) => (
                <tr key={field.fieldId || fieldIndex}>
                  <td>{field.fieldName || "-"}</td>
                  <td>{Number(field.orderedQuantity || 0)}</td>

                  <td>
                    {editable ? (
                      <input
                        className="quantity-input"
                        type="number"
                        min="0"
                        max={Number(field.orderedQuantity || 0)}
                        value={field.deliveredQuantity ?? 0}
                        onChange={(event) =>
                          updateDeliveredQuantity(
                            productIndex,
                            fieldIndex,
                            event.target.value
                          )
                        }
                      />
                    ) : (
                      Number(field.deliveredQuantity || 0)
                    )}
                  </td>

                  <td>
                    <span className="pending-quantity">
                      {Number(field.pendingQuantity || 0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ));
  };

  return (
    <div className="customer-delivery-layout">
      <Sidebar />

      <div className="customer-delivery-main">
        <Header />

        <main className="customer-delivery-content">
          <div className="customer-delivery-breadcrumb">
            Daily Activity <span>›</span> Customer Delivery
          </div>

          <div className="customer-delivery-page-header">
            <div className="page-title-group">
              <div className="page-title-icon">
                <PackageCheck size={22} />
              </div>

              <div>
                <h1>Customer Delivery</h1>
                <p>
                  Track customer deliveries, delivered quantities and
                  pending quantities.
                </p>
              </div>
            </div>

            <div className="customer-delivery-header-actions">
              <button
                type="button"
                className="bulk-payment-open-button"
                onClick={() => setShowBulkPayment(true)}
              >
                Open Bulk Payment
              </button>

              <button
                type="button"
                className="refresh-button"
                onClick={() => fetchDeliveries(true)}
                disabled={refreshing}
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          {saveMessage && (
            <div className="delivery-message">
              {saveMessage}
            </div>
          )}

          {showBulkPayment ? (
            <section className="bulk-payment-screen">
              <div className="bulk-payment-screen-header">
                <div>
                  <h2>Bulk Payment</h2>
                  <p>Allocate one received payment across company pending orders using FIFO.</p>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowBulkPayment(false)}
                >
                  Back to Delivery List
                </button>
              </div>

              <div className="bulk-payment-card">
                <h3>Company Selection</h3>
                <label className="bulk-payment-label" htmlFor="bulk-company-select">
                  Company
                </label>
                <select
                  id="bulk-company-select"
                  className="bulk-payment-select"
                  value={bulkCompanyId}
                  onChange={(event) => handleBulkCompanyChange(event.target.value)}
                >
                  <option value="">Select Company</option>
                  {bulkCompanies.map((company) => (
                    <option key={company._id} value={company._id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>

                {bulkCompanies.length === 0 && (
                  <p className="bulk-payment-note">
                    Company information is not available in the customer delivery response.
                  </p>
                )}

                <h3 className="bulk-section-heading">Company Outstanding Summary</h3>
                <div className="bulk-summary-grid">
                  <div className="bulk-summary-item">
                    <span>Total Pending Orders</span>
                    <strong>{bulkPendingOrders.length}</strong>
                  </div>
                  <div className="bulk-summary-item">
                    <span>Overall Pending</span>
                    <strong>{formatCurrency(bulkTotalPending)}</strong>
                  </div>
                </div>

                <h3 className="bulk-section-heading">Pending Orders</h3>
                <div className="bulk-orders-table-wrap">
                  <table className="bulk-orders-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Pending Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkLoading ? (
                        <tr>
                          <td colSpan="2" className="bulk-empty-cell">Loading pending orders...</td>
                        </tr>
                      ) : bulkPendingOrders.length > 0 ? (
                        bulkPendingOrders.map((order) => (
                          <tr key={order._id || order.orderId}>
                            <td>{order.orderNo || order._id || "-"}</td>
                            <td>{formatCurrency(order.pendingAmount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="2" className="bulk-empty-cell">
                            {bulkCompanyId
                              ? "No pending orders found for this company."
                              : "Select a company to view pending orders."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bulk-payment-card">
                <h3>Received Payment Amount</h3>
                <input
                  className="bulk-received-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter received payment amount"
                  value={bulkReceivedAmount}
                  onChange={(event) => setBulkReceivedAmount(event.target.value)}
                />

                <h3 className="bulk-section-heading">Payment Details</h3>
                <div className="bulk-payment-details-grid">
                  <label className="bulk-payment-label">
                    Payment Date
                    <input
                      className="bulk-received-input"
                      type="date"
                      value={bulkPaymentDate}
                      onChange={(event) => setBulkPaymentDate(event.target.value)}
                    />
                  </label>
                  <label className="bulk-payment-label">
                    Payment Mode
                    <select
                      className="bulk-payment-select"
                      value={bulkPaymentMode}
                      onChange={(event) => setBulkPaymentMode(event.target.value)}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <label className="bulk-payment-label">
                    Reference Number
                    <input
                      className="bulk-received-input"
                      type="text"
                      value={bulkReferenceNumber}
                      onChange={(event) => setBulkReferenceNumber(event.target.value)}
                      placeholder="Transaction / cheque reference"
                    />
                  </label>
                  <label className="bulk-payment-label">
                    Remarks
                    <textarea
                      className="bulk-received-input"
                      rows="2"
                      value={bulkRemarks}
                      onChange={(event) => setBulkRemarks(event.target.value)}
                      placeholder="Optional remarks"
                    />
                  </label>
                </div>

                <div className="bulk-fifo-panel">
                  <h3>Payment Allocation</h3>
                  <strong className="bulk-fifo-label">FIFO</strong>
                  <p>பழைய Pending Order-ல் இருந்து முதலில் Payment Allocate செய்யப்படும்.</p>
                  <div className="bulk-allocation-summary">
                    <div>
                      <span>Allocated</span>
                      <strong>{formatCurrency(bulkAllocatedAmount)}</strong>
                    </div>
                    <div>
                      <span>Remaining Pending</span>
                      <strong>{formatCurrency(Math.max(0, bulkTotalPending - bulkAllocatedAmount))}</strong>
                    </div>
                    {bulkReceived > bulkTotalPending && (
                      <div>
                        <span>Unallocated Payment</span>
                        <strong>{formatCurrency(bulkReceived - bulkAllocatedAmount)}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="bulk-section-heading">Allocation Preview</h3>
                {bulkAllocations.length > 0 ? (
                  <div className="bulk-allocation-list">
                    {bulkAllocations.map((order) => (
                      <div className="bulk-allocation-row" key={order._id}>
                        <strong>{order.orderNo}</strong>
                        <span>Allocated: {formatCurrency(order.allocatedAmount)}</span>
                        <span>Balance: {formatCurrency(order.remainingPending)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="bulk-payment-note">Select a company to preview FIFO allocation.</p>
                )}

                {bulkError && <div className="delivery-error">{bulkError}</div>}
                {bulkSuccess && <div className="delivery-message">{bulkSuccess}</div>}

                <div className="bulk-payment-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleCreateBulkPayment}
                    disabled={bulkSaving || bulkLoading || !bulkCompanyId || bulkAllocatedAmount <= 0}
                  >
                    {bulkSaving ? "Saving Payment..." : "Save Bulk Payment"}
                  </button>
                </div>
                <p className="bulk-payment-note">
                  Payment will be allocated to the oldest pending orders first (FIFO).
                </p>
              </div>

              <div className="bulk-payment-card bulk-history-card">
                <div className="bulk-history-header">
                  <div>
                    <h3>Bulk Payment History</h3>
                    <p>View previous payments and edit payment details.</p>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={fetchBulkPayments}
                    disabled={bulkHistoryLoading}
                  >
                    <RefreshCw
                      size={15}
                      className={bulkHistoryLoading ? "spin" : ""}
                    />
                    Refresh
                  </button>
                </div>

                <div className="bulk-orders-table-wrap">
                  <table className="bulk-orders-table">
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Payment Date</th>
                        <th>Company</th>
                        <th>Received Amount</th>
                        <th>Allocated</th>
                        <th>Unallocated</th>
                        <th>Payment Mode</th>
                        <th>Reference</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkHistoryLoading ? (
                        <tr>
                          <td colSpan="9" className="bulk-empty-cell">
                            Loading bulk payment history...
                          </td>
                        </tr>
                      ) : bulkPayments.length ? (
                        bulkPayments.map((payment, index) => {
                          const allocated = Array.isArray(payment.allocations)
                            ? payment.allocations.reduce(
                                (sum, item) =>
                                  sum + Number(
                                    item.allocatedAmount ??
                                      item.amount ??
                                      0
                                  ),
                                0
                              )
                            : Number(payment.allocatedAmount || 0);

                          const companyName =
                            payment.companyId?.companyName ||
                            payment.companyName ||
                            "-";

                          return (
                            <tr key={payment._id}>
                              <td>{index + 1}</td>
                              <td>{formatDate(payment.paymentDate || payment.createdAt)}</td>
                              <td>{companyName}</td>
                              <td>{formatCurrency(payment.receivedAmount)}</td>
                              <td>{formatCurrency(allocated)}</td>
                              <td>{formatCurrency(payment.unallocatedAmount)}</td>
                              <td>{payment.paymentMode || "-"}</td>
                              <td>{payment.referenceNumber || "-"}</td>
                              <td>
                                <div className="delivery-actions">
                                  <button
                                    type="button"
                                    className="view-action"
                                    onClick={() => openBulkPaymentView(payment)}
                                    title="View bulk payment"
                                  >
                                    <Eye size={15} />
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    className="edit-action"
                                    onClick={() => openBulkPaymentEdit(payment)}
                                    title="Edit bulk payment"
                                  >
                                    <Pencil size={15} />
                                    Edit
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="9" className="bulk-empty-cell">
                            No bulk payment history found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : (
            <section className="delivery-list-card">
            <div className="delivery-card-header">
              <div>
                <h2>Delivery List</h2>
                <p>
                  {filteredDeliveries.length} delivery
                  {filteredDeliveries.length !== 1 ? "ies" : ""} found
                </p>
              </div>

              <div className="delivery-search">
                <Search size={17} />
                <input
                  type="text"
                  placeholder="Search delivery, order or customer..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="delivery-status-tabs">
              {DELIVERY_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={
                    activeStatus === status
                      ? "delivery-tab active"
                      : "delivery-tab"
                  }
                  onClick={() => setActiveStatus(status)}
                >
                  {status}
                  <span>{statusCounts[status] || 0}</span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="delivery-empty">
                Loading customer deliveries...
              </div>
            ) : error ? (
              <div className="delivery-error">{error}</div>
            ) : filteredDeliveries.length === 0 ? (
              <div className="delivery-empty">
                No customer deliveries found.
              </div>
            ) : (
              <div className="delivery-table-wrap">
                <table className="delivery-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Delivery No</th>
                      <th>Order No</th>
                      <th>Customer</th>
                      <th>Company</th>
                      <th>Location</th>
                      <th>Tax Amount</th>
                      <th>Total Amount</th>
                      <th>Pending Amount</th>
                      <th>Expected Date</th>
                      <th>Actual Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredDeliveries.map((delivery, index) => {
                      const status =
                        delivery.deliveryStatus || "Pending";

                      return (
                        <tr key={delivery._id}>
                          <td>{index + 1}</td>
                          <td>
                            <strong>{delivery.deliveryNo || "-"}</strong>
                          </td>
                          <td>{getOrderNo(delivery)}</td>
                          <td>{delivery.customerName || "-"}</td>
                          <td>{getCompanyName(delivery)}</td>
                          <td>{getLocationName(delivery)}</td>
                          <td>
                            ₹{Number(delivery.orderId?.taxAmount || 0).toLocaleString("en-IN")}
                          </td>
                          <td>
                            ₹{Number(delivery.orderId?.totalAmount || 0).toLocaleString("en-IN")}
                          </td>
                          <td>
                            ₹{Number(delivery.orderId?.pendingAmount || 0).toLocaleString("en-IN")}
                          </td>
                          <td>{formatDate(delivery.expectedDeliveryDate)}</td>
                          <td>{formatDate(delivery.actualDeliveryDate)}</td>
                          <td>
                            <span
                              className={`delivery-status-badge ${getStatusClass(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </td>
                          <td>
                            <div className="delivery-actions">
                              <button
                                type="button"
                                className="view-action"
                                onClick={() =>
                                  setViewDelivery(delivery)
                                }
                                title="View"
                              >
                                <Eye size={16} />
                                View
                              </button>

                              <button
                                type="button"
                                className="edit-action"
                                onClick={() => openEdit(delivery)}
                                title="Edit"
                              >
                                <Pencil size={16} />
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            </section>
          )}
        </main>
      </div>

      {viewBulkPayment && (
        <div
          className="delivery-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewBulkPayment(null);
            }
          }}
        >
          <div className="delivery-modal large-modal">
            <div className="delivery-modal-header">
              <div>
                <h2>Bulk Payment Details</h2>
                <p>{viewBulkPayment._id}</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setViewBulkPayment(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="delivery-details-grid">
              <div className="detail-item">
                <span>Company</span>
                <strong>
                  {viewBulkPayment.companyId?.companyName ||
                    viewBulkPayment.companyName ||
                    "-"}
                </strong>
              </div>
              <div className="detail-item">
                <span>Payment Date</span>
                <strong>{formatDate(viewBulkPayment.paymentDate)}</strong>
              </div>
              <div className="detail-item">
                <span>Received Amount</span>
                <strong>{formatCurrency(viewBulkPayment.receivedAmount)}</strong>
              </div>
              <div className="detail-item">
                <span>Payment Mode</span>
                <strong>{viewBulkPayment.paymentMode || "-"}</strong>
              </div>
              <div className="detail-item">
                <span>Reference Number</span>
                <strong>{viewBulkPayment.referenceNumber || "-"}</strong>
              </div>
              <div className="detail-item">
                <span>Unallocated Amount</span>
                <strong>{formatCurrency(viewBulkPayment.unallocatedAmount)}</strong>
              </div>
            </div>

            <div className="delivery-products-section">
              <div className="section-title">
                <FileText size={18} />
                <h3>Order Allocations</h3>
              </div>
              <div className="bulk-orders-table-wrap">
                <table className="bulk-orders-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Allocated Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewBulkPayment.allocations || []).length ? (
                      viewBulkPayment.allocations.map((allocation, index) => {
                        const order = allocation.orderId || allocation.order || {};
                        return (
                          <tr key={allocation._id || index}>
                            <td>
                              {order.orderNo ||
                                allocation.orderNo ||
                                getId(allocation.orderId) ||
                                "-"}
                            </td>
                            <td>
                              {formatCurrency(
                                allocation.allocatedAmount ?? allocation.amount
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="2" className="bulk-empty-cell">
                          No allocation details available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="delivery-products-section">
              <div className="section-title">
                <RefreshCw size={18} />
                <h3>Payment Edit History</h3>
              </div>

              <div className="bulk-orders-table-wrap">
                <table className="bulk-orders-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Action</th>
                      <th>Updated Date</th>
                      <th>Old Amount</th>
                      <th>New Amount</th>
                      <th>Changed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewBulkPayment.allocationHistory || []).length ? (
                      [...viewBulkPayment.allocationHistory]
                        .sort(
                          (a, b) =>
                            new Date(a.changedAt || 0) -
                            new Date(b.changedAt || 0)
                        )
                        .map((history, index) => (
                          <tr key={history._id || index}>
                            <td>{index + 1}</td>
                            <td>
                              {history.action === "created" ? "Created" : "Edited"}
                            </td>
                            <td>
                              {history.changedAt
                                ? new Date(history.changedAt).toLocaleString("en-IN")
                                : "-"}
                            </td>
                            <td>{formatCurrency(history.oldAmount)}</td>
                            <td>{formatCurrency(history.newAmount)}</td>
                            <td>
                              {history.changedBy?.name ||
                                history.changedBy?.email ||
                                (history.changedBy ? getId(history.changedBy) : "-")}
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="bulk-empty-cell">
                          No edit history found for this payment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {viewBulkPayment.remarks && (
              <div className="remarks-box">
                <strong>Remarks</strong>
                <p>{viewBulkPayment.remarks}</p>
              </div>
            )}

            <div className="delivery-modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setViewBulkPayment(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editBulkPayment && (
        <div
          className="delivery-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !bulkEditSaving
            ) {
              setEditBulkPayment(null);
            }
          }}
        >
          <div className="delivery-modal large-modal">
            <div className="delivery-modal-header">
              <div>
                <h2>Edit Bulk Payment</h2>
                <p>
                  Update payment details. Allocations will be recalculated using FIFO.
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditBulkPayment(null)}
                disabled={bulkEditSaving}
              >
                <X size={20} />
              </button>
            </div>

            <div className="delivery-details-grid">
              <div className="detail-item">
                <span>Company</span>
                <strong>
                  {editBulkPayment.companyId?.companyName ||
                    editBulkPayment.companyName ||
                    "-"}
                </strong>
              </div>
              <label className="form-field">
                <span>Received Amount</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editBulkPayment.receivedAmount}
                  onChange={(event) =>
                    setEditBulkPayment((previous) => ({
                      ...previous,
                      receivedAmount: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="form-field">
                <span>Payment Date</span>
                <input
                  type="date"
                  value={editBulkPayment.paymentDate || ""}
                  onChange={(event) =>
                    setEditBulkPayment((previous) => ({
                      ...previous,
                      paymentDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="form-field">
                <span>Payment Mode</span>
                <select
                  value={editBulkPayment.paymentMode || "Cash"}
                  onChange={(event) =>
                    setEditBulkPayment((previous) => ({
                      ...previous,
                      paymentMode: event.target.value,
                    }))
                  }
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label className="form-field">
                <span>Reference Number</span>
                <input
                  type="text"
                  value={editBulkPayment.referenceNumber || ""}
                  onChange={(event) =>
                    setEditBulkPayment((previous) => ({
                      ...previous,
                      referenceNumber: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <label className="form-field remarks-field">
              <span>Remarks</span>
              <textarea
                rows="3"
                value={editBulkPayment.remarks || ""}
                onChange={(event) =>
                  setEditBulkPayment((previous) => ({
                    ...previous,
                    remarks: event.target.value,
                  }))
                }
                placeholder="Optional remarks"
              />
            </label>

            {bulkEditMessage && (
              <div className="delivery-error">{bulkEditMessage}</div>
            )}

            <div className="delivery-modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setEditBulkPayment(null)}
                disabled={bulkEditSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleUpdateBulkPayment}
                disabled={bulkEditSaving}
              >
                <Save size={16} />
                {bulkEditSaving ? "Updating..." : "Update Bulk Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewDelivery && (
        <div
          className="delivery-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewDelivery(null);
            }
          }}
        >
          <div className="delivery-modal large-modal">
            <div className="delivery-modal-header">
              <div>
                <h2>Customer Delivery Details</h2>
                <p>{viewDelivery.deliveryNo || "-"}</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setViewDelivery(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="delivery-details-grid">
              <div className="detail-item">
                <span>Delivery No</span>
                <strong>{viewDelivery.deliveryNo || "-"}</strong>
              </div>

              <div className="detail-item">
                <span>Order No</span>
                <strong>{getOrderNo(viewDelivery)}</strong>
              </div>

              <div className="detail-item">
                <span>Customer</span>
                <strong>{viewDelivery.customerName || "-"}</strong>
              </div>

              <div className="detail-item">
                <span>Company</span>
                <strong>{getCompanyName(viewDelivery)}</strong>
              </div>

              <div className="detail-item">
                <span>Location</span>
                <strong>{getLocationName(viewDelivery)}</strong>
              </div>

              <div className="detail-item">
                <span>Status</span>
                <span
                  className={`delivery-status-badge ${getStatusClass(
                    viewDelivery.deliveryStatus || "Pending"
                  )}`}
                >
                  {viewDelivery.deliveryStatus || "Pending"}
                </span>
              </div>

              <div className="detail-item">
                <span>Expected Delivery</span>
                <strong>
                  {formatDate(viewDelivery.expectedDeliveryDate)}
                </strong>
              </div>

              <div className="detail-item">
                <span>Actual Delivery</span>
                <strong>
                  {formatDate(viewDelivery.actualDeliveryDate)}
                </strong>
              </div>
            </div>

            <div className="delivery-products-section">
              <div className="section-title">
                <PackageCheck size={18} />
                <h3>Products & Delivery Quantity</h3>
              </div>

              {renderProducts(viewDelivery)}
            </div>

            {viewDelivery.remarks && (
              <div className="remarks-box">
                <strong>Remarks</strong>
                <p>{viewDelivery.remarks}</p>
              </div>
            )}

            <div className="delivery-modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setViewDelivery(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editDelivery && (
        <div
          className="delivery-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEditDelivery(null);
            }
          }}
        >
          <div className="delivery-modal large-modal">
            <div className="delivery-modal-header">
              <div>
                <h2>Edit Customer Delivery</h2>
                <p>
                  Update delivery date and delivered quantities.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setEditDelivery(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="delivery-details-grid">
              <div className="detail-item">
                <span>Delivery No</span>
                <strong>{editDelivery.deliveryNo || "-"}</strong>
              </div>

              <div className="detail-item">
                <span>Order No</span>
                <strong>{getOrderNo(editDelivery)}</strong>
              </div>

              <div className="detail-item">
                <span>Customer</span>
                <strong>{editDelivery.customerName || "-"}</strong>
              </div>

              <div className="detail-item">
                <span>Company</span>
                <strong>{getCompanyName(editDelivery)}</strong>
              </div>

              <div className="detail-item">
                <span>Location</span>
                <strong>{getLocationName(editDelivery)}</strong>
              </div>

              <div className="detail-item">
                <span>Current Status</span>
                <span
                  className={`delivery-status-badge ${getStatusClass(
                    calculateStatus(editDelivery)
                  )}`}
                >
                  {calculateStatus(editDelivery)}
                </span>
              </div>

              <label className="form-field">
                <span>Expected Delivery Date</span>
                <div className="input-with-icon">
                  <CalendarDays size={16} />
                  <input
                    type="date"
                    value={editDelivery.expectedDeliveryDate || ""}
                    onChange={(event) =>
                      setEditDelivery((previous) => ({
                        ...previous,
                        expectedDeliveryDate: event.target.value,
                      }))
                    }
                  />
                </div>
              </label>

              <label className="form-field">
                <span>Actual Delivery Date</span>
                <div className="input-with-icon">
                  <CalendarDays size={16} />
                  <input
                    type="date"
                    value={editDelivery.actualDeliveryDate || ""}
                    onChange={(event) =>
                      setEditDelivery((previous) => ({
                        ...previous,
                        actualDeliveryDate: event.target.value,
                      }))
                    }
                  />
                </div>
              </label>
            </div>

            <div className="delivery-products-section">
              <div className="section-title">
                <PackageCheck size={18} />
                <h3>Delivery Quantity</h3>
              </div>

              <p className="edit-help-text">
                Ordered quantity cannot be changed. Update only the
                delivered quantity.
              </p>

              {renderProducts(editDelivery, true)}
            </div>

            <label className="form-field remarks-field">
              <span>Remarks</span>
              <textarea
                rows="3"
                value={editDelivery.remarks || ""}
                onChange={(event) =>
                  setEditDelivery((previous) => ({
                    ...previous,
                    remarks: event.target.value,
                  }))
                }
                placeholder="Enter delivery remarks..."
              />
            </label>

            <div className="delivery-modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setEditDelivery(null)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={16} />
                {saving ? "Updating..." : "Update Delivery"}
              </button>
            </div>
          </div>
        </div>
      )}

      {stockValidationErrors.length > 0 && (
        <div
          className="delivery-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setStockValidationErrors([]);
            }
          }}
        >
          <div className="delivery-modal" role="alertdialog" aria-modal="true">
            <div className="delivery-modal-header">
              <div>
                <h2 style={{ color: "#dc2626" }}>Stock Not Available</h2>
                <p>Please check the available stock before updating this delivery.</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setStockValidationErrors([])}
                aria-label="Close stock validation popup"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "20px 22px" }}>
              <p style={{ margin: "0 0 12px", color: "#334155", fontWeight: 600 }}>
                The delivery was not updated. Insufficient stock was found for:
              </p>
              <ul style={{ margin: 0, paddingLeft: 22, color: "#b91c1c", lineHeight: 1.8 }}>
                {stockValidationErrors.map((message, index) => (
                  <li key={`${index}-${message}`}>{message}</li>
                ))}
              </ul>
            </div>

            <div className="delivery-modal-footer">
              <button
                type="button"
                className="primary-button"
                onClick={() => setStockValidationErrors([])}
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerDelivery;
