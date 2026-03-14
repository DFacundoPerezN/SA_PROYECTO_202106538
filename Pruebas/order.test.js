const axios = require("axios");

const BASE_URL = "http://localhost:8080/api";
const ORDERS_URL = `${BASE_URL}/orders/`;
const LOGIN_URL = `${BASE_URL}/auth/login`;

jest.setTimeout(10000);

// ─── Credenciales y token ─────────────────────────────────────────────────────
const VALID_CREDENTIALS = {
  email: "jc@mail.com",
  password: "example1973",
};

let authToken = "";

beforeAll(async () => {
  const res = await axios.post(LOGIN_URL, VALID_CREDENTIALS, {
    validateStatus: () => true,
  });
  authToken = res.data.token || "";
});

// ─── Orden válida de referencia ───────────────────────────────────────────────
const VALID_ORDER = {
  restaurante_id: 13,
  direccion_entrega: "Mi casa zona 12",
  latitud: 14.6349,
  longitud: -90.5069,
  items: [
    { producto_id: 2, cantidad: 1, comentarios: "con queso extra" },
    { producto_id: 1, cantidad: 1, comentarios: "" },
  ],
  cliente_nombre: "JC1",
  cliente_telefono: "+505 5505550",
  nombre_restaurante: "Restaurante",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function createOrder(payload, token = authToken) {
  return axios.post(ORDERS_URL, payload, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    validateStatus: () => true,
  });
}

// ─── Suite principal ──────────────────────────────────────────────────────────
describe("Core 3 POST /api/orders/", () => {

  // ── 1. Casos exitosos ────────────────────────────────────────────────────
  describe("✅ Caso exitoso", () => {

    test("1.1 Crear orden con payload válido devuelve 200 o 201", async () => {
      const res = await createOrder(VALID_ORDER);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.data).toHaveProperty("order_id");
      expect(typeof res.data.order_id).toBe("number");
      expect([200, 201]).toContain(res.status);
    });

  });

  // ── 2. Autenticación ─────────────────────────────────────────────────────
  describe("🔐 Autenticación con Bearer token", () => {

    test("2.1 Sin token devuelve 401", async () => {
      const res = await createOrder(VALID_ORDER, null);
      expect(res.status).toBe(401);
    });

    test("2.2 Token inválido devuelve 401 o 403", async () => {
      const res = await createOrder(VALID_ORDER, "token.falso.invalido");
      expect([401, 403]).toContain(res.status);
    });

    test("2.3 Token expirado devuelve 401 o 403", async () => {
      const expiredToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
        "eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ." +
        "invalidsignature";
      const res = await createOrder(VALID_ORDER, expiredToken);
      expect([401, 403]).toContain(res.status);
    });
  });

  // ── 3. Validación de campos obligatorios ─────────────────────────────────
  describe("⚠️ Campos obligatorios", () => {


    test("3.3 Sin items devuelve 500", async () => {
      const { items, ...payload } = VALID_ORDER;
      const res = await createOrder(payload);
      expect(res.status).toBe(500);
    });

    test("3.4 Items vacío devuelve 500", async () => {
      const res = await createOrder({ ...VALID_ORDER, items: [] });
      expect(res.status).toBe(500);
    });



    test("3.7 Cuerpo completamente vacío devuelve 500", async () => {
      const res = await createOrder({});
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ── 4. Validación de items ───────────────────────────────────────────────
  describe("📦 Validación de items", () => {

    test("4.1 Item con mal producto_id devuelve 500", async () => {
      const payload = {
        ...VALID_ORDER,
        items: [{ producto_id: 0, cantidad: 1, comentarios: "" }],
      };
      const res = await createOrder(payload);
      expect(res.status).toBeGreaterThanOrEqual(500);
    });


  });

  // ── 5. Coordenadas ───────────────────────────────────────────────────────
  describe("📍 Coordenadas", () => {

    test("5.1 Sin latitud ni longitud no produce 500", async () => {
      const { latitud, longitud, ...payload } = VALID_ORDER;
      const res = await createOrder(payload);
      expect(res.status).not.toBe(500);
    });
  });

  // ── 6. Rendimiento ───────────────────────────────────────────────────────
  describe("⚡ Rendimiento", () => {

    test("6.1 Crear una orden válida responde en menos de 2000 ms", async () => {
      const start = Date.now();
      await createOrder(VALID_ORDER);
      expect(Date.now() - start).toBeLessThan(2000);
    });
  });
});