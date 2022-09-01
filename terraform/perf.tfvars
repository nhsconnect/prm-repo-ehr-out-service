environment    = "perf"
component_name = "repo-to-gp"
dns_name       = "repo-to-gp"
task_cpu    = 256
task_memory = 512
port        = 3000
service_desired_count = "3"
alb_deregistration_delay = 15

log_level = "info"

grant_access_through_vpn = false

enable_rds_cluster_deletion_protection = true
db_instance_number = 3