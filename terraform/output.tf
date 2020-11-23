resource "aws_ssm_parameter" "repo_to_gp_service_url" {
  name  = "/repo/${var.environment}/output/${var.repo_name}/repo-to-gp-service-url"
  type  = "String"
  value = "https://${var.environment}.${var.dns_name}.patient-deductions.nhs.uk"
}