import { and, asc, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
   GoogleGenerativeAI,
   SchemaType,
   type Tool,
} from "@google/generative-ai";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export const runtime = "nodejs";

// Lazy initialization to avoid build-time errors
let _gemini: GoogleGenerativeAI | null = null;

function getGemini() {
   if (!_gemini) {
      _gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
   }
   return _gemini;
}

function getModel() {
   return process.env.GEMINI_MODEL || "gemini-1.5-flash";
}

// Tool definitions for Gemini
const functionDeclarations = [
   {
      name: "searchParts",
      description:
         "Search for parts by name, ID, color, category, job number, size, brand, or other attributes. Returns matching parts with their total quantities.",
      parameters: {
         type: SchemaType.OBJECT,
         properties: {
            query: {
               type: SchemaType.STRING,
               description:
                  "Search query to match against part name, ID, color, category, job number, size, brand, thickness, or pallet",
            },
         },
         required: ["query"],
      },
   },
   {
      name: "filterParts",
      description:
         "Filter parts by multiple attributes (size, color, category, brand, job, etc). Returns matching parts with their total quantities.",
      parameters: {
         type: SchemaType.OBJECT,
         properties: {
            partId: { type: SchemaType.STRING, description: "Part ID (partial match)" },
            partName: { type: SchemaType.STRING, description: "Part name (partial match)" },
            color: { type: SchemaType.STRING, description: "Color (partial match)" },
            category: { type: SchemaType.STRING, description: "Category (partial match)" },
            jobNumber: { type: SchemaType.STRING, description: "Job number (partial match)" },
            brand: { type: SchemaType.STRING, description: "Brand (partial match)" },
            pallet: { type: SchemaType.STRING, description: "Pallet (partial match)" },
            unit: { type: SchemaType.STRING, description: "Unit (partial match)" },
            sizeWMin: { type: SchemaType.NUMBER, description: "Minimum width" },
            sizeWMax: { type: SchemaType.NUMBER, description: "Maximum width" },
            sizeLMin: { type: SchemaType.NUMBER, description: "Minimum length" },
            sizeLMax: { type: SchemaType.NUMBER, description: "Maximum length" },
            thicknessMin: { type: SchemaType.NUMBER, description: "Minimum thickness" },
            thicknessMax: { type: SchemaType.NUMBER, description: "Maximum thickness" },
            limit: { type: SchemaType.NUMBER, description: "Maximum number of parts to return" },
         },
      },
   },
   {
      name: "getPartDetails",
      description:
         "Get detailed information about a specific part including quantities at each location.",
      parameters: {
         type: SchemaType.OBJECT,
         properties: {
            partId: {
               type: SchemaType.STRING,
               description: "The part_id (text identifier) of the part to look up",
            },
         },
         required: ["partId"],
      },
   },
   {
      name: "getRecentMoves",
      description:
         "Get recent inventory movements. Can filter by time range (today, week, etc).",
      parameters: {
         type: SchemaType.OBJECT,
         properties: {
            range: {
               type: SchemaType.STRING,
               enum: ["today", "yesterday", "week", "month"],
               description: "Time range for the movements",
            },
            limit: {
               type: SchemaType.NUMBER,
               description: "Maximum number of moves to return (default 20)",
            },
         },
         required: ["range"],
      },
   },
   {
      name: "getLastMoveForPart",
      description:
         "Get the most recent movement for a specific part, showing who touched it and when.",
      parameters: {
         type: SchemaType.OBJECT,
         properties: {
            partId: {
               type: SchemaType.STRING,
               description: "The part_id (text identifier) to look up",
            },
         },
         required: ["partId"],
      },
   },
   {
      name: "listLocations",
      description:
         "List known locations with optional search across location code, type, or zone.",
      parameters: {
         type: SchemaType.OBJECT,
         properties: {
            query: {
               type: SchemaType.STRING,
               description: "Optional search term for location code, type, or zone",
            },
            limit: { type: SchemaType.NUMBER, description: "Maximum number of locations to return" },
         },
      },
   },
   {
      name: "listCategories",
      description: "List part categories with optional search.",
      parameters: {
         type: SchemaType.OBJECT,
         properties: {
            query: { type: SchemaType.STRING, description: "Optional search term for category" },
            limit: { type: SchemaType.NUMBER, description: "Maximum number of categories to return" },
         },
      },
   },
   {
      name: "listBrands",
      description: "List part brands with optional search.",
      parameters: {
         type: SchemaType.OBJECT,
         properties: {
            query: { type: SchemaType.STRING, description: "Optional search term for brand" },
            limit: { type: SchemaType.NUMBER, description: "Maximum number of brands to return" },
         },
      },
   },
   {
      name: "getInventoryByLocation",
      description: "Get all parts and quantities at a specific location code.",
      parameters: {
         type: SchemaType.OBJECT,
         properties: {
            locationId: { type: SchemaType.STRING, description: "Location code to look up" },
         },
         required: ["locationId"],
      },
   },
   {
      name: "getLowStockParts",
      description: "List parts with low total quantity (default threshold 5).",
      parameters: {
         type: SchemaType.OBJECT,
         properties: {
            threshold: { type: SchemaType.NUMBER, description: "Low-stock threshold (default 5)" },
            limit: { type: SchemaType.NUMBER, description: "Maximum number of parts to return" },
         },
      },
   },
   {
      name: "getInventorySummaryByJob",
      description: "Summarize total quantities by job number, with optional filter.",
      parameters: {
         type: SchemaType.OBJECT,
         properties: {
            jobNumber: { type: SchemaType.STRING, description: "Optional job number filter (partial match)" },
            limit: { type: SchemaType.NUMBER, description: "Maximum number of job rows to return" },
         },
      },
   },
   {
      name: "getInventorySummaryByBrand",
      description: "Summarize total quantities by brand, with optional filter.",
      parameters: {
         type: SchemaType.OBJECT,
         properties: {
            brand: { type: SchemaType.STRING, description: "Optional brand filter (partial match)" },
            limit: { type: SchemaType.NUMBER, description: "Maximum number of brand rows to return" },
         },
      },
   },
];

