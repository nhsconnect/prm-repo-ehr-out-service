terraform{
  backend "s3" {
    bucket  = "prm-deductions-terraform-state"
    key     = "repo-to-gp/terraform.tfstate"
    region  = "eu-west-2"
    encrypt = true
  }
}