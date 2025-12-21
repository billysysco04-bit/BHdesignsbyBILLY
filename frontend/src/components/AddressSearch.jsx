import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Input } from "./ui/input";
import { MapPin, Check, Search } from "lucide-react";
import { API } from "../App";

export default function AddressSearch({ 
  value, 
  onChange, 
  token, 
  placeholder = "Enter city or address...",
  className = ""
}) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search - instant for local lookup
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2 || selected) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    // Short debounce since it's just local lookup now
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API}/location/search`, {
          params: { query },
          headers: { Authorization: `Bearer ${token}` }
        });
        setResults(response.data.results || []);
        if (response.data.results?.length > 0) {
          setShowDropdown(true);
        }
      } catch (error) {
        console.error("Location search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150); // Very short debounce - local lookup is instant

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, token, selected]);

  const handleSelect = (location) => {
    setQuery(location.formatted_address);
    setShowDropdown(false);
    setSelected(true);
    onChange(location.formatted_address, location);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setSelected(false);
    onChange(newValue, null);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && !selected && setShowDropdown(true)}
          placeholder={placeholder}
          data-testid="location-input"
          className="pl-11 pr-10 h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {selected ? (
            <Check className="w-5 h-5 text-emerald-400" />
          ) : query.length > 0 ? (
            <Search className="w-5 h-5 text-zinc-500" />
          ) : null}
        </div>
      </div>

      {/* Dropdown Results */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden">
          {results.map((location, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(location)}
              className="w-full px-4 py-3 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-b-0"
              data-testid={`location-result-${index}`}
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">{location.formatted_address}</p>
                  {location.city && location.state && (
                    <p className="text-sm text-zinc-500">
                      {location.city}, {location.state}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-500 mt-2">
        Start typing a city name (e.g., Dallas, Austin, Miami)
      </p>
    </div>
  );
}