const tools = [
   {
      functionDeclarations,
   },
] as unknown as Tool[];

// Tool implementations
async function searchParts(query: string) {
   const searchPattern = `%${query}%`;

   const parts = await db
      .select({
         id: schema.parts.id,
         partId: schema.parts.partId,
         partName: schema.parts.partName,
         color: schema.parts.color,
         category: schema.parts.category,
         jobNumber: schema.parts.jobNumber,
         sizeW: schema.parts.sizeW,
         sizeL: schema.parts.sizeL,
         thickness: schema.parts.thickness,
         brand: schema.parts.brand,
         pallet: schema.parts.pallet,
         unit: schema.parts.unit,
         totalQty: sql<number>`COALESCE(SUM(${schema.inventory.qty}), 0)`.as(
            "total_qty",
         ),
      })
      .from(schema.parts)
      .leftJoin(schema.inventory, eq(schema.parts.id, schema.inventory.partId))
      .where(
         or(
            ilike(schema.parts.partId, searchPattern),
            ilike(schema.parts.partName, searchPattern),
            ilike(schema.parts.color, searchPattern),
            ilike(schema.parts.category, searchPattern),
            ilike(schema.parts.jobNumber, searchPattern),
            ilike(schema.parts.brand, searchPattern),
            ilike(schema.parts.pallet, searchPattern),
            ilike(schema.parts.unit, searchPattern),
            sql`CAST(${schema.parts.sizeW} AS TEXT) ILIKE ${searchPattern}`,
            sql`CAST(${schema.parts.sizeL} AS TEXT) ILIKE ${searchPattern}`,
            sql`CAST(${schema.parts.thickness} AS TEXT) ILIKE ${searchPattern}`,
         ),
      )
      .groupBy(schema.parts.id)
      .limit(10);

   return parts;
}

