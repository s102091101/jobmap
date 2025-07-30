// ----- JOB LISTINGS FROM ARRAY -----
const jobs = [
  { title: "Software Engineer", address: "Patrick St, Cork, Ireland", url: "https://example.com/job1" },
  { title: "Sales Manager", address: "Grand Parade, Cork, Ireland", url: "https://example.com/job2" }
];

// ----- EMPLOYERS FROM CSV -----
const CSV_URL = 'employers.csv';

// ----- LEAFLET MAP SETUP -----
const map = L.map('map').setView([51.8979, -8.4706], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// ----- GEOCODING FUNCTION -----
async function geocode(query) {
  // Accepts either address (string) or Eircode
  const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&country=Ireland&q=${encodeURIComponent(query)}`);
  const data = await resp.json();
  return data.length ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;
}

// ----- PLOT JOBS (ADDRESS) -----
jobs.forEach(async job => {
  const coords = await geocode(job.address);
  if (coords) {
    const marker = L.marker(coords).addTo(map);
    marker.bindPopup(`<h3>${job.title}</h3><p>${job.address}</p><a href="${job.url}" target="_blank">Apply</a>`);
  }
});

// ----- PLOT EMPLOYERS (CSV WITH EIRCODE) -----
Papa.parse(CSV_URL, {
  download: true,
  header: true,
  complete: function(results) {
    // Sequential async processing for geocoding
    (async function() {
      for (const employer of results.data) {
        try {
          if (employer.Eircode && employer.Name && employer.JobSite) {
            const coords = await geocode(employer.Eircode);
            if (coords) {
              const marker = L.marker(coords, {icon: L.icon({
                  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
                  iconSize: [25, 25]
              })}).addTo(map);
              marker.bindPopup(
                `<h3>${employer.Name}</h3>` +
                `<p>Eircode: ${employer.Eircode}</p>` +
                `<a href="${employer.JobSite}" target="_blank">Job Site</a>`
              );
            }
          }
        } catch (err) {
          console.error('Error geocoding employer:', employer, err);
        }
      }
    })();
  }
});

// ----- DOWNLOAD CSV BUTTON -----
const downloadBtn = document.getElementById("downloadBtn");
if (downloadBtn) {
  downloadBtn.addEventListener("click", function() {
    window.location.href = CSV_URL;
  });
}
