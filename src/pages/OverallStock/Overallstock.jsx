import { useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import api from "../../api/axios";

import FilterBar from "./sections/FilterBar";
import CategoryStockSection from "./sections/CategoryStockSection";
import TodayActivitySection from "./sections/TodayActivitySection";
import CurrentStockSection from "./sections/CurrentStockSection";

import { getList } from "./utils";

import "./OverallStock.css";
import "./CategoryStock.css";

// "/daily-history/today" returns ONE object ({ data: { _id, date, ... } }),
// not an array. TodayActivitySection expects a list, so wrap the object.
const getTodayHistoryList = (response) => {
  const data = response?.data?.data ?? response?.data;

  if (Array.isArray(data)) return data;

  return data && typeof data === "object" ? [data] : [];
};

function OverallStock() {
  const [locations, setLocations] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [location, setLocation] = useState("");
  const [company, setCompany] = useState("");

  const [openingStocks, setOpeningStocks] = useState([]);
  const [overallStocks, setOverallStocks] = useState([]);
  const [dailyHistories, setDailyHistories] = useState([]);

  const [itemCategories, setItemCategories] = useState([]);
  const [itemsMaster, setItemsMaster] = useState([]);
  const [nailsMaster, setNailsMaster] = useState([]);
  const [consumablesMaster, setConsumablesMaster] = useState([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dataError, setDataError] = useState("");

  // Create Daily History API
  const handleCreateDailyHistory = async () => {
    try {
      setCreating(true);

      await api.post("/daily-history");

      window.location.reload();
    } catch (error) {
      console.error("Create Daily History error:", error);

      setCreating(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setDataError("");

        const [
          locationsResponse,
          companiesResponse,
          openingStockResponse,
          overallStockResponse,
          dailyHistoryResponse,
          itemCategoriesResponse,
          itemsResponse,
          nailsResponse,
          consumablesResponse,
        ] = await Promise.all([
          api.get("/locations"),
          api.get("/finished-materials"),
          api.get("/opening-stock"),
          api.get("/finished-material-product-stock"),
          api.get("/daily-history/today"),
          api.get("/item-categories"),
          api.get("/items"),
          api.get("/nails"),
          api.get("/consumables"),
        ]);

        const locationData = getList(locationsResponse);
        const companyData = getList(companiesResponse);

        setLocations(locationData);
        setCompanies(companyData);
        setOpeningStocks(getList(openingStockResponse));
        setOverallStocks(getList(overallStockResponse));
        setDailyHistories(getTodayHistoryList(dailyHistoryResponse));
        setItemCategories(getList(itemCategoriesResponse));
        setItemsMaster(getList(itemsResponse));
        setNailsMaster(getList(nailsResponse));
        setConsumablesMaster(getList(consumablesResponse));

        if (locationData.length > 0) {
          setLocation((current) => current || locationData[0]._id);
        }

        if (companyData.length > 0) {
          setCompany((current) => current || companyData[0]._id);
        }
      } catch (error) {
        console.error("Overall Stock API error:", error);

        setDataError(
          error.response?.data?.message ||
            "Failed to load Overall Stock data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const locationName =
    locations.find((item) => String(item._id) === String(location))?.name ||
    "-";

  const companyName =
    companies.find((item) => String(item._id) === String(company))?.name ||
    "-";

  const scope = `${locationName} - ${companyName}`;

  return (
    <div className="overall-layout">
      <Sidebar />

      <div className="overall-main">
        <Header />

        <main className="overall-content">
          <h1 className="overall-title">Overall Stock</h1>

          <FilterBar
            locations={locations}
            companies={companies}
            location={location}
            company={company}
            onLocationChange={setLocation}
            onCompanyChange={setCompany}
            loading={loading}
          />

          <div className="daily-history-bar">
            <button
              type="button"
              className="create-daily-history-btn"
              onClick={handleCreateDailyHistory}
              disabled={creating || loading}
            >
              <CalendarPlus size={18} />
              {creating ? "Creating..." : "Create Daily History"}
            </button>
          </div>

          {dataError && <div className="overall-error">{dataError}</div>}

          <CategoryStockSection
            openingStocks={openingStocks}
            location={location}
            locationName={locationName}
            scope={scope}
            itemCategories={itemCategories}
            itemsMaster={itemsMaster}
            nailsMaster={nailsMaster}
            consumablesMaster={consumablesMaster}
          />

          <TodayActivitySection
            dailyHistories={dailyHistories}
            location={location}
            company={company}
            locationName={locationName}
          />

          <CurrentStockSection
            overallStocks={overallStocks}
            location={location}
            company={company}
            locationName={locationName}
            companyName={companyName}
          />
        </main>
      </div>
    </div>
  );
}

export default OverallStock;
