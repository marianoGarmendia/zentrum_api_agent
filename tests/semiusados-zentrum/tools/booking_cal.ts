import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
// import { humanNode } from "../human-node/human-node";
// import { workflow } from "../../zentrum.js";
// import { AIMessage } from "@langchain/core/messages";
// import type { toolInput } from "../human-node/human-node";

const CAL_API_KEY = process.env.CAL_ZENTRUM_API_KEY;

export const model = new ChatOpenAI({
  model: "gpt-4o",
  apiKey: process.env.OPENAI_API_KEY_WIN_2_WIN,
  temperature: 0,
});

interface Slot {
  time: string;
}

interface Slots {
  [fecha: string]: Slot[];
}

interface Data {
  slots: Slots;
}

// Herramienta para agendar una cita en cal
export const createbookingTool = tool(
  async ({ name, start, email }, _config) => {
    // const state = await workflow.getState({
    //   configurable: { thread_id: _config.configurable.thread_id },
    // });

    const fechaOriginal = new Date(start);
    // Restar 3 horas (3 * 60 * 60 * 1000 milisegundos)
    const fechaAjustada = new Date(
      fechaOriginal.getTime() + 3 * 60 * 60 * 1000,
    ).toISOString();

    // const fechaOriginalIso = fechaOriginal.toISOString();
    console.log("fecha original: " + fechaOriginal);
    console.log("fecha original en ISO: " + fechaOriginal.toISOString());

    console.log("fecha ajustada: " + fechaAjustada);

    try {
      const response = await fetch("https://api.cal.com/v2/bookings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CAL_API_KEY}`,
          "cal-api-version": "2024-08-13",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attendee: {
            name: name,
            timeZone: "America/Santiago",
            language: "es",
            email: email,
          },
          eventTypeId: 2362500, // aca va empresa.eventTypeId
          start: fechaAjustada, // Asegúrate de que start es un string en formato "YYYY-MM-DDTHH:mm:ss.SSSZ"
        }),
      });

      const isBooking = await response.json();
      return isBooking;
    } catch (error) {
      throw new Error("Error al crear la reserva: " + error);
    }
  },
  {
    name: "createbookingTool",
    description: "Crea una reserva en Cal",
    schema: z.object({
      name: z.string().describe("Nombre del asistente"),
      start: z
        .string()
        .describe("Fecha y hora de la reserva en formato ISO 8601 "),
      email: z.string().describe("Email del asistente"),
    }),
  },
);

// Herramienta para obtener la disponibilidad del evento en CAL

export const getAvailabilityTool = tool(
  async ({ startTime, endTime }, _config) => {
    console.log("startTime:", startTime);
    console.log("endTime:", endTime);

    try {
      const response = await fetch(
        `https://api.cal.com/v2/slots/available?startTime=${startTime}&endTime=${endTime}&eventTypeId=2362500`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${CAL_API_KEY}`,
          },
        },
      );

      const isAvailability = await response.json();
      console.log("isAvailability:", isAvailability);

      if (
        !isAvailability ||
        !isAvailability.data ||
        !isAvailability.data.slots
      ) {
        throw new Error(
          "La respuesta de la API no contiene datos válidos de disponibilidad",
        );
      }

      const data: Data = isAvailability.data;

      const horarios_disponibles: string[] = [];

      for (const fecha in data.slots) {
        data.slots[fecha].forEach((slot: Slot) => {
          const fechaOriginal = new Date(slot.time);
          const fechaAjustada = new Date(
            fechaOriginal.getTime() - 3 * 60 * 60 * 1000,
          );
          horarios_disponibles.push(fechaAjustada.toISOString());
        });
      }

      console.log("Horarios disponibles parseados:", horarios_disponibles);

      if (horarios_disponibles.length === 0) {
        return "No hay horarios disponibles para la fecha seleccionada.";
      } else {
        return horarios_disponibles;
      }
    } catch (error) {
      console.error("Error en getAvailabilityTool:", error);
      throw new Error(
        "Error al obtener la disponibilidad: " + (error as Error).message,
      );
    }
  },
  {
    name: "Obtener_disponibilidad_de_turnos",
    description:
      "Obtiene la disponibilidad de un turno para la visita a la empresa o ir a tasar un auto",
    schema: z.object({
      startTime: z
        .string()
        .describe(
          "Fecha y hora de inicio de la disponibilidad en formato ISO 8601,  Ejemplo: 2025-02-13T16:00:00.000Z",
        ),
      endTime: z
        .string()
        .describe(
          "Fecha y hora de fin de la disponibilidad en formato ISO 8601, (Ej: 2025-02-13T16:00:00.000Z)",
        ),
    }),
  },
);

// export const check_availability_by_professional_tool = tool(
//   async (horarios) => {
//     const prompt = `Hola`;

//     const listaHorarios = await model.invoke(prompt);
//     return listaHorarios.content;
//   },

//   {
//     name: "check_availability_by_professional_tool",
//     description: "Chequear disponibilidad por profesional",
//     schema: z.array(
//       z
//         .string()
//         .describe(
//           "horarios disponibles en la agenda para comparar con la disponibilidad del profesional"
//         )
//     ),
//   }
// );
