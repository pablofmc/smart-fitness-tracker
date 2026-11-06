import { describe, expect, it } from "vitest";
import { cleanProposal, matchExercise, ROUTINE_EXERCISES } from "./routine";

const exercise = (over: Partial<Parameters<typeof cleanProposal>[0]["exercises"][number]>) => ({
  name: "Sentadilla",
  category: "squat",
  target_sets: 4,
  target_reps: "8",
  target_kg: 60,
  ...over,
});

describe("cleanProposal", () => {
  it("keeps a well-formed exercise", () => {
    expect(cleanProposal({ exercises: [exercise({})] })).toEqual([{ name: "Sentadilla", category: "squat", targetSets: 4, targetReps: "8", targetKg: 60 }]);
  });

  it("turns an unknown category into a hand-typed exercise", () => {
    expect(cleanProposal({ exercises: [exercise({ name: "Hip thrust", category: "hipThrust" })] })[0].category).toBeNull();
  });

  it("drops numbers out of range instead of guessing", () => {
    const [e] = cleanProposal({ exercises: [exercise({ target_sets: 0, target_kg: -5 })] });
    expect(e).toMatchObject({ targetSets: null, targetKg: null });
    expect(cleanProposal({ exercises: [exercise({ target_sets: 3.5 })] })[0].targetSets).toBeNull();
  });

  it("keeps reps as written and empties blank ones", () => {
    expect(cleanProposal({ exercises: [exercise({ target_reps: " 8-10 " })] })[0].targetReps).toBe("8-10");
    expect(cleanProposal({ exercises: [exercise({ target_reps: "  " })] })[0].targetReps).toBeNull();
  });

  it("skips exercises without a name and tidies spaces", () => {
    expect(cleanProposal({ exercises: [exercise({ name: "   " }), exercise({ name: " Peso   muerto " })] }).map((e) => e.name)).toEqual(["Peso muerto"]);
  });

  it("rounds kg to one decimal", () => {
    expect(cleanProposal({ exercises: [exercise({ target_kg: 22.45 })] })[0].targetKg).toBe(22.5);
  });
});

describe("matchExercise", () => {
  it("finds a known exercise ignoring case and accents", () => {
    expect(matchExercise("press de BANCA")).toBe("benchPress");
    expect(matchExercise("Elevacion lateral")).toBe("lateralRaise");
  });

  it("leaves other names typed by hand", () => {
    expect(matchExercise("Hip thrust")).toBeNull();
  });

  it("offers no warm-up or cardio as routine exercises", () => {
    expect(ROUTINE_EXERCISES.map((e) => e.key)).not.toContain("warmUp");
  });
});
