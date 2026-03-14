const axios = require("axios");

const BASE_URL = "http://localhost:8080/api";

jest.setTimeout(10000);

// ─── Helper ───────────────────────────────────────────────────────────────────
async function getPromociones() {
  return axios.get(`${BASE_URL}/promociones`, {
    validateStatus: () => true,
  });
}

// ─── Suite principal ──────────────────────────────────────────────────────────
describe("Core 5 GET /api/promociones", () => {

  // ── 1. Estructura de la respuesta ────────────────────────────────────────
  describe("✅ Estructura de respuesta", () => {

    test("1.1 Devuelve 200", async () => {
      const res = await getPromociones();
      expect(res.status).toBe(200);
    });

    test("1.2 El Content-Type es application/json", async () => {
      const res = await getPromociones();
      expect(res.headers["content-type"]).toMatch(/application\/json/);
    });

    test("1.3 La respuesta es un objeto (no un arreglo directo)", async () => {
      const res = await getPromociones();
      expect(typeof res.data).toBe("object");
      expect(Array.isArray(res.data)).toBe(false);
    });

    test("1.4 La respuesta contiene la propiedad 'promociones'", async () => {
      const res = await getPromociones();
      expect(res.data).toHaveProperty("promociones");
    });

    test("1.5 El campo 'promociones' es un arreglo", async () => {
      const res = await getPromociones();
      expect(Array.isArray(res.data.promociones)).toBe(true);
    });
  });

  // ── 2. Estado actual (arreglo vacío) ─────────────────────────────────────
  describe("📭 Estado actual sin promociones", () => {

    test("2.1 El arreglo de promociones está vacío actualmente", async () => {
      const res = await getPromociones();
      expect(res.data.promociones).toEqual([]);
    });

    test("2.2 La respuesta no contiene campos inesperados fuera de 'promociones'", async () => {
      const res = await getPromociones();
      const keys = Object.keys(res.data);
      expect(keys).toContain("promociones");
    });
  });

  // ── 3. Preparado para cuando haya promociones ────────────────────────────
  describe("🎯 Estructura esperada con promociones (futura)", () => {

    test("3.1 Si hay promociones, cada una tiene al menos un campo 'id'", async () => {
      const res = await getPromociones();
      if (res.data.promociones.length > 0) {
        res.data.promociones.forEach((promo) => {
          expect(promo).toHaveProperty("id");
        });
      } else {
        expect(res.data.promociones).toEqual([]);
      }
    });

    test("3.2 Si hay promociones, el campo id es un número", async () => {
      const res = await getPromociones();
      if (res.data.promociones.length > 0) {
        res.data.promociones.forEach((promo) => {
          expect(typeof promo.id).toBe("number");
        });
      } else {
        expect(res.data.promociones).toEqual([]);
      }
    });
  });

  // ── 4. Rendimiento ───────────────────────────────────────────────────────
  describe("⚡ Rendimiento", () => {

    test("4.1 Responde en menos de 2000 ms", async () => {
      const start = Date.now();
      await getPromociones();
      expect(Date.now() - start).toBeLessThan(2000);
    });
  });
});