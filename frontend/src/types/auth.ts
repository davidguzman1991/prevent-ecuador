export type DoctorProfile = {
  id: string;
  display_name: string;
  specialty: string | null;
  license_number: string | null;
  institution_name: string | null;
  city: string | null;
  phone: string | null;
  birth_date: string | null;
  province_code: string | null;
  province_name: string | null;
  profile_status?: "pending" | "partial" | "complete";
};

export type CurrentUser = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: "doctor" | "global_admin" | string;
  is_active: boolean;
  auth_provider: string;
  auth_subject: string;
  created_at: string;
  updated_at: string;
  doctor_profile: DoctorProfile | null;
};
