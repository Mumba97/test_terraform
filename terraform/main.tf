provider "google" {
  project = var.project_id
  region  = var.region
}

# 1. Crear la Red VPC
resource "google_compute_network" "vpc_network" {
  name                    = "mi-vpc-pruebas"
  auto_create_subnetworks = false
}

# 2. Crear la Subred
resource "google_compute_subnetwork" "subnet" {
  name          = "mi-subred-pruebas"
  ip_cidr_range = "10.0.10.0/24"
  region        = var.region
  network       = google_compute_network.vpc_network.id
}

# 3. Regla de Firewall (Permitir HTTP y SSH)
resource "google_compute_firewall" "allow_web_ssh" {
  name    = "allow-web-ssh"
  network = google_compute_network.vpc_network.name

  allow {
    protocol = "tcp"
    ports    = ["80", "22"]
  }

  # ¡OJO! 0.0.0.0/0 permite acceso desde CUALQUIER lugar del mundo.
  # Para producción, deberías restringir esto a tu IP o un Load Balancer.
  source_ranges = ["0.0.0.0/0"]
}

# 4. Instancia (Servidor Web)
resource "google_compute_instance" "web_server" {
  name         = "servidor-web-prueba"
  machine_type = "e2-micro" # Capa gratuita elegible en ciertas regiones
  zone         = "${var.region}-a"
  tags         = ["web-server"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.id

    # Al incluir este bloque vacío, se asigna una IP Pública efímera
    access_config {
      # Dejar vacío para IP pública estándar
    }
  }

  # Script de inicio: Instala Nginx automáticamente para probar que el puerto 80 funciona
  metadata_startup_script = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y nginx
    echo "<h1>Infraestructura desplegada con Terraform correctamente!</h1>" > /var/www/html/index.html
    systemctl restart nginx
  EOF
}