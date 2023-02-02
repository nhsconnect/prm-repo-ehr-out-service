moved {
  from = aws_kms_key.ehr-out-service-incoming
  to   = aws_kms_key.service_incoming
}

moved {
  from = aws_kms_key.repo_to_gp_key
  to   = aws_kms_key.ehr_out_service_db_key
}

#TBD
moved {
  from = aws_rds_cluster.repo_to_gp_db_cluster
  to   = aws_rds_cluster.ehr_out_service_db_cluster
}
