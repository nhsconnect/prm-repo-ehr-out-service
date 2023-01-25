moved {
  from = aws_ssm_parameter.service_to_repo_to_gp
  to   = aws_ssm_parameter.sg_id_from_other_services
}

moved {
  from = aws_sqs_queue.ehr-out-service-incoming
  to   = aws_sqs_queue.service_incoming
}

moved {
  from = aws_security_group.repo_to_gp_alb
  to   = aws_security_group.service_from_alb
}

moved {
  from = aws_security_group.service_to_repo_to_gp
  to   = aws_security_group.access_from_other_services
}

moved {
  from = aws_security_group.vpn_to_repo_to_gp
  to   = aws_security_group.vpn_to_service_alb
}

moved {
  from = aws_security_group_rule.vpn_to_repo_to_gp
  to   = aws_security_group_rule.vpn_to_service_alb
}

moved {
  from = aws_security_group.gocd_to_repo_to_gp
  to   = aws_security_group.gocd_to_service_alb
}

moved {
  from = aws_security_group.vpn_to_repo_to_gp_ecs
  to   = aws_security_group.vpn_to_service_ecs
}

moved {
  from = aws_alb_listener_rule.int-alb-http-listener-rule
  to   = aws_alb_listener_rule.int_alb_http_listener_rule
}

moved {
  from = aws_alb_listener_rule.int-alb-https-listener-rule
  to   = aws_alb_listener_rule.int_alb_https_listener_rule
}

moved {
  from = aws_iam_role.component-ecs-role
  to   = aws_iam_role.component_ecs_role
}

moved {
  from = aws_route53_record.repo-to-gp
  to   = aws_route53_record.service
}

moved {
  from = aws_kms_key.ehr-out-service-incoming
  to   = aws_kms_key.service_incoming
}

moved {
  from = aws_acm_certificate.repo-to-gp-cert
  to   = aws_acm_certificate.service_cert
}

moved {
  from = aws_route53_record.repo-to-gp-cert-validation-record
  to   = aws_route53_record.service_cert_validation_record
}

moved {
  from = aws_acm_certificate_validation.repo-to-gp-cert-validation
  to   = aws_acm_certificate_validation.service_cert_validation
}

moved {
  from = aws_ssm_parameter.repo_to_gp_service_url
  to   = aws_ssm_parameter.service_url
}

moved {
  from = aws_iam_role.component-ecs-role
  to   = aws_iam_role.component_ecs_role
}

moved {
  from = aws_security_group.ecs-tasks-sg
  to   = aws_security_group.ecs_tasks_sg
}

moved {
  from = aws_security_group_rule.repo-to-gp-to-gp2gp-messenger
  to = aws_security_group_rule.app_to_gp2gp_messenger
}

moved {
  from = aws_security_group_rule.repo-to-gp-to-ehr-repo
  to   = aws_security_group_rule.app_to_ehr_repo
}

moved {
  from = aws_alb.alb-internal
  to   = aws_alb.alb_internal
}

moved {
  from = aws_ecs_service.ecs-service
  to   = aws_ecs_service.ecs_service
}

moved {
  from = aws_ecs_cluster.ecs-cluster
  to   = aws_ecs_cluster.ecs_cluster
}





