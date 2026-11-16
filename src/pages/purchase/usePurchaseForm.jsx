import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

/* =========================================================
   CONSTANTS + HELPERS
========================================================= */

export const PURCHASE_TYPES = [
  { value: "item", label: "Item" },
  { value: "nail", label: "Nail" },
  { value: "consumable", label: "Consumable" },
];

const getToday = () => new Date().toISOString().split("T")[0];

const normalizeKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const createPiece = () => ({
  id: `${Date.now()}-${Math.random()}`,
  pieceSizeId: "",
  width: "",
  inch: "",
  feet: "",
  count: "",
});

const createInitialForm = () => ({
  purchaseNo: "",
  purchaseDate: getToday(),
  locationId: "",
  type: "item",
  category: "",
  referenceId: "",
  quantity: "",
  unit: "kg",
  cft: "",
  cubicMeter: "",
  supplierName: "",
  supplierPhone: "",
  supplierAddress: "",
  amount: "",
  taxAmount: "",
  remarks: "",
});

const emptyToast = { show: false, type: "", title: "", message: "" };

// populated object ({ _id, name }) or plain id -> id
const toId = (value) =>
  (value && typeof value === "object" ? value._id : value) || "";

const toInputDate = (value) => (value ? String(value).slice(0, 10) : "");

// ISO / Date -> "YYYY-MM-DDTHH:mm" in LOCAL time (value for <input type="datetime-local">)
export const toInputDateTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// current local date + time
export const getNowLocal = () => toInputDateTime(new Date());

// "11/11/2026 12:53 pm"
export const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(",", "");
};

export const formatMoney = (value) => Number(value || 0).toLocaleString("en-IN");

export const formatDate = (date) => {
  if (!date) return "-";
  const [year, month, day] = String(date).slice(0, 10).split("-");
  return `${day}-${month}-${year}`;
};

/* =========================================================
   HOOK
========================================================= */

