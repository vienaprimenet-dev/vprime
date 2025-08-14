let map, markers = [], drawLayer;

function downloadCSV(data) {
  const csvContent = "data:text/csv;charset=utf-8," + 
    data.map(e => e.join(",")).join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", "pontos_selecionados.csv");
  document.body.appendChild(link);
  link.click();
}

function drawViz(dataView) {
  if (!map) {
    map = L.map('map').setView([-23.55, -46.63], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    drawLayer = new L.FeatureGroup().addTo(map);

    const drawControl = new L.Control.Draw({
      draw: { marker: false, polyline: false, rectangle: false, circle: true, polygon: true },
      edit: { featureGroup: drawLayer }
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, e => {
      drawLayer.clearLayers();
      const layer = e.layer;
      drawLayer.addLayer(layer);

      let selectedPoints = [];
      markers.forEach(m => {
        let inside = false;
        if (layer instanceof L.Circle) {
          inside = layer.getLatLng().distanceTo(m.getLatLng()) <= layer.getRadius();
        } else if (layer instanceof L.Polygon) {
          inside = leafletPip.pointInLayer(m.getLatLng(), layer).length > 0;
        }
        if (inside) selectedPoints.push(m.options.data);
      });

      alert(`Pontos selecionados: ${selectedPoints.length}`);
      if (selectedPoints.length > 0) downloadCSV(selectedPoints);
    });
  }

  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const latIndex = dataView.fields.findIndex(f => f.toLowerCase().includes("latitude"));
  const lngIndex = dataView.fields.findIndex(f => f.toLowerCase().includes("longitude"));

  dataView.rows.forEach(row => {
    const lat = parseFloat(row[latIndex]);
    const lng = parseFloat(row[lngIndex]);
    if (!isNaN(lat) && !isNaN(lng)) {
      const marker = L.marker([lat, lng], { data: row })
        .bindTooltip(`Lat: ${lat}, Lng: ${lng}`);
      marker.addTo(map);
      markers.push(marker);
    }
  });
}

looker.plugins.visualizations.add({
  id: "mapa-raio-leaflet",
  label: "Mapa com Raio Interativo",
  options: {},
  create: function(element, config) {},
  updateAsync: function(data, element, config, queryResponse, details, done) {
    drawViz({
      fields: queryResponse.fields.dimension_like.map(f => f.label),
      rows: data.map(row => row.map(cell => cell.value))
    });
    done();
  }
});