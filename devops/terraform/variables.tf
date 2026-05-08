# LMHospital Terraform variables

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "m7i-flex.large"
}

variable "key_pair_name" {
  description = "EC2 key pair name for SSH"
  type        = string
  default     = "LM-Hospital-Prod"
}

variable "app_name" {
  description = "Application name used for naming resources"
  type        = string
  default     = "lm-hospital"
}