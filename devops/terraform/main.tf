# LMHospital — Terraform AWS Infrastructure
# Uses the default VPC — no custom networking resources needed

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ── Default VPC & Subnet ──────────────────────────────────────
data "aws_vpc" "default" {
  default = true
}

data "aws_subnet" "default" {
  vpc_id            = data.aws_vpc.default.id
  availability_zone = "${var.aws_region}a"
  default_for_az    = true
}

# ── Security Group ────────────────────────────────────────────
resource "aws_security_group" "lm_sg" {
  name        = "${var.app_name}-sg"
  description = "LM Hospital security group"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8085
    to_port     = 8085
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.app_name}-sg"
    Project = "LMHospital"
  }
}

# ── IAM Role for SSM ──────────────────────────────────────────
resource "aws_iam_role" "ssm_role" {
  name = "${var.app_name}-ssm-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_role_attachment" {
  role       = aws_iam_role.ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_profile" {
  name = "${var.app_name}-ssm-profile"
  role = aws_iam_role.ssm_role.name
}

# ── Latest Ubuntu 22.04 LTS AMI ───────────────────────────────
data "aws_ami" "ubuntu_latest_lts" {
  most_recent = true
  owners      = ["099720109477"]
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── EC2 Instance ──────────────────────────────────────────────
resource "aws_instance" "lm_ec2" {
  ami                    = data.aws_ami.ubuntu_latest_lts.id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  subnet_id              = data.aws_subnet.default.id
  vpc_security_group_ids = [aws_security_group.lm_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.ssm_profile.name

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = templatefile("${path.module}/bootstrap.tpl", {
    app_name = var.app_name
  })

  tags = {
    Name    = "${var.app_name}-server"
    Project = "LMHospital"
    Env     = "Production"
  }
}

# ── Elastic IP ────────────────────────────────────────────────
resource "aws_eip" "lm_eip" {
  instance = aws_instance.lm_ec2.id
  domain   = "vpc"
  tags     = { Name = "${var.app_name}-eip" }
}
