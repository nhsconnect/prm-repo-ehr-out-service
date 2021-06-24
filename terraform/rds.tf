resource "aws_rds_cluster" "repo_to_gp_db_cluster" {
  cluster_identifier      = "${var.environment}-repo-to-gp-db-cluster"
  engine                  = "aurora-postgresql"
  database_name           = "repotogpdb"
  master_username         = data.aws_ssm_parameter.db-username.value
  master_password         = data.aws_ssm_parameter.db-password.value
  backup_retention_period = 5
  preferred_backup_window = "07:00-09:00"
  vpc_security_group_ids  = [aws_security_group.repo-to-gp-db-sg.id]
  apply_immediately       = true
  db_subnet_group_name    = aws_db_subnet_group.repo_to_gp_db_cluster_subnet_group.name
  skip_final_snapshot = true
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.repo_to_gp_key.arn
  iam_database_authentication_enabled  = true

  tags = {
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

resource "aws_kms_key" "repo_to_gp_key" {
  description             = "Repo To Gp KMS key in ${var.environment} environment"
  tags = {
    Name = "${var.environment}-repo-to-gp-db"
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

resource "aws_db_subnet_group" "repo_to_gp_db_cluster_subnet_group" {
  name       = "${var.environment}-repo-to-gp-db-subnet-group"
  subnet_ids = split(",", data.aws_ssm_parameter.deductions_private_db_subnets.value)

  tags = {
    Name = "${var.environment}-repo-to-gp-db-subnet-group"
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

resource "aws_rds_cluster_instance" "repo_to_gp_db_instances" {
  count                 = 1
  identifier            = "${var.environment}-repo-to-gp-db-instance-${count.index}"
  cluster_identifier    = aws_rds_cluster.repo_to_gp_db_cluster.id
  instance_class        = "db.t3.medium"
  engine                = "aurora-postgresql"
  db_subnet_group_name  = aws_db_subnet_group.repo_to_gp_db_cluster_subnet_group.name

  tags = {
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

resource "aws_security_group" "repo-to-gp-db-sg" {
  name        = "${var.environment}-repo-to-gp-db-sg"
  vpc_id      = data.aws_ssm_parameter.deductions_private_vpc_id.value

  ingress {
    description     = "Allow traffic from repo-to-gp to the db"
    protocol        = "tcp"
    from_port       = "5432"
    to_port         = "5432"
    security_groups = [aws_security_group.ecs-tasks-sg.id]
  }

  ingress {
    description     = "Allow traffic from GoCD agent to the db"
    protocol        = "tcp"
    from_port       = "5432"
    to_port         = "5432"
    security_groups = [data.aws_ssm_parameter.gocd_sg_id.value]
  }

  tags = {
    Name = "${var.environment}-state-db-sg"
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "db_host" {
  name =  "/repo/${var.environment}/output/${var.repo_name}/db-host"
  type  = "String"
  value = aws_rds_cluster.repo_to_gp_db_cluster.endpoint

  tags = {
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "db_resource_cluster_id" {
  name =  "/repo/${var.environment}/output/${var.repo_name}/db-resource-cluster-id"
  type  = "String"
  value = aws_rds_cluster.repo_to_gp_db_cluster.cluster_resource_id

  tags = {
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

