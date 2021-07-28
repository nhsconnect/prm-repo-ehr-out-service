environment    = "pre-prod"
component_name = "repo-to-gp"
dns_name       = "repo-to-gp"
task_cpu    = 256
task_memory = 512
port        = 3000
service_desired_count = "2"
alb_deregistration_delay = 15

log_level = "info"

grant_access_through_vpn = false