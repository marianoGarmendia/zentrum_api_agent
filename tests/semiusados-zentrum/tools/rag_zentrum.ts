import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rutaArchivo = path.join(__dirname, "../docs/zentrum_info.pdf");

const loader = new PDFLoader(rutaArchivo);

const docs = await loader.load();

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",

  apiKey: process.env.OPENAI_API_KEY,
});

const model = new ChatOpenAI({
  model: "gpt-4o",
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
});

export const zentrum_info_tool = tool(
  async ({ query }) => {
    const vectorStore = new MemoryVectorStore(embeddings);
    await vectorStore.addDocuments(docs);

    const retriever = vectorStore.asRetriever({
      k: 5,
    });
    const docsFound = await retriever.invoke(query);
    console.dir(docsFound, { depth: null });

    const content = docsFound.map((doc) => doc.pageContent);
    const texto = content.join(" ");

    const prompt =` según el siguiente texto, responde la consulta de la manera mas completa posible, si no puedes responder, di que no puedes responder. 
    
    texto: ${texto} \n\n\n 
    
    consulta: ${query}`;
    try {
        const response = await model.invoke(prompt)
        if(!response) {
            throw new Error("No se pudo obtener respuesta del modelo.");
        }
        const texto = response.content as string;
        console.log("Respuesta del modelo: ", texto);
        
        return texto;
    } catch (error) {
        
    }



    return texto;
  },
  {
    name: "zentrum_informacion_de_la_empresa",
    description:
      "Obtiene informacion de la empresa zentrum, quienes son, y como gestionar los reclamos, denuncias y consultas",
    schema: z.object({
      query: z
        .string()
        .describe(
          "Consulta a realizar sobre informacion de la empresa zentrum, quienes son, y como gestionar los reclamos, denuncias y consultas"
        ),
    }),
  }
);