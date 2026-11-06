(function (root) {
  'use strict';
  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  function matches(feature, state) {
    const p = feature.properties;
    if (state.status === 'complete' && !p.completo) return false;
    if (state.status === 'incomplete' && p.completo) return false;
    if (state.missing === 'both' && (p.plano || p.finca)) return false;
    if (!['all', 'both'].includes(state.missing) && p[state.missing]) return false;
    const query = normalize(state.query);
    return !query || ['codigo', 'finca', 'plano'].some(key => normalize(p[key]).includes(query));
  }
  function csv(features) {
    const cell = value => '"' + String(value ?? '').replace(/^[=+@\-]/, "'$&").replace(/"/g, '""') + '"';
    const rows = features.map(f => {const p = f.properties; return [p.codigo, p.finca, p.plano, p.area_m2, p.completo ? 'Completo' : 'Incompleto', p.faltantes.join(', ')];});
    return '\ufeff' + [['Codigo predial', 'Finca', 'Plano', 'Area m2', 'Estado', 'Campos faltantes'], ...rows].map(row => row.map(cell).join(';')).join('\r\n');
  }
  root.PredialFilters = {normalize, matches, csv};
})(globalThis);
