import { beforeEach, describe, expect, it, vi } from "vitest";

const readRoutineFile = vi.fn();
const reads = { used: 0, today: "2026-11-09" };

vi.mock("@/lib/supabase/auth", () => ({ requireUserId: async () => "11111111-1111-4111-8111-111111111111" }));
vi.mock("@/modules/routines/read-count", () => ({ aiReadsThisMonth: async () => reads }));
vi.mock("@/modules/routines/read-with-ai", () => ({ readRoutineFile: (...args: unknown[]) => readRoutineFile(...args) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => ({ insert: async () => ({ error: null }) }) }) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));

const { readRoutine } = await import("./actions");

const photo = () => {
  const form = new FormData();
  form.set("file", new File([new Uint8Array([1, 2, 3])], "rutina.jpg", { type: "image/jpeg" }));
  return form;
};

describe("readRoutine and the monthly cap (R-USR-04)", () => {
  beforeEach(() => {
    readRoutineFile.mockReset();
    readRoutineFile.mockResolvedValue({ ok: true, exercises: [], usage: { input: 1, output: 1 } });
  });

  it("reads while the person is under 30 this month", async () => {
    reads.used = 29;
    expect(await readRoutine(photo())).toEqual({ exercises: [] });
    expect(readRoutineFile).toHaveBeenCalledOnce();
  });

  it("refuses the 31st read without calling the model", async () => {
    reads.used = 30;
    const result = await readRoutine(photo());
    expect(result.message).toBe("Ya usaste las 30 lecturas con IA de este mes. Escribe los ejercicios a mano; el 1 de diciembre vuelves a tener 30.");
    expect(readRoutineFile).not.toHaveBeenCalled();
  });
});
