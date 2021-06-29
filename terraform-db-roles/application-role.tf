resource "postgresql_role" "application_role" {
  name     = "application_role"
}

resource "postgresql_grant" "application_role_schema_usage_grant" {
  database    = var.db_name
  role        = postgresql_role.application_role.name
  schema      = "public"
  object_type = "schema"
  privileges  = ["USAGE"]
}

resource "postgresql_grant" "application_role_table_read_write_grant" {
  database    = var.db_name
  role        = postgresql_role.application_role.name
  schema      = "public"
  object_type = "table"
  privileges  = ["SELECT","UPDATE","DELETE","INSERT"]
}

resource "postgresql_role" "application_user" {
  name     = "application_user"
  login    = true
  roles = ["rds_iam", postgresql_role.application_role.name]
}

data "aws_iam_policy_document" "application-assume-role-policy" {
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

resource "aws_iam_role" "db_application_role" {
  name               = "${var.environment}-${var.component_name}-DbApplicationRole"
  assume_role_policy = data.aws_iam_policy_document.application-assume-role-policy.json
  description        = "DbApplication role read write data in ${var.component_name} db"

  tags = {
    Environment = var.environment
    CreatedBy= var.repo_name
  }
}

resource "aws_iam_instance_profile" "db_application_role_profile" {
  name = "${var.environment}-${var.component_name}-DbApplicationRole"
  role = aws_iam_role.db_application_role.name
}

data "aws_iam_policy_document" "db_application_user_policy_doc" {
  statement {
    actions = [
      "rds-db:connect"
    ]

    resources = [
      "arn:aws:rds-db:${var.region}:${data.aws_caller_identity.current.account_id}:dbuser:${data.aws_ssm_parameter.db_cluster_resource_id.value}/${postgresql_role.application_user.name}"
    ]

    effect = "Allow"
  }
}

resource "aws_iam_policy" "db_application_user_policy" {
  name   = "${var.environment}-${var.component_name}-db_application_user"
  policy = data.aws_iam_policy_document.db_application_user_policy_doc.json
}

resource "aws_iam_role_policy_attachment" "db_application_user_policy_attach" {
  role       = aws_iam_role.db_application_role.name
  policy_arn = aws_iam_policy.db_application_user_policy.arn
}
