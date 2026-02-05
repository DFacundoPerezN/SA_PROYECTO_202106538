# Conjunto de endpoints del Backend

## Usuarios

### Crear usuario

**POST: /api/users**

Entrada:

```json
{
    "email":         "ex@mail.com",
    "password":   "example1973",
    "role":           "CLIENTE",
    "nombre_completo": "jc"
}
```

Salida:

```json
{
  "id": 13,
  "email": "ex@mail.com",
  "role": "CLIENTE",
  "nombre_completo": "jc",
  "fecha_registro": "0001-01-01T00:00:00Z"
}
```
### Login

**POST /auth/login**

Entrada:

```json
{
    "email":         "ex@mail.com",
    "password":   "example1973"
}
```

Salida:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMywiZW1haWwiOiJleEBtYWlsLmNvbSIsInJvbGUiOiJDTElFTlRFIiwiaXNzIjoiZGVsaXZlcnktc3lzdGVtIiwiZXhwIjoxNzcwMDI0ODc5LCJpYXQiOjE3NzAwMTA0Nzl9.DeohvkN0kHuYnco5rUw2DK-GRozI6G4KPkxLVNk0xcw",
  "user": {
    "id": 13,
    "email": "ex@mail.com",
    "role": "CLIENTE",
    "nombre_completo": "jc",
    "fecha_registro": "2026-02-01T23:19:07.75Z"
  }
}
```