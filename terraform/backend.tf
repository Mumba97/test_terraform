terraform {
  backend "gcs" {
    bucket  = "state-terraform1"
    prefix  = "dev/web-app"
  }
}