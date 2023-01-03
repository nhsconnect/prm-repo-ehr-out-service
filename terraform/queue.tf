locals {
  ehr-out-service-incoming-queue-name = "${var.environment}-ehr-out-service-incoming"
}

resource "aws_sqs_queue" "ehr-out-service-incoming" {
  name                       = local.ehr-out-service-incoming-queue-name
  message_retention_seconds  = 1209600
  kms_master_key_id = aws_kms_key.ehr-out-service-incoming.key_id
  receive_wait_time_seconds = 20
  visibility_timeout_seconds = 240

  tags = {
    Name = local.ehr-out-service-incoming-queue-name
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "ehr-out-service-incoming-queue" {
  name  = "/repo/${var.environment}/output/${var.component_name}/ehr-out-service-incoming-sqs-queue-arn"
  type  = "String"
  value = aws_sqs_queue.ehr-out-service-incoming.arn
}

resource "aws_kms_key" "ehr-out-service-incoming" {
  description = "Custom KMS Key to enable server side encryption for SQS"
  policy      = data.aws_iam_policy_document.kms_key_policy_doc.json
  enable_key_rotation = true

  tags = {
    Name        = "${local.ehr-out-service-incoming-queue-name}-kms-key"
    CreatedBy   = var.repo_name
    Environment = var.environment
  }
}

data "aws_iam_policy_document" "kms_key_policy_doc" {
  statement {
    effect = "Allow"

    principals {
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
      type        = "AWS"
    }
    actions   = ["kms:*"]
    resources = ["*"]
  }

  statement {
    effect = "Allow"

    principals {
      identifiers = ["sns.amazonaws.com"]
      type        = "Service"
    }

    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey*"
    ]

    resources = ["*"]
  }

  statement {
    effect = "Allow"

    principals {
      identifiers = ["cloudwatch.amazonaws.com"]
      type        = "Service"
    }

    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey*"
    ]

    resources = ["*"]
  }
}