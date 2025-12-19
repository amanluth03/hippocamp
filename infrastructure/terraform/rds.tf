# RDS PostgreSQL Database for Hippo Campus

# =============================================================================
# VPC FOR DATABASE (Simple setup for MVP)
# =============================================================================

# Use default VPC for simplicity
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security group for RDS
resource "aws_security_group" "rds" {
  name        = "${var.app_name}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = data.aws_vpc.default.id

  # Allow PostgreSQL from Lambda (will be in same VPC)
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [] # Will add Lambda SG reference later
    cidr_blocks     = [data.aws_vpc.default.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.app_name}-rds-sg"
  }
}

# Subnet group for RDS
resource "aws_db_subnet_group" "main" {
  name       = "${var.app_name}-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "${var.app_name}-db-subnet-group"
  }
}

# =============================================================================
# RDS POSTGRESQL INSTANCE
# =============================================================================

resource "aws_db_instance" "main" {
  identifier = "${var.app_name}-db-${var.environment}"

  # Engine configuration
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = var.db_instance_class
  allocated_storage    = 20
  max_allocated_storage = 100 # Enable autoscaling up to 100GB

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Storage configuration
  storage_type          = "gp3"
  storage_encrypted     = true

  # Backup configuration
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"

  # Performance and monitoring
  performance_insights_enabled = false # Costs extra, enable if needed
  monitoring_interval          = 0     # Disable enhanced monitoring for cost

  # Other settings
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.app_name}-db-final-snapshot"
  deletion_protection       = true # Prevent accidental deletion

  # Parameter group for custom PostgreSQL settings
  parameter_group_name = aws_db_parameter_group.main.name

  tags = {
    Name = "${var.app_name}-database"
  }
}

# Custom parameter group
resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "${var.app_name}-pg-params"

  # Optimize for small instance
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4096}" # 25% of memory
  }

  parameter {
    name  = "max_connections"
    value = "100"
  }

  tags = {
    Name = "${var.app_name}-pg-params"
  }
}

