const map = L.map('map').setView([-34.5, 135.5], 10);

const esriSat = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Tiles © Esri'
  }
).addTo(map);

const paddockLayer = L.geoJSON(null, { style: { color: 'green' } }).addTo(map);
const exclusionLayer = L.geoJSON(null, { style: { color: 'red', fillOpacity: 0.3 } }).addTo(map);

let drawControl, drawType = null;
const drawnItems = new L.FeatureGroup().addTo(map);

const drawOptions = {
  draw: {
    polygon: {
      allowIntersection: false,
      showArea: true,
      metric: true,
      shapeOptions: {
        color: 'green'
      }
    },
    marker: false,
    polyline: false,
    rectangle: false,
    circle: false,
    circlemarker: false
  },
  edit: {
    featureGroup: drawnItems
  }
};

drawControl = new L.Control.Draw(drawOptions);
map.addControl(drawControl);

document.getElementById('drawPaddock').addEventListener('click', () => {
  drawType = 'paddock';
  drawOptions.draw.polygon.shapeOptions.color = 'green';
  new L.Draw.Polygon(map, drawOptions.draw.polygon).enable();
});

document.getElementById('drawExclusion').addEventListener('click', () => {
  drawType = 'exclusion';
  drawOptions.draw.polygon.shapeOptions.color = 'red';
  new L.Draw.Polygon(map, drawOptions.draw.polygon).enable();
});

function calculateHectares(layer) {
  const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
  return area / 10000; // m² to hectares
}

function updateLabels() {
  drawnItems.eachLayer(layer => {
    if (layer.label) map.removeLayer(layer.label);
    const type = layer.feature?.properties?.type || '';
    const ha = layer.feature?.properties?.hectares?.toFixed(2) || '';
    if (type && ha) {
      const center = layer.getBounds().getCenter();
      layer.label = L.marker(center, {
        icon: L.divIcon({
          className: 'ha-label',
          html: `<b>${type}: ${ha} ha</b>`,
          iconSize: [100, 20]
        })
      }).addTo(map);
    }
  });
}

map.on(L.Draw.Event.CREATED, function (e) {
  const layer = e.layer;
  const areaHa = calculateHectares(layer);
  layer.feature = {
    type: 'Feature',
    properties: {
      type: drawType,
      hectares: areaHa
    },
    geometry: layer.toGeoJSON().geometry
  };
  drawnItems.addLayer(layer);
  updateLabels();
});

map.on('draw:edited', () => {
  drawnItems.eachLayer(layer => {
    const newArea = calculateHectares(layer);
    layer.feature.properties.hectares = newArea;
  });
  updateLabels();
});

L.GeometryUtil = L.extend(L.GeometryUtil || {}, {
  geodesicArea: function (latLngs) {
    let area = 0.0;
    const len = latLngs.length;
    if (len < 3) return 0;

    for (let i = 0; i < len; i++) {
      const p1 = latLngs[i];
      const p2 = latLngs[(i + 1) % len];
      area += (p2.lng - p1.lng) * (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
    }
    area = area * 6378137.0 * 6378137.0 / 2.0;
    return Math.abs(area);
  }
});