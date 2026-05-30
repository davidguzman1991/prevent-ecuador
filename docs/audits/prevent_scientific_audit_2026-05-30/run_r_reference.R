
source("G:/Mi unidad/proyecto prevent R original/AHAprevent/R/AHA_prevent_equations.R")
patients <- read.csv("c:/Users/Usuario/prevent-ecuador/docs/audits/prevent_scientific_audit_2026-05-30/synthetic_patients.csv", stringsAsFactors=FALSE)
rows <- list()
for (i in seq_len(nrow(patients))) {
  p <- patients[i,]
  if (p$variant == "base") {
    res <- prevent_base(p$sex, p$age, p$tc, p$hdl, p$sbp, p$dm, p$smoking, p$bmi, p$egfr, p$bptreat, p$statin)
  } else if (p$variant == "uacr") {
    res <- prevent_uacr(p$sex, p$age, p$tc, p$hdl, p$sbp, p$dm, p$smoking, p$bmi, p$egfr, p$bptreat, p$statin, p$uacr)
  } else if (p$variant == "hba1c") {
    res <- prevent_hba1c(p$sex, p$age, p$tc, p$hdl, p$sbp, p$dm, p$smoking, p$bmi, p$egfr, p$bptreat, p$statin, p$hba1c)
  } else if (p$variant == "sdi") {
    res <- prevent_sdi(p$sex, p$age, p$tc, p$hdl, p$sbp, p$dm, p$smoking, p$bmi, p$egfr, p$bptreat, p$statin, p$sdi)
  } else if (p$variant == "full") {
    res <- prevent_full(p$sex, p$age, p$tc, p$hdl, p$sbp, p$dm, p$smoking, p$bmi, p$egfr, p$bptreat, p$statin, p$uacr, p$hba1c, p$sdi)
  }
  rows[[i]] <- data.frame(
    case_id=p$case_id,
    variant=p$variant,
    cvd_10y=as.numeric(res[[grep("10yr_CVD", names(res))]]),
    cvd_30y=as.numeric(res[[grep("30yr_CVD", names(res))]]),
    ascvd_10y=as.numeric(res[[grep("10yr_ASCVD", names(res))]]),
    ascvd_30y=as.numeric(res[[grep("30yr_ASCVD", names(res))]]),
    hf_10y=as.numeric(res[[grep("10yr_HF", names(res))]]),
    hf_30y=as.numeric(res[[grep("30yr_HF", names(res))]])
  )
}
out <- do.call(rbind, rows)
write.csv(out, "c:/Users/Usuario/prevent-ecuador/docs/audits/prevent_scientific_audit_2026-05-30/r_reference_results.csv", row.names=FALSE, na="")
