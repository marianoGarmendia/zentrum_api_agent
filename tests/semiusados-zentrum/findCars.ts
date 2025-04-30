import {  Auto, AutoInput } from "./types/autoSchema.js";
import Fuse from "fuse.js";

/** Puntajes máximos para cada criterio */
const MAX_SCORES = {
  fuse: 5,
  year: 2,
  price: 2,
  combust: 1,
  trans: 1,
  tag: 3,
};

/** Normaliza cadenas: minúsculas, sin tildes ni espacios alrededor */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}


export function buscarAutosMejorado(
  params: AutoInput,
  autos: Auto[]
): { auto: Auto; score: number }[] {
  // 1) Normalizar input
  const normParams = {
    marca: params.marca ? normalizar(params.marca) : null,
    modelo: params.modelo ? normalizar(params.modelo) : null,
    combustible: params.combustible
      ? normalizar(params.combustible)
      : null,
    transmision: params.transmision
      ? normalizar(params.transmision)
      : null,
    anio:
      params.anio && !isNaN(Number(params.anio))
        ? Number(params.anio)
        : null,
    precio_contado:
      params.precio_contado && !isNaN(Number(params.precio_contado))
        ? Number(params.precio_contado)
        : null,
    query: params.query ? normalizar(params.query) : null,
  };

  // 2) Normalizar cada auto una sola vez
  type NormAuto = {
    original: Auto;
    norm: {
      marca: string ;
      modelo: string;
      combustible: string;
      transmision: string;
      tag: string | null;
    };
  };

  let normalizedAutos: NormAuto[] = autos.map((a) => ({
    original: a,
    norm: {
      marca: normalizar(a.marca ?? ""),
      modelo: normalizar(a.modelo ?? ""),
      combustible: normalizar(a.combustible ?? ""),
      transmision: normalizar(a.transmision ?? ""),
      tag: a.tag ? normalizar(a.tag) : null,
    },
  }));

  // 3) Filtros iniciales (marca / combustible / transmisión)
  let candidates = normalizedAutos;
  if (normParams.marca) {
    candidates = candidates.filter((a) =>
      a.norm.marca.includes(normParams.marca!)
    );
  }
  if (normParams.combustible) {
    candidates = candidates.filter(
      (a) => a.norm.combustible === normParams.combustible
    );
  }
  if (normParams.transmision) {
    candidates = candidates.filter(
      (a) => a.norm.transmision === normParams.transmision
    );
  }

  // Si no hay resultados, relaja filtros
  if (
    candidates.length === 0 &&
    (normParams.marca || normParams.combustible || normParams.transmision)
  ) {
    candidates = normalizedAutos;
  }

  // 4) Configurar Fuse.js solo sobre modelo+marca
  const fuse = new Fuse(candidates.map((c) => c.original), {
    keys: [
      { name: "modelo", weight: 0.6 },
      { name: "marca", weight: 0.2 },
    ],
    threshold: 0.4,
  });

  const searchTerm = [normParams.modelo, normParams.marca]
    .filter(Boolean)
    .join(" ");

  const fuseResults = searchTerm
    ? fuse.search(searchTerm).map((r) => ({
        auto: r.item,
        fuseScore: 1 - (r.score ?? 1),
      }))
    : candidates.map((c) => ({ auto: c.original, fuseScore: 0 }));

  // 5) Calcular score final combinando todos los criterios
  return fuseResults
    .map(({ auto, fuseScore }) => {
      let score = 0;

      // 5.1 Fuse difuso
      score += fuseScore * MAX_SCORES.fuse;

      // 5.2 Año (cae lineal en ±5 años)
      if (normParams.anio != null) {
        const delta = Math.abs(auto.anio?  - normParams.anio : 0);
        const yearScore = Math.max(0, 1 - delta / 5);
        score += yearScore * MAX_SCORES.year;
      } else {
        score += MAX_SCORES.year;
      }

      // 5.3 Precio (1 – diffPct)
      if (normParams.precio_contado != null) {
        const diffPct = Math.abs(auto.precio_contado? - normParams.precio_contado: 0) 
          normParams.precio_contado;
        const priceScore = Math.max(0, 1 - diffPct);
        score += priceScore * MAX_SCORES.price;
      } else {
        score += MAX_SCORES.price;
      }

      // 5.4 Combustible exacto
      if (normParams.combustible) {
        if (normalizar(auto.combustible ?? "") === normParams.combustible) {
          score += MAX_SCORES.combust;
        }
      } else {
        score += MAX_SCORES.combust;
      }

      // 5.5 Transmisión exacta
      if (normParams.transmision) {
        if (normalizar(auto.transmision ?? "") === normParams.transmision) {
          score += MAX_SCORES.trans;
        }
      } else {
        score += MAX_SCORES.trans;
      }

      // 5.6 Tag “oportunidad” si el usuario lo pide
      if (
        normParams.query?.includes("oportunidad") &&
        normalizar(auto.tag ?? "").includes("oportunidad")
      ) {
        score += MAX_SCORES.tag;
      }

      return { auto, score };
    })
    .sort((a, b) => b.score - a.score);
}