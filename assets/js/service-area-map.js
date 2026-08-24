/* Limpiezas Luz de Luna V2 — mapa de zona de servicio (Finestrat a Calpe, incluyendo Callosa d'en Sarrià) */
(() => {
  const el = document.getElementById('service-area-map');
  if (!el || typeof L === 'undefined') return;

  // Localidades que delimitan la zona de servicio (Marina Baixa)
  const towns = [
    { name: 'Villajoyosa', lat: 38.5075, lng: -0.2334 },
    { name: 'Benidorm', lat: 38.5411, lng: -0.1225, note: 'Base operativa. Incluye Levante, Poniente, Rincón de Loix, Centro, La Cala y Sierra Helada.' },
    { name: "Alfaz del Pi", lat: 38.5789, lng: -0.0089 },
    { name: 'Altea', lat: 38.5993, lng: -0.0517 },
    { name: 'Calpe', lat: 38.6447, lng: 0.0443 },
    { name: "Callosa d'en Sarrià", lat: 38.6534, lng: -0.1339 },
    { name: 'La Nucía', lat: 38.6136, lng: -0.1279 },
    { name: 'Finestrat', lat: 38.5675, lng: -0.2226 },
  ];

  const polygon = towns.map(t => [t.lat, t.lng]);

  const map = L.map(el, {
    scrollWheelZoom: false,
    attributionControl: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const area = L.polygon(polygon, {
    color: '#c89968',
    weight: 2,
    fillColor: '#222875',
    fillOpacity: 0.1,
  }).addTo(map);

  // Cada pueblo se "ilumina" con un halo, sin chinchetas ni iconos de pin.
  towns.forEach(t => {
    L.circle([t.lat, t.lng], {
      radius: 2600,
      color: '#c89968',
      weight: 1,
      fillColor: '#c89968',
      fillOpacity: 0.35,
      className: 'service-area-map__glow',
    }).addTo(map);

    L.circle([t.lat, t.lng], {
      radius: 900,
      weight: 0,
      fillColor: '#fff3df',
      fillOpacity: 0.85,
    }).addTo(map);

    const tooltip = L.circle([t.lat, t.lng], { radius: 900, opacity: 0, fillOpacity: 0 })
      .addTo(map)
      .bindTooltip(t.name, {
        permanent: true,
        direction: 'top',
        offset: [0, -8],
        className: 'service-area-map__label',
      });

    if (t.note) {
      tooltip.bindPopup(`<strong>${t.name}</strong><br>${t.note}`);
    }
  });

  map.fitBounds(area.getBounds(), { padding: [24, 24] });

  map.on('focus', () => map.scrollWheelZoom.enable());
  map.on('blur', () => map.scrollWheelZoom.disable());
})();
