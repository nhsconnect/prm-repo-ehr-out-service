locals {
  deductions_private_internal_alb_dns = data.aws_ssm_parameter.deductions_private_alb_internal_dns.value
  zone_id = data.aws_ssm_parameter.root_zone_id.value
  private_zone_id = data.aws_ssm_parameter.private_zone_id.value
}

resource "aws_route53_record" "repo-to-gp" {
  zone_id = data.aws_ssm_parameter.environment_private_zone_id.value
  name    = var.dns_name
  type    = "CNAME"
  ttl     = "300"
  records = [local.deductions_private_internal_alb_dns]
}

data "aws_route53_zone" "environment_public_zone" {
  zone_id = data.aws_ssm_parameter.environment_public_zone_id.value
}

resource "aws_acm_certificate" "repo-to-gp-cert" {
  domain_name       = "${var.dns_name}.${data.aws_route53_zone.environment_public_zone.name}"

  validation_method = "DNS"

  tags = {
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

resource "aws_route53_record" "repo-to-gp-cert-validation-record" {
  for_each = {
    for dvo in aws_acm_certificate.repo-to-gp-cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.environment_public_zone.zone_id
}

resource "aws_acm_certificate_validation" "repo-to-gp-cert-validation" {
  certificate_arn = aws_acm_certificate.repo-to-gp-cert.arn
  validation_record_fqdns = [for record in aws_route53_record.repo-to-gp-cert-validation-record : record.fqdn]
}

resource "aws_ssm_parameter" "repo_to_gp_service_url" {
  name  = "/repo/${var.environment}/output/${var.repo_name}/repo-to-gp-service-url"
  type  = "String"
  value = "https://${var.dns_name}.${data.aws_route53_zone.environment_public_zone.name}"
}