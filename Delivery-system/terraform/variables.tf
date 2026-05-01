variable "project_id" {
  description = "ID del proyecto de Google Cloud."
  type        = string
}

variable "region" {
  description = "Region principal de despliegue."
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Zona para el cluster GKE y recursos zonales."
  type        = string
  default     = "us-central1-a"
}

variable "network_name" {
  description = "Nombre de la VPC."
  type        = string
  default     = "deliver-eats-vpc"
}

variable "subnet_name" {
  description = "Nombre de la subred principal."
  type        = string
  default     = "deliver-eats-subnet"
}

variable "network_cidr" {
  description = "Rango CIDR de la subred principal."
  type        = string
  default     = "10.10.0.0/20"
}

variable "pods_secondary_cidr" {
  description = "Rango secundario para pods de GKE."
  type        = string
  default     = "10.20.0.0/16"
}

variable "services_secondary_cidr" {
  description = "Rango secundario para services de GKE."
  type        = string
  default     = "10.30.0.0/20"
}

variable "gke_cluster_name" {
  description = "Nombre del cluster GKE."
  type        = string
  default     = "deliver-eats-gke"
}

variable "gke_node_pool_name" {
  description = "Nombre del node pool de GKE."
  type        = string
  default     = "primary-pool"
}

variable "gke_machine_type" {
  description = "Tipo de maquina para los nodos de GKE."
  type        = string
  default     = "e2-medium"
}

variable "gke_node_count" {
  description = "Cantidad inicial de nodos en el node pool."
  type        = number
  default     = 2
}

variable "ssh_source_ranges" {
  description = "CIDRs autorizados para SSH hacia los nodos."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "sql_vm_name" {
  description = "Nombre de la VM que alojara SQL Server."
  type        = string
  default     = "deliver-eats-sqlserver-vm"
}

variable "sql_vm_machine_type" {
  description = "Tipo de maquina para la VM de SQL Server."
  type        = string
  default     = "e2-standard-4"
}

variable "sql_admin_username" {
  description = "Usuario administrador de SQL Server."
  type        = string
  default     = "sqladmin"
}

variable "sql_server_password" {
  description = "Password para el usuario administrador de SQL Server."
  type        = string
  default     = "Delivereats123"
}

variable "sql_vm_disk_size_gb" {
  description = "Tamano del disco de la VM."
  type        = number
  default     = 100
}

variable "sql_vm_dns_name" {
  description = "Nombre DNS interno estable para la base de datos."
  type        = string
  default     = "sqlserver.deliver-eats.internal"
}

variable "sql_database_names" {
  description = "Bases de datos que la VM debe crear al iniciar."
  type        = list(string)
  default = [
    "Delivereats_SA",
    "Delivereats_SA_Usuarios",
    "Delivereats_SA_Productos",
    "Delivereats_SA_Restaurantes",
    "Delivereats_SA_Ordenes",
    "Delivereats_SA_Pagos",
  ]
}

variable "private_dns_zone_name" {
  description = "Nombre de la zona DNS privada para el dominio interno."
  type        = string
  default     = "deliver-eats-internal"
}