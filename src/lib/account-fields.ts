export type Field = {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "tel"
    | "date"
    | "number"
    | "textarea"
    | "select"
    | "checkbox"
    | "file"
    | "url";
  required?: boolean;
  options?: string[];
  choices?: { value: string; label: string }[];
  max?: number;
  dir?: "ltr";
};
const f = (
  name: string,
  label: string,
  type: Field["type"] = "text",
  extra: Partial<Field> = {},
): Field => ({ name, label, type, ...extra });
export const personalSections = [
  {
    id: "identity",
    title: "اطلاعات فردی",
    description: "اطلاعاتی که به شناخت و شناسایی شما کمک می‌کند.",
    fields: [
      f("first_name", "نام", "text", { required: true }),
      f("last_name", "نام خانوادگی", "text", { required: true }),
      f("preferred_name", "نامی که دوست دارید صدایتان کنیم"),
      f("full_name_latin", "نام کامل به لاتین", "text", { dir: "ltr" }),
      f("father_name", "نام پدر"),
      f("birth_date", "تاریخ تولد", "date"),
      f("birth_place", "محل تولد"),
      f("nationality", "ملیت"),
      f("national_id", "کد ملی", "text", { dir: "ltr", max: 20 }),
      f("identity_document_number", "شماره شناسنامه"),
      f("identity_issue_place", "محل صدور شناسنامه"),
      f("gender", "جنسیت", "select", {
        options: ["زن", "مرد", "ترجیح می‌دهم نگویم"],
      }),
      f("marital_status", "وضعیت تأهل", "select", {
        options: ["مجرد", "متأهل", "سایر"],
      }),
      f("military_service_status", "وضعیت نظام وظیفه", "select", {
        options: [
          "مشمول نیستم",
          "پایان خدمت",
          "معافیت دائم",
          "معافیت تحصیلی",
          "در حال خدمت",
          "مشمول",
        ],
      }),
      f("passport_number", "شماره گذرنامه", "text", { dir: "ltr" }),
      f("passport_expires_on", "اعتبار گذرنامه", "date"),
    ],
  },
  {
    id: "contact",
    title: "راه‌های ارتباطی و نشانی",
    description: "شماره و نشانی فعلی خود را به‌روز نگه دارید.",
    fields: [
      f("mobile_phone", "شماره همراه", "tel"),
      f("personal_email", "ایمیل شخصی", "email"),
      f("work_phone", "تلفن محل کار", "tel"),
      f("phone_extension", "داخلی", "text", { dir: "ltr" }),
      f("country", "کشور"),
      f("province", "استان"),
      f("city", "شهر"),
      f("postal_code", "کد پستی", "text", { dir: "ltr", max: 20 }),
      f("address_line_1", "نشانی", "textarea"),
      f("address_line_2", "جزئیات نشانی", "textarea"),
      f("timezone", "منطقه زمانی", "select", {
        options: [
          "Asia/Tehran",
          "UTC",
          "Europe/Berlin",
          "Europe/London",
          "Asia/Dubai",
          "America/Toronto",
        ],
      }),
      f("preferred_language", "زبان ترجیحی", "select", {
        options: ["فارسی", "English"],
      }),
    ],
  },
  {
    id: "insurance",
    title: "شناسه‌های بیمه و مالیاتی",
    description: "اطلاعات شخصی موردنیاز برای امور اداری.",
    fields: [
      f("insurance_number", "شماره بیمه", "text", { dir: "ltr" }),
      f("insurance_provider", "سازمان بیمه‌گر"),
      f("tax_identifier", "شناسه مالیاتی", "text", { dir: "ltr" }),
      f("pension_number", "شماره صندوق بازنشستگی", "text", { dir: "ltr" }),
    ],
  },
] as const;
export type Collection = {
  id: string;
  table: string;
  title: string;
  singular: string;
  description: string;
  group: string;
  fields: Field[];
  readOnly?: boolean;
};
export const collections: Collection[] = [
  {
    id: "emergency",
    table: "employee_emergency_contacts",
    title: "تماس‌های اضطراری",
    singular: "تماس اضطراری",
    group: "family",
    description: "افرادی که در شرایط ضروری می‌توان با آن‌ها تماس گرفت.",
    fields: [
      f("full_name", "نام و نام خانوادگی", "text", { required: true }),
      f("relationship", "نسبت"),
      f("phone", "شماره تماس", "tel", { required: true }),
      f("alternate_phone", "شماره جایگزین", "tel"),
      f("email", "ایمیل", "email"),
      f("address", "نشانی", "textarea"),
      f("is_primary", "تماس اصلی", "checkbox"),
      f("notes", "توضیحات", "textarea"),
    ],
  },
  {
    id: "dependents",
    table: "employee_dependents",
    title: "اعضای خانواده و افراد تحت تکفل",
    singular: "عضو خانواده",
    group: "family",
    description: "مشخصات افراد تحت پوشش خود را ثبت کنید.",
    fields: [
      f("full_name", "نام و نام خانوادگی", "text", { required: true }),
      f("relationship", "نسبت"),
      f("birth_date", "تاریخ تولد", "date"),
      f("national_id", "کد ملی", "text", { dir: "ltr" }),
      f("insurance_covered", "تحت پوشش بیمه", "checkbox"),
      f("coverage_starts_on", "شروع پوشش", "date"),
      f("coverage_ends_on", "پایان پوشش", "date"),
      f("notes", "توضیحات", "textarea"),
    ],
  },
  {
    id: "bank",
    table: "employee_bank_accounts",
    title: "حساب‌های بانکی",
    singular: "حساب بانکی",
    group: "finance",
    description: "حساب‌های متعلق به خودتان را وارد کنید.",
    fields: [
      f("bank_name", "نام بانک", "text", { required: true }),
      f("branch_name", "شعبه"),
      f("account_holder", "نام صاحب حساب", "text", { required: true }),
      f("account_number", "شماره حساب", "text", { dir: "ltr" }),
      f("iban", "شماره شبا", "text", { dir: "ltr", max: 34 }),
      f("swift_code", "کد سوئیفت", "text", { dir: "ltr" }),
      f("currency", "واحد پول", "select", {
        options: ["IRR", "USD", "EUR", "AED"],
      }),
      f("is_primary", "حساب اصلی", "checkbox"),
    ],
  },
  {
    id: "education",
    table: "employee_education",
    title: "تحصیلات",
    singular: "سابقه تحصیلی",
    group: "career",
    description: "مدرک‌ها و مسیر تحصیلی شما.",
    fields: [
      f("institution", "دانشگاه یا مؤسسه", "text", { required: true }),
      f("degree", "مقطع"),
      f("field_of_study", "رشته تحصیلی"),
      f("country", "کشور"),
      f("starts_on", "تاریخ شروع", "date"),
      f("ends_on", "تاریخ پایان", "date"),
      f("grade", "معدل"),
      f("document_storage_path", "فایل مدرک", "file"),
      f("notes", "توضیحات", "textarea"),
    ],
  },
  {
    id: "work",
    table: "employee_work_history",
    title: "سوابق کاری",
    singular: "سابقه کاری",
    group: "career",
    description: "تجربه‌های حرفه‌ای پیشین خود را اضافه کنید.",
    fields: [
      f("employer", "نام مجموعه", "text", { required: true }),
      f("job_title", "عنوان شغلی", "text", { required: true }),
      f("employment_type", "نوع همکاری"),
      f("location", "محل کار"),
      f("starts_on", "تاریخ شروع", "date"),
      f("ends_on", "تاریخ پایان", "date"),
      f("responsibilities", "مسئولیت‌ها", "textarea"),
      f("reason_for_leaving", "دلیل پایان همکاری", "textarea"),
      f("notes", "توضیحات", "textarea"),
    ],
  },
  {
    id: "skills",
    table: "employee_skills",
    title: "مهارت‌ها",
    singular: "مهارت",
    group: "career",
    description: "توانمندی‌هایی که با خود به تیم می‌آورید.",
    fields: [
      f("skill_name", "نام مهارت", "text", { required: true }),
      f("category", "دسته‌بندی"),
      f("proficiency", "سطح تسلط", "select", {
        options: ["مقدماتی", "متوسط", "پیشرفته", "حرفه‌ای"],
      }),
      f("years_experience", "سال تجربه", "number"),
      f("assessed_on", "تاریخ ارزیابی", "date"),
      f("notes", "توضیحات", "textarea"),
    ],
  },
  {
    id: "languages",
    table: "employee_languages",
    title: "زبان‌ها",
    singular: "زبان",
    group: "career",
    description: "سطح توانایی خود در هر زبان را ثبت کنید.",
    fields: [
      f("language", "زبان", "text", { required: true }),
      ...["speaking", "reading", "writing", "listening"].map((s, i) =>
        f(s + "_level", ["گفتار", "خواندن", "نوشتن", "شنیدن"][i], "select", {
          options: ["مقدماتی", "متوسط", "پیشرفته", "زبان مادری"],
        }),
      ),
      f("notes", "توضیحات", "textarea"),
    ],
  },
  {
    id: "certifications",
    table: "employee_certifications",
    title: "گواهی‌نامه‌ها",
    singular: "گواهی‌نامه",
    group: "documents",
    description: "گواهی‌های حرفه‌ای و مدارک قابل استناد.",
    fields: [
      f("title", "عنوان گواهی", "text", { required: true }),
      f("issuer", "صادرکننده"),
      f("credential_id", "شناسه گواهی", "text", { dir: "ltr" }),
      f("credential_url", "پیوند اعتبارسنجی", "url"),
      f("issued_on", "تاریخ صدور", "date"),
      f("expires_on", "تاریخ اعتبار", "date"),
      f("document_storage_path", "فایل گواهی", "file"),
      f("notes", "توضیحات", "textarea"),
    ],
  },
  {
    id: "documents",
    table: "employee_documents",
    title: "مدارک شخصی",
    singular: "مدرک",
    group: "documents",
    description: "تصویر یا PDF مدارک؛ هر فایل تا ۵ مگابایت.",
    fields: [
      f("title", "عنوان مدرک", "text", { required: true }),
      f("document_type", "نوع مدرک"),
      f("storage_path", "فایل مدرک", "file"),
      f("issued_on", "تاریخ صدور", "date"),
      f("expires_on", "تاریخ اعتبار", "date"),
      f("notes", "توضیحات", "textarea"),
    ],
  },
  {
    id: "training",
    table: "employee_training",
    title: "دوره‌های آموزشی",
    singular: "دوره آموزشی",
    group: "career",
    description: "دوره‌ها و آموزش‌هایی که گذرانده‌اید.",
    fields: [
      f("title", "عنوان دوره", "text", { required: true }),
      f("provider", "برگزارکننده"),
      f("starts_on", "تاریخ شروع", "date"),
      f("completed_on", "تاریخ پایان", "date"),
      f("status", "وضعیت", "select", {
        options: ["در حال گذراندن", "تکمیل شده", "ناتمام"],
      }),
      f("duration_hours", "مدت دوره (ساعت)", "number"),
      f("cost", "هزینه دوره", "number"),
      f("currency", "واحد پول"),
      f("result", "نتیجه"),
      f("document_storage_path", "فایل مدرک", "file"),
      f("notes", "توضیحات", "textarea"),
    ],
  },
  {
    id: "contracts",
    table: "employee_contracts",
    title: "قراردادهای من",
    singular: "قرارداد",
    group: "employment",
    description: "اطلاعات ثبت‌شده توسط سازمان.",
    readOnly: true,
    fields: [
      f("contract_number", "شماره قرارداد"),
      f("contract_type", "نوع قرارداد"),
      f("status", "وضعیت"),
      f("starts_on", "شروع", "date"),
      f("ends_on", "پایان", "date"),
      f("signed_on", "تاریخ امضا", "date"),
      f("job_title", "عنوان شغلی"),
      f("department", "واحد"),
      f("work_location", "محل کار"),
      f("weekly_work_hours", "ساعت کار هفتگی", "number"),
      f("notice_period_days", "مهلت اعلام پایان همکاری", "number"),
      f("notes", "توضیحات"),
    ],
  },
  {
    id: "compensation",
    table: "employee_compensation",
    title: "حقوق و مزایا",
    singular: "حقوق",
    group: "employment",
    description: "اطلاعات پرداخت و مزایای ثبت‌شده برای شما.",
    readOnly: true,
    fields: [
      f("effective_from", "از تاریخ", "date"),
      f("effective_to", "تا تاریخ", "date"),
      f("base_amount", "مبلغ پایه", "number"),
      f("currency", "واحد پول"),
      f("pay_frequency", "دوره پرداخت"),
      f("pay_basis", "مبنای پرداخت"),
      f("housing_allowance", "حق مسکن", "number"),
      f("transport_allowance", "ایاب‌وذهاب", "number"),
      f("meal_allowance", "کمک‌هزینه غذا", "number"),
      f("bonus_details", "پاداش"),
      f("overtime_details", "اضافه‌کار"),
      f("notes", "توضیحات"),
    ],
  },
  {
    id: "benefits",
    table: "employee_benefits",
    title: "پوشش‌ها و خدمات رفاهی",
    singular: "مزایا",
    group: "employment",
    description: "پوشش‌ها و خدمات سازمانی شما.",
    readOnly: true,
    fields: [
      f("benefit_type", "نوع خدمت"),
      f("provider", "ارائه‌دهنده"),
      f("policy_number", "شماره بیمه‌نامه"),
      f("starts_on", "شروع", "date"),
      f("ends_on", "پایان", "date"),
      f("employee_contribution", "سهم کارمند", "number"),
      f("employer_contribution", "سهم کارفرما", "number"),
      f("currency", "واحد پول"),
      f("notes", "توضیحات"),
    ],
  },
  {
    id: "assets",
    table: "employee_assets",
    title: "تجهیزات تحویلی",
    singular: "تجهیزات",
    group: "employment",
    description: "تجهیزاتی که به نام شما ثبت شده‌اند.",
    readOnly: true,
    fields: [
      f("asset_type", "نوع تجهیز"),
      f("asset_tag", "کد اموال"),
      f("serial_number", "شماره سریال"),
      f("description", "شرح"),
      f("assigned_on", "تاریخ تحویل", "date"),
      f("returned_on", "تاریخ بازگشت", "date"),
      f("condition_at_assignment", "وضعیت هنگام تحویل"),
      f("condition_at_return", "وضعیت هنگام بازگشت"),
      f("notes", "توضیحات"),
    ],
  },
  {
    id: "reviews",
    table: "employee_reviews",
    title: "ارزیابی‌ها و بازخورد من",
    singular: "ارزیابی",
    group: "employment",
    description: "ارزیابی‌های ثبت‌شده و پاسخ شما به آن‌ها.",
    readOnly: true,
    fields: [
      f("period_start", "شروع دوره", "date"),
      f("period_end", "پایان دوره", "date"),
      f("reviewed_on", "تاریخ ارزیابی", "date"),
      f("rating", "امتیاز"),
      f("summary", "خلاصه"),
      f("goals", "هدف‌ها"),
      f("employee_feedback", "بازخورد من", "textarea"),
    ],
  },
];
export const organizationFields: Field[] = [
  f("employee_number", "کد پرسنلی"),
  f("email", "ایمیل سازمانی"),
  f("legal_entity", "شرکت"),
  f("department", "واحد"),
  f("team", "تیم"),
  f("job_title", "عنوان شغلی"),
  f("job_level", "سطح شغلی"),
  f("cost_center", "مرکز هزینه"),
  f("work_location", "محل کار"),
  f("work_arrangement", "شیوه همکاری"),
  f("employment_type", "نوع استخدام"),
  f("employment_status", "وضعیت همکاری"),
  f("hired_on", "تاریخ استخدام", "date"),
  f("original_hired_on", "شروع همکاری اولیه", "date"),
  f("probation_ends_on", "پایان دوره آزمایشی", "date"),
  f("terminated_on", "پایان همکاری", "date"),
  f("termination_reason", "علت پایان همکاری"),
  f("weekly_work_hours", "ساعات هفتگی", "number"),
];
export const completionFields = [
  "first_name",
  "last_name",
  "mobile_phone",
  "personal_email",
  "birth_date",
  "national_id",
  "city",
  "address_line_1",
  "postal_code",
  "photo_storage_path",
];
export const profileChecklist = [
  {
    label: "مشخصات فردی",
    fields: ["first_name", "last_name", "birth_date", "national_id"],
    section: "identity",
  },
  {
    label: "اطلاعات تماس و نشانی",
    fields: [
      "mobile_phone",
      "personal_email",
      "city",
      "address_line_1",
      "postal_code",
    ],
    section: "contact",
  },
  {
    label: "تصویر حساب",
    fields: ["photo_storage_path"],
    section: "identity",
  },
] as const;

export function getProfileChecklist(employee: Record<string, unknown>) {
  return profileChecklist.map((item) => ({
    ...item,
    complete: item.fields.every((field) => Boolean(employee[field])),
  }));
}

export function profileCompletion(employee: Record<string, unknown>) {
  return Math.round(
    (completionFields.filter((key) => Boolean(employee[key])).length /
      completionFields.length) *
      100,
  );
}
