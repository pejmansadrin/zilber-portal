"use client";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  UserRound,
  ContactRound,
  UsersRound,
  Landmark,
  GraduationCap,
  Files,
  BriefcaseBusiness,
  KeyRound,
  Plus,
  Trash2,
  Save,
  FolderOpen,
  Check,
  ChevronDown,
  X,
  LayoutGrid,
  Pencil,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import {
  collections,
  getProfileChecklist,
  personalSections,
  profileCompletion,
  organizationFields,
  type Field,
  type Collection,
} from "@/lib/account-fields";
import { toPersianDate } from "@/lib/persian-date";
import {
  savePersonal,
  saveRecord,
  deleteRecord,
  saveReviewFeedback,
  changePassword,
  type FormResult,
} from "@/actions/account";
import type { Employee, EmployeeRecord } from "@/types/employee";
import Loader from "@/components/ui/loader-4";
import { Avatar } from "./PortalShell";
import { ProfilePhotoEditor } from "./ProfilePhotoEditor";
import s from "./Portal.module.css";
import a from "./AccountOverview.module.css";
const initial: FormResult = { ok: false, message: "" };
type Dirty = (key: string, value: boolean) => void;
type FormAction = (previous: FormResult, data: FormData) => Promise<FormResult>;
const tabs = [
  { id: "overview", label: "خلاصهٔ پرونده", hint: "مرور سریع و تکمیل اطلاعات", icon: LayoutGrid },
  { id: "identity", label: "اطلاعات فردی", hint: "مشخصات و تصویر حساب", icon: UserRound },
  { id: "contact", label: "تماس و نشانی", hint: "راه‌های ارتباطی و نشانی", icon: ContactRound },
  { id: "family", label: "خانواده و تماس اضطراری", hint: "افراد تحت تکفل و تماس ضروری", icon: UsersRound },
  { id: "finance", label: "بانک و بیمه", hint: "اطلاعات بانکی و پوشش بیمه", icon: Landmark },
  { id: "career", label: "تحصیلات و مهارت‌ها", hint: "سوابق تحصیلی و توانمندی‌ها", icon: GraduationCap },
  { id: "documents", label: "مدارک و گواهی‌ها", hint: "فایل‌ها و گواهی‌های شخصی", icon: Files },
  { id: "employment", label: "پروندهٔ همکاری", hint: "اطلاعات ثبت‌شده توسط سازمان", icon: BriefcaseBusiness },
  { id: "security", label: "ورود و امنیت", hint: "ایمیل ورود و گذرواژه", icon: KeyRound },
];
function Result({ state }: { state: FormResult }) {
  return state.message ? (
    <p
      role={state.ok ? "status" : "alert"}
      className={`${s.message} ${state.ok ? s.success : s.error}`}
    >
      {state.ok && (
        <Check size={14} style={{ display: "inline", marginLeft: 6 }} />
      )}
      {state.message}
    </p>
  ) : null;
}
function FieldInput({
  field,
  value,
  error,
  prefix,
}: {
  field: Field;
  value?: unknown;
  error?: string;
  prefix: string;
}) {
  const id = `${prefix}-${field.name}`;
  const text =
    typeof value === "string" || typeof value === "number" ? String(value) : "";
  if (field.type === "checkbox")
    return (
      <div className={s.field}>
        <label className={s.checkbox} htmlFor={id}>
          <input
            id={id}
            name={field.name}
            type="checkbox"
            defaultChecked={value === true}
          />
          {field.label}
        </label>
      </div>
    );
  const props = {
    id,
    name: field.name,
    required: field.required,
    "aria-invalid": !!error,
    "aria-describedby": error
      ? `${id}-error`
      : field.type === "date"
        ? `${id}-help`
        : undefined,
  };
  const options = field.options || [];
  return (
    <div
      className={`${s.field} ${field.type === "textarea" || field.type === "file" ? s.wide : ""}`}
    >
      <label htmlFor={id}>
        {field.label}
        {field.required ? " *" : ""}
      </label>
      {field.type === "textarea" ? (
        <textarea {...props} defaultValue={text} maxLength={3000} />
      ) : field.type === "select" ? (
        <select {...props} defaultValue={text}>
          <option value="">انتخاب کنید</option>
          {text && !options.includes(text) && !field.choices?.some(choice => choice.value === text) && (
            <option value={text}>{text}</option>
          )}
          {field.choices?.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === "file" ? (
        <>
          <input {...props} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" />
          <small>PDF، JPG، PNG یا WebP · حداکثر ۵ مگابایت</small>
          {text && (
            <>
              <a
                href={`/account/files?path=${encodeURIComponent(text)}`}
                className={s.fileLink}
                target="_blank"
                rel="noreferrer"
              >
                مشاهدهٔ فایل فعلی
              </a>
              <label className={s.checkbox}>
                <input type="checkbox" name={`remove_${field.name}`} />
                برداشتن فایل فعلی
              </label>
            </>
          )}
        </>
      ) : (
        <input
          {...props}
          type={field.type === "date" ? "text" : field.type || "text"}
          dir={
            field.dir ||
            (["email", "tel", "url", "number", "date"].includes(
              field.type || "",
            )
              ? "ltr"
              : undefined)
          }
          defaultValue={field.type === "date" ? toPersianDate(text) : text}
          placeholder={field.type === "date" ? "۱۴۰۵/۰۷/۰۶" : undefined}
          min={field.type === "number" ? 0 : undefined}
          step={field.type === "number" ? "any" : undefined}
          maxLength={field.max ?? 250}
          autoComplete={
            field.name === "first_name"
              ? "given-name"
              : field.name === "last_name"
                ? "family-name"
                : undefined
          }
        />
      )}
      {field.type === "date" && (
        <small id={`${id}-help`}>تاریخ شمسی · سال/ماه/روز</small>
      )}
      {error && (
        <span id={`${id}-error`} className={s.error}>
          {error}
        </span>
      )}
    </div>
  );
}
export function EditorForm({
  fields,
  record = {},
  action,
  formKey,
  onDirty,
  onSuccess,
}: {
  fields: readonly Field[];
  record?: EmployeeRecord;
  action: FormAction;
  formKey: string;
  onDirty: Dirty;
  onSuccess?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, submit, pending] = useActionState(
    async (previous: FormResult, data: FormData) => {
      try {
        if (
          [...data.values()].some(
            (value) => value instanceof File && value.size > 5 * 1024 * 1024,
          )
        )
          return { ok: false, message: "حداکثر حجم هر فایل ۵ مگابایت است." };
        const result = await action(previous, data);
        if (result.ok) {
          formRef.current
            ?.querySelectorAll<HTMLInputElement>('input[type="file"]')
            .forEach((input) => {
              input.value = "";
            });
          onDirty(formKey, false);
          onSuccess?.();
        }
        return result;
      } catch {
        return { ok: false, message: "ارتباط برقرار نشد. دوباره تلاش کنید." };
      }
    },
    initial,
  );
  return (
    <form
      action={submit}
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => submit(data));
      }}
      onChange={() => onDirty(formKey, true)}
      aria-busy={pending}
    >
      {record.id && (
        <input type="hidden" name="record_id" value={String(record.id)} />
      )}
      <fieldset disabled={pending}>
        <div className={s.formGrid}>
          {fields.map((field) => (
            <FieldInput
              key={field.name}
              prefix={formKey}
              field={field}
              value={record[field.name]}
              error={state.errors?.[field.name]}
            />
          ))}
        </div>
      </fieldset>
      <Result state={state} />
      <div className={s.formFooter}>
        <small>تغییرات این بخش جداگانه ذخیره می‌شود.</small>
        <button
          className={s.button}
          type="submit"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? <Loader size={18} decorative /> : <Save size={16} />}{" "}
          {pending ? "در حال ذخیره…" : "ذخیرهٔ تغییرات"}
        </button>
      </div>
    </form>
  );
}
function ReadFields({
  fields,
  record,
}: {
  fields: readonly Field[];
  record: EmployeeRecord;
}) {
  return (
    <dl className={s.descriptionList}>
      {fields.map((field) => {
        const value = record[field.name];
        return (
          <div key={field.name}>
            <dt>{field.label}</dt>
            <dd>
              {value === null || value === undefined || value === ""
                ? "ثبت نشده"
                : field.type === "date"
                  ? toPersianDate(String(value))
                  : typeof value === "number"
                    ? value.toLocaleString("fa-IR")
                    : String(value)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
function CollectionPanel({
  config,
  records,
  onDirty,
}: {
  config: Collection;
  records: EmployeeRecord[];
  onDirty: Dirty;
}) {
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<FormResult>(initial);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const addKey = `${config.id}-new`;
  function remove(id: number) {
    if (!confirm(`این ${config.singular} حذف شود؟`)) return;
    setDeletingId(id);
    startTransition(async () => {
      try {
        const result = await deleteRecord(config.id, id);
        setMessage(result);
        if (result.ok) onDirty(`${config.id}-${id}`, false);
      } catch {
        setMessage({ ok: false, message: "حذف انجام نشد. دوباره تلاش کنید." });
      }
    });
  }
  return (
    <section className={`${s.glass} ${s.panel} ${s.collectionPanel}`}>
      <div className={s.panelHeading}>
        <div>
          <h2>{config.title}</h2>
          <p className={s.muted}>{config.description}</p>
        </div>
        {!config.readOnly && (
          <button
            className={`${s.iconButton} ${adding ? s.iconButtonActive : ""}`}
            aria-label={
              adding
                ? `انصراف از افزودن ${config.singular}`
                : `افزودن ${config.singular}`
            }
            title={adding ? "انصراف" : `افزودن ${config.singular}`}
            onClick={() => {
              if (adding) {
                setAdding(false);
                onDirty(addKey, false);
              } else {
                setAdding(true);
              }
            }}
          >
            {adding ? <X size={17} /> : <Plus size={17} />}
          </button>
        )}
      </div>
      <Result state={message} />
      {records.length === 0 && !adding && (
        <div className={s.empty}>
          <div className={s.emptyIconWrap}>
            <FolderOpen size={18} />
          </div>
          <p>هنوز {config.singular} ثبت نشده است.</p>
          {!config.readOnly && (
            <button className={s.secondary} onClick={() => setAdding(true)}>
              <Plus size={13} />
              افزودن {config.singular}
            </button>
          )}
        </div>
      )}
      {records.map((record, index) => (
        <article key={String(record.id)} className={s.record}>
          <div className={s.recordHeading}>
            <h3>
              {String(
                record[config.fields[0].name] ||
                  `${config.singular} ${(index + 1).toLocaleString("fa-IR")}`,
              )}
            </h3>
            {!config.readOnly && (
              <button
                type="button"
                onClick={() => remove(Number(record.id))}
                disabled={pending}
                className={`${s.iconButton} ${s.danger}`}
                aria-busy={pending && deletingId === Number(record.id)}
                aria-label={
                  pending && deletingId === Number(record.id)
                    ? `در حال حذف ${config.singular} ${index + 1}…`
                    : `حذف ${config.singular} ${index + 1}`
                }
              >
                {pending && deletingId === Number(record.id) ? (
                  <Loader size={18} decorative />
                ) : (
                  <Trash2 size={15} />
                )}
              </button>
            )}
          </div>
          {config.readOnly ? (
            <details>
              <summary>جزئیات {config.singular} · ثبت توسط سازمان</summary>
              <ReadFields
                fields={config.fields.filter(
                  (f) => f.name !== "employee_feedback",
                )}
                record={record}
              />
              {config.id === "reviews" && (
                <div style={{ marginTop: 28 }}>
                  <EditorForm
                    fields={[
                      {
                        name: "employee_feedback",
                        label: "بازخورد من",
                        type: "textarea",
                      },
                    ]}
                    record={record}
                    action={saveReviewFeedback.bind(null, Number(record.id))}
                    formKey={`review-${record.id}`}
                    onDirty={onDirty}
                  />
                </div>
              )}
            </details>
          ) : (
            <details>
              <summary>مشاهده و ویرایش</summary>
              <EditorForm
                fields={config.fields}
                record={record}
                action={saveRecord.bind(null, config.id)}
                formKey={`${config.id}-${record.id}`}
                onDirty={onDirty}
              />
            </details>
          )}
        </article>
      ))}
      {adding && (
        <div className={s.record}>
          <div className={s.recordHeading}>
            <h3>{config.singular} جدید</h3>
            <button
              className={s.secondary}
              type="button"
              onClick={() => {
                if (confirm("از افزودن این مورد منصرف می‌شوید؟")) {
                  setAdding(false);
                  onDirty(addKey, false);
                }
              }}
            >
              انصراف
            </button>
          </div>
          <EditorForm
            fields={config.fields}
            action={saveRecord.bind(null, config.id)}
            formKey={addKey}
            onDirty={onDirty}
            onSuccess={() => {
              setAdding(false);
              setMessage({ ok: true, message: `${config.singular} اضافه شد.` });
            }}
          />
        </div>
      )}
    </section>
  );
}
function Security({ email, onDirty }: { email: string; onDirty: Dirty }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    async (previous: FormResult, data: FormData) => {
      try {
        const result = await changePassword(previous, data);
        if (result.ok) {
          formRef.current?.reset();
          onDirty("password", false);
        }
        return result;
      } catch {
        return { ok: false, message: "تغییر رمز انجام نشد. دوباره تلاش کنید." };
      }
    },
    initial,
  );
  return (
    <section className={`${s.glass} ${s.panel}`}>
      <div className={s.panelHeading}>
        <div>
          <h2>ورود و امنیت</h2>
          <p className={s.muted}>
            برای حساب خود یک رمز منحصر‌به‌فرد انتخاب کنید.
          </p>
        </div>
        <KeyRound size={22} />
      </div>
      <p className={s.muted}>ایمیل ورود سازمانی</p>
      <p dir="ltr" style={{ textAlign: "right", overflowWrap: "anywhere" }}>
        {email}
      </p>
      <p className={s.muted}>
        برای تغییر ایمیل سازمانی با مسئول سامانه هماهنگ کنید.
      </p>
      <div className={s.divider} />
      <form
        action={action}
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          startTransition(() => action(data));
        }}
        onChange={() => onDirty("password", true)}
        aria-busy={pending}
      >
        <fieldset disabled={pending}>
          <div className={s.formGrid}>
            {[
              {
                name: "current_password",
                label: "رمز فعلی",
                auto: "current-password",
              },
              { name: "password", label: "رمز تازه", auto: "new-password" },
              {
                name: "confirm_password",
                label: "تکرار رمز تازه",
                auto: "new-password",
              },
            ].map((field) => (
              <div className={s.field} key={field.name}>
                <label htmlFor={field.name}>{field.label}</label>
                <input
                  type="password"
                  name={field.name}
                  id={field.name}
                  required
                  dir="ltr"
                  autoComplete={field.auto}
                  minLength={field.name === "current_password" ? undefined : 12}
                  maxLength={72}
                />
              </div>
            ))}
          </div>
        </fieldset>
        <Result state={state} />
        <div className={s.formFooter}>
          <small>رمز تازه: حداقل ۱۲ کاراکتر</small>
          <button className={s.button} disabled={pending} aria-busy={pending}>
            {pending && <Loader size={18} decorative />}
            {pending ? "در حال تغییر رمز…" : "تغییر رمز عبور"}
          </button>
        </div>
      </form>
    </section>
  );
}
export function AccountWorkspace({
  employee,
  records,
  avatar,
  email,
  initialSection,
}: {
  employee: Employee;
  records: Record<string, EmployeeRecord[]>;
  avatar: string | null;
  email: string;
  initialSection: string;
}) {
  const [active, setActive] = useState(
    tabs.some((t) => t.id === initialSection) ? initialSection : "overview",
  );
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);
  const pickerTriggerRef = useRef<HTMLButtonElement>(null);
  const pickerCloseRef = useRef<HTMLButtonElement>(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const activeTab = tabs.find((tab) => tab.id === active) || tabs[0];
  const activeTabIndex = tabs.findIndex((tab) => tab.id === active);
  const progress = profileCompletion(
    employee as unknown as Record<string, unknown>,
  );
  const checklist = getProfileChecklist(
    employee as unknown as Record<string, unknown>,
  );
  const onDirty: Dirty = (key, value) =>
    setDirty((previous) => {
      const next = new Set(previous);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  useEffect(() => {
    if (!dirty.size) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest("a");
      if (
        link &&
        link.target !== "_blank" &&
        !link.getAttribute("href")?.startsWith("#") &&
        !confirm("تغییرات ذخیره‌نشده دارید. از این صفحه خارج می‌شوید؟")
      )
        event.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty.size]);
  function switchTab(id: string) {
    if (active === id) return true;
    if (dirty.size && !confirm("تغییرات ذخیره‌نشدهٔ این بخش کنار گذاشته شود؟"))
      return false;
    setDirty(new Set());
    setActive(id);
    window.history.pushState(
      null,
      "",
      `/account?section=${encodeURIComponent(id)}`,
    );
    return true;
  }
  useEffect(() => {
    const syncSection = () => {
      const section = new URLSearchParams(window.location.search).get(
        "section",
      );
      const next = tabs.some((tab) => tab.id === section)
        ? section!
        : "overview";
      if (next !== active) {
        if (
          dirty.size &&
          !confirm("تغییرات ذخیره‌نشدهٔ این بخش کنار گذاشته شود؟")
        ) {
          window.history.pushState(
            null,
            "",
            `/account?section=${encodeURIComponent(active)}`,
          );
          return;
        }
        setDirty(new Set());
        setActive(next);
      }
    };
    window.addEventListener("popstate", syncSection);
    return () => window.removeEventListener("popstate", syncSection);
  }, [active, dirty.size]);
  useEffect(() => {
    if (!sectionPickerOpen) return;
    const trigger = pickerTriggerRef.current;
    pickerCloseRef.current?.focus({ preventScroll: true });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSectionPickerOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = document.getElementById("mobile-section-picker");
      const focusable = Array.from(dialog?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ) || []).filter(element => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
    };
  }, [sectionPickerOpen]);
  const core = personalSections.find(
    (section) =>
      section.id === active ||
      (active === "finance" && section.id === "insurance"),
  );
  return (
    <>
      <header className={s.pageTitle} id="account-workspace">
        <div className={a.titleContent}>
          <p className={s.eyebrow}>فضای شخصی شما</p>
          <div className={a.titleRow}>
            <h1 className={s.heading}>حساب من</h1>
            {active !== "overview" && (
              <button
                type="button"
                className={a.backButton}
                aria-label="بازگشت به خلاصهٔ پرونده"
                title="بازگشت به خلاصهٔ پرونده"
                onClick={() => {
                  if (switchTab("overview"))
                    requestAnimationFrame(() =>
                      document.getElementById("account-panel")?.focus({ preventScroll: true }),
                    );
                }}
              >
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            )}
          </div>
          <p className={s.muted}>اطلاعات درست و به‌روز، شروع یک همکاری بهتر.</p>
        </div>
      </header>
    <div className={`${s.accountLayout} ${s.compactAccount} ${a.workspace}`}>
      {progress < 100 && <section
        className={`${s.glass} ${s.profileProgress} ${a.completion}`}
        aria-labelledby="profile-progress-title"
      >
        <div className={a.completionHeader}>
          <div className={a.completionCopy}>
            <h2 id="profile-progress-title">
              {progress === 100
                ? "اطلاعات پایه کامل است"
                : "تکمیل اطلاعات پایه"}
            </h2>
            <p className={s.muted}>
              {checklist
                .filter((item) => item.complete)
                .length.toLocaleString("fa-IR")}{" "}
              از {checklist.length.toLocaleString("fa-IR")} بخش اصلی تکمیل شده ·{" "}
              {progress.toLocaleString("fa-IR")}٪
            </p>
          </div>
          <button
            type="button"
            className={a.completionAction}
            onClick={() =>
              switchTab(
                checklist.find((item) => !item.complete)?.section || "identity",
              )
            }
          >
            {checklist.some((item) => !item.complete)
              ? "ادامهٔ تکمیل پرونده"
              : "مرور اطلاعات"}
          </button>
        </div>
        <progress
          className={s.profileProgressBar}
          value={progress}
          max={100}
          aria-label="درصد تکمیل اطلاعات پایه"
        />
        <ul className={s.profileProgressList}>
          {checklist.map((item) => (
            <li
              key={item.label}
              className={item.complete ? s.profileProgressDone : ""}
            >
              <span aria-hidden="true">{item.complete ? "✓" : "○"}</span>
              {item.label}
            </li>
          ))}
        </ul>
      </section>}
      {sectionPickerOpen && <div className={s.sectionPickerBackdrop} aria-hidden="true" onClick={() => setSectionPickerOpen(false)} />}
      <div
        className={`${s.accountNavigation} ${sectionPickerOpen ? s.accountNavigationOpen : ""}`}
        id="mobile-section-picker"
        role={sectionPickerOpen ? "dialog" : undefined}
        aria-modal={sectionPickerOpen ? true : undefined}
        aria-labelledby={sectionPickerOpen ? "mobile-section-picker-title" : undefined}
      >
        <nav
          className={`${s.glass} ${a.sectionNav}`}
          role="tablist"
          aria-label="بخش‌های حساب کاربری"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              role="tab"
              id={`account-tab-${id}`}
              aria-selected={active === id}
              tabIndex={active === id ? 0 : -1}
              aria-controls="account-panel"
              onKeyDown={(event) => {
                if (
                  ![
                    "ArrowLeft",
                    "ArrowRight",
                    "ArrowUp",
                    "ArrowDown",
                    "Home",
                    "End",
                  ].includes(event.key)
                )
                  return;
                event.preventDefault();
                const currentIndex = tabs.findIndex((tab) => tab.id === id);
                const forward =
                  event.key === "ArrowDown" || event.key === "ArrowLeft";
                const nextIndex =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? tabs.length - 1
                      : (currentIndex + (forward ? 1 : -1) + tabs.length) %
                        tabs.length;
                const nextId = tabs[nextIndex].id;
                if (switchTab(nextId)) {
                  requestAnimationFrame(() =>
                    document.getElementById(`account-tab-${nextId}`)?.focus(),
                  );
                }
              }}
              className={a.sectionButton}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        {sectionPickerOpen && (
          <section
            className={s.sectionPicker}
          >
            <div className={s.sectionPickerHeader}>
              <div>
                <p className={s.eyebrow}>پروندهٔ شخصی</p>
                <h2 id="mobile-section-picker-title">انتخاب بخش</h2>
              </div>
              <button
                ref={pickerCloseRef}
                type="button"
                className={s.sectionPickerClose}
                aria-label="بستن فهرست بخش‌ها"
                onClick={() => setSectionPickerOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className={s.sectionPickerList}>
              {tabs.map(({ id, label, hint, icon: Icon }, index) => (
                <button
                  key={id}
                  type="button"
                  className={`${s.sectionPickerOption} ${active === id ? s.sectionPickerOptionActive : ""}`}
                  aria-pressed={active === id}
                  onClick={() => {
                    if (switchTab(id)) setSectionPickerOpen(false);
                  }}
                >
                  <span
                    className={s.sectionPickerOptionIcon}
                    aria-hidden="true"
                  >
                    <Icon size={20} />
                  </span>
                  <span className={s.sectionPickerOptionText}>
                    <strong>{label}</strong>
                    <small>{hint}</small>
                  </span>
                  <small className={s.sectionPickerNumber}>
                    {(index + 1).toLocaleString("fa-IR")}
                  </small>
                  {active === id && (
                    <Check
                      size={19}
                      className={s.sectionPickerCheck}
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>
          </section>
        )}
        <button
          ref={pickerTriggerRef}
          id="account-mobile-current"
          type="button"
          className={s.mobileSectionTrigger}
          aria-haspopup="dialog"
          aria-expanded={sectionPickerOpen}
          aria-controls="mobile-section-picker"
          aria-label={sectionPickerOpen ? "بستن فهرست بخش‌ها" : "انتخاب بخش حساب کاربری"}
          onClick={() => setSectionPickerOpen(open => !open)}
        >
          <span className={s.mobileSectionIcon} aria-hidden="true">
            <activeTab.icon size={20} />
          </span>
          <span className={s.mobileSectionText}>
            <small>
              بخش {(activeTabIndex + 1).toLocaleString("fa-IR")} از {tabs.length.toLocaleString("fa-IR")}
            </small>
            <strong>{activeTab.label}</strong>
          </span>
          <ChevronDown size={19} aria-hidden="true" />
        </button>
      </div>
      <div
        className={`${s.stack} ${s.tabPanelAnimated}`}
        id="account-panel"
        role="tabpanel"
        aria-labelledby={`account-tab-${active}`}
        tabIndex={0}
        key={active}
      >
        {active === "overview" && (
          <>
            <section className={`${s.glass} ${a.summaryPanel}`} aria-labelledby="account-overview-title">
              <div className={a.summaryHeader}>
                <div className={a.person}>
                  <Avatar name={employee.full_name} src={avatar} gender={employee.gender} small />
                  <div><h2 id="account-overview-title">پرونده در یک نگاه</h2><p>{employee.full_name}</p></div>
                </div>
                <button type="button" className={a.editButton} onClick={() => switchTab("identity")}><Pencil size={14} />ویرایش مشخصات</button>
              </div>
              <dl className={a.summaryFields}>
                {[
                  { name: "mobile_phone", label: "شماره همراه", section: "contact", ltr: true },
                  { name: "personal_email", label: "ایمیل شخصی", section: "contact", ltr: true },
                  { name: "birth_date", label: "تاریخ تولد", section: "identity", date: true },
                  { name: "city", label: "شهر", section: "contact" },
                ].map(field => <div key={field.name}>
                  <dt>{field.label}</dt>
                  <dd>{employee[field.name as keyof Employee] ? <span dir={field.ltr ? "ltr" : undefined}>{field.date ? toPersianDate(String(employee[field.name as keyof Employee])) : String(employee[field.name as keyof Employee])}</span> : <button type="button" onClick={() => switchTab(field.section)} className={a.missingValue}><Plus size={12} />افزودن</button>}</dd>
                </div>)}
              </dl>
              <div className={a.summaryFooter}><UserRound size={14} /><span>اطلاعات شخصی را می‌توانید از بخش‌های کنار صفحه تکمیل کنید.</span></div>
            </section>
            <section className={`${s.glass} ${a.summaryPanel}`} aria-labelledby="employment-summary-title">
              <div className={a.summaryHeader}>
                <div><h2 id="employment-summary-title">اطلاعات همکاری</h2><p>ثبت و اصلاح توسط ادمین یا سرپرست</p></div>
                <button type="button" className={a.editButton} onClick={() => switchTab("employment")}>جزئیات پرونده<ArrowLeft size={14} /></button>
              </div>
              <dl className={a.summaryFields}>
                {[
                  { name: "employee_number", label: "کد پرسنلی" },
                  { name: "job_title", label: "عنوان شغلی" },
                  { name: "department", label: "واحد سازمانی" },
                  { name: "employment_status", label: "وضعیت همکاری" },
                ].map(field => <div key={field.name}><dt>{field.label}</dt><dd className={!employee[field.name as keyof Employee] ? a.emptyValue : undefined}>{String(employee[field.name as keyof Employee] || "هنوز ثبت نشده")}</dd></div>)}
              </dl>
            </section>
            <div className={a.quickLinks} aria-label="دسترسی سریع به پرونده">
              {[{id:"documents",label:"مدارک من",icon:Files},{id:"finance",label:"حساب بانکی و بیمه",icon:Landmark},{id:"career",label:"سوابق و مهارت‌ها",icon:GraduationCap}].map(item => <button type="button" key={item.id} onClick={() => switchTab(item.id)}><item.icon size={17} /><span>{item.label}</span><ArrowLeft size={14} /></button>)}
            </div>
          </>
        )}
        {active === "identity" && (
          <ProfilePhotoEditor employee={employee} avatar={avatar} onDirty={onDirty} />
        )}
        {core && (
          <section className={`${s.glass} ${s.panel}`}>
            <div className={s.panelHeading}>
              <div>
                <h2>{core.title}</h2>
                <p className={s.muted}>{core.description}</p>
              </div>
            </div>
            <EditorForm
              fields={core.fields}
              record={employee as unknown as EmployeeRecord}
              action={savePersonal.bind(null, core.id)}
              formKey={core.id}
              onDirty={onDirty}
            />
          </section>
        )}
        {active === "employment" && (
          <section className={`${s.glass} ${s.panel}`}>
            <div className={s.panelHeading}>
              <div>
                <h2>اطلاعات همکاری</h2>
                <p className={s.muted}>
                  این اطلاعات توسط سازمان ثبت می‌شود. برای اصلاح آن با منابع
                  انسانی هماهنگ کنید.
                </p>
              </div>
            </div>
            <ReadFields
              fields={organizationFields}
              record={employee as unknown as EmployeeRecord}
            />
          </section>
        )}
        {collections
          .filter((c) => c.group === active)
          .map((config) => (
            <CollectionPanel
              key={config.id}
              config={config}
              records={records[config.id] || []}
              onDirty={onDirty}
            />
          ))}
        {active === "security" && <Security email={email} onDirty={onDirty} />}
      </div>
    </div>
    </>
  );
}
