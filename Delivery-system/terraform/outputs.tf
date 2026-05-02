output "vpc_name" {
  description = "Nombre de la VPC creada."
  value       = google_compute_network.vpc.name
}

output "subnet_name" {
  description = "Nombre de la subred creada."
  value       = google_compute_subnetwork.subnet.name
}

output "gke_cluster_name" {
  description = "Nombre del cluster GKE."
  value       = google_container_cluster.gke.name
}

output "gke_node_pool_name" {
  description = "Nombre del node pool principal."
  value       = google_container_node_pool.primary.name
}


output "sql_admin_username" {
  description = "Usuario administrador de SQL Server."
  value       = var.sql_admin_username
}

output "sql_admin_password" {
  description = "Password del usuario administrador de SQL Server."
  value       = var.sql_server_password
}

output "sql_vm_dns_name" {
  description = "Hostname interno estable de SQL Server."
  value       = var.sql_vm_dns_name
}

output "sql_database_names" {
  description = "Bases de datos que crea la VM al arrancar."
  value       = var.sql_database_names
}

output "frontend_url" {
  description = "URL publica del frontend desplegado en Cloud Run."
  value       = google_cloud_run_v2_service.frontend.uri
}