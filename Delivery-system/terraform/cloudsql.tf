# ============================================================================
# Google Cloud SQL para SQL Server - SOLUCIÓN ALTERNATIVA A VM MANUAL
# ============================================================================

# Habilitar servicio de Cloud SQL
resource "google_project_service" "sqladmin" {
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

# Habilitar el servicio de Cloud SQL Auth Proxy
resource "google_project_service" "cloudresourcemanager" {
  service            = "cloudresourcemanager.googleapis.com"
  disable_on_destroy = false
}

# Habilitar Service Networking para IP privada de Cloud SQL
resource "google_project_service" "servicenetworking" {
  service            = "servicenetworking.googleapis.com"
  disable_on_destroy = false
}

# Service Account para Cloud SQL Auth Proxy
resource "google_service_account" "cloudsql_proxy" {
  account_id   = "cloudsql-proxy"
  display_name = "Cloud SQL Proxy Service Account"
  project      = var.project_id
}

# Rol para Cloud SQL Auth Proxy - acceso a Cloud SQL Instances
resource "google_project_iam_member" "cloudsql_proxy_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloudsql_proxy.email}"
}

# Rol para Cloud SQL Auth Proxy - acceso a conectar a instancia
resource "google_project_iam_member" "cloudsql_proxy_instance_user" {
  project = var.project_id
  role    = "roles/cloudsql.instanceUser"
  member  = "serviceAccount:${google_service_account.cloudsql_proxy.email}"
}

# Permitir que el ServiceAccount de Kubernetes use Workload Identity
resource "google_service_account_iam_member" "cloudsql_proxy_workload_identity" {
  service_account_id = google_service_account.cloudsql_proxy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[deliver-eats/cloudsql-proxy]"
}

# GKE nodes también necesitan acceso a Cloud SQL
resource "google_project_iam_member" "gke_nodes_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# Instancia de Cloud SQL para SQL Server
resource "google_sql_database_instance" "sqlserver" {
  name                = "deliver-eats-sqlserver"
  database_version    = "SQLSERVER_2022_ENTERPRISE"
  region              = var.region
  deletion_protection = false
  root_password       = var.sql_server_password

  settings {
    tier              = "db-custom-4-16384"  # 4 vCPU, 16GB RAM
    availability_type = "ZONAL"              # Cambiar a REGIONAL para HA si se requiere

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    # Configuración de IP
    ip_configuration {
      ipv4_enabled   = false
      private_network = google_compute_network.vpc.id
    }

    user_labels = local.labels
  }
 

  depends_on = [
    google_project_service.sqladmin,
    google_project_service.servicenetworking,
    google_project_service.compute
  ]
}

# Reserva de rango para Private Service Connection de Cloud SQL
resource "google_compute_global_address" "cloudsql_private_service_range" {
  name          = "google-managed-services-deliver-eats-vpc"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

# Conexión privada para Cloud SQL
resource "google_service_networking_connection" "cloudsql_private_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.cloudsql_private_service_range.name]

  depends_on = [
    google_project_service.servicenetworking,
    google_compute_global_address.cloudsql_private_service_range,
  ]
}

# Usuario SQL Server root (sa equivalent)
resource "google_sql_user" "sa" {
  name     = "sa"
  instance = google_sql_database_instance.sqlserver.name
  password = var.sql_server_password
  type     = "BUILT_IN"
}

# Usuario administrador personalizado
resource "google_sql_user" "admin" {
  name     = var.sql_admin_username
  instance = google_sql_database_instance.sqlserver.name
  password = var.sql_server_password
  type     = "BUILT_IN"
}

# Crear cada base de datos necesaria
resource "google_sql_database" "delivereats_sa" {
  name     = "Delivereats_SA"
  instance = google_sql_database_instance.sqlserver.name
}

resource "google_sql_database" "delivereats_sa_usuarios" {
  name     = "Delivereats_SA_Usuarios"
  instance = google_sql_database_instance.sqlserver.name
}

resource "google_sql_database" "delivereats_sa_productos" {
  name     = "Delivereats_SA_Productos"
  instance = google_sql_database_instance.sqlserver.name
}

resource "google_sql_database" "delivereats_sa_restaurantes" {
  name     = "Delivereats_SA_Restaurantes"
  instance = google_sql_database_instance.sqlserver.name
}

resource "google_sql_database" "delivereats_sa_ordenes" {
  name     = "Delivereats_SA_Ordenes"
  instance = google_sql_database_instance.sqlserver.name
}

resource "google_sql_database" "delivereats_sa_pagos" {
  name     = "Delivereats_SA_Pagos"
  instance = google_sql_database_instance.sqlserver.name
}

# Actualizar DNS privado para apuntar a Cloud SQL
resource "google_dns_record_set" "cloudsql_a_record" {
  name         = "${var.sql_vm_dns_name}."
  managed_zone = google_dns_managed_zone.private.name
  type         = "A"
  ttl          = 300

  rrdatas = [google_sql_database_instance.sqlserver.private_ip_address]

  depends_on = [
    google_sql_database_instance.sqlserver,
    google_service_networking_connection.cloudsql_private_connection
  ]
}

# Outputs para referencia
output "cloudsql_connection_name" {
  description = "Connection name para Cloud SQL Auth Proxy"
  value       = google_sql_database_instance.sqlserver.connection_name
}

output "cloudsql_private_ip" {
  description = "IP privada de la instancia de Cloud SQL"
  value       = google_sql_database_instance.sqlserver.private_ip_address
}

output "cloudsql_instance_name" {
  description = "Nombre de la instancia de Cloud SQL"
  value       = google_sql_database_instance.sqlserver.name
}
