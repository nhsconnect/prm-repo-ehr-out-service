locals {
  account_id = data.aws_caller_identity.current.account_id
}

resource "postgresql_role" "migration_role" {
  name     = "migration_role"
}

resource "postgresql_grant" "migration_role_schema_usage_grant" {
  database    = var.db_name
  role        = postgresql_role.migration_role.name
  schema      = "public"
  object_type = "schema"
  privileges  = ["USAGE", "CREATE"]
}

resource "postgresql_role" "migration_user" {
  name     = "migration_user"
  login    = true
}

resource "aws_ssm_parameter" "migration_user" {
  name = "/repo/${var.environment}/output/${var.repo_name}/db-migration-user"
  type = "String"
  value = postgresql_role.migration_user.name
}

resource "postgresql_grant_role" "migration_user_rds_iam_grant" {
  role              = postgresql_role.migration_user.name
  grant_role        = "rds_iam"
}

resource "postgresql_grant_role" "migration_user_migration_role_grant" {
  role              = postgresql_role.migration_user.name
  grant_role        = postgresql_role.migration_role.name
}

data "aws_iam_policy_document" "ec2-assume-role-policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type = "Service"
      identifiers = [
        "ec2.amazonaws.com"
      ]
    }
  }
}

resource "aws_iam_role" "db_migration_role" {
  name               = "${var.environment}-${var.component_name}-DbMigrationRole"
  assume_role_policy = data.aws_iam_policy_document.ec2-assume-role-policy.json
  description        = "DbMigration role to migrate db in the pipeline"

  tags = {
    Environment = var.environment
    CreatedBy= var.repo_name
  }
}

data "aws_iam_policy_document" "db_migration_user_policy_doc" {
  statement {
    actions = [
      "rds-db:connect"
    ]

    resources = [
      "arn:aws:rds-db:${var.region}:${local.account_id}:dbuser:${data.aws_ssm_parameter.db_cluster_resource_id.value}/${postgresql_role.migration_user.name}"
    ]

    effect = "Allow"
  }
}

resource "aws_iam_policy" "db_migration_user_policy" {
  name   = "${var.environment}-${var.component_name}-db_migration_user"
  policy = data.aws_iam_policy_document.db_migration_user_policy_doc.json
}

resource "aws_iam_role_policy_attachment" "db_migration_user_policy_attach" {
  role       = aws_iam_role.db_migration_role.name
  policy_arn = aws_iam_policy.db_migration_user_policy.arn
}
