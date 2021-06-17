data "aws_caller_identity" "current" {}

data "aws_ssm_parameter" "deductions_private_private_subnets" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/deductions-private-private-subnets"
}

data "aws_ssm_parameter" "deductions_private_vpc_id" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/private-vpc-id"
}

data "aws_ssm_parameter" "e2e_test_authorization_keys_for_repo_to_gp" {
  name = "/repo/${var.environment}/user-input/api-keys/${var.component_name}/e2e-test"
}

data "aws_ssm_parameter" "gp2gp_adaptor_authorization_keys" {
  name = "/repo/${var.environment}/user-input/api-keys/gp2gp-adaptor/repo-to-gp"
}

data "aws_ssm_parameter" "ehr_repo_authorization_keys" {
  name = "/repo/${var.environment}/user-input/api-keys/ehr-repo/repo-to-gp"
}

data "aws_ssm_parameter" "private_zone_id" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/private-root-zone-id"
}

data "aws_ssm_parameter" "environment_private_zone_id" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/environment-private-zone-id"
}

data "aws_ssm_parameter" "environment_public_zone_id" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/environment-public-zone-id"
}

data "aws_ssm_parameter" "db-username" {
  name = "/repo/${var.environment}/user-input/repo-to-gp-db-username"
}

data "aws_ssm_parameter" "db-password" {
  name = "/repo/${var.environment}/user-input/repo-to-gp-db-password"
}

data "aws_ssm_parameter" "deductions_private_db_subnets" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/deductions-private-database-subnets"
}
