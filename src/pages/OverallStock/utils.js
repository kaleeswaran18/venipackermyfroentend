export const getList = (response) => {
  const payload = response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
};

export const getId = (value) => {
  if (!value) return null;
  if (typeof value === "object") {
    return value._id || value.id || null;
  }
  return value;
};

export const getName = (value) => {
  if (!value) return "-";
  if (typeof value === "object") {
    return value.name || "-";
  }
  return String(value);
};

export const getOptionName = (item) =>
  item?.name ||
  item?.itemName ||
  item?.nailName ||
  item?.consumableName ||
  item?.item?.name ||
  "";

export const getDisplayName = (value, list = []) => {
  const id = getId(value);

  const found = list.find(
    (item) => String(getId(item)) === String(id)
  );

  if (found) return getOptionName(found);

  if (value && typeof value === "object") {
    return getOptionName(value) || "-";
  }

  return id || "-";
};

export const normalize = (text) =>
  String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

export const getNumericValues = (values = {}) =>
  Object.values(values).filter(
    (value) =>
      typeof value === "number" && Number.isFinite(value)
  );

export const sumNumbers = (values = []) =>
  values.reduce(
    (total, value) => total + Number(value || 0),
    0
  );

export const formatQuantity = (row) =>
  row.quantity !== undefined && row.quantity !== null
    ? `${row.quantity} ${row.unit || ""}`.trim()
    : "-";