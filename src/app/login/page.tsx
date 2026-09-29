'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CircleHelp,
  Eye,
  EyeOff,
  Headphones,
  Info,
  LockKeyhole,
  Mail,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCloudConfig } from '@/lib/supabase/config';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { UtilityButton } from '@/components/ui/UtilityButton';
import Loader from '@/components/ui/loader-4';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const pending = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Smooth modal mount & unmount state management
  const [forgotModalMounted, setForgotModalMounted] = useState(false);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const configured = Boolean(getCloudConfig());

  const openForgotModal = () => {
    setForgotModalMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setForgotModalVisible(true);
      });
    });
  };

  const closeForgotModal = () => {
    setForgotModalVisible(false);
    setTimeout(() => {
      setForgotModalMounted(false);
    }, 220);
  };

  // Close forgot password modal on Escape
  useEffect(() => {
    if (!forgotModalMounted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeForgotModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [forgotModalMounted]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !configured) return;
    pending.current = true;
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await createClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        const messages: Record<string, string> = {
          invalid_credentials: 'ایمیل یا رمز عبور اشتباه است.',
          email_not_confirmed: 'ایمیل حساب کاربری هنوز تأیید نشده است.',
          user_banned: 'حساب کاربری مسدود است. لطفاً با منابع انسانی تماس بگیرید.',
          over_request_rate_limit: 'تعداد تلاش‌های ناموفق بیش از حد مجاز است. کمی بعد مجدداً تلاش کنید.',
        };
        setError(messages[authError.code || ''] || 'ورود ناموفق بود. لطفاً دوباره تلاش کنید.');
        return;
      }

      if (!data.session) {
        setError('نشست ورود ایجاد نشد. لطفاً صفحه را مجدداً بارگذاری کنید.');
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('خطا در برقراری ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.');
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  const isEmailFloating = emailFocused || email.length > 0;
  const isPasswordFloating = passwordFocused || password.length > 0;

  return (
    <main className={styles.page}>
      {/* Pure background images with smooth theme cross-fade (zero overlay effects, unoptimized for full AVIF fidelity) */}
      <div className={styles.bgLayerLight} aria-hidden="true">
        <Image
          src="/images/bg-light.avif"
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className={styles.bgImage}
        />
      </div>

      <div className={styles.bgLayerDark} aria-hidden="true">
        <Image
          src="/images/bg-dark.avif"
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className={styles.bgImage}
        />
      </div>

      {/* Main Card with Refined Glassmorphism & High Backdrop Blur */}
      <div className={styles.formPanel}>
        <div className={styles.card}>
          {/* Brand & Heading */}
          <div className={styles.brand}>
            <div className={styles.brandBadge}>
              <Image
                src="/images/zilber-logo.svg"
                alt="لوگوی شرکت زیلبر"
                width={46}
                height={46}
                priority
                className={styles.logoImage}
              />
              <div className={styles.brandTitleWrap}>
                <span className={styles.brandName}>زیلبر</span>
                <span className={styles.brandSub}>پورتال سازمانی</span>
              </div>
            </div>
          </div>

          <div>
            <h1 className={styles.title}>ورود به حساب کاربری</h1>
            <p className={styles.subtitle}>جهت دسترسی به سامانه، مشخصات خود را وارد کنید.</p>
          </div>

          {!configured && (
            <div className={styles.notice} role="status">
              <Info size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
              <span>پیکربندی سامانه احراز هویت تکمیل نشده است. با مدیر سیستم تماس بگیرید.</span>
            </div>
          )}

          <form onSubmit={login} aria-busy={loading} noValidate>
            <fieldset disabled={loading || !configured} className={styles.fields}>
              {/* Email with Floating Label */}
              <div className={styles.floatingField}>
                <div
                  className={`${styles.inputWrap} ${
                    emailFocused ? styles.inputWrapFocused : ''
                  }`}
                >
                  <Mail
                    size={17}
                    className={`${styles.fieldIcon} ${
                      emailFocused ? styles.fieldIconFocused : ''
                    }`}
                    aria-hidden="true"
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    dir="ltr"
                    required
                    value={email}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.textInput}
                  />
                  <label
                    htmlFor="email"
                    className={`${styles.floatingLabel} ${
                      isEmailFloating ? styles.floatingLabelActive : ''
                    }`}
                  >
                    ایمیل سازمانی
                  </label>
                </div>
              </div>

              {/* Password with Floating Label */}
              <div className={styles.floatingField}>
                <div
                  className={`${styles.inputWrap} ${
                    passwordFocused ? styles.inputWrapFocused : ''
                  }`}
                >
                  <LockKeyhole
                    size={17}
                    className={`${styles.fieldIcon} ${
                      passwordFocused ? styles.fieldIconFocused : ''
                    }`}
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    name="password"
                    type={visible ? 'text' : 'password'}
                    autoComplete="current-password"
                    dir="ltr"
                    required
                    value={password}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-describedby={error ? 'login-error' : undefined}
                    className={styles.textInput}
                  />
                  <label
                    htmlFor="password"
                    className={`${styles.floatingLabel} ${
                      isPasswordFloating ? styles.floatingLabelActive : ''
                    }`}
                  >
                    رمز عبور
                  </label>

                  {/* Password Reveal Button with Smooth Scale & Rotate Animation */}
                  <button
                    className={styles.reveal}
                    type="button"
                    onClick={() => setVisible(!visible)}
                    aria-label={visible ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
                    aria-pressed={visible}
                  >
                    <div className={styles.revealIconWrap}>
                      <Eye
                        size={17}
                        className={`${styles.eyeIcon} ${
                          visible ? styles.eyeIconHidden : styles.eyeIconVisible
                        }`}
                        aria-hidden="true"
                      />
                      <EyeOff
                        size={17}
                        className={`${styles.eyeIcon} ${
                          visible ? styles.eyeIconVisible : styles.eyeIconHidden
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                </div>

                {/* Centered Forgot Password Button directly under password input */}
                <div className={styles.forgotRow}>
                  <button
                    type="button"
                    className={styles.forgotBtn}
                    onClick={openForgotModal}
                  >
                    فراموشی رمز عبور؟
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className={styles.error} id="login-error" role="alert">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button (Zero Jump, Thin Halo on Click) */}
              <button className={styles.submit} type="submit" aria-busy={loading}>
                {loading ? (
                  <>
                    <Loader size={18} decorative />
                    <span>در حال ورود...</span>
                  </>
                ) : (
                  <>
                    <span>ورود به سامانه</span>
                    <ArrowLeft className={styles.arrowIcon} size={17} aria-hidden="true" />
                  </>
                )}
              </button>
            </fieldset>
          </form>

          {/* Bottom Center Monocolor Controls without Dot - Unified Component */}
          <div className={styles.cardFooter}>
            <ThemeToggle />
            <UtilityButton
              as="a"
              href="mailto:support@zilber.tech"
              title="ارتباط با پشتیبانی (support@zilber.tech)"
              aria-label="پشتیبانی شرکت زیلبر"
            >
              <Headphones size={16} strokeWidth={2} className="text-current" aria-hidden="true" />
            </UtilityButton>
          </div>
        </div>
      </div>

      {/* Full-Page Blur Modal for Forgot Password with Smooth Open & Close Transitions */}
      {forgotModalMounted && (
        <div
          className={`${styles.fullPageModalBackdrop} ${
            forgotModalVisible ? styles.fullPageModalBackdropActive : ''
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeForgotModal();
          }}
        >
          <div
            className={`${styles.modalCard} ${
              forgotModalVisible ? styles.modalCardActive : ''
            }`}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleRow}>
                <div className={styles.modalIconWrap}>
                  <CircleHelp size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h2 id="forgot-modal-title" className={styles.modalTitle}>
                  بازیابی رمز عبور
                </h2>
              </div>
              <button
                type="button"
                onClick={closeForgotModal}
                className={styles.modalCloseBtn}
                aria-label="بستن پنجره"
              >
                <X size={16} />
              </button>
            </div>

            {/* Explanation Text */}
            <p className={styles.modalDescription}>
              برای بازیابی یا تنظیم مجدد رمز عبور حساب کاربری خود، لطفاً از طریق دکمهٔ زیر با واحد پشتیبانی شرکت زیلبر در ارتباط باشید تا راهنمایی و صدور رمز موقت برای شما انجام شود.
            </p>

            {/* Support Connect Button */}
            <a
              href="mailto:support@zilber.tech?subject=درخواست%20بازیابی%20رمز%20عبور%20پورتال%20زیلبر"
              className={styles.modalSupportBtn}
            >
              <Mail size={16} aria-hidden="true" />
              <span>ارتباط با پشتیبانی (support@zilber.tech)</span>
            </a>
          </div>
        </div>
      )}

      {/* Full-Screen Blur Overlay when logging in - keeps the current login page visible underneath and blurred */}
      {loading && (
        <div className={styles.loadingOverlay} role="status" aria-live="polite">
          <Loader size={60} decorative />
        </div>
      )}
    </main>
  );
}