async function getPartDetails(partIdText: string) {
   const partResult = await db
      .select()
      .from(schema.parts)
      .where(eq(schema.parts.partId, partIdText))
      .limit(1);

   if (partResult.length === 0) {
      return { error: `Part "${partIdText}" not found` };
   }

   const part = partResult[0];

   const inventoryByLocation = await db
      .select({
         locationCode: schema.locations.locationId,
         locationType: schema.locations.type,
         zone: schema.locations.zone,
         qty: schema.inventory.qty,
      })
      .from(schema.inventory)
      .innerJoin(
         schema.locations,
         eq(schema.inventory.locationId, schema.locations.id),
      )
      .where(eq(schema.inventory.partId, part.id));

   const totalQty = inventoryByLocation.reduce((sum, inv) => sum + inv.qty, 0);

   return {
      part: {
         partId: part.partId,
         partName: part.partName,
         color: part.color,
         category: part.category,
         jobNumber: part.jobNumber,
         sizeW: part.sizeW,
         sizeL: part.sizeL,
         thickness: part.thickness,
         brand: part.brand,
         pallet: part.pallet,
         unit: part.unit,
      },
      totalQty,
      locations: inventoryByLocation,
   };
}

async function getRecentMoves(range: string, limit?: number) {
   const resolvedLimit = typeof limit === "number" ? limit : 20;
   const now = new Date();
   let startDate: Date;

   switch (range) {
      case "today":
         startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
         break;
      case "yesterday":
         startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 1,
         );
         break;
      case "week":
         startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 7,
         );
         break;
      case "month":
         startDate = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            now.getDate(),
         );
         break;
      default:
         startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
   }

   const moves = await db
      .select({
         ts: schema.inventoryMoves.ts,
         deltaQty: schema.inventoryMoves.deltaQty,
         note: schema.inventoryMoves.note,
         userName: schema.users.name,
         partId: schema.parts.partId,
         partName: schema.parts.partName,
         locationCode: schema.locations.locationId,
      })
      .from(schema.inventoryMoves)
      .innerJoin(
         schema.users,
         eq(schema.inventoryMoves.userId, schema.users.id),
      )
      .innerJoin(
         schema.parts,
         eq(schema.inventoryMoves.partId, schema.parts.id),
      )
      .innerJoin(
         schema.locations,
         eq(schema.inventoryMoves.locationId, schema.locations.id),
      )
      .where(gte(schema.inventoryMoves.ts, startDate))
      .orderBy(desc(schema.inventoryMoves.ts))
      .limit(resolvedLimit);

   return moves;
}

async function getLastMoveForPart(partIdText: string) {
   const partResult = await db
      .select()
      .from(schema.parts)
      .where(eq(schema.parts.partId, partIdText))
      .limit(1);

   if (partResult.length === 0) {
      return { error: `Part "${partIdText}" not found` };
   }

   const part = partResult[0];

   const lastMove = await db
      .select({
         ts: schema.inventoryMoves.ts,
         deltaQty: schema.inventoryMoves.deltaQty,
         note: schema.inventoryMoves.note,
         userName: schema.users.name,
         locationCode: schema.locations.locationId,
      })
      .from(schema.inventoryMoves)
      .innerJoin(
         schema.users,
         eq(schema.inventoryMoves.userId, schema.users.id),
      )
      .innerJoin(
         schema.locations,
         eq(schema.inventoryMoves.locationId, schema.locations.id),
      )
      .where(eq(schema.inventoryMoves.partId, part.id))
      .orderBy(desc(schema.inventoryMoves.ts))
      .limit(1);

   if (lastMove.length === 0) {
      return { message: `No movement history found for part "${partIdText}"` };
   }

   return {
      part: { partId: part.partId, partName: part.partName },
      lastMove: lastMove[0],
   };
}

