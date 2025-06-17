const map = L.map('map').setView([-34.5, 135.5], 12);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri'
}).addTo(map);

const drawnItems = new L.FeatureGroup().addTo(map);

const drawOptions = {
    draw: {
        polygon: {
            allowIntersection: false,
            showArea: true,
            metric: true,
            repeatMode: false,
            shapeOptions: { color: 'green' }
        },
        polyline: false,
        circle: false,
        marker: false,
        circlemarker: false,
        rectangle: false
    },
    edit: {
        featureGroup: drawnItems,
        remove: true
    }
};

const drawControl = new L.Control.Draw(drawOptions);
map.addControl(drawControl);

let drawType = "paddock";

document.getElementById("drawPaddock").onclick = () => {
    drawType = "paddock";
    drawOptions.draw.polygon.shapeOptions.color = 'green';
    new L.Draw.Polygon(map, drawOptions.draw.polygon).enable();
};

document.getElementById("drawExclusion").onclick = () => {
    drawType = "exclusion";
    drawOptions.draw.polygon.shapeOptions.color = 'red';
    new L.Draw.Polygon(map, drawOptions.draw.polygon).enable();
};

function calculateTotalAreas() {
    let paddocks = [];
    let exclusions = [];

    drawnItems.eachLayer(layer => {
        const geo = layer.toGeoJSON();
        geo.properties = geo.properties || {};
        if (geo.properties.type === "paddock") paddocks.push(geo);
        if (geo.properties.type === "exclusion") exclusions.push(geo);
    });

    paddocks.forEach(p => {
        let area = geojsonArea.geometry(p.geometry);
        exclusions.forEach(e => {
            if (turf.booleanOverlap(p, e) || turf.booleanContains(p, e)) {
                area -= geojsonArea.geometry(e.geometry);
            }
        });
        p.properties._hectares = area / 10000;
    });

    drawnItems.eachLayer(layer => {
        const g = layer.toGeoJSON();
        if (g.properties.type === "paddock") {
            const ha = g.properties._hectares.toFixed(2);
            const center = layer.getBounds().getCenter();
            if (layer._label) map.removeLayer(layer._label);
            layer._label = L.marker(center, {
                icon: L.divIcon({ className: 'ha-label', html: `${ha} ha`, iconSize: [60, 20] })
            }).addTo(map);
        }
    });
}

map.on(L.Draw.Event.CREATED, function (event) {
    const layer = event.layer;
    layer.feature = {
        type: "Feature",
        properties: { type: drawType },
        geometry: layer.toGeoJSON().geometry
    };
    drawnItems.addLayer(layer);
    calculateTotalAreas();
});

map.on("draw:edited", calculateTotalAreas);
map.on("draw:deleted", calculateTotalAreas);