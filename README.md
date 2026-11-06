# Demo predial de Bolson, Santa Cruz

Visor estatico de un unico distrito (codigo 50302), con datos SIRI/SNIT.
Publicacion prevista: https://saitamacalvocr.github.io/visor-demo-santa-cruz/

Consulta codigo predial, finca, plano y area. Filtros de presencia de datos,
busqueda, seleccion cartografica y exportacion CSV de los resultados visibles.
No incluye DEM, riesgo, fiscalidad, informacion de propietarios ni otros distritos.
Los valores ausentes se muestran como "Sin dato"; no hay datos sinteticos.
Completo significa que codigo, finca y plano estan presentes en la fuente,
no que exista una validacion juridica.

## Datos

`data/predios.geojson` contiene solo los predios con provincia 5, canton 03 y
distrito 02. `data/resumen.json` conserva conteos, criterio y fecha de exportacion.
Las geometrias se mantienen completas como fueron recibidas, sin filtro vial.
El campo de distrito es el declarado por la fuente catastral; no se recortan
parcelas para ajustar diferencias con limites administrativos.

Desde el workspace padre:

```powershell
& 'C:\OSGeo4W\bin\python-qgis.bat' preparar_demo_santa_cruz.py
```

## Desarrollo

```powershell
python -m http.server 8031 --bind 127.0.0.1
```

Abrir http://127.0.0.1:8031 desde esta carpeta. Se requiere servidor HTTP para
leer el GeoJSON. No hay build ni backend. Dependencias vendorizadas: Leaflet
1.9.4 y Lucide 0.468.0. El fondo satelital utiliza Esri World Imagery con
las referencias World Transportation y World Boundaries and Places, como Garabito.

GitHub Pages se publica mediante `.github/workflows/pages.yml`.
`work/` y `qa/` quedan excluidos del repositorio.
