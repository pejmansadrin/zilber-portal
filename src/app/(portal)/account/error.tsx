"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="m-auto max-w-lg p-8 text-center">
      <h1 className="text-xl font-bold">دریافت اطلاعات انجام نشد</h1>
      <p className="my-4 leading-8">اتصال را بررسی کنید و دوباره تلاش کنید.</p>
      <button
        onClick={reset}
        className="rounded-xl bg-blue-900 px-6 py-3 text-white"
      >
        تلاش دوباره
      </button>
    </div>
  );
}
