variable "region" {
  type    = string
  default = "eu-west-2"
}

variable "repo_name" {
  type = string
  default = "prm-repo-ehr-out-service"
}

variable "db_port" {
  type = string
  default = "5432"
}

variable "component_name" {
  type = string
  default = "repo-to-gp"
}

variable "environment" {}
variable "db_name" {}
variable "db_host" {}
variable "db_username" {}
variable "db_password" {}
