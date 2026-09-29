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
  Camera,
} from "lucide-react";
import {
  collections,
  personalSections,
  organizationFields,
  type Field,
  type Collection,
} from "@/lib/account-fields";
import { toPersianDate } from "@/lib/persian-date";
import {
  savePersonal,
  saveRecord,
  deleteRecord,
  saveAvatar,
  saveReviewFeedback,
  changePassword,
  type FormResult,
} from "@/actions/account";
import type { Employee, EmployeeRecord } from "@/types/employee";
import Loader from "@/components/ui/loader-4";
import { Avatar } from "./PortalShell";
import s from "./Portal.module.css";
const initial: FormResult = { ok: false, message: "" };
type Dirty = (key: string, value: boolean) => void;
type FormAction = (previous: FormResult, data: FormData) => Promise<FormResult>;
const tabs = [
  { id: "identity", label: "اطلاعات فردی", icon: UserRound },
  { id: "contact", label: "تماس و نشانی", icon: ContactRound },
  { id: "family", label: "خانواده و تماس اضطراری", icon: UsersRound },
  { id: "finance", label: "بانک و بیمه", icon: Landmark },
  { id: "career", label: "تحصیلات و مهارت‌ها", icon: GraduationCap },
  { id: "documents", label: "مدارک و گواهی‌ها", icon: Files },
  { id: "employment", label: "پروندهٔ همکاری", icon: BriefcaseBusiness },
  { id: "security", label: "ورود و امنیت", icon: KeyRound },
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
          {text && !options.includes(text) && (
            <option value={text}>{text}</option>
          )}
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
function EditorForm({
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
    <section className={`${s.glass} ${s.panel}`}>
      <div className={s.panelHeading}>
        <div>
          <h2>{config.title}</h2>
          <p className={s.muted}>{config.description}</p>
        </div>
        {!config.readOnly && !adding && (
          <button
            className={s.iconButton}
            aria-label={`افزودن ${config.singular}`}
            title={`افزودن ${config.singular}`}
            onClick={() => setAdding(true)}
          >
            <Plus size={19} />
          </button>
        )}
      </div>
      <Result state={message} />
      {records.length === 0 && !adding && (
        <div className={s.empty}>
          <FolderOpen size={26} />
          <p>هنوز {config.singular} ثبت نشده است.</p>
          {!config.readOnly && (
            <button className={s.secondary} onClick={() => setAdding(true)}>
              <Plus size={15} />
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
            <>
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
            </>
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
function AvatarPanel({
  employee,
  avatar,
  onDirty,
}: {
  employee: Employee;
  avatar: string | null;
  onDirty: Dirty;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    async (previous: FormResult, data: FormData) => {
      try {
        const file = data.get("photo");
        if (file instanceof File && file.size > 5 * 1024 * 1024)
          return { ok: false, message: "حداکثر حجم تصویر ۵ مگابایت است." };
        const result = await saveAvatar(previous, data);
        if (result.ok) {
          formRef.current?.reset();
          onDirty("avatar", false);
        }
        return result;
      } catch {
        return { ok: false, message: "بارگذاری انجام نشد. دوباره تلاش کنید." };
      }
    },
    initial,
  );
  return (
    <section className={`${s.glass} ${s.panel}`}>
      <div className={s.panelHeading}>
        <div>
          <h2>تصویر حساب</h2>
          <p className={s.muted}>با یک تصویر، حساب خود را شخصی‌تر کنید.</p>
        </div>
        <Camera size={21} />
      </div>
      <div className={s.avatarForm}>
        <Avatar name={employee.full_name} src={avatar} />
        <form
          action={action}
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            startTransition(() => action(data));
          }}
          onChange={() => onDirty("avatar", true)}
          aria-busy={pending}
        >
          <fieldset disabled={pending}>
            <div className={s.field}>
              <label htmlFor="account-photo">تصویر جدید</label>
              <input
                id="account-photo"
                name="photo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
              />
              <small>JPG، PNG یا WebP · حداکثر ۵ مگابایت</small>
            </div>
            {avatar && (
              <label className={s.checkbox}>
                <input type="checkbox" name="remove" />
                حذف تصویر فعلی
              </label>
            )}
          </fieldset>
          <Result state={state} />
          <div className={s.formFooter}>
            <button
              disabled={pending}
              className={s.secondary}
              aria-busy={pending}
            >
              {pending && <Loader size={18} decorative />}
              {pending ? "در حال ذخیرهٔ تصویر…" : "ذخیرهٔ تصویر"}
            </button>
          </div>
        </form>
      </div>
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
    tabs.some((t) => t.id === initialSection) ? initialSection : "identity",
  );
  const [dirty, setDirty] = useState<Set<string>>(new Set());
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
    if (active === id) return;
    if (dirty.size && !confirm("تغییرات ذخیره‌نشدهٔ این بخش کنار گذاشته شود؟"))
      return;
    setDirty(new Set());
    setActive(id);
  }
  const core = personalSections.find(
    (section) =>
      section.id === active ||
      (active === "finance" && section.id === "insurance"),
  );
  return (
    <div className={s.accountLayout}>
      <nav className={s.sideNav} aria-label="بخش‌های حساب کاربری">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchTab(id)}
            aria-current={active === id}
            aria-controls="account-panel"
            className={`${s.sideNavBtn} ${active === id ? s.sideNavBtnActive : ""}`}
          >
            <Icon size={17} className={s.sideNavIcon} />
            <span>{label}</span>
          </button>
        ))}
        <small>اطلاعات هر بخش را پس از ویرایش ذخیره کنید.</small>
      </nav>
      <div className={`${s.stack} ${s.tabPanelAnimated}`} id="account-panel" key={active}>
        {active === "identity" && (
          <AvatarPanel employee={employee} avatar={avatar} onDirty={onDirty} />
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
  );
}
