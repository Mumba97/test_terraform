variable "project_id" {
  description = "pruebas-gke-483814"
  type        = string
}

variable "region" {
  description = "Región de GCP para desplegar los recursos"
  type        = string
  default     = "us-east4"
}