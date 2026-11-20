
import { useMemo, useState } from "react";
import { Package, Hammer, Droplets } from "lucide-react";

import StockTable from "./StockTable";
import { getId, getDisplayName, normalize } from "../utils";

const CATEGORY_TABS = [
  { key: "items", label: "Items", Icon: Package },
  { key: "nails", label: "Nails", Icon: Hammer },
  { key: "consumables", label: "Consumables", Icon: Droplets },
];

const ITEM_KIND_TABS = [
  { key: "new", label: "New Item" },
  { key: "used", label: "Used Item" },
];

// Calculate individual piece CFT
const getPieceCft = (piece) => {
  const width = Number(piece.width || 0);
  const height = Number(piece.height || 0);
  const inch = Number(piece.inch || 0);
  const count = Number(piece.count || 0);

  return (width * height * inch * count) / 1728;
};

// Calculate total CFT from pieces
const getTotalCft = (pieces = []) => {
  return pieces.reduce(
    (total, piece) => total + getPieceCft(piece),
    0
  );
};

// Convert CFT to Cubic Meter
const getCubicMeter = (cft) => cft * 0.0283168;

function CategoryStockSection({
  openingStocks,
  location,
  locationName,
  scope,
  itemCategories,
  itemsMaster,
  nailsMaster,
  consumablesMaster,
}) {
  const [activeCategory, setActiveCategory] = useState("items");
  const [itemKind, setItemKind] = useState("new");

  const categoryStock = useMemo(() => {
    const result = {
      newItems: [],
      usedItems: [],
      nails: [],
      consumables: [],
    };

    openingStocks.forEach((record) => {
      const recordLocationId = getId(record.location);

      if (
        location &&
        recordLocationId &&
        String(recordLocationId) !== String(location)
      ) {
        return;
      }

      const nameList =
        record.type === "item"
          ? itemsMaster
          : record.type === "nail"
          ? nailsMaster
          : consumablesMaster;

      const pieces = record.pieces || [];

      // Calculate overall CFT and Cubic Meter from pieces
      const totalCft =
        record.type === "item" &&
        normalize(getDisplayName(record.category, itemCategories)) === "newitem"
          ? getTotalCft(pieces)
          : Number(record.cft || 0);

      const totalCubicMeter =
        record.type === "item" &&
        normalize(getDisplayName(record.category, itemCategories)) === "newitem"
          ? getCubicMeter(totalCft)
          : Number(record.cubicMeter || 0);

      const row = {
        id: record._id || record.id,
        category: getDisplayName(record.category, itemCategories),
        name: getDisplayName(record.referenceId, nameList),
        quantity: record.quantity,
        unit: record.unit || "kg",
        cft: totalCft,
        cubicMeter: totalCubicMeter,
        pieces,
        createdAt: record.createdAt,
      };

      if (record.type === "item") {
        const categoryName = normalize(row.category);

        if (categoryName === "useditem") {
          result.usedItems.push(row);
        } else if (categoryName === "newitem") {
          result.newItems.push(row);
        }
      } else if (record.type === "nail") {
        result.nails.push(row);
      } else if (record.type === "consumable") {
        result.consumables.push(row);
      }
    });

    return result;
  }, [
    openingStocks,
    location,
    itemCategories,
    itemsMaster,
    nailsMaster,
    consumablesMaster,
  ]);

  const tabCounts = {
    items: categoryStock.newItems.length + categoryStock.usedItems.length,
    nails: categoryStock.nails.length,
    consumables: categoryStock.consumables.length,
  };

  return (
    <section className="overall-card">
      <div className="card-heading">
        <span className="heading-icon heading-icon-orange">
          <Package size={26} />
        </span>

        <h2>Category Stock ({scope})</h2>
      </div>

      {/* Main tabs */}
      <div className="cat-tabs" role="tablist">
        {CATEGORY_TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeCategory === key}
            className={`cat-tab ${
              activeCategory === key ? "cat-tab-active" : ""
            }`}
            onClick={() => setActiveCategory(key)}
          >
            <Icon size={18} />
            <span>{label}</span>
            <span className="cat-tab-count">{tabCounts[key]}</span>
          </button>
        ))}
      </div>

      {/* Items → New / Used sub tabs */}
      {activeCategory === "items" && (
        <>
          <div className="kind-tabs" role="tablist">
            {ITEM_KIND_TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={itemKind === key}
                className={`kind-tab ${
                  itemKind === key ? "kind-tab-active" : ""
                }`}
                onClick={() => setItemKind(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {itemKind === "new" ? (
            <StockTable
              title="New Items"
              nameHeader="ITEM NAME"
              rows={categoryStock.newItems}
              variant="new"
              scopeName={locationName}
            />
          ) : (
            <StockTable
              title="Used Items"
              nameHeader="ITEM NAME"
              rows={categoryStock.usedItems}
              variant="used"
              scopeName={locationName}
            />
          )}
        </>
      )}

      {activeCategory === "nails" && (
        <StockTable
          title="Nails"
          nameHeader="NAIL NAME"
          rows={categoryStock.nails}
          variant="simple"
          scopeName={locationName}
        />
      )}

      {activeCategory === "consumables" && (
        <StockTable
          title="Consumables"
          nameHeader="CONSUMABLE NAME"
          rows={categoryStock.consumables}
          variant="simple"
          scopeName={locationName}
        />
      )}
    </section>
  );
}

export default CategoryStockSection;
