import { autoSchema, Auto, AutoInput } from "./types/autoSchema.js";

export function buscarAutos(
  params: AutoInput,
  autos: Auto[]
): { auto: Auto; score: number }[] {
  const  { modelo, combustible, transmision, anio, precio_contado } = params

    // Parsear strings a números de forma segura
    const anioNum = anio && !isNaN(Number(anio)) ? Number(anio) : null;
const precioContadoNum = precio_contado && !isNaN(Number(precio_contado)) ? Number(precio_contado) : null;

  const modeloInput = modelo?.toLowerCase().trim().split(/\s+/);

  const autosPuntuados = autos.map((auto) => {
    let score = 0;

    // Coincidencia de modelo (parcial y no sensible a mayúsculas)
    const modeloAuto = auto.modelo.toLowerCase();
    const modeloCoincide = modeloInput?.every((palabra) =>
      modeloAuto.includes(palabra)
    );
    if (modeloCoincide) score++;

    // Combustible
    if (!combustible || auto.combustible === combustible) {
      score++;
    }

    // Transmisión
    if (
      !transmision ||
      auto.transmision.toLowerCase() === transmision.toLowerCase()
    ) {
      score++;
    }

    // Año
    if (!anioNum || Number(auto.anio) === anioNum) {
      score++;
    }

    // Precio contado
    if (!precioContadoNum) {
      score++;
    } else {
      const rango = 0.1; // 10% de tolerancia
      const min = precioContadoNum * (1 - rango);
      const max = precioContadoNum * (1 + rango);
      if (Number(auto.precio_contado) >= min && Number(auto.precio_contado) <= max) {
        score++;
      }
    }

    return { auto, score };
  });

  // Ordenar por puntuación descendente
  return autosPuntuados.sort((a, b) => b.score - a.score);
}