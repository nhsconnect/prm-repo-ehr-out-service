data "aws_caller_identity" "current" {}

data "aws_ssm_parameter" "deductions_private_ecs_cluster_id" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/deductions-private-ecs-cluster-id"
}

data "aws_ssm_parameter" "deductions_private_repo_to_gp_sg_id" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/deductions-private-repo-to-gp-sg-id"
}

data "aws_ssm_parameter" "deductions_private_private_subnets" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/deductions-private-private-subnets"
}

data "aws_ssm_parameter" "deductions_private_vpc_id" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/private-vpc-id"
}

data "aws_ssm_parameter" "deductions_private_int_alb_httpl_arn" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/deductions-private-int-alb-httpl-arn"
}

data "aws_ssm_parameter" "deductions_private_int_alb_httpsl_arn" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/deductions-private-int-alb-httpsl-arn"
}

data "aws_ssm_parameter" "authorization_keys" {
  name = "/repo/${var.environment}/user-input/${var.component_name}-authorization-keys"
}

data "aws_ssm_parameter" "gp2gp_adaptor_authorization_keys" {
  name = "/repo/${var.environment}/user-input/gp2gp-adaptor-authorization-keys"
}

data "aws_ssm_parameter" "ehr_repo_authorization_keys" {
  name = "/repo/${var.environment}/user-input/ehr-repo-authorization-keys"
}

data "aws_ssm_parameter" "gp2gp_adaptor_service_url" {
  name = "/repo/${var.environment}/output/prm-deductions-gp2gp-adaptor/service-url"
}

data "aws_ssm_parameter" "deductions_private_alb_internal_dns" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/deductions-private-alb-internal-dns"
}

data "aws_ssm_parameter" "root_zone_id" {
  name = "/repo/output/prm-deductions-base-infra/root-zone-id"
}

data "aws_ssm_parameter" "private_zone_id" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/private-root-zone-id"
}

data "aws_ssm_parameter" "db-username" {
  name = "/repo/${var.environment}/user-input/repo-to-gp-db-username"
}

data "aws_ssm_parameter" "db-password" {
  name = "/repo/${var.environment}/user-input/repo-to-gp-db-password"
}

data "aws_ssm_parameter" "rds_endpoint" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/repo-to-gp-rds-endpoint"
}

data "aws_ssm_parameter" "use_new_ehr_repo_api" {
  name = "/repo/${var.environment}/user-input/feature-toggle/use-new-ehr-repo-api"
}