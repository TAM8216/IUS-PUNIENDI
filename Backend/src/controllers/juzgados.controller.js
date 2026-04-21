const { createRequire } = require("module");

// Usamos dynamic import para node-fetch (ESM) y cheerio
let fetchModule;
let cheerioModule;

async function getFetch() {
  if (!fetchModule) {
    fetchModule = (await import("node-fetch")).default;
  }
  return fetchModule;
}

async function getCheerio() {
  if (!cheerioModule) {
    cheerioModule = await import("cheerio");
  }
  return cheerioModule;
}

const URL_JUZGADOS = "https://lapaz.organojudicial.gob.bo/Juzgados/Index";

// Scrape juzgados from the government website
const listarJuzgados = async (req, res, next) => {
  try {
    const fetch = await getFetch();
    const cheerio = await getCheerio();

    const response = await fetch(URL_JUZGADOS, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9",
      },
    });

    if (!response.ok) {
      return res.status(502).json({
        message: `Error al obtener datos del sitio externo: ${response.status}`,
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const juzgados = [];
    let id = 1;

    $("tr.grid-row").each((_index, row) => {
      const cells = $(row).find("td.grid-cell");

      // Columna 1: Lugar (ej: "La Paz Murillo")
      const lugarCell = cells.eq(0);
      const lugar = lugarCell.text().trim().replace(/\s+/g, " ");

      // Columna 2: Imagen/Número
      const imagenCell = cells.eq(1);
      const imagenSrc = imagenCell.find("img").attr("src") || "";
      const imagenUrl = imagenSrc
        ? `https://lapaz.organojudicial.gob.bo${imagenSrc}`
        : "";

      // Columna 3: Oficina (nombre del juzgado)
      const oficinaCell = cells.eq(2);
      const oficina = oficinaCell.text().trim().replace(/\s+/g, " ");

      // Columna 4: Detalle Ubicación (edificio, calle, piso)
      const ubicacionCell = cells.eq(3);
      const ubicacionSpans = ubicacionCell.find("span");
      let edificio = "";
      let calle = "";
      let piso = "";

      // El HTML tiene spans anidados: edificio > calle > piso
      const ubicacionHtml = ubicacionCell.html() || "";
      const edificioMatch = ubicacionCell
        .find('span[style*="forestgreen"]')
        .contents()
        .first()
        .text()
        .trim();
      const calleMatch = ubicacionCell
        .find('span[style*="saddlebrown"]')
        .contents()
        .first()
        .text()
        .trim();
      const pisoMatch = ubicacionCell
        .find('span[style*="orangered"]')
        .text()
        .trim();

      edificio = edificioMatch || "";
      calle = calleMatch || "";
      piso = pisoMatch || "";

      const ubicacionCompleta = [edificio, calle, piso]
        .filter(Boolean)
        .join(" - ");

      // Columna 5: Materia
      const materiaCell = cells.eq(4);
      const materia = materiaCell.text().trim();

      // Columna 6: Link de detalle
      const verCell = cells.eq(5);
      const verLink = verCell.find("a").attr("href") || "";
      const detalleUrl = verLink
        ? `https://lapaz.organojudicial.gob.bo${verLink}`
        : "";

      if (oficina) {
        juzgados.push({
          id: id++,
          nombre: oficina,
          lugar,
          edificio,
          calle,
          piso,
          ubicacion: ubicacionCompleta,
          materia,
          imagen: imagenUrl,
          detalleUrl,
          // Mapeo compatible con el formato de instituciones
          direcciones: [
            {
              id: id,
              direccion: ubicacionCompleta,
              contacto: materia,
            },
          ],
        });
      }
    });

    console.log(`✅ ${juzgados.length} juzgados obtenidos del sitio externo`);
    res.json(juzgados);
  } catch (error) {
    console.error("❌ Error al scrape de juzgados:", error);
    next(error);
  }
};

module.exports = {
  listarJuzgados,
};