export default function usePurchaseForm(purchaseId) {
  const navigate = useNavigate();
  const isEdit = Boolean(purchaseId);

  // ---------- master data ----------
  const [locations, setLocations] = useState([]);
  const [itemCategories, setItemCategories] = useState([]);
  const [itemsMaster, setItemsMaster] = useState([]);
  const [nailsMaster, setNailsMaster] = useState([]);
  const [consumablesMaster, setConsumablesMaster] = useState([]);
  const [pieceSizes, setPieceSizes] = useState([]);

  // ---------- form ----------
  const [form, setForm] = useState(createInitialForm());
  const [pieces, setPieces] = useState([createPiece()]);
  const [paymentHistory, setPaymentHistory] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // used to reload <PurchaseList /> after save
  const [refreshKey, setRefreshKey] = useState(0);

  // ---------- toast ----------
  const [toast, setToast] = useState(emptyToast);

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => setToast(emptyToast), 3000);
  };

  const closeToast = () => setToast(emptyToast);

  // ---------- load master data ----------
  useEffect(() => {
    const loadMasters = async () => {
      try {
        setLoading(true);

        const [loc, cat, items, nails, consumables, sizes] = await Promise.all([
          api.get("/locations"),
          api.get("/item-categories"),
          api.get("/items"),
          api.get("/nails"),
          api.get("/consumables"),
          api.get("/piece-size"),
        ]);

        const locationData = loc.data?.data || [];

        setLocations(locationData);
        setItemCategories(cat.data?.data || []);
        setItemsMaster(items.data?.data || []);
        setNailsMaster(nails.data?.data || []);
        setConsumablesMaster(consumables.data?.data || []);
        setPieceSizes(sizes.data?.data || []);

        if (locationData.length > 0) {
          setForm((current) => ({
            ...current,
            locationId: current.locationId || locationData[0]._id,
          }));
        }
      } catch (error) {
        console.error("Purchase master load error:", error);
        showToast(
          "error",
          "Error",
          error.response?.data?.message || "Failed to load purchase data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadMasters();
  }, []);

  // ---------- load purchase (edit mode) ----------
  const loadPurchase = async () => {
    try {
      setLoading(true);

      const response = await api.get(`/purchases/${purchaseId}`);
      const p = response.data?.data;

      if (!p) return;

      setForm({
        ...createInitialForm(),
        purchaseNo: p.purchaseNo || "",
        purchaseDate: toInputDate(p.purchaseDate) || getToday(),
        locationId: toId(p.location),
        type: p.type || "item",
        category: toId(p.category),
        referenceId: toId(p.referenceId),
        quantity: p.quantity ?? "",
        unit: p.unit || "kg",
        cft: p.cft ?? "",
        cubicMeter: p.cubicMeter ?? "",
        supplierName: p.supplierName || "",
        supplierPhone: p.supplierPhone || "",
        supplierAddress: p.supplierAddress || "",
        amount: p.amount ?? "",
        taxAmount: p.taxAmount ?? "",
        remarks: p.remarks || "",
      });

      setPieces(
        p.pieces?.length
          ? p.pieces.map((piece) => ({
              id: `${Date.now()}-${Math.random()}`,
              pieceSizeId: toId(piece.pieceSizeId),
              width: piece.width ?? "",
              inch: piece.inch ?? "",
              feet: piece.feet ?? "",
              count: piece.count ?? "",
            }))
          : [createPiece()]
      );

      if (p.paymentHistory?.length) {
        setPaymentHistory(
          p.paymentHistory.map((payment) => ({
            id: `${Date.now()}-${Math.random()}`,
            _id: payment._id, // DB id, sent back so the backend knows it is an existing payment
            saved: true, // already stored in DB => edit only, no delete
            paymentDate: toInputDateTime(payment.paymentDate) || getNowLocal(),
            amount: Number(payment.amount || 0),
            paymentMode: payment.paymentMode || "Cash",
            referenceNo: payment.referenceNo || "",
            remarks: payment.remarks || "",
          }))
        );
      } else if (Number(p.paidAmount || 0) > 0) {
        // old record: only paidAmount was saved, so keep it as one opening payment
        setPaymentHistory([
          {
            id: `${Date.now()}-${Math.random()}`,
            saved: true,
            paymentDate: toInputDateTime(p.purchaseDate) || getNowLocal(),
            amount: Number(p.paidAmount),
            paymentMode: "Cash",
            referenceNo: "",
            remarks: "Opening payment",
          },
        ]);
      } else {
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error("Load purchase error:", error);
      showToast(
        "error",
        "Error",
        error.response?.data?.message || "Failed to load purchase."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEdit) loadPurchase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseId]);

  // ---------- derived values ----------
  const selectedCategory = itemCategories.find(
    (category) => String(category._id) === String(form.category)
  );

  const categoryKey = normalizeKey(selectedCategory?.name);

  const isItem = form.type === "item";
  const isNewItem = isItem && categoryKey === "newitem";
  const showQuantity = !isNewItem && (!isItem || categoryKey === "useditem");

  const itemOptions =
    form.type === "item"
      ? itemsMaster
      : form.type === "nail"
      ? nailsMaster
      : consumablesMaster;

  // Total = Amount + Tax, Paid = sum of payments, Pending = Total - Paid
  const round2 = (number) => Math.round((number + Number.EPSILON) * 100) / 100;

  const totalAmount = round2(
    Number(form.amount || 0) + Number(form.taxAmount || 0)
  );

  const paidAmount = round2(
    paymentHistory.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  );

  const pendingAmount = round2(Math.max(totalAmount - paidAmount, 0));

  const paymentStatus =
    totalAmount > 0 && pendingAmount === 0
      ? "Paid"
      : paidAmount > 0
      ? "Partially Paid"
      : "Unpaid";

  // ---------- form handlers ----------
  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleTypeChange = (event) => {
    const { value } = event.target;

    setForm((current) => ({
      ...current,
      type: value,
      category: "",
      referenceId: "",
      quantity: "",
      cft: "",
      cubicMeter: "",
    }));

    setPieces([createPiece()]);
  };

  const handleCategoryChange = (event) => {
    const { value } = event.target;

    setForm((current) => ({
      ...current,
      category: value,
      quantity: "",
      cft: "",
      cubicMeter: "",
    }));

    setPieces([createPiece()]);
  };

  const handleItemChange = (event) => {
    const { value } = event.target;

    const master = itemOptions.find((item) => String(item._id) === String(value));

    setForm((current) => ({
      ...current,
      referenceId: value,
      unit: master?.unit || current.unit || "kg",
    }));
  };

  // ---------- pieces ----------
  const handlePieceSizeChange = (id, pieceSizeId) => {
    const selectedSize = pieceSizes.find(
      (pieceSize) => String(pieceSize._id) === String(pieceSizeId)
    );

    setPieces((current) =>
      current.map((piece) =>
        piece.id === id
          ? {
              ...piece,
              pieceSizeId,
              width: selectedSize?.width ?? "",
              inch: selectedSize?.inch ?? "",
              feet: selectedSize?.feet ?? "",
            }
          : piece
      )
    );
  };

  const handlePieceChange = (id, field, value) =>
    setPieces((current) =>
      current.map((piece) => (piece.id === id ? { ...piece, [field]: value } : piece))
    );

  const addPiece = () => setPieces((current) => [...current, createPiece()]);

  const removePiece = (id) =>
    setPieces((current) =>
      current.length === 1 ? [createPiece()] : current.filter((piece) => piece.id !== id)
    );

  // ---------- payments ----------
  // new payment => saved: false (edit + delete allowed until it is stored)
  const addPayment = (payment) =>
    setPaymentHistory((current) => [
      ...current,
      { id: `${Date.now()}-${Math.random()}`, ...payment, saved: false },
    ]);

  // edit keeps the same id and the same saved flag
  const updatePayment = (id, data) =>
    setPaymentHistory((current) =>
      current.map((payment) =>
        payment.id === id ? { ...payment, ...data } : payment
      )
    );

  const removePayment = (id) =>
    setPaymentHistory((current) =>
      current.filter((payment) => payment.id !== id)
    );

  // ---------- reset ----------
  const handleReset = () => {
    // edit mode: reset = reload the saved purchase
    if (isEdit) {
      loadPurchase();
      return;
    }

    setForm((current) => ({
      ...createInitialForm(),
      locationId: locations[0]?._id || current.locationId,
    }));

    setPieces([createPiece()]);
    setPaymentHistory([]);
  };

  // ---------- save ----------
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.referenceId) {
      showToast("error", "Item Required", "Please select an item.");
      return;
    }

    if (isItem && !form.category) {
      showToast("error", "Category Required", "Please select a category.");
      return;
    }

    if (!form.supplierName.trim()) {
      showToast("error", "Supplier Required", "Please enter the supplier name.");
      return;
    }

    const usedPieces = pieces
      .filter((piece) => Number(piece.count || 0) > 0)
      .map((piece) => ({
        pieceSizeId: piece.pieceSizeId,
        width: Number(piece.width || 0),
        inch: Number(piece.inch || 0),
        feet: Number(piece.feet || 0),
        count: Number(piece.count || 0),
      }));

    if (isNewItem) {
      const hasValue =
        Number(form.cft || 0) > 0 ||
        Number(form.cubicMeter || 0) > 0 ||
        usedPieces.length > 0;

      if (usedPieces.some((piece) => !piece.pieceSizeId)) {
        showToast(
          "error",
          "Piece Size Required",
          "Please select a piece size for every added piece."
        );
        return;
      }

      if (!hasValue) {
        showToast(
          "error",
          "Stock Details Required",
          "Enter CFT, cubic meter or piece counts."
        );
        return;
      }
    } else if (Number(form.quantity || 0) <= 0) {
      showToast("error", "Quantity Required", "Enter a quantity greater than 0.");
      return;
    }

    if (totalAmount <= 0) {
      showToast("error", "Amount Required", "Enter the purchase amount.");
      return;
    }

    if (paidAmount > totalAmount) {
      showToast(
        "error",
        "Paid Amount Too High",
        "Paid amount cannot be more than the total amount."
      );
      return;
    }

    const payload = {
      purchaseNo: form.purchaseNo.trim(),
      purchaseDate: form.purchaseDate,
      location: form.locationId,
      type: form.type,

      ...(isItem && { category: form.category }),

      referenceId: form.referenceId,

      ...(isNewItem
        ? {
            cft: Number(form.cft || 0),
            cubicMeter: Number(form.cubicMeter || 0),
            pieces: usedPieces,
          }
        : {
            quantity: Number(form.quantity || 0),
            unit: form.unit,
          }),

      supplierName: form.supplierName.trim(),
      supplierPhone: form.supplierPhone.trim(),
      supplierAddress: form.supplierAddress.trim(),

      amount: Number(form.amount || 0),
      taxAmount: Number(form.taxAmount || 0),
      totalAmount,

      paidAmount,
      pendingAmount,
      paymentStatus,
      paymentHistory: paymentHistory.map((payment) => ({
        // existing (saved) payments carry their DB _id, new payments have none
        ...(payment._id && { _id: payment._id }),
        // "2026-11-11T12:53" (local) -> "2026-11-11T07:23:00.000Z" (ISO, with time)
        paymentDate: new Date(payment.paymentDate).toISOString(),
        amount: Number(payment.amount),
        paymentMode: payment.paymentMode,
        referenceNo: String(payment.referenceNo || "").trim(),
        remarks: String(payment.remarks || "").trim(),
      })),

      remarks: form.remarks.trim(),
    };

    try {
      setSaving(true);

      if (isEdit) {
        await api.patch(`/purchases/${purchaseId}`, payload);

        showToast(
          "success",
          "Purchase Updated",
          "Purchase updated successfully."
        );

        setTimeout(() => navigate("/master/purchase"), 1000);
      } else {
        await api.post("/purchases", payload);

        showToast("success", "Purchase Saved", "Purchase saved successfully.");

        handleReset();
        setRefreshKey((key) => key + 1);
      }
    } catch (error) {
      console.error("Save purchase error:", error);

      showToast(
        "error",
        "Save Failed",
        error.response?.data?.message || "Failed to save purchase."
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    // master data
    locations,
    itemCategories,
    itemOptions,
    pieceSizes,

    // form state
    form,
    pieces,
    paymentHistory,
    loading,
    saving,
    refreshKey,
    toast,

    // derived
    totalAmount,
    paidAmount,
    pendingAmount,
    paymentStatus,
    isEdit,
    isItem,
    isNewItem,
    showQuantity,

    // handlers
    closeToast,
    handleChange,
    handleTypeChange,
    handleCategoryChange,
    handleItemChange,
    handlePieceSizeChange,
    handlePieceChange,
    addPiece,
    removePiece,
    addPayment,
    updatePayment,
    removePayment,
    handleReset,
    handleSubmit,
  };
}
