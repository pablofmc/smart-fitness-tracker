import { describe, expect, it } from "vitest";
import { hasTemporaryPassword, newPasswordProblem } from "./password";

describe("newPasswordProblem", () => {
  it("accepts a new password of 10 or more characters, typed twice", () => {
    expect(newPasswordProblem("temporal-1", "una-clave-mia", "una-clave-mia")).toBeNull();
  });

  it("explains each problem", () => {
    expect(newPasswordProblem("", "una-clave-mia", "una-clave-mia")).toBe("Escribe tu contraseña actual.");
    expect(newPasswordProblem("temporal-1", "corta", "corta")).toBe("La nueva contraseña necesita al menos 10 caracteres.");
    expect(newPasswordProblem("temporal-1", "una-clave-mia", "una-clave-tuya")).toBe("Las dos contraseñas nuevas no coinciden.");
    expect(newPasswordProblem("una-clave-mia", "una-clave-mia", "una-clave-mia")).toBe("La nueva contraseña debe ser distinta de la actual.");
  });
});

describe("hasTemporaryPassword", () => {
  it("reads only the flag the script sets in app_metadata", () => {
    expect(hasTemporaryPassword({ app_metadata: { temp_password: true } })).toBe(true);
    expect(hasTemporaryPassword({ app_metadata: { temp_password: false } })).toBe(false);
    expect(hasTemporaryPassword({ app_metadata: {} })).toBe(false);
    expect(hasTemporaryPassword(null)).toBe(false);
  });
});