async function listLocations(query?: string, limit?: number) {
   const resolvedLimit = typeof limit === "number" ? limit : 20;
   const baseQuery = db
      .select({
         locationId: schema.locations.locationId,
         type: schema.locations.type,
         zone: schema.locations.zone,
      })
      .from(schema.locations);

   if (!query || query.trim() === "") {
      return baseQuery
         .orderBy(asc(schema.locations.locationId))
         .limit(resolvedLimit);
   }

   const searchPattern = `%${query}%`;
   return baseQuery
      .where(
         or(
            ilike(schema.locations.locationId, searchPattern),
            ilike(schema.locations.type, searchPattern),
            ilike(schema.locations.zone, searchPattern),
         ),
      )
      .orderBy(asc(schema.locations.locationId))
      .limit(resolvedLimit);
}

async function listCategories(query?: string, limit?: number) {
   const resolvedLimit = typeof limit === "number" ? limit : 20;
   const baseWhere = and(
      sql`${schema.parts.category} IS NOT NULL`,
      sql`${schema.parts.category} <> ''`,
   );
   const searchPattern = query ? `%${query}%` : null;
   const whereClause =
      searchPattern && query
         ? and(baseWhere, ilike(schema.parts.category, searchPattern))
         : baseWhere;

   return db
      .select({ category: schema.parts.category })
      .from(schema.parts)
      .where(whereClause)
      .groupBy(schema.parts.category)
      .orderBy(asc(schema.parts.category))
      .limit(resolvedLimit);
}

async function listBrands(query?: string, limit?: number) {
   const resolvedLimit = typeof limit === "number" ? limit : 20;
   const baseWhere = and(
      sql`${schema.parts.brand} IS NOT NULL`,
      sql`${schema.parts.brand} <> ''`,
   );
   const searchPattern = query ? `%${query}%` : null;
   const whereClause =
      searchPattern && query
         ? and(baseWhere, ilike(schema.parts.brand, searchPattern))
         : baseWhere;

   return db
      .select({ brand: schema.parts.brand })
      .from(schema.parts)
      .where(whereClause)
      .groupBy(schema.parts.brand)
      .orderBy(asc(schema.parts.brand))
      .limit(resolvedLimit);
}

async function getInventoryByLocation(locationIdText: string) {
   const locationResult = await db
      .select()
      .from(schema.locations)
      .where(eq(schema.locations.locationId, locationIdText))
      .limit(1);

   if (locationResult.length === 0) {
      return { error: `Location "${locationIdText}" not found` };
   }

   const location = locationResult[0];

   const inventory = await db
      .select({
         partId: schema.parts.partId,
         partName: schema.parts.partName,
         color: schema.parts.color,
         category: schema.parts.category,
         qty: schema.inventory.qty,
      })
      .from(schema.inventory)
      .innerJoin(schema.parts, eq(schema.inventory.partId, schema.parts.id))
      .where(eq(schema.inventory.locationId, location.id))
      .orderBy(asc(schema.parts.partName));

   return {
      location: {
         locationId: location.locationId,
         type: location.type,
         zone: location.zone,
      },
      inventory,
   };
}

// Execute tool calls
async function executeToolCall(
   name: string,
   args: Record<string, unknown>,
): Promise<unknown> {
   switch (name) {
      case "searchParts":
         return searchParts(args.query as string);
      case "getPartDetails":
         return getPartDetails(args.partId as string);
      case "getRecentMoves":
         return getRecentMoves(
            args.range as string,
            typeof args.limit === "number" ? args.limit : undefined,
         );
      case "getLastMoveForPart":
         return getLastMoveForPart(args.partId as string);
      case "listLocations":
         return listLocations(args.query as string, args.limit as number);
      case "listCategories":
         return listCategories(args.query as string, args.limit as number);
      case "listBrands":
         return listBrands(args.query as string, args.limit as number);
      case "getInventoryByLocation":
         return getInventoryByLocation(args.locationId as string);
      default:
         return { error: `Unknown tool: ${name}` };
   }
}

function toGeminiContents(messages: { role: string; content: string }[]) {
   return messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
   }));
}

