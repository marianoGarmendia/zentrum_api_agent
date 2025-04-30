import {z} from "zod";
export const autoSchema = z.object({
    modelo: z.string().describe("Modelo del vehiculo").nullable(),
    combustible: z.enum(["Gasolina", "Diesel", "Eléctrico"]).nullable(),
    transmision: z.string().nullable(),
    anio: z.string().describe("Año del vehiculo, valores validos de ejemplo: 2020, 2021, 2022, 2023").nullable(),
    precio_contado: z.string().describe("Precio de contado del vehiculo, valores validos de ejemplo, no utilizan puntos: 10000, 20000, 30000, 40000, 23990000, 52990000").nullable(),
  });

export type AutoInput = z.infer<typeof autoSchema>;

 export  type Auto = {
    modelo: string;
    anio: number;
    combustible: "Gasolina" | "Diésel" | "Eléctrico" | string;
    transmision: string;
    kilometraje_kms: number;
    precio_financiamiento: number;
    precio_contado: number;
    tag?: string | null;
   
  };
  