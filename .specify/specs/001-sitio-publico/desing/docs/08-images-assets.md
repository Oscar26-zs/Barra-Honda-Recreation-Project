# 08 — Imágenes y assets

## Assets locales (copiados en `design-astro/images/`)

Estas 4 imágenes son los únicos archivos binarios reales del proyecto original (`src/assets/`), importados como módulos de Vite (`import heroImage from '../assets/hero-salida.jpg'`) y usadas vía `style={{ backgroundImage: url(...) }}` o `<img src={...}>`. En Astro van en `src/assets/` (para usar `astro:assets` y optimización automática) o `public/assets/` (si se prefiere referenciarlas por ruta directa igual que el original) — ver nota abajo.

| Archivo | Usado en | Cómo se usa |
|---|---|---|
| `hero-salida.jpg` | `HeroSection` (Inicio), `FAQSection` (Inicio) | Fondo de pantalla completa vía `background-image` + overlay de gradiente (Hero: `from-night/75 via-night/50 to-night/25` + `from-night/15 via-transparent to-night`); en FAQ como fondo con overlay claro `bg-paper/92` |
| `cyclist-silhouette.png` | `RouteAnimationSection` (×2 instancias) | **No se muestra como `<img>`** — se usa como `mask-image`/`-webkit-mask-image` de un `<div>` de color sólido (`bg-paper` en modo oscuro, `bg-[#1c4f7a]` en modo claro), para "recortar" la silueta del ciclista y que se mueva a lo largo del path SVG animado |
| `sobre-ruta.jpg` | `SobreRutaSection` | Foto editorial, `object-cover`, con marco decorativo (`border-2 border-river/25` desplazado) en mobile, y full-bleed en la columna izquierda del layout de 12 columnas en desktop |
| `inclusion-feature.jpg` | `InclusionesSectionn` | Fondo de sección completa, con doble overlay: `bg-river/15` + `bg-night/88` (queda muy oscurecida, es principalmente textura de fondo) |


### Astro — `astro:assets` vs. `public/`

Para que el sitio "quede exactamente igual", la opción más simple es tratar estas 4 imágenes igual que el original (import directo, sin pipeline de optimización): copiarlas a `src/assets/` e importarlas con `astro:assets`:

```astro
---
import heroImage from '../assets/hero-salida.jpg'
---
<div class="absolute inset-0 bg-cover bg-center bg-night" style={`background-image:url(${heroImage.src})`}></div>
```

Si se prefiere no depender de la API de imágenes de Astro (por ejemplo, para el `mask-image` de la silueta, que no es un `<img>` y no se beneficia de la optimización), es igual de válido dejarlas en `public/assets/` y referenciarlas por ruta absoluta (`/assets/cyclist-silhouette.png`) — así es como están escritas las rutas en los ejemplos de `<script>` de [07-interactivity.md](07-interactivity.md).

## Imágenes externas — placeholders temporales de Unsplash

**Estas NO son assets del proyecto** — son URLs directas a `images.unsplash.com` usadas como contenido de relleno mientras no hay fotografía oficial. Aparecen marcadas en el código fuente original con comentarios como `[pendiente: video]` o notas explícitas de que es contenido temporal. Se listan aquí para que quien continúe el proyecto en Astro sepa exactamente qué reemplazar:

### `ExperienciaSection` (Inicio) — 4 fotos, formato `?w=700&h=500&fit=crop&auto=format`
- Concierto en vivo — Plaza de Deportes (`photo-1493225457124-a3eb161ffa5f`)
- Ternerada nocturna — Plaza de Toros Barra Honda (`photo-1516214104703-d870798883c5`)
- Tours guiados — Parque Nacional Barra Honda (`photo-1441974231531-c6227db76b6e`)
- Feria de emprendedores (`photo-1555529669-e69e7aa0ba9a`)

### `Galeria.tsx` — 12 fotos/videos mock, formato `?w=600&h={300|500}&fit=crop&auto=format`
IDs: `1534787238916-9ba6764efd4f` (featured), `1472791127703-64f8b7d5b93d`, `1506905925346-21bda4d32df4`, `1502082553048-f009c37129b9`, `1542831371-29b0f74f9713` (video), `1558981806-ec527fa84c39`, `1551632436-cbf8dd35adfa`, `1536243929-ed92dc2f2c4d`, `1497263375989-abf4f6e5ae77`, `1517649763962-0c623066013b`, `1569880153113-76086ddde745` (video), `1466098686939-b23d40efc33b`.

### `Historial.tsx` — 3 fotos por edición × 4 ediciones (12 total)
Reutiliza el mismo pool de IDs de Unsplash que la Galería, distribuidas 3 por edición, formato `?w={300|600}&h=200&fit=crop&auto=format`.

> Todas las fechas/estadísticas de Historial (`year`, `participants`, `km`, `raised`) están literalmente como `'[pendiente]'` en el código — es contenido de placeholder, no solo las fotos.

## Recorridos Komoot (no son imágenes, son embeds de mapa)

3 iframes de Komoot en `MapaPerfilSection` — no requieren asset local, se documentan aquí porque ocupan el mismo rol visual que una imagen de mapa:

| Ruta | Distancia | URL de embed |
|---|---|---|
| Mirador Nacaome — Parque Nacional | 6.98 km | `https://www.komoot.com/smarttour/20108244/embed?layout=map&profile=1` |
| Circuito de las Cuevas — Parque Nacional | 3.61 km | `https://www.komoot.com/smarttour/34323352/embed?layout=map&profile=1` |
| Las Cavernas — Sendero La Flor | 1.80 km | `https://www.komoot.com/tour/3252919856/embed?share_token=af6zUG06ZnlQQ9oJg7Up4TTl5ilQbYL6NkRfffEexqDMS9C469&layout=map&profile=1` |

## Íconos

100% SVG inline escritos a mano (paths de Heroicons-style, `stroke="currentColor"`, `viewBox="0 0 24 24"`), sin librería de íconos externa. Los dos sets más grandes son `InclusionIcon` (12 variantes: jersey, water, shower, medical, wrench, car, flag, camera, bracelet, gift, parking, number) en `Inicio.tsx`, y `RuleIcon` (6 variantes: id, helmet, wrench, receipt, ban, warning) también en `Inicio.tsx`. Se portan a Astro como un simple `Record<string, string>` de paths o componentes `.astro` individuales — no requieren ninguna dependencia nueva.
