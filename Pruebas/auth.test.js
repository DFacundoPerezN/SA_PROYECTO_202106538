const axios = require("axios");

const BASE_URL = "http://localhost:8080/api";
const LOGIN_URL = `${BASE_URL}/auth/login`;

// ─── Credenciales de prueba ───────────────────────────────────────────────────
const VALID_CREDENTIALS = {
  email: "jc@mail.com",
  password: "example1973",
};

// ─── Helper ───────────────────────────────────────────────────────────────────
async function login(payload, headers = {}) {
  return axios.post(LOGIN_URL, payload, {
    headers: { "Content-Type": "application/json", ...headers },
    validateStatus: () => true, // nunca lanza error por status HTTP
  });
}

// ─── Suite principal ──────────────────────────────────────────────────────────
describe("Core 1 POST /api/auth/login", () => {

  // ── 1. Casos exitosos ────────────────────────────────────────────────────
  describe("✅ Casos exitosos", () => {

    test("1.1 Login con credenciales válidas devuelve 200", async () => {
      const res = await login(VALID_CREDENTIALS);
      expect(res.status).toBe(200);
    });

    test("1.2 La respuesta incluye un token de acceso", async () => {
      const res = await login(VALID_CREDENTIALS);
      expect(res.data).toHaveProperty("token");
      expect(typeof res.data.token).toBe("string");
      expect(res.data.token.length).toBeGreaterThan(0);
    });


  });

  // ── 2. Credenciales inválidas ────────────────────────────────────────────
  describe("❌ Credenciales inválidas", () => {

    test("2.1 Contraseña incorrecta devuelve 401", async () => {
      const res = await login({ ...VALID_CREDENTIALS, password: "wrong_pass" });
      expect(res.status).toBe(401);
    });

    test("2.2 Email inexistente devuelve 401", async () => {
      const res = await login({ email: "noexiste@mail.com", password: "example1973" });
      expect(res.status).toBe(401);
    });

    test("2.3 No se devuelve token con credenciales inválidas", async () => {
      const res = await login({ ...VALID_CREDENTIALS, password: "wrong_pass" });
      expect(res.data.token).toBeUndefined();
    });
  });

  // ── 3. Rendimiento básico ────────────────────────────────────────────────
  describe("⚡ Rendimiento", () => {

    test("3.1 El login válido responde en menos de 2000 ms", async () => {
      const start = Date.now();
      await login(VALID_CREDENTIALS);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(2000);
    });
  });
});