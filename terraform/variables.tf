variable "region" {
  type    = string
  default = "eu-west-2"
}

variable "repo_name" {
  type = string
  default = "prm-deductions-repo-to-gp"
}

variable "db_name" {
  type = string
  default = "repotogpdb"
}

variable "environment" {}
variable "component_name" {}
variable "dns_name" {}
variable "task_image_tag" {}
variable "task_cpu" {}
variable "task_memory" {}
variable "port" {}
variable "service_desired_count" {}
variable "alb_deregistration_delay" {}
variable "application_database_user" {
  default = "application_user"
  description = "Needs to match with the user created in db-roles tf plan"
}
variable "grant_access_through_vpn" {}
variable "allow_vpn_to_ecs_tasks" { default=false }

variable "log_level" {
  type = string
  default = "debug"
}
