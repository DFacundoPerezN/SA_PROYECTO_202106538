# Terraform para la infraestructura base

Este modulo cubre los puntos 7, 8 y 9 del alcance:

- VPC, subred y reglas de firewall.
- Cluster GKE y node pool dedicado.
- Base de datos externa en una VM de Compute Engine con SQL Server en Docker.

## Archivos

- [main.tf](main.tf)
- [variables.tf](variables.tf)
- [outputs.tf](outputs.tf)
- [versions.tf](versions.tf)
- [terraform.tfvars.example](terraform.tfvars.example)

## Uso rapido

1. Copia [terraform.tfvars.example](terraform.tfvars.example) a `terraform.tfvars`.
2. Completa `project_id` y, si quieres, define `sql_server_password`.
3. Ejecuta:

```bash
terraform init
terraform fmt -check
terraform validate
terraform plan
```

## Notas

- La VM crea un hostname privado estable: `sqlserver.deliver-eats.internal`.
- La VM crea las bases de datos que esperan los servicios: auth, user, catalog, restaurant, order y payment.
- El nodo de GKE usa una service account dedicada con permisos mínimos para logs, métricas y Artifact Registry.