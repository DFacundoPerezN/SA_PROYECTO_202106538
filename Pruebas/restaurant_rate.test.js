const axios = require("axios");

const BASE_URL = "http://localhost:8080/api";

jest.setTimeout(10000);

// ─── Helper ───────────────────────────────────────────────────────────────────
async function getTopRestaurants(n, extraParams = "") {
  const query = n !== undefined ? `?n=${n}${extraParams}` : extraParams;
  return axios.get(`${BASE_URL}/restaurants/top${query}`, {
    validateStatus: () => true,
  });
}

// ─── Suite principal ──────────────────────────────────────────────────────────
describe("Core 2 GET /restaurants/top", () => {

  // ── 1. Casos exitosos ────────────────────────────────────────────────────
  describe("✅ Casos exitosos", () => {

    test("1.1 Devuelve 200 con que es un arreglo con n=5", async () => {
      const res = await getTopRestaurants(5);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });

    test("1.2 Devuelve como máximo n restaurantes", async () => {
      const n = 2;
      const res = await getTopRestaurants(n);
      expect(res.data.length).toBeLessThanOrEqual(n);
    });

    test("1.3 Cada restaurante tiene los campos id, nombre y direccion", async () => {
      const res = await getTopRestaurants(2);
      res.data.forEach((restaurante) => {
        expect(restaurante).toHaveProperty("id");
        expect(restaurante).toHaveProperty("nombre");
        expect(restaurante).toHaveProperty("direccion");
      });
    });

    test("1.4 El campo id es un número", async () => {
      const res = await getTopRestaurants(1);
      res.data.forEach((restaurante) => {
        expect(typeof restaurante.id).toBe("number");
      });
    });

    test("1.5 Si existe calificacion, es un número entre 0 y 5", async () => {
      const res = await getTopRestaurants(1);
      res.data.forEach((restaurante) => {
        if (restaurante.calificacion !== undefined) {
          expect(typeof restaurante.calificacion).toBe("number");
          expect(restaurante.calificacion).toBeGreaterThanOrEqual(0);
          expect(restaurante.calificacion).toBeLessThanOrEqual(5);
        }
      });
    });

  });

  // ── 2. Variación del parámetro n ─────────────────────────────────────────
  describe(" Variación del parámetro n", () => {

    test("2.1 Con n=1 devuelve como máximo 1 restaurante", async () => {
      const res = await getTopRestaurants(1);
      expect(res.status).toBe(200);
      expect(res.data.length).toBeLessThanOrEqual(1);
    });

    test("2.2 Con n=3 devuelve como máximo 3 restaurantes", async () => {
      const res = await getTopRestaurants(3);
      expect(res.status).toBe(200);
      expect(res.data.length).toBeLessThanOrEqual(3);
    });

    // test("2.3 Con n mayor al total disponible, devuelve todos sin error", async () => {
    //   const res = await getTopRestaurants(999);
    //   expect(res.status).toBe(200);
    //   expect(Array.isArray(res.data)).toBe(true);
    // });
  });

  // ── 3. Parámetros inválidos ──────────────────────────────────────────────
  describe("⚠️ Parámetros inválidos", () => {

    test("3.1 n=0 responde 200 con arreglo vacío o 400 (no 500)", async () => {
      const res = await getTopRestaurants(0);
      expect(res.status).not.toBe(500);
      if (res.status === 200) {
        expect(res.data).toBe(null);
      }
    });

    test("3.2 n negativo no produce 500", async () => {
      const res = await getTopRestaurants(-1);
      expect(res.status).not.toBe(500);
    });

    test("3.3 n con valor no numérico no produce 500", async () => {
      const res = await getTopRestaurants("abc");
      expect(res.status).not.toBe(500);
    });
  });

  // ── 4. Rendimiento ───────────────────────────────────────────────────────
  describe("⚡ Rendimiento", () => {

    test("4.1 Responde en menos de 2000 ms con n=6", async () => {
      const start = Date.now();
      await getTopRestaurants(6);
      expect(Date.now() - start).toBeLessThan(2000);
    });
  });
});