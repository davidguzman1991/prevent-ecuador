export type DashboardRecord = {
  id: string;
  created_at: string;
  is_deleted: boolean;
  patient_age: number;
  patient_sex: string;
  physician_name: string;
  diabetes: boolean;
  smoker: boolean;
  cvd_risk: number | null;
  ascvd_risk: number | null;
  hf_risk: number | null;
  cvd_risk_30y: number | null;
  ascvd_risk_30y: number | null;
  hf_risk_30y: number | null;
  model_variant: string | null;
  created_by_user_id?: string | null;
  owner_doctor_id?: string | null;
  patient_id?: string | null;
  public_session_id?: string | null;
  source_type?: string | null;
  user_type?: string | null;
  visibility_scope?: string | null;
  created_modality?: string | null;
  request_id?: string | null;
};

export type DashboardListResponse = {
  items: DashboardRecord[];
  total: number;
  active_total: number;
  archived_total: number;
  page: number;
  page_size: number;
};
