import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { cleanProposal, proposalSchema, ROUTINE_EXERCISES, type RoutineExercise, type RoutineFileType } from "./routine";

/** ADR-0006: the one paid model call in the app. */
const MODEL = "claude-haiku-5-5";

const SYSTEM = `You read strength training routines for one person's fitness app. Routines are photos or PDFs, usually in Spanish, sometimes handwritten or a screenshot from a coach.

Rules:
- List every exercise in the order it appears. Skip warm-up, stretching and cardio blocks unless they are clearly part of the strength work.
- Copy what the routine says. Never invent or estimate a value that isn't written; use null when something is missing or unreadable.
- name: the exercise as written, in Spanish when it is in Spanish ("Sentadilla con barra"). Fix obvious typos only.
- category: when the exercise is clearly one from the known list, its key; otherwise null. Variations count ("Sentadilla goblet" → squat, "Press inclinado con mancuernas" → benchPress). Machines and exercises not on the list → null.
- target_sets: the number of sets as an integer, or null.
- target_reps: reps or time exactly as written ("8", "8-10", "12 c/lado", "45 s"), or null.
- target_kg: the weight in kg as a number when written in kg; convert lb to kg (1 lb = 0.4536 kg) rounded to 0.5. null when there is no weight or it says "peso corporal".
- If the file has several routines (days), read only the first and ignore the rest.
- Ignore anything that is not part of the routine (logos, notes, ads).`;

export type ReadResult =
  | { ok: true; exercises: RoutineExercise[]; usage: { input: number; output: number } }
  | { ok: false; message: string; usage?: { input: number; output: number } };

/** Sends one routine file to Claude and returns the cleaned proposal. Nothing is saved here. */
export async function readRoutineFile(bytes: Uint8Array, mediaType: RoutineFileType): Promise<ReadResult> {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, message: "La lectura con IA no está configurada (falta ANTHROPIC_API_KEY). Escribe los ejercicios a mano." };

  const data = Buffer.from(bytes).toString("base64");
  const file: Anthropic.ContentBlockParam =
    mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data } };

  try {
    const response = await new Anthropic().messages.parse({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [file, { type: "text", text: `Known exercises (key: Spanish name):\n${ROUTINE_EXERCISES.map((e) => `${e.key}: ${e.name}`).join("\n")}\n\nRead the routine in the file.` }],
        },
      ],
      output_config: { format: zodOutputFormat(proposalSchema) },
    });
    const usage = { input: response.usage.input_tokens, output: response.usage.output_tokens };
    if (response.stop_reason === "refusal") return { ok: false, message: "La IA no quiso leer este archivo. Escribe los ejercicios a mano.", usage };
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return { ok: false, message: "La IA no terminó de leer la rutina. Escribe los ejercicios a mano o prueba con otra foto.", usage };
    }
    const exercises = cleanProposal(response.parsed_output);
    if (exercises.length === 0) return { ok: false, message: "La IA no encontró ejercicios en el archivo. Escríbelos a mano.", usage };
    return { ok: true, exercises, usage };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return { ok: false, message: "La IA está ocupada. Espera un minuto o escribe los ejercicios a mano." };
    if (error instanceof Anthropic.AuthenticationError) return { ok: false, message: "La clave de la IA no es válida. Escribe los ejercicios a mano y revisa ANTHROPIC_API_KEY." };
    if (error instanceof Anthropic.BadRequestError) {
      const credit = /credit/i.test(error.message);
      return { ok: false, message: credit ? "Se acabó el crédito de la IA. Escribe los ejercicios a mano." : "La IA no pudo abrir este archivo. Prueba con otra foto o escríbelos a mano." };
    }
    if (error instanceof Anthropic.APIError) return { ok: false, message: "La IA no respondió. Escribe los ejercicios a mano o intenta de nuevo." };
    throw error;
  }
}
