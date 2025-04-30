import {
  ActionRequest,
  HumanInterruptConfig,
  HumanInterrupt,
  HumanResponse,
} from "@langchain/langgraph/prebuilt";

import { interrupt } from "@langchain/langgraph";

 
export interface toolInput {
  zentrumBooking: { name: string; start: string; email: string };
  zentrumSearch: {
    marca: string;
    modelo: string;
    precio_financiamiento: number;
    precio_contado: number;
    anio: number;
    combustible: "Gasolina" | "Diesel" | "Eléctrico" | "Híbrido";
    transmision: string;
  };
  zentrumGetAvailability:{ startTime:string, endTime:string }
}

export const humanNode = (lastMessage:any, companyTool: keyof toolInput) => {
  const toolArgs = lastMessage.tool_calls[0]
    .args as toolInput[typeof companyTool];

  // Define the interrupt request
  const actionRequest: ActionRequest = {
    action: "Confirma la información que brindaste",
    args: toolArgs,
  };

  const description = `Por favor, confirma la informacion que brindaste ${JSON.stringify(
    toolArgs
  )}`;

  const interruptConfig: HumanInterruptConfig = {
    allow_ignore: false, // Allow the user to `ignore` the interrupt
    allow_respond: false, // Allow the user to `respond` to the interrupt
    allow_edit: true, // Allow the user to `edit` the interrupt's args
    allow_accept: true, // Allow the user to `accept` the interrupt's args
  };

  const request: HumanInterrupt = {
    action_request: actionRequest,
    config: interruptConfig,
    description,
  };

  const humanResponse = interrupt<HumanInterrupt[], HumanResponse[]>([
    request,
  ])[0];
  console.log("request: ", request);

  console.log("humanResponse: ", humanResponse);

  if (humanResponse.type === "response") {
    const message = `User responded with: ${humanResponse.args}`;
    return { interruptResponse: message, humanResponse: humanResponse.args };
  } else if (humanResponse.type === "accept") {
    const message = `User accepted with: ${JSON.stringify(humanResponse.args)}`;
    return { interruptResponse: message, humanResponse: humanResponse };
  } else if (humanResponse.type === "edit") {
    const message = `User edited with: ${JSON.stringify(humanResponse.args)}`;
    return { interruptResponse: message, humanResponse: humanResponse.args };
  } else if (humanResponse.type === "ignore") {
    const message = "User ignored interrupt.";
    return { interruptResponse: message, humanResponse: humanResponse };
  }

  return {
    interruptResponse:
      "Unknown interrupt response type: " + JSON.stringify(humanResponse),
  };
};