import React, { useState } from "react";

const emissionFactors = {
  ev: 60,     // gCO2/km average electric vehicle
  car: 130,   // gCO2/km average petrol/diesel car
  bus: 95,    // gCO2/km per passenger bus average
  cycle: 0,
  walk: 0,
};

export default function CarbonCalculator() {
  const [homeEircode, setHomeEircode] = useState("");
  const [workEircode, setWorkEircode] = useState("");
  const [mode, setMode] = useState("car");
  const [distanceKm, setDistanceKm] = useState(null);
  const [carbonGrams, setCarbonGrams] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Helper: fetch coordinates for an Eircode using Vision-net API
  async function fetchCoords(eircode) {
    const res = await fetch(
      `https://api.vision-net.ie/eircode/v1/search?eircode=${eircode}`
    );
    if (!res.ok) {
      throw new Error("Failed to fetch coordinates");
    }
    const data = await res.json();
    if (!data.Address || !data.Address.Latitude || !data.Address.Longitude) {
      throw new Error("Invalid eircode or no coordinates found");
    }
    return [data.Address.Longitude, data.Address.Latitude];
  }

  // Helper: fetch distance in meters from OSRM route API for selected mode
  async function fetchDistance(lon1, lat1, lon2, lat2, profile) {
    // profile = 'car', 'bike', or 'foot'
    const url = `https://routing.openstreetmap.de/routed-${profile}/route/v1/${profile}/${lon1},${lat1};${lon2},${lat2}?overview=false&alternatives=false&steps=false`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Failed to fetch route data");
    }
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes || !data.routes.length) {
      throw new Error("No route found");
    }
    return data.routes[0].distance; // meters
  }

  async function calculateCarbon() {
    setError(null);
    setLoading(true);
    setDistanceKm(null);
    setCarbonGrams(null);

    if (
      !homeEircode.match(/^[A-Za-z0-9]{7}$/) ||
      !workEircode.match(/^[A-Za-z0-9]{7}$/)
    ) {
      setError("Please enter valid 7-character Eircodes");
      setLoading(false);
      return;
    }

    try {
      // Get coordinates
      const homeCoords = await fetchCoords(homeEircode);
      const workCoords = await fetchCoords(workEircode);

      // Map travel modes to OSRM profiles
      let profile = "car"; // default
      if (mode === "car" || mode === "ev") profile = "car";
      else if (mode === "bus") profile = "car"; // approximate bus by car route for simplicity
      else if (mode === "cycle") profile = "bike";
      else if (mode === "walk") profile = "foot";

      // Get route distance meters
      const distMeters = await fetchDistance(
        homeCoords[0],
        homeCoords[1],
        workCoords[0],
        workCoords[1],
        profile
      );

      const distKm = distMeters / 1000;
      setDistanceKm(distKm.toFixed(2));

      // Calculate carbon grams (mode 'ev' uses ev factor, else car or bus etc)
      const emissionFactor =
        mode === "ev" ? emissionFactors.ev : emissionFactors[mode];
      const gramsCO2 = emissionFactor * distKm;
      setCarbonGrams(gramsCO2.toFixed(0));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        maxWidth: 420,
        margin: "20px auto",
        fontFamily: "Arial, sans-serif",
        padding: 20,
        border: "1px solid #ccc",
        borderRadius: 6,
      }}
    >
      <h2>Carbon Footprint Commute Calculator</h2>
      <label>
        Home Eircode:
        <input
          type="text"
          value={homeEircode}
          onChange={(e) => setHomeEircode(e.target.value.toUpperCase())}
          maxLength={7}
          style={{ width: "100%", marginBottom: 12, padding: 8 }}
          placeholder="Enter 7-character Eircode"
        />
      </label>
      <label>
        Work Eircode:
        <input
          type="text"
          value={workEircode}
          onChange={(e) => setWorkEircode(e.target.value.toUpperCase())}
          maxLength={7}
          style={{ width: "100%", marginBottom: 12, padding: 8 }}
          placeholder="Enter 7-character Eircode"
        />
      </label>
      <label>
        Travel Mode:
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          style={{ width: "100%", marginBottom: 20, padding: 8 }}
        >
          <option value="ev">Electric Vehicle (EV)</option>
          <option value="car">Car (Petrol/Diesel)</option>
          <option value="bus">Bus</option>
          <option value="cycle">Cycle</option>
          <option value="walk">Walk</option>
        </select>
      </label>
      <button
        onClick={calculateCarbon}
        disabled={loading}
        style={{
          padding: "10px 20px",
          fontSize: 16,
          cursor: "pointer",
          backgroundColor: "#007acc",
          color: "white",
          border: "none",
          borderRadius: 4,
        }}
      >
        {loading ? "Calculating..." : "Calculate Footprint"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: 20 }}>
          Error: {error.toString()}
        </p>
      )}

      {distanceKm && carbonGrams && !error && (
        <div style={{ marginTop: 20 }}>
          <p>
            Distance: <strong>{distanceKm} km</strong>
          </p>
          <p>
            Estimated CO₂ emissions: <strong>{carbonGrams} g CO₂</strong> per
            trip
          </p>

          {distanceKm <= 2 && mode !== "walk" && (
            <p style={{ color: "green" }}>
              You could walk or cycle to work and save approximately{" "}
              <strong>{carbonGrams} g CO₂</strong> per trip!
            </p>
          )}

          {(mode === "car" || mode === "bus" || mode === "ev") && (
            <p>
              Alternative options emissions per trip:
              <ul>
                {["ev", "car", "bus", "cycle", "walk"].map((opt) => {
                  if (opt === mode) return null;
                  return (
                    <li key={opt}>
                      {opt.toUpperCase()}:{" "}
                      {(
                        emissionFactors[opt] * parseFloat(distanceKm)
                      ).toFixed(0)}{" "}
                      g CO₂
                    </li>
                  );
                })}
              </ul>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
