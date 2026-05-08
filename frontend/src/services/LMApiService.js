import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8085/api/lm";

/* =========================================================
   🔐 AUTH API (login, me, password, etc.)
========================================================= */
const AuthAPI = axios.create({
  baseURL: API_BASE_URL,
});

/* =========================================================
   🏥 STAFF API (ALL protected modules)
========================================================= */
const StaffAPI = axios.create({
  baseURL: API_BASE_URL,
});

/* =========================================================
   🔐 ATTACH JWT TOKEN INTERCEPTOR
========================================================= */
const attachToken = (config) => {
  const token = localStorage.getItem("lm_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};

AuthAPI.interceptors.request.use(attachToken);
StaffAPI.interceptors.request.use(attachToken);

/* =========================================================
   ❌ GLOBAL ERROR HANDLER
========================================================= */
const handleError = (error) => {
  console.log("API ERROR:", error.response);

  // ❗ Only logout on 401 (NOT 403)
  if (error.response?.status === 401) {
    localStorage.removeItem("lm_token");
    localStorage.removeItem("lm_user");

    window.location.href = "/login";
  }

  return Promise.reject(error);
};

AuthAPI.interceptors.response.use((res) => res, handleError);
StaffAPI.interceptors.response.use((res) => res, handleError);

/* =========================================================
   📌 API SERVICE OBJECT
========================================================= */
export const LMApi = {

  /* =========================
     🔐 AUTH MODULE
  ========================= */
  login: (data) => AuthAPI.post("/auth/login", data),
  me: () => AuthAPI.get("/auth/me"),
  changePassword: (data) => AuthAPI.post("/auth/change-password", data),

  /* =========================
     📊 DASHBOARD
  ========================= */
  getStats: () => StaffAPI.get("/dashboard/stats"),
  getActivity: () => StaffAPI.get("/dashboard/activity"),
  getUsers: () => StaffAPI.get("/dashboard/users"),

  /* =========================
     👨‍⚕️ DOCTORS
  ========================= */
  getDoctors: () => StaffAPI.get("/doctors"),
  getDoctor: (id) => StaffAPI.get(`/doctors/${id}`),
  getMyDoctorProfile: () => StaffAPI.get("/doctors/profile"),
  getActiveDoctors: () => StaffAPI.get("/doctors/active"),
  searchDoctors: (name) => StaffAPI.get(`/doctors/search?name=${name}`),
  createDoctor: (data) => StaffAPI.post("/doctors", data),
  updateDoctor: (id, data) => StaffAPI.put(`/doctors/${id}`, data),
  toggleDoctorActive: (id) => StaffAPI.patch(`/doctors/${id}/toggle-active`),
  deleteDoctor: (id) => StaffAPI.delete(`/doctors/${id}`),

  /* =========================
     🧑‍🤝‍🧑 PATIENTS
  ========================= */
  getPatients: () => StaffAPI.get("/patients"),
  getPatient: (id) => StaffAPI.get(`/patients/${id}`),
  getMyPatients: () => StaffAPI.get("/patients/user"),
  getMyPatientProfile: () => StaffAPI.get("/patients/profile"),
  createPatient: (data) => StaffAPI.post("/patients", data),
  updatePatient: (id, data) => StaffAPI.put(`/patients/${id}`, data),
  deletePatient: (id) => StaffAPI.delete(`/patients/${id}`),

  /* =========================
     📅 APPOINTMENTS
  ========================= */
  getAppointments: () => StaffAPI.get("/appointments"),
  getMyAppointments: () => StaffAPI.get("/appointments/my"),
  createAppointment: (data) => StaffAPI.post("/appointments", data),
  updateAppointment: (id, data) => StaffAPI.put(`/appointments/${id}`, data),
  updateAppointmentStatus: (id, status, doctorNotes = "") =>
    StaffAPI.patch(`/appointments/${id}/status`, null, { params: { status, doctorNotes } }),
  deleteAppointment: (id) => StaffAPI.delete(`/appointments/${id}`),

  /* =========================
     🧾 MEDICAL RECORDS
  ========================= */
  getMedicalRecords: () => StaffAPI.get("/medical-records"),
  createMedicalRecord: (data) => StaffAPI.post("/medical-records", data),
  updateMedicalRecord: (id, data) => StaffAPI.put(`/medical-records/${id}`, data),
  deleteMedicalRecord: (id) => StaffAPI.delete(`/medical-records/${id}`),

  /* =========================
     💰 BILLING
  ========================= */
  getBillings: () => StaffAPI.get("/billing"),
  getBilling: (id) => StaffAPI.get(`/billing/${id}`),
  getBillingsByPatient: (id) => StaffAPI.get(`/billing/patient/${id}`),
  getPendingBills: () => StaffAPI.get("/billing/pending"),
  createBilling: (data) => StaffAPI.post("/billing", data),
  updateBilling: (id, data) => StaffAPI.put(`/billing/${id}`, data),
  markBillAsPaid: (id) => StaffAPI.patch(`/billing/${id}/pay`),
  deleteBilling: (id) => StaffAPI.delete(`/billing/${id}`),

  /* =========================
     🔔 NOTIFICATIONS
  ========================= */
  getMyNotifications: () => StaffAPI.get("/notifications"),
  getUnreadNotifications: () => StaffAPI.get("/notifications/unread"),
  getUnreadNotificationCount: () => StaffAPI.get("/notifications/unread-count"),
  sendNotification: (data) => StaffAPI.post("/notifications", data),
  markNotificationAsRead: (id) => StaffAPI.patch(`/notifications/${id}/read`),
  markAllNotificationsAsRead: () => StaffAPI.patch("/notifications/mark-all-read"),
  deleteNotification: (id) => StaffAPI.delete(`/notifications/${id}`),

  /* =========================
     👩‍⚕️ STAFF
  ========================= */
  addStaff: (data) => StaffAPI.post("/staff", data),
  createStaff: (data) => StaffAPI.post("/staff", data),
  getStaffByRole: (role) => StaffAPI.get(`/staff/role/${role}`),
  updateStaff: (id, data) => StaffAPI.put(`/staff/${id}`, data),
  toggleStaffActive: (id) => StaffAPI.patch(`/staff/${id}/toggle-active`),
  deleteStaff: (id) => StaffAPI.delete(`/staff/${id}`),
};
