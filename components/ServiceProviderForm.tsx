"use client";

import { FormEvent } from "react";

type ServiceProviderFormProps = {
  providerName: string;
  setProviderName: (value: string) => void;
  companyName: string;
  setCompanyName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  serviceType: string;
  setServiceType: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  loading: boolean;
  onSubmit: () => void;
};

export default function ServiceProviderForm({
  providerName,
  setProviderName,
  companyName,
  setCompanyName,
  email,
  setEmail,
  phone,
  setPhone,
  serviceType,
  setServiceType,
  notes,
  setNotes,
  loading,
  onSubmit,
}: ServiceProviderFormProps) {
  const isDisabled =
    loading || providerName.trim().length === 0 || serviceType.trim().length === 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-900">Add Service Provider</h2>

      <div className="space-y-1">
        <label htmlFor="providerName" className="block text-sm font-medium text-slate-700">
          Provider name
        </label>
        <input
          id="providerName"
          type="text"
          value={providerName}
          onChange={(event) => setProviderName(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="companyName" className="block text-sm font-medium text-slate-700">
          Company name
        </label>
        <input
          id="companyName"
          type="text"
          placeholder="Optional"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="Optional"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
          Phone
        </label>
        <input
          id="phone"
          type="tel"
          placeholder="Optional"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="serviceType" className="block text-sm font-medium text-slate-700">
          Service type
        </label>
        <select
          id="serviceType"
          value={serviceType}
          onChange={(event) => setServiceType(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
        >
          <option value="">Select service type</option>
          <option value="cleaner">Cleaner</option>
          <option value="handyman">Handyman</option>
          <option value="restock">Restock</option>
          <option value="inspector">Inspector</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
          Notes
        </label>
        <textarea
          id="notes"
          placeholder="Optional"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
        />
      </div>

      <button
        type="submit"
        disabled={isDisabled}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save provider"}
      </button>
    </form>
  );
}
