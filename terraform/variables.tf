variable "region" {
  type    = string
  default = "eu-west-2"
}

variable "repo_name" {
  type = string
  default = "prm-repo-ehr-out-service"
}

variable "db_name" {
  type = string
  default = "repotogpdb"
}

variable "environment" {}
variable "component_name" {
  default = "repo-to-gp"
}
variable "dns_name" {
  default = "repo-to-gp"
}
variable "task_image_tag" {}
variable "task_cpu" {
  default = 256
}
variable "task_memory" {
  default = 512
}
variable "port" {
  default = 3000
}
variable "service_desired_count" {
  default = "3"
}
variable "alb_deregistration_delay" {
  default = 15
}
variable "application_database_user" {
  default = "application_user"
  description = "Needs to match with the user created in db-roles tf plan"
}
variable "grant_access_through_vpn" {
  default = false
}
variable "allow_vpn_to_ecs_tasks" {
  default = false
}
variable "enable_rds_cluster_deletion_protection" {
  default = true
}

variable "threshold_approx_age_oldest_message" {
  default = "300"
}

variable "period_of_age_of_message_metric" {
  default = "1800"
}

variable "log_level" {
  type = string
  default = "info"
}

variable "db_instance_number" {
  default = 3
}
