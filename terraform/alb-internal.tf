locals {
  domain = trimsuffix("${var.dns_name}.${data.aws_route53_zone.environment_public_zone.name}", ".")
}

resource "aws_alb_target_group" "internal-alb-tg" {
  name        = "${var.environment}-${var.component_name}-int-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = data.aws_ssm_parameter.deductions_private_vpc_id.value
  target_type = "ip"
  deregistration_delay = var.alb_deregistration_delay
  health_check {
    healthy_threshold   = 3
    unhealthy_threshold = 5
    timeout             = 5
    interval            = 10
    path                = "/health"
    port                = 3000
  }

  tags = {
    Environment = var.environment
    CreatedBy = var.repo_name
  }
}

resource "aws_alb_listener_rule" "int-alb-http-listener-rule" {
  listener_arn = data.aws_ssm_parameter.deductions_private_int_alb_httpl_arn.value
  priority     = 300

  action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  condition {
    host_header {
      values = [local.domain]
    }
  }
}

resource "aws_alb_listener_rule" "int-alb-https-listener-rule" {
  listener_arn = data.aws_ssm_parameter.deductions_private_int_alb_httpsl_arn.value
  priority     = 301

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.internal-alb-tg.arn
  }

  condition {
    host_header {
      values = [local.domain]
    }
  }
}

data "aws_ssm_parameter" "int-alb-listener-https-arn" {
  name = "/repo/${var.environment}/output/prm-deductions-infra/int-alb-listener-https-arn"
}

resource "aws_lb_listener_certificate" "repo-to-gp-int-listener-cert" {
  listener_arn    = data.aws_ssm_parameter.int-alb-listener-https-arn.value
  certificate_arn = aws_acm_certificate_validation.repo-to-gp-cert-validation.certificate_arn
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
  source_security_group_id = data.aws_ssm_parameter.deductions_private_repo_to_gp_sg_id.value
}