import { ChevronDown } from "lucide-react";

function FilterBar({
  locations,
  companies,
  location,
  company,
  onLocationChange,
  onCompanyChange,
  loading,
}) {
  return (
    <div className="overall-filters">
      <label htmlFor="stock-location" className="filter-label">
        Location:
      </label>

      <div className="select-wrap">
        <select
          id="stock-location"
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
          disabled={loading}
        >
          {locations.map((item) => (
            <option key={item._id} value={item._id}>
              {item.name}
            </option>
          ))}
        </select>

        <ChevronDown size={16} />
      </div>

      {companies.map((item) => (
        <button
          key={item._id}
          type="button"
          className={`company-btn ${
            company === item._id ? "company-btn-active" : ""
          }`}
          onClick={() => onCompanyChange(item._id)}
          disabled={loading}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
}

export default FilterBar;