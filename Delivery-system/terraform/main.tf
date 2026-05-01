locals {
  labels = {
    app     = "deliver-eats"
    managed = "terraform"
  }

  frontend_image_uri = "${var.region}-docker.pkg.dev/${var.project_id}/deliver-eats-repo/frontend:dev"
}

resource "google_project_service" "compute" {
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "container" {
  service            = "container.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifactregistry" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "dns" {
  service            = "dns.googleapis.com"
  disable_on_destroy = false
}

resource "google_compute_network" "vpc" {
  name                    = var.network_name
  auto_create_subnetworks = false

  depends_on = [google_project_service.compute]
}

resource "google_compute_subnetwork" "subnet" {
  name          = var.subnet_name
  region        = var.region
  network       = google_compute_network.vpc.id
  ip_cidr_range = var.network_cidr

  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = var.pods_secondary_cidr
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = var.services_secondary_cidr
  }
}

resource "google_compute_address" "sql_vm_internal" {
  name         = "${var.sql_vm_name}-internal-ip"
  region       = var.region
  subnetwork   = google_compute_subnetwork.subnet.id
  address_type = "INTERNAL"
}

resource "google_dns_managed_zone" "private" {
  name     = var.private_dns_zone_name
  dns_name = "deliver-eats.internal."

  visibility = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.vpc.id
    }
  }
}

resource "google_dns_record_set" "sql_vm_a_record" {
  name         = "${var.sql_vm_dns_name}."
  managed_zone = google_dns_managed_zone.private.name
  type         = "A"
  ttl          = 300

  rrdatas = [google_compute_address.sql_vm_internal.address]
}

resource "google_service_account" "gke_nodes" {
  account_id   = "deliver-eats-gke-nodes"
  display_name = "Deliver Eats GKE Nodes"
}

resource "google_project_iam_member" "gke_nodes_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_project_iam_member" "gke_nodes_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_project_iam_member" "gke_nodes_artifact_registry" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_container_cluster" "gke" {
  name     = var.gke_cluster_name
  location = var.zone

  network    = google_compute_network.vpc.self_link
  subnetwork = google_compute_subnetwork.subnet.self_link

  remove_default_node_pool = true
  initial_node_count       = 1

  networking_mode = "VPC_NATIVE"

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  release_channel {
    channel = "REGULAR"
  }

  addons_config {
    http_load_balancing {
      disabled = false
    }

    horizontal_pod_autoscaling {
      disabled = false
    }
  }

  master_auth {
    client_certificate_config {
      issue_client_certificate = false
    }
  }

  depends_on = [
    google_project_service.container,
    google_compute_subnetwork.subnet,
  ]
}

resource "google_container_node_pool" "primary" {
  name      = var.gke_node_pool_name
  location  = var.zone
  cluster   = google_container_cluster.gke.name
  node_count = var.gke_node_count

  node_config {
    machine_type   = var.gke_machine_type
    service_account = google_service_account.gke_nodes.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/logging.write",
      "https://www.googleapis.com/auth/monitoring",
      "https://www.googleapis.com/auth/devstorage.read_only",
    ]
    tags       = ["gke-nodes"]
    image_type  = "COS_CONTAINERD"
    disk_type   = "pd-standard"
    disk_size_gb = 50
    metadata = {
      disable-legacy-endpoints = "true"
    }
    labels = local.labels
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
  }

  depends_on = [
    google_container_cluster.gke,
    google_project_iam_member.gke_nodes_logging,
    google_project_iam_member.gke_nodes_monitoring,
    google_project_iam_member.gke_nodes_artifact_registry,
  ]
}

resource "google_compute_firewall" "allow_internal" {
  name    = "${var.network_name}-allow-internal"
  network = google_compute_network.vpc.name

  direction     = "INGRESS"
  source_ranges = [var.network_cidr, var.pods_secondary_cidr, var.services_secondary_cidr]
  target_tags   = ["gke-nodes"]

  allow {
    protocol = "tcp"
  }

  allow {
    protocol = "udp"
  }

  allow {
    protocol = "icmp"
  }
}

resource "google_compute_firewall" "allow_sqlserver" {
  name    = "${var.network_name}-allow-sqlserver"
  network = google_compute_network.vpc.name

  direction     = "INGRESS"
  source_ranges = [var.network_cidr, var.pods_secondary_cidr, var.services_secondary_cidr]
  target_tags   = ["sqlserver-vm"]

  allow {
    protocol = "tcp"
    ports    = ["1433"]
  }
}

resource "google_compute_firewall" "allow_ssh" {
  name    = "${var.network_name}-allow-ssh"
  network = google_compute_network.vpc.name

  direction     = "INGRESS"
  source_ranges = var.ssh_source_ranges
  target_tags   = ["gke-nodes", "sqlserver-vm"]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}

resource "google_compute_firewall" "allow_load_balancer" {
  name    = "${var.network_name}-allow-lb"
  network = google_compute_network.vpc.name

  direction     = "INGRESS"
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["gke-nodes"]

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "30000-32767"]
  }
}

resource "google_compute_instance" "sqlserver_vm" {
  name         = var.sql_vm_name
  machine_type = var.sql_vm_machine_type
  zone         = var.zone
  tags         = ["sqlserver-vm"]

  allow_stopping_for_update = true

  boot_disk {
    auto_delete = true

    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = var.sql_vm_disk_size_gb
      type  = "pd-balanced"
    }
  }

  network_interface {
    network    = google_compute_network.vpc.id
    subnetwork = google_compute_subnetwork.subnet.id
    network_ip = google_compute_address.sql_vm_internal.address

    access_config {}
  }

  metadata = {
    enable-oslogin = "FALSE"
  }

  metadata_startup_script = templatefile("${path.module}/scripts/sqlserver-startup.sh.tftpl", {
    sql_admin_username = var.sql_admin_username
    sql_server_password = var.sql_server_password
    sql_database_names  = var.sql_database_names
  })
}

resource "google_cloud_run_v2_service" "frontend" {
  name     = "deliver-eats-frontend"
  location = var.region
  labels   = local.labels

  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    labels = local.labels

    containers {
      image = local.frontend_image_uri

      ports {
        container_port = 80
      }
    }
  }

  depends_on = [
    google_project_service.artifactregistry,
    google_project_service.run,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "frontend_public_access" {
  project  = var.project_id
  name     = google_cloud_run_v2_service.frontend.name
  location = google_cloud_run_v2_service.frontend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}