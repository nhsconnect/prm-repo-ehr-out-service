locals {
  task_role_arn       = aws_iam_role.component-ecs-role.arn
  task_execution_role = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.environment}-${var.component_name}-EcsTaskRole"
  task_ecr_url        = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com"
  task_log_group      = "/nhs/deductions/${var.environment}-${data.aws_caller_identity.current.account_id}/${var.component_name}"
  environment_variables = [
    { name = "NHS_ENVIRONMENT", value = var.environment },
    { name = "SERVICE_URL", value = "https://repo-to-gp.${var.environment}.non-prod.patient-deductions.nhs.uk" },
    { name = "GP2GP_ADAPTOR_SERVICE_URL", value = "https://gp2gp-adaptor.${var.environment}.non-prod.patient-deductions.nhs.uk" },
    { name = "EHR_REPO_SERVICE_URL", value = "https://ehr-repo.${var.environment}.non-prod.patient-deductions.nhs.uk" },
    { name = "DATABASE_NAME", value = aws_rds_cluster.repo_to_gp_db_cluster.database_name },
    { name = "DATABASE_HOST", value = aws_rds_cluster.repo_to_gp_db_cluster.endpoint },
    { name = "DATABASE_USER", value = var.application_database_user },
    { name = "REPO_TO_GP_USE_AWS_RDS_CREDENTIALS", value = "true" },
    { name = "AWS_REGION", value = var.region },
    { name = "REPO_TO_GP_SKIP_MIGRATION", value = "true" },
    { name = "USE_SSL_FOR_DB", value = "true" }
  ]
  secret_environment_variables = [
    { name = "E2E_TEST_AUTHORIZATION_KEYS_FOR_GP_TO_REPO", valueFrom = data.aws_ssm_parameter.e2e_test_authorization_keys_for_repo_to_gp.arn },
    { name = "GP2GP_ADAPTOR_AUTHORIZATION_KEYS", valueFrom = data.aws_ssm_parameter.gp2gp_adaptor_authorization_keys.arn },
    { name = "EHR_REPO_AUTHORIZATION_KEYS", valueFrom = data.aws_ssm_parameter.ehr_repo_authorization_keys.arn }
  ]
}

resource "aws_ecs_task_definition" "task" {
  family                   = var.component_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = local.task_execution_role
  task_role_arn            = local.task_role_arn


  container_definitions = templatefile("${path.module}/templates/ecs-task-def.tmpl", {
    container_name        = "${var.component_name}-container"
    ecr_url               = local.task_ecr_url,
    image_name            = "deductions/${var.component_name}",
    image_tag             = var.task_image_tag,
    cpu                   = var.task_cpu,
    memory                = var.task_memory,
    container_port        = var.port,
    host_port             = var.port,
    log_region            = var.region,
    log_group             = local.task_log_group,
    environment_variables = jsonencode(local.environment_variables),
    secrets               = jsonencode(local.secret_environment_variables)
  })

  tags = {
    Environment = var.environment
    CreatedBy= var.repo_name
  }
}

resource "aws_security_group" "ecs-tasks-sg" {
  name        = "${var.environment}-${var.component_name}-ecs-tasks-sg"
  vpc_id      = data.aws_ssm_parameter.deductions_private_vpc_id.value

  ingress {
    description     = "Allow traffic from internal ALB of gp to repo"
    protocol        = "tcp"
    from_port       = "3000"
    to_port         = "3000"
    security_groups = [
      aws_security_group.repo_to_gp_alb.id
    ]
  }

  egress {
    description = "Allow All Outbound"
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-${var.component_name}-ecs-tasks-sg"
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}


data "aws_ssm_parameter" "service-to-gp2gp-adaptor-sg-id" {
  name = "/repo/${var.environment}/output/prm-deductions-gp2gp-adaptor/service-to-gp2gp-adaptor-sg-id"
}

resource "aws_security_group_rule" "repo-to-gp-to-gp2gp-adaptor" {
  type = "ingress"
  protocol = "TCP"
  from_port = 443
  to_port = 443
  security_group_id = data.aws_ssm_parameter.service-to-gp2gp-adaptor-sg-id.value
  source_security_group_id = local.ecs_task_sg_id
}

data "aws_ssm_parameter" "service-to-ehr-repo-sg-id" {
  name = "/repo/${var.environment}/output/prm-deductions-ehr-repository/service-to-ehr-repo-sg-id"
}


resource "aws_security_group_rule" "repo-to-gp-to-ehr-repo" {
  type = "ingress"
  protocol = "TCP"
  from_port = 443
  to_port = 443
  security_group_id = data.aws_ssm_parameter.service-to-ehr-repo-sg-id.value
  source_security_group_id = aws_security_group.ecs-tasks-sg.id
}
