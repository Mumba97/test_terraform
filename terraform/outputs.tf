output "web_server_public_ip" {
  description = "La IP pública del servidor web. Pégala en tu navegador."
  value       = google_compute_instance.web_server.network_interface[0].access_config[0].nat_ip
}