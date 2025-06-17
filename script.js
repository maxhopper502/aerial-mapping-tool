
const map = L.map('map').setView([-34.7, 135.8], 10);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: '© Esri',
}).addTo(map);

let drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

const drawControl = new L.Control.Draw({
  draw: false,
  edit: { featureGroup: drawnItems }
});
map.addControl(drawControl);

let currentMode = null;
let paddocks = [];
let exclusions = [];

document.getElementById('draw-paddock').onclick = () => currentMode = 'paddock';
document.getElementById('draw-exclusion').onclick = () => currentMode = 'exclusion';

map.on(L.Draw.Event.CREATED, function (event) {
  const layer = event.layer;
  const area = turf.area(layer.toGeoJSON()) / 10000; // ha
  const center = layer.getBounds().getCenter();
  let label = `${area.toFixed(2)} ha`;
  let mode = currentMode;

  if (mode === 'paddock') {
    paddocks.push(layer.toGeoJSON());
    layer.setStyle({ color: '#28a745' });
  } else if (mode === 'exclusion') {
    exclusions.push(layer.toGeoJSON());
    layer.setStyle({ color: '#dc3545', fillOpacity: 0.4 });
    label = `-${label}`;
  }
  layer.bindTooltip(label, { permanent: true, direction: 'center' }).openTooltip();
  drawnItems.addLayer(layer);
  updateTotalArea();
});

function updateTotalArea() {
  let paddockArea = paddocks.reduce((sum, p) => sum + turf.area(p), 0);
  let exclusionArea = exclusions.reduce((sum, e) => sum + turf.area(e), 0);
  const total = (paddockArea - exclusionArea) / 10000;
  console.log(`Total treated area: ${total.toFixed(2)} ha`);
}
