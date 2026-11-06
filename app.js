/* global L, lucide, PredialFilters */
'use strict';
const $ = id => document.getElementById(id);
const integer = new Intl.NumberFormat('es-CR');
const area = new Intl.NumberFormat('es-CR', {maximumFractionDigits: 2});
const state = {features: [], filtered: [], status: 'all', missing: 'all', query: '', page: 0, selected: null};
const pageSize = 10;
let map, polygons, selectedLayer, districtBounds, debounce, toastTimer;
const byId = new Map();
const layers = new Map();
function icons() { if (window.lucide) lucide.createIcons(); }
function el(tag, text, className) {const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node;}
function style(feature) {return {color: feature.properties.completo ? '#087b61' : '#ad485b', weight: 1.1, fillColor: feature.properties.completo ? '#21a27e' : '#df7c8e', fillOpacity: .28, opacity: .92};}
function showToast(message) {$('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => {$('toast').hidden = true;}, 2400);}
function initMap() {
  if (!window.L) throw new Error('No se pudo cargar el mapa.');
  map = L.map('map', {preferCanvas: true, zoomControl: true, minZoom: 9, maxZoom: 20}).setView([10.36, -85.49], 12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxNativeZoom: 19, maxZoom: 20, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  polygons = L.geoJSON(null, {style, onEachFeature(feature, layer) {
    layers.set(feature.properties.uid, layer);
    layer.bindTooltip(el('span', feature.properties.codigo || 'Sin identificación'), {sticky: true});
    layer.on('click', () => selectParcel(feature.properties.uid, false));
    layer.on('mouseover', () => {if (state.selected !== feature.properties.uid) layer.setStyle({weight: 2.5, fillOpacity: .48});});
    layer.on('mouseout', () => {if (state.selected !== feature.properties.uid) layer.setStyle(style(feature));});
  }}).addTo(map);
  $('fit').addEventListener('click', () => {if (districtBounds) map.fitBounds(districtBounds, {padding: [22, 22]});});
}
function closeDetail() {
  if (selectedLayer) polygons.resetStyle(selectedLayer);
  state.selected = null; selectedLayer = null; $('detail').hidden = true;
  document.querySelectorAll('.result.selected').forEach(node => node.classList.remove('selected'));
}
function selectParcel(uid, zoom) {
  const feature = byId.get(uid), layer = layers.get(uid);
  if (!feature || !layer) return;
  if (selectedLayer) polygons.resetStyle(selectedLayer);
  state.selected = uid; selectedLayer = layer;
  layer.setStyle({color: '#182b25', weight: 3, fillOpacity: .55});
  layer.bringToFront();
  if (zoom) map.fitBounds(layer.getBounds(), {padding: [45, 45], maxZoom: 18});
  const p = feature.properties;
  $('detail-title').textContent = p.finca ? 'Finca ' + p.finca : 'Predio sin finca';
  $('detail-badge').textContent = p.completo ? 'Datos completos' : 'Datos incompletos';
  $('detail-badge').className = 'data-badge' + (p.completo ? '' : ' missing');
  const fields = [['Código predial', p.codigo], ['Finca', p.finca], ['Plano', p.plano], ['Área', area.format(p.area_m2) + ' m²']];
  $('detail-fields').replaceChildren(...fields.map(([label, value]) => {const row = el('div'); row.append(el('dt', label), el('dd', value || 'Sin dato', value ? '' : 'absent')); return row;}));
  const names = {codigo: 'identificación', finca: 'finca', plano: 'plano'};
  $('detail-missing').hidden = p.completo;
  $('detail-missing').textContent = 'Sin dato en la fuente: ' + p.faltantes.map(key => names[key]).join(', ') + '.';
  $('detail').hidden = false;
  document.querySelectorAll('.result').forEach(node => {node.classList.toggle('selected', node.dataset.uid === uid); node.setAttribute('aria-pressed', String(node.dataset.uid === uid));});
}
function renderList() {
  const totalPages = Math.max(1, Math.ceil(state.filtered.length / pageSize));
  state.page = Math.max(0, Math.min(state.page, totalPages - 1));
  const fragment = document.createDocumentFragment();
  state.filtered.slice(state.page * pageSize, (state.page + 1) * pageSize).forEach(feature => {
    const p = feature.properties, button = el('button', undefined, 'result' + (state.selected === p.uid ? ' selected' : ''));
    button.type = 'button'; button.dataset.uid = p.uid; button.setAttribute('aria-pressed', String(state.selected === p.uid));
    const top = el('span', undefined, 'result-top'); top.append(el('span', p.codigo || 'Sin identificación', 'code'));
    const status = el('span', undefined, 'result-status'); status.append(el('b', '', 'dot ' + (p.completo ? 'complete' : 'incomplete')), document.createTextNode(p.completo ? 'Completo' : 'Incompleto')); top.append(status);
    const bottom = el('span', undefined, 'result-bottom'); bottom.append(el('span', 'Finca ' + (p.finca || 'sin dato')), el('span', '·'), el('span', area.format(p.area_m2) + ' m²'));
    button.append(top, bottom); button.addEventListener('click', () => selectParcel(p.uid, true)); fragment.append(button);
  });
  if (!state.filtered.length) fragment.append(el('p', 'Sin coincidencias', 'no-results'));
  $('results').replaceChildren(fragment);
  $('page-label').textContent = state.filtered.length ? (state.page + 1) + ' / ' + totalPages : '0 / 0';
  $('previous').disabled = state.page === 0; $('next').disabled = state.page + 1 >= totalPages;
}
function render() {
  if (!polygons) return;
  state.filtered = state.features.filter(feature => PredialFilters.matches(feature, state));
  const selected = state.selected;
  closeDetail(); layers.clear(); polygons.clearLayers(); polygons.addData({type: 'FeatureCollection', features: state.filtered});
  $('result-count').textContent = integer.format(state.filtered.length) + ' de ' + integer.format(state.features.length);
  $('map-message').hidden = state.filtered.length > 0;
  $('export').disabled = !state.filtered.length;
  renderList();
  if (selected && layers.has(selected)) selectParcel(selected, false);
  if (PredialFilters.normalize(state.query).length >= 3 && state.filtered.length) map.fitBounds(polygons.getBounds(), {padding: [35, 35], maxZoom: 17});
}
function reset() {
  state.status = 'all'; state.missing = 'all'; state.query = ''; state.page = 0;
  $('search').value = ''; $('missing').value = 'all'; document.querySelector('input[name="status"][value="all"]').checked = true;
  render();
}
async function loadData() {
  $('loading').hidden = false; $('error').hidden = true;
  try {
    if (!map) initMap();
    const responses = await Promise.all(['data/predios.geojson', 'data/resumen.json'].map(url => fetch(url)));
    if (responses.some(response => !response.ok)) throw new Error('Los archivos del distrito no están disponibles.');
    const [geojson, summary] = await Promise.all(responses.map(response => response.json()));
    if (!Array.isArray(geojson.features) || geojson.features.length !== summary.total) throw new Error('El conjunto de predios está incompleto.');
    state.features = geojson.features; byId.clear(); state.features.forEach(feature => byId.set(feature.properties.uid, feature));
    $('total').textContent = integer.format(summary.total); $('complete').textContent = integer.format(summary.completos); $('incomplete').textContent = integer.format(summary.incompletos);
    $('date').textContent = new Date(summary.fecha + 'T12:00:00').toLocaleDateString('es-CR', {day: '2-digit', month: 'short', year: 'numeric'});
    $('load-status').textContent = integer.format(summary.total) + ' predios · listo';
    ['plano', 'finca', 'codigo'].forEach(field => {const option = $('missing').querySelector('[value="' + field + '"]'); const count = summary[field === 'codigo' ? 'sin_codigo' : 'sin_' + field]; option.textContent += ' (' + integer.format(count) + ')';});
    $('search').disabled = false; $('missing').disabled = false;
    render(); districtBounds = polygons.getBounds(); map.fitBounds(districtBounds, {padding: [25, 25]}); $('loading').hidden = true;
  } catch (error) {
    $('loading').hidden = true; $('error').hidden = false; $('error-message').textContent = error.message; $('load-status').textContent = 'Error de carga';
  }
}
$('search').addEventListener('input', () => {clearTimeout(debounce); debounce = setTimeout(() => {state.query = $('search').value; state.page = 0; render();}, 160);});
document.querySelectorAll('input[name="status"]').forEach(input => input.addEventListener('change', () => {state.status = input.value; state.missing = 'all'; $('missing').value = 'all'; state.page = 0; render();}));
$('missing').addEventListener('change', () => {state.missing = $('missing').value; state.page = 0; if (state.missing !== 'all') {state.status = 'incomplete'; document.querySelector('input[name="status"][value="incomplete"]').checked = true;} render();});
$('clear').addEventListener('click', reset);
$('previous').addEventListener('click', () => {state.page--; renderList();});
$('next').addEventListener('click', () => {state.page++; renderList();});
$('close-detail').addEventListener('click', closeDetail);
$('retry').addEventListener('click', loadData);
$('mobile-collapse').addEventListener('click', () => {const collapsed = document.body.classList.toggle('panel-collapsed'); $('mobile-collapse').setAttribute('aria-label', collapsed ? 'Expandir panel' : 'Contraer panel'); $('mobile-collapse').title = collapsed ? 'Expandir panel' : 'Contraer panel'; $('mobile-collapse').firstElementChild.style.transform = collapsed ? 'rotate(180deg)' : ''; requestAnimationFrame(() => map?.invalidateSize());});
$('export').addEventListener('click', () => {const blob = new Blob([PredialFilters.csv(state.filtered)], {type: 'text/csv;charset=utf-8;'}); const url = URL.createObjectURL(blob); const anchor = el('a'); anchor.href = url; anchor.download = 'predios_bolson_filtrados.csv'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); showToast(integer.format(state.filtered.length) + ' predios exportados');});
$('copy').addEventListener('click', async () => {const p = byId.get(state.selected)?.properties; if (!p) return; const text = ['Distrito: Bolsón, Santa Cruz', 'Código: ' + (p.codigo || 'Sin dato'), 'Finca: ' + (p.finca || 'Sin dato'), 'Plano: ' + (p.plano || 'Sin dato'), 'Área: ' + area.format(p.area_m2) + ' m²'].join('\n'); try {await navigator.clipboard.writeText(text); showToast('Datos copiados');} catch {showToast('No se pudo acceder al portapapeles');}});
document.addEventListener('keydown', event => {if (event.key === 'Escape') closeDetail();});
icons(); loadData();
