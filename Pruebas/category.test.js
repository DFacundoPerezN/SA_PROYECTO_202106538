const axios = require("axios");

const BASE_URL = "http://localhost:8080/api";

jest.setTimeout(10000);

// ─── Helper ───────────────────────────────────────────────────────────────────
async function getByCategory(categoria) {
  return axios.get(`${BASE_URL}/restaurants/category/${categoria}`, {
    validateStatus: () => true,
  });
}

// ─── Suite principal ──────────────────────────────────────────────────────────
describe("Core 4 GET /api/restaurants/category/:categoria", () => {

  // ── 1. Casos exitosos ────────────────────────────────────────────────────
  describe("✅ Casos exitosos", () => {

    test("1.1 Devuelve 200 con categoría 'desayuno'", async () => {
      const res = await getByCategory("desayuno");
      expect(res.status).toBe(200);
    });

    test("1.2 La respuesta es un arreglo", async () => {
      const res = await getByCategory("desayuno");
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
    });

    test("1.4 Cada elemento tiene restaurante_id y restaurante_nombre", async () => {
      const res = await getByCategory("desayuno");
      res.data.forEach((item) => {
        expect(item).toHaveProperty("restaurante_id");
        expect(item).toHaveProperty("restaurante_nombre");
      });
    });

    test("1.5 El campo restaurante_id es un número", async () => {
      const res = await getByCategory("desayuno");
      res.data.forEach((item) => {
        expect(typeof item.restaurante_id).toBe("number");
        expect(typeof item.restaurante_nombre).toBe("string");
        expect(item.restaurante_nombre.length).toBeGreaterThan(0);
      });
    });


    test("1.7 El Content-Type de la respuesta es application/json", async () => {
      const res = await getByCategory("desayuno");
      expect(res.headers["content-type"]).toMatch(/application\/json/);
    });

    test("1.8 No hay restaurante_id duplicados en la respuesta", async () => {
      const res = await getByCategory("desayuno");
      const ids = res.data.map((item) => item.restaurante_id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });

  // ── 2. Variación de categorías ───────────────────────────────────────────
  describe("🍽️ Variación de categorías", () => {

    test("2.1 Categoría 'almuerzo' devuelve 200 o 404", async () => {
      const res = await getByCategory("almuerzo");
      expect([200, 404]).toContain(res.status);
    });

    test("2.2 Categoría 'cena' devuelve 200 o 404", async () => {
      const res = await getByCategory("cena");
      expect([200, 404]).toContain(res.status);
    });

    test("2.3 Categoría con mayúsculas devuelve 200 o 404 (no 500)", async () => {
      const res = await getByCategory("Desayuno");
      expect(res.status).not.toBe(500);
    });

  });

  // ── 3. Casos límite ──────────────────────────────────────────────────────
  describe("⚠️ Casos límite", () => {

    test("3.1 Categoría vacía no produce 500", async () => {
      const res = await getByCategory("");
      expect(res.status).not.toBe(500);
    });

    test("3.2 Categoría con caracteres especiales no produce 500", async () => {
      const res = await getByCategory("des@y#no!");
      expect(res.status).not.toBe(500);
    });

    test("3.3 Categoría con espacios codificados no produce 500", async () => {
      const res = await getByCategory("des%20ayuno");
      expect(res.status).not.toBe(500);
    });
  });

});