function getResponseText(response: {
   text?: () => string;
   candidates?: { content?: { parts?: { text?: string }[] } }[];
}) {
   if (typeof response.text === "function") {
      const text = response.text();
      if (text) return text;
   }

   const parts = response.candidates?.[0]?.content?.parts ?? [];
   return parts
      .map((part) => part.text || "")
      .join("")
      .trim();
}

export async function POST(request: Request) {
   try {
      const user = await getCurrentUser();
      if (!user) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (
         !process.env.GEMINI_API_KEY ||
         process.env.GEMINI_API_KEY.trim() === ""
      ) {
         return NextResponse.json(
            {
               error: "AI service not configured. Please set GEMINI_API_KEY in environment variables.",
            },
            { status: 503 },
         );
      }

      const body = await request.json();
      const { messages } = body;

      if (!messages || !Array.isArray(messages)) {
         return NextResponse.json(
            { error: "Messages array is required" },
            { status: 400 },
         );
      }

      // Prepare messages with system prompt
      const systemPrompt = `You are a helpful inventory assistant for a shop. You can search for parts, check quantities at different locations, and see recent inventory movements.

When users ask about:
- "Where is X?" - Search for the part and show its locations
- "Do we have Y?" - Search and show quantities
- "What changed today?" - Get recent movements
- "Who touched Z?" - Get last move for that part

Be concise and helpful. When showing results, mention if quantities are low (less than 5) or out of stock.

If you find a part the user might want to see, include an action suggestion like "Would you like me to show the detail page for [Part Name]?"`;

      const gemini = getGemini();
      const model = gemini.getGenerativeModel({
         model: getModel(),
         systemInstruction: systemPrompt,
         tools,
      });

      const contents = toGeminiContents(messages);
      const lastMessage = contents.pop();
      if (!lastMessage) {
         return NextResponse.json(
            { error: "Messages array is required" },
            { status: 400 },
         );
      }

      const chat = model.startChat({ history: contents });

      let result = await chat.sendMessage(lastMessage.parts);
      let response = result.response;
      let functionCalls =
         typeof response.functionCalls === "function"
            ? response.functionCalls() ?? []
            : [];

      while (functionCalls.length > 0) {
         const toolResponses = [];
         for (const toolCall of functionCalls) {
            let args: Record<string, unknown> = {};
            if (typeof toolCall.args === "object" && toolCall.args !== null) {
               args = toolCall.args as Record<string, unknown>;
            } else if (typeof toolCall.args === "string") {
               try {
                  args = JSON.parse(toolCall.args) as Record<string, unknown>;
               } catch {
                  args = {};
               }
            }
            const toolResult = await executeToolCall(
               toolCall.name,
               args as Record<string, unknown>,
            );
            toolResponses.push({
               functionResponse: { name: toolCall.name, response: toolResult },
            });
         }

         result = await chat.sendMessage(toolResponses);
         response = result.response;
         functionCalls =
            typeof response.functionCalls === "function"
               ? response.functionCalls() ?? []
               : [];
      }

      // Extract action chips from the response
      const actionChips: { label: string; partId: string }[] = [];

      // Simple heuristic: if the response mentions specific part IDs, create action chips
      // This could be made smarter with structured output

      return NextResponse.json({
         message:
            getResponseText(response) ||
            "I couldn't generate a response. Please try again.",
         actionChips,
      });
   } catch (error) {
      console.error("AI chat error:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to process chat";
      const errorDetails =
         error instanceof Error
            ? error.stack || error.message
            : typeof error === "string"
              ? error
              : JSON.stringify(error);

      if (error instanceof Error) {
         const message = error.message || "";
         if (
            message.includes("API key") ||
            message.includes("API_KEY_INVALID")
         ) {
            errorMessage = "Invalid Gemini API key";
         } else if (message.includes("rate limit")) {
            errorMessage = "Rate limit exceeded. Please try again later.";
         } else if (message.trim().length > 0) {
            errorMessage = message;
         }
      }

      return NextResponse.json(
         {
            error: errorMessage,
            details: errorDetails,
         },
         { status: 500 },
      );
   }
}
