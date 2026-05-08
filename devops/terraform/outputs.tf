# LMHospital Terraform outputs

output "ec2_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_eip.lm_eip.public_ip
}

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.lm_ec2.id
}

output "app_url" {
  description = "HTTP URL for the application"
  value       = "http://${aws_eip.lm_eip.public_ip}"
}

output "grafana_url" {
  description = "Grafana URL"
  value       = "http://${aws_eip.lm_eip.public_ip}:3001"
}

output "prometheus_url" {
  description = "Prometheus URL"
  value       = "http://${aws_eip.lm_eip.public_ip}:9090"
}
