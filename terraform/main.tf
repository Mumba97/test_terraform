terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region  = "us-east-1"
  secret_key = "terraform"
}

resource "aws_instance" "prueba1" {
  ami = "ami-05ffe3c48a9991133" # amazon linux 2023
  instance_type = "t2.micro"
}
