import { AIMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
// import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
// import { humanNode } from "./semiusados-zentrum/human-node/human-node.js";

import { StateGraph, END } from "@langchain/langgraph";
import {
  MemorySaver,
  Annotation,
  MessagesAnnotation,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { encode } from "gpt-3-encoder";
import {
  createbookingTool,
  getAvailabilityTool,
} from "./semiusados-zentrum/tools/booking_cal.js";
// import { autoSchema } from "./semiusados-zentrum/types/autoSchema.js";
import { buscarAutos } from "./semiusados-zentrum/findCars.js";
// import { getUniversalFaq, noticias_y_tendencias } from "./firecrawl";
// import { TavilySearchAPIRetriever } from "@langchain/community/retrievers/tavily_search_api";
import { semiUsadosZentrum } from "./semiusados-zentrum/allcars.js";
import { zentrum_info_tool } from "./semiusados-zentrum/tools/rag_zentrum.js";
// import { contexts } from "./contexts.js";
// import { info, log } from "console";
// import { ToolCall } from "openai/resources/beta/threads/runs/steps.mjs";

const stateAnnotation = MessagesAnnotation;

const newState = Annotation.Root({
  ...stateAnnotation.spec,

  interruptResponse: Annotation<string>,
});

// const tavilySearch = new TavilySearchAPIRetriever({
//   apiKey: process.env.TAVILY_API_KEY as string,
//   k: 5,
//   searchDepth: "advanced",
//   kwargs: {
//     lang: "es",
//     country: "CL",

//   },

// });

// const tavilySearch = new TavilySearchResults({
//   apiKey: process.env.TAVILY_API_KEY,
//   maxResults: 5,
//   searchDepth: "deep",
// });

// type AutoInput = z.infer<typeof autoSchema>;

const get_cars = tool(
  async (
    { modelo, combustible, transmision, anio, precio_contado, query },
    config,
  ) => {
    // const state = await workflow.getState({
    //   configurable: { thread_id: config.configurable.thread_id },
    // });

    // const { messages } = state.values;
    // const lastMessage = messages[messages.length - 1] as AIMessage;

    // const responseInterrupt = humanNode(lastMessage, "zentrumSearch");

    // if(responseInterrupt.humanResponse && typeof responseInterrupt.humanResponse !== 'string' && responseInterrupt.humanResponse.args){
    //   const toolArgsInterrupt = responseInterrupt.humanResponse.args as AutoInput;
    //   const autosEncontrados = buscarAutos(
    //     toolArgsInterrupt,
    //     semiUsadosZentrum
    //   );
    console.log("buscando autos");

    const autosEncontrados = buscarAutos(
      { modelo, combustible, transmision, anio, precio_contado },
      semiUsadosZentrum,
    );
    if (!query) query = "No hay consulta del cliente";
    const primerosCincoAutos = autosEncontrados.slice(0, 5);

    console.log("autos encontrados");

    console.dir(primerosCincoAutos, { depth: null });

    const response = `Los autos encontrados segun el criterio de siguiente cirterio de búsqueda: modelo: ${modelo} combustible: ${combustible} , Transmision: ${transmision},año ${anio}, 
    precio: ${precio_contado?.toString()} 
    
    son: ${JSON.stringify(primerosCincoAutos)}.
    
    Por favor analiza los autos encontrados y selecciona el que consideres más relevante para el cliente.
    Además el cliente ha realizado la siguiente consulta: ${query}.

    de ser necesario utiliza la herramienta: "tavily_search_result" para buscar en internet información adicional sobre el auto seleccionado y la consulta técnica del cliente.
    responde con un mensaje estructurado de buena manera para pasarlo al siguiente nodo de evaluacion por otro modelo llm.`;

    // const modelCars = new ChatOpenAI({
    //   model: "gpt-4o",
    //   apiKey: process.env.ZENTRUM_OPENAI_API_KEY,
    //   temperature: 0,
    // }).bindTools([tavilySearch]);
    try {
      // const response = await modelCars.invoke(prompt);
      if (!primerosCincoAutos)
        return "Estamos teniendo problemas para encontrar autos, por favor intentalo nuevamente mas tarde";
      return response;
    } catch (error) {
      console.error("Error al buscar autos:", error);
      throw new Error("Error al buscar autos");
    }
  },

  {
    name: "Catalogo_de_Vehiculos",
    description: `Busca en la base de datos de vehículos seminuevos y devuelve los resultados más relevantes según los criterios proporcionados.`,
    schema: z.object({
      modelo: z.string().describe("Modelo del vehículo"),
      combustible: z
        .enum(["Gasolina", "Diesel", "Eléctrico"])
        .describe(
          "Tipo de combustible del vehículo (Gasolina, Diesel o Eléctrico)",
        )
        .nullable(),
      transmision: z
        .string()
        .describe("Tipo de transmisión del vehículo")
        .nullable(),
      anio: z.string().describe("Año del vehículo").nullable(),
      precio_contado: z
        .string()
        .describe("Precio de contado aproximado del vehículo")
        .nullable(),
      query: z
        .string()
        .describe(
          "Consulta o requerimiento técnico del cliente sobre el vehículo",
        )
        .nullable(),
    }),
  },
);

const simulacion_de_credito = tool(
  async ({ valor_vehiculo, monto_a_financiar, cuotas }, config) => {
    // const model = new ChatOpenAI({
    //   model: "gpt-4o-mini",
    //   streaming: false,
    //   apiKey: process.env.ZENTRUM_OPENAI_API_KEY,
    //   temperature: 0,

    // });

    const response = `Simula un credito para un auto de ${valor_vehiculo} con un monto a financiar de ${monto_a_financiar} y ${cuotas} cuotas.
     con una tasa referencial de 1,74. 
     En la respuesta incluye la cuota estimada, el monto total a pagar y el monto de intereses.
     aclara abajo lo siguiente: *Los cálculos son referenciales y pueden no coincidir con los reales.
      Calculado con una tasa referencial de 1,74.      
    `;
    try {
      // const response = await model.invoke(prompt);

      if (!response)
        return "No se pudo realizar la simulacion del credito, intentalo nuevamente";

      return response;
    } catch (error) {
      console.error("Error al simular el credito:", error);
      throw new Error("Error al simular el credito");
    }
  },
  {
    name: "Simulador_de_Credito",
    description: `Ofrece a los clientes la posibilidad de simular opciones de financiamiento, calculando cuotas mensuales estimadas según el monto a financiar, número de cuotas y tasa de interés referencial. *Los cálculos son referenciales y pueden no coincidir con los reales.
Calculado con una tasa referencial de 1,74.`,
    schema: z.object({
      valor_vehiculo: z
        .string()
        .describe("Valor del vehículo para la simulacion del credito"),
      monto_a_financiar: z
        .string()
        .describe("Monto a financiar para la simulacion del credito"),
      cuotas: z
        .enum(["6", "12", "24", "48"])
        .describe("Cantidad de cuotas para la simulacion del credito"),
    }),
  },
);

const tools = [
  get_cars,
  simulacion_de_credito,
  getAvailabilityTool,
  createbookingTool,
  zentrum_info_tool,
];

export const llm = new ChatOpenAI({
  model: "gpt-4o",
  streaming: true,
  apiKey: process.env.ZENTRUM_OPENAI_API_KEY,
  temperature: 0,
}).bindTools(tools);

const toolNode = new ToolNode(tools);

async function callModel(state: typeof newState.State, config: any) {
  const { messages } = state;
  const threadId = config.configurable?.thread_id;
  console.log("Thread ID:", threadId);

  // console.log("sumary agent en callModel");
  // console.log("-----------------------");
  // console.log(summary);

  const systemsMessage = new SystemMessage(
    `   
    # 🎯 System Prompt: Agente de Ventas de Vehículos Seminuevos

Eres un **Agente de IA especializado en vehículos seminuevos** de marcas como Audi, Volkswagen, Skoda, entre otras.

Tu objetivo es **asistir al cliente** en:

- Búsqueda de un vehículo para comprar
- Simulación de crédito
- Cotización de su vehículo en parte de pago o venta
- Coordinación de visitas a la agencia Zentrum

---

## 🛠 Herramientas Disponibles

### 'get_cars'
- **Uso:** Cuando el cliente pide ver autos o tiene preferencias específicas.
- **Descripción:** Consulta el catálogo actualizado (marca, modelo, año, precio, kilometraje) y ofrece opciones.
- **Parámetros:**
  - modelo: string (modelo del vehículo)
  - combustible: string (tipo de combustible)
  - transmision: string (tipo de transmisión)
  - anio: number (año del vehículo)
  - precio_contado: number (precio contado)
  - query: string (consulta o comentario del cliente)
  

---

### simulacion_de_credito
- **Uso:** Cuando el cliente desea simular un plan de financiamiento.
- **Descripción:** Calcula el valor de cuotas según el monto y plazo deseado.
- **Parámetros:**
  - valor_vehiculo: string (valor total del vehículo)
  - monto_a_financiar: string (monto que desea financiar)
  - cuotas: enum (6, 12, 24, 48)

---

### Obtener_disponibilidad_de_turnos
- **Uso:** Cuando se quiere coordinar una visita para ver o tasar un auto.
- **Descripción:** Consulta disponibilidad de horarios.
- **Parámetros:**
  - name: string (nombre del cliente)
  - start: string (fecha y hora solicitada)
  - email: string (email del cliente)

---

### createbookingTool
- **Uso:**
  - Para agendar visitas para ver autos
  - Para agendar visitas de tasación
- **Descripción:** Agenda citas en la agencia Zentrum.
- **Parámetros:**
  - 
  name: string (nombre del cliente)
  - start: string (fecha y hora confirmada)
  - email: string (email del cliente)

---

### REGLA PARA TODAS LAS HERRAMIENTAS
**A los paraemtros que no tengas valores ingresados por el usuario le asignas null**

## 📏 Reglas de Uso de Herramientas

- Usa createbookingTool solo si ya confirmaste disponibilidad con 'Obtener_disponibilidad_de_turnos'.
- No llames a 'Obtener_disponibilidad_de_turnos' si no vas a agendar después.
- No pidas todos los datos de una sola vez: pregunta uno a uno.
- Usa herramientas solo si tienes todos los datos necesarios.
- No llames herramientas innecesariamente.

---

## 🗣️ Reglas de Conversación

- Tono **amigable, profesional y claro**.
- Sin jergas técnicas.
- Siempre preguntar si falta información, no asumir.
- Personalizar respuestas, evitar plantillas automáticas.
- Sé breve, directo y positivo.
- Nunca dar información negativa de autos ni de la empresa.
- Buscar siempre una solución o alternativa.
- Ser persuasivo para concretar citas o ventas.

---

## 🧩 Flujo de Conversación

1. **Saludo Inicial:**
   > "Hola, soy Zen, el Agente IA de Seminuevos Zentrum. ¿En qué puedo ayudarte hoy?"

2. **Recibir consulta.**

3. **Evaluar y decidir:**
   - Buscar autos ➔ 'get_cars'
   - Simular crédito ➔ 'simulacion_de_credito'
   - Coordinar visita ➔ Consultar disponibilidad ➔ Agendar cita
   - Cotizar vehículo ➔ Consultar disponibilidad ➔ Agendar cita

---

## 💬 Ejemplos de Conversación

**Cliente:** "Quiero financiar un vehículo de $15,000,000 en 36 cuotas."  
**Agente:** "Perfecto. ¿Deseas financiar el total o solo una parte? Así puedo calcular mejor tu cuota."

---

**Cliente:** "Me gustaría probar el Audi Q5 antes de comprarlo."  
**Agente:** "¡Genial! ¿Qué día y horario te resultan más cómodos? Voy a verificar la disponibilidad."

---

**Cliente:** "Quiero saber cuánto me darían por mi auto actual."  
**Agente:** "Podemos coordinar una visita para tasarlo. ¿Qué día y franja horaria te quedarían mejor?"

---

## 🕐 Contexto Actual

Hoy es **${new Date().toLocaleDateString(
      "es-ES",
    )}**, hora **${new Date().toLocaleTimeString("es-ES")}**.

---




    `,
  );

  const response = await llm.invoke([systemsMessage, ...messages]);
  console.log("call model");

  //   console.log("response: ", response);

  console.log("state en call model", state);

  const cadenaJSON = JSON.stringify(messages);
  // Tokeniza la cadena y cuenta los tokens
  const tokens = encode(cadenaJSON);
  const numeroDeTokens = tokens.length;

  console.log(`Número de tokens: ${numeroDeTokens}`);

  return { messages: [...messages, response] };

  // console.log(messages, response);

  // We return a list, because this will get added to the existing list
}

function shouldContinue(state: typeof newState.State) {
  const { messages } = state;

  const lastMessage = messages[messages.length - 1] as AIMessage;
  // If the LLM makes a tool call, then we route to the "tools" node
  if (lastMessage?.tool_calls?.length) {
    return "tools";
  } else {
    return END;
  }

  // Otherwise, we stop (reply to the user)
}

// const toolNodo = async (state: typeof newState.State) => {
//   const { messages } = state;

//   const lastMessage = messages[messages.length - 1] as AIMessage;
//   console.log("toolNodo");
//   console.log("-----------------------");
//   console.log(lastMessage);
//   console.log(lastMessage?.tool_calls);

//   let toolMessage: BaseMessageLike = "un tool message" as BaseMessageLike;
//   if (lastMessage?.tool_calls?.length) {
//     const toolName = lastMessage.tool_calls[0].name;
//     const toolArgs = lastMessage.tool_calls[0].args as {
//       habitaciones: string | null;
//       precio_aproximado: string;
//       zona: string;
//       superficie_total: string | null;
//       piscina: "si" | "no" | null;
//       tipo_operacion: "venta" | "alquiler";
//     } & { query: string } & { startTime: string; endTime: string } & {
//       name: string;
//       start: string;
//       email: string;
//     };
//     let tool_call_id = lastMessage.tool_calls[0].id as string;

//     if (toolName === "Obtener_pisos_en_venta_dos") {
//       const response = await getPisos2.invoke(toolArgs);
//       if (typeof response !== "string") {
//         toolMessage = new ToolMessage(
//           "Hubo un problema al consultar las propiedades intentemoslo nuevamente",
//           tool_call_id,
//           "Obtener_pisos_en_venta_dos"
//         );
//       } else {
//         toolMessage = new ToolMessage(
//           response,
//           tool_call_id,
//           "Obtener_pisos_en_venta_dos"
//         );
//       }
//     } else if (toolName === "universal_info_2025") {
//       // const res = await pdfTool.invoke(toolArgs);
//       // toolMessage = new ToolMessage(res, tool_call_id, "universal_info_2025");
//     } else if (toolName === "get_availability_Tool") {
//       const res = await getAvailabilityTool.invoke(toolArgs);
//       toolMessage = new ToolMessage(res, tool_call_id, "get_availability_Tool");
//     } else if (toolName === "create_booking_tool") {
//       const res = await createbookingTool.invoke(toolArgs);
//       toolMessage = new ToolMessage(res, tool_call_id, "create_booking_tool");
//     }
//   } else {
//     return { messages };
//   }
//   // tools.forEach((tool) => {
//   //   if (tool.name === toolName) {
//   //     tool.invoke(lastMessage?.tool_calls?[0]['args']);
//   //   }
//   // });
//   // console.log("toolMessage: ", toolMessage);

//   return { messages: [...messages, toolMessage] };
// };

// const delete_messages = async (state: typeof newState.State) => {
//   const { messages, summary } = state;
//   console.log("delete_messages");
//   console.log("-----------------------");

//   console.log(messages);

//   let summary_text = "";

//   let messages_parsed: any[] = [];
//   messages_parsed = messages.map((message) => {
//     if (message instanceof AIMessage) {
//       return {
//         ...messages_parsed,
//         role: "assistant",
//         content: message.content,
//       };
//     }
//     if (message instanceof HumanMessage) {
//       return { ...messages_parsed, role: "Human", content: message.content };
//     }
//   });

//   // 1. Filtrar elementos undefined
//   const filteredMessages = messages_parsed.filter(
//     (message) => message !== undefined
//   );

//   // 2. Formatear cada objeto
//   const formattedMessages = filteredMessages.map(
//     (message) => `${message.role}: ${message.content}`
//   );

//   // 3. Unir las cadenas con un salto de línea
//   const prompt_to_messages = formattedMessages.join("\n");

//   if (messages.length > 3) {
//     if (!summary) {
//       const intructions_summary = `Como asistente de inteligencia artificial, tu tarea es resumir los siguientes mensajes para mantener el contexto de la conversación. Por favor, analiza cada mensaje y elabora un resumen conciso que capture la esencia de la información proporcionada, asegurándote de preservar el flujo y coherencia del diálogo
//         mensajes: ${prompt_to_messages}
//         `;

//       const summary_message = await model.invoke(intructions_summary);
//       summary_text = summary_message.content as string;
//     } else {
//       const instructions_with_summary = `"Como asistente de inteligencia artificial, tu tarea es resumir los siguientes mensajes para mantener el contexto de la conversación y además tener en cuenta el resumen previo de dicha conversación. Por favor, analiza cada mensaje y el resumen y elabora un nuevo resumen conciso que capture la esencia de la información proporcionada, asegurándote de preservar el flujo y coherencia del diálogo.

//       mensajes: ${prompt_to_messages}

//       resumen previo: ${summary}

//       `;

//       const summary_message = await model.invoke(instructions_with_summary);

//       summary_text = summary_message.content as string;
//     }

//     return {
//       messages: [
//         ...messages.slice(0, -3).map((message) => {
//           return new RemoveMessage({ id: message.id as string });
//         }),
//       ],
//       summary: summary_text,
//     };
//   }
//   return { messages };
// };

const graph = new StateGraph(newState);

graph
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

// .addEdge("agent", "delete_messages")
// .addEdge("delete_messages", "__end__")

const checkpointer = new MemorySaver();

export const workflow = graph.compile({ checkpointer });
// let config = { configurable: { thread_id: "123" } };

// const response = await workflow.invoke({messages:"dame las noticias ams relevantes de este 2025"}, config)

// console.log("response: ", response);

// const response =  workflow.streamEvents({messages: [new HumanMessage("Hola como estas? ")]}, {configurable: {thread_id: "1563"} , version: "v2" });
// console.log("-----------------------");
// console.log("response: ", response);

// await workflow.stream({messages: [new HumanMessage("Podes consultar mi cobertura?")]}, {configurable: {thread_id: "1563"} , streamMode: "messages" });

// console.log("-----------------------");

// await workflow.stream({messages: [new HumanMessage("Mi dni es 32999482, tipo dni")]}, {configurable: {thread_id: "1563"} , streamMode: "messages" });

// for await (const message of response) {

//   // console.log(message);
//   // console.log(message.content);
//   // console.log(message.tool_calls);

//   console.dir({
//     event: message.event,
//     messages: message.data,

//   },{
//     depth: 3,
//   });
// }

// for await (const message of response) {
//   // console.log(message);

//   console.dir(message, {depth: null});
// }

// await workflow.stream(new Command({resume: true}));

// Implementacion langgraph studio sin checkpointer
// export const workflow = graph.compile();

// MODIFICAR EL TEMA DE HORARIOS
// En el calendar de cal esta configurado el horario de bs.as.
// El agente detecta 3hs mas tarde de lo que es en realidad es.
// Ejemplo: si el agente detecta 16hs, en realidad es 13hs.
// Para solucionar este problema, se debe modificar el horario de la herramienta "create_booking_tool".
// En la herramienta "create_booking_tool" se debe modificar el horario de la variable "start".
// En la variable "start" se debe modificar la hora de la reserva.
