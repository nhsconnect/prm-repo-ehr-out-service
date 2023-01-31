resource "aws_rds_cluster" "ehr_out_service_db_cluster" {
  cluster_identifier      = "${var.environment}-repo-to-gp-db-cluster"
  engine                  = "aurora-postgresql"
  engine_version          = "11.16"
  database_name           = "repotogpdb"
  master_username         = data.aws_ssm_parameter.db-username.value
  master_password         = data.aws_ssm_parameter.db-password.value
  backup_retention_period = 5
  preferred_backup_window = "07:00-09:00"
  vpc_security_group_ids  = [
    aws_security_group.ehr_out_service_db_sg.id,
    aws_security_group.gocd_to_db_sg.id,
    aws_security_group.vpn_to_db_sg.id
  ]
  apply_immediately       = true
  db_subnet_group_name    = aws_db_subnet_group.ehr_out_service_db_cluster_subnet_group.name
  skip_final_snapshot = true
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.ehr_out_service_db_key.arn
  iam_database_authentication_enabled  = true
  deletion_protection = var.enable_rds_cluster_deletion_protection
  db_cluster_parameter_group_name = data.aws_ssm_parameter.repo_databases_parameter_group_name.value

  tags = {
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

resource "aws_rds_cluster" "ehr_out_service" {
  cluster_identifier      = "${var.environment}-${var.component_name}-cluster"
  engine                  = "aurora-postgresql"
  engine_version          = "11.16"
  database_name           = var.db_name
  master_username         = data.aws_ssm_parameter.db-username.value
  master_password         = data.aws_ssm_parameter.db-password.value
  backup_retention_period = 5
  preferred_backup_window = "07:00-09:00"
  vpc_security_group_ids  = [
    aws_security_group.ehr_out_service_db_sg.id,
    aws_security_group.gocd_to_db_sg.id,
    aws_security_group.vpn_to_db_sg.id
  ]
  apply_immediately         = true
  db_subnet_group_name      = aws_db_subnet_group.ehr_out_service_db.name
  final_snapshot_identifier = "${var.component_name}-db-final"
  storage_encrypted         = true
  kms_key_id                = aws_kms_key.ehr_out_service_db_key.arn
  iam_database_authentication_enabled  = true
  deletion_protection = var.enable_rds_cluster_deletion_protection
  db_cluster_parameter_group_name = data.aws_ssm_parameter.repo_databases_parameter_group_name.value

  tags = {
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}



resource "aws_ssm_parameter" "db_name" {
  name =  "/repo/${var.environment}/output/${var.repo_name}/db-name"
  type  = "String"
  value = aws_rds_cluster.ehr_out_service.database_name
}

resource "aws_kms_key" "ehr_out_service_db_key" {
  description = "${var.component_name} DB KMS key in ${var.environment} environment"
  tags = {
    Name = "${var.environment}-ehr-out-service-db"
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

# TBD
resource "aws_db_subnet_group" "ehr_out_service_db_cluster_subnet_group" {
  name       = "${var.environment}-repo-to-gp-db-subnet-group"
  subnet_ids = split(",", data.aws_ssm_parameter.deductions_private_db_subnets.value)

  tags = {
    Name = "${var.environment}-ehr-out-service-db-subnet-group"
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

resource "aws_db_subnet_group" "ehr_out_service_db" {
  name       = "${var.environment}-${var.component_name}-db-subnet-group"
  subnet_ids = split(",", data.aws_ssm_parameter.deductions_private_db_subnets.value)

  tags = {
    Name = "${var.environment}-ehr-out-service-db-subnet-group"
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

resource "aws_rds_cluster_instance" "ehr_out_service_db_instances" {
  count                 = var.db_instance_number
  identifier            = "${var.environment}-${var.component_name}-db-instance-${count.index}"
  cluster_identifier    = aws_rds_cluster.ehr_out_service.id
  instance_class        = "db.t3.medium"
  engine                = "aurora-postgresql"
  db_subnet_group_name  = aws_db_subnet_group.ehr_out_service_db_cluster_subnet_group.name

  tags = {
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

#TBD
resource "aws_security_group" "repo_to_gp_db_sg" {
  name        = "${var.environment}-repo-to-gp-db-sg"
  vpc_id      = data.aws_ssm_parameter.deductions_private_vpc_id.value

  ingress {
    description     = "Allow traffic from repo-to-gp to the db"
    protocol        = "tcp"
    from_port       = "5432"
    to_port         = "5432"
    security_groups = [aws_security_group.ecs_tasks_sg.id]
  }

  tags = {
    Name = "${var.environment}-state-db-sg"
    CreatedBy   = var.repo_name
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "ehr_out_service_db_sg" {
  name        = "${var.environment}-ehr-out-service-db-sg"
  vpc_id      = data.aws_ssm_parameter.deductions_private_vpc_id.value

  ingress {
    description     = "Allow traffic from ${var.component_name} to the db"
    protocol        = "tcp"
    from_port       = "5432"
    to_port         = "5432"
    security_groups = [aws_security_group.ecs_tasks_sg.id]
  }

  tags = {
    Name = "${var.environment}-${var.component_name}-db-sg"
    CreatedBy   = var.repo_name
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}


resource "aws_security_group" "gocd_to_db_sg" {
  name = "${var.environment}-gocd-to-${var.component_name}-db-sg"
  vpc_id = data.aws_ssm_parameter.deductions_private_vpc_id.value

  ingress {
    description     = "Allow traffic from GoCD agent to the db"
    protocol        = "tcp"
    from_port       = "5432"
    to_port         = "5432"
    security_groups = [data.aws_ssm_parameter.gocd_sg_id.value]
  }

  tags = {
    Name = "${var.environment}-gocd-to-${var.component_name}-db-sg"
    CreatedBy   = var.repo_name
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "vpn_to_db_sg" {
  name = "${var.environment}-vpn-to-${var.component_name}-db-sg"
  vpc_id = data.aws_ssm_parameter.deductions_private_vpc_id.value

  tags = {
    Name = "${var.environment}-vpn-to-${var.component_name}-db-sg"
    CreatedBy   = var.repo_name
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "vpn_to_db_sg" {
  count       = var.grant_access_through_vpn ? 1 : 0
  type        = "ingress"
  description = "Allow traffic from VPN to the db"
  protocol    = "tcp"
  from_port   = 5432
  to_port     = 5432
  source_security_group_id = data.aws_ssm_parameter.vpn_sg_id.value
  security_group_id = aws_security_group.vpn_to_db_sg.id
}

resource "aws_ssm_parameter" "db_host" {
  name =  "/repo/${var.environment}/output/${var.repo_name}/db-host"
  type  = "String"
  value = aws_rds_cluster.ehr_out_service.endpoint

  tags = {
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "db_resource_cluster_id" {
  name =  "/repo/${var.environment}/output/${var.repo_name}/db-resource-cluster-id"
  type  = "String"
  value = aws_rds_cluster.ehr_out_service.cluster_resource_id

  tags = {
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

data "aws_ssm_parameter" "repo_databases_parameter_group_name" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/repo-databases-parameter-group-name"
}
