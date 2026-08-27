import { useEffect, useState } from 'react';
import { Wallet, Receipt, Download, CreditCard } from 'lucide-react';
import { Payment, Member } from '../../types';
import { fetchPayments } from '../../memberApi';
import { BRAND, DEFAULTS } from '../../config';
import { Card, Stat, SectionHeader, Loading, EmptyState, Button, fmtDate, fmtMoney } from './ui';

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', upi: 'UPI', card: 'Card', bank: 'Bank Transfer',
};

/**
 * Opens a print-ready invoice in a new window. Using the browser's own
 * print-to-PDF avoids shipping a PDF library to every visitor, and the
 * "Save as PDF" destination produces a proper file on every modern browser.
 */
function printInvoice(p: Payment, member: Member) {
  const win = window.open('', '_blank', 'width=820,height=900');
  if (!win) {
    alert('Please allow pop-ups for this site to download your invoice.');
    return;
  }
  const esc = (s: unknown) =>
    String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

  const period = p.periodFrom && p.periodTo
    ? `${fmtDate(p.periodFrom)} — ${fmtDate(p.periodTo)}`
    : '—';

  win.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>Invoice ${esc(p.invoiceNo)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;padding:48px;max-width:800px;margin:0 auto;font-size:14px;line-height:1.6}
  .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #FF003C;padding-bottom:24px;margin-bottom:32px}
  .brand{font-size:26px;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:-1px}
  .brand span{color:#FF003C}
  .muted{color:#666;font-size:12px;margin-top:6px}
  .tag{text-align:right}
  .tag h2{font-size:13px;text-transform:uppercase;letter-spacing:3px;color:#666;font-weight:700}
  .tag .no{font-size:19px;font-weight:800;margin-top:4px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px}
  .label{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#999;font-weight:700;margin-bottom:6px}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#999;padding:12px 0;border-bottom:2px solid #eee}
  td{padding:16px 0;border-bottom:1px solid #f0f0f0}
  .right{text-align:right}
  .total{display:flex;justify-content:flex-end;gap:48px;padding:20px 0;border-top:2px solid #111;font-weight:800;font-size:18px}
  .paid{display:inline-block;background:#e8f7ee;color:#1a7f42;padding:6px 16px;border-radius:99px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px}
  footer{margin-top:48px;padding-top:24px;border-top:1px solid #eee;color:#999;font-size:11px;text-align:center}
  @media print{body{padding:24px}.noprint{display:none}}
  .noprint{margin-bottom:32px;text-align:center}
  button{background:#FF003C;color:#fff;border:0;padding:12px 28px;border-radius:99px;font-weight:800;text-transform:uppercase;letter-spacing:2px;font-size:11px;cursor:pointer}
</style></head><body>
<div class="noprint"><button onclick="window.print()">Print / Save as PDF</button></div>
<div class="top">
  <div>
    <div class="brand">${esc(BRAND.first)} <span>${esc(BRAND.accent)}</span></div>
    <div class="muted">${esc(DEFAULTS.address)}</div>
    <div class="muted">+${esc(DEFAULTS.callNumber)}</div>
  </div>
  <div class="tag">
    <h2>Invoice</h2>
    <div class="no">${esc(p.invoiceNo)}</div>
    <div class="muted">${esc(fmtDate(p.date))}</div>
  </div>
</div>
<div class="grid">
  <div>
    <div class="label">Billed To</div>
    <div style="font-weight:700">${esc(member.name)}</div>
    <div class="muted">+${esc(member.phone)}</div>
    ${member.email ? `<div class="muted">${esc(member.email)}</div>` : ''}
  </div>
  <div>
    <div class="label">Payment Method</div>
    <div style="font-weight:700">${esc(METHOD_LABEL[p.method] || p.method)}</div>
    <div style="margin-top:12px"><span class="paid">Paid</span></div>
  </div>
</div>
<table>
  <thead><tr><th>Description</th><th>Period</th><th class="right">Amount</th></tr></thead>
  <tbody><tr>
    <td><strong>${esc(p.planName || 'Gym Membership')}</strong><br><span class="muted">Membership fee</span></td>
    <td>${esc(period)}</td>
    <td class="right"><strong>${esc(fmtMoney(p.amount))}</strong></td>
  </tr></tbody>
</table>
<div class="total"><span>Total Paid</span><span>${esc(fmtMoney(p.amount))}</span></div>
<footer>This is a computer-generated receipt and does not require a signature.<br>${esc(BRAND.full)} — ${esc(BRAND.city)}</footer>
</body></html>`);
  win.document.close();
}

export default function Payments({ member }: { member: Member }) {
  const [rows, setRows] = useState<Payment[] | null>(null);

  useEffect(() => {
    fetchPayments().then(setRows).catch(() => setRows([]));
  }, []);

  if (rows === null) return <Loading label="Loading payments" />;

  const total = rows.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const thisYear = rows
    .filter((p) => new Date(p.date).getFullYear() === new Date().getFullYear())
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  return (
    <div>
      <SectionHeader
        title="Payments &"
        accent="Invoices"
        subtitle="Download a receipt for any payment"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <Stat icon={Wallet} label="Total Paid" value={fmtMoney(total)} sub="all time" tone="accent" />
        <Stat icon={CreditCard} label="This Year" value={fmtMoney(thisYear)} sub={String(new Date().getFullYear())} delay={0.05} />
        <Stat icon={Receipt} label="Payments" value={rows.length} sub="on record" delay={0.1} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No payments recorded"
          message="Once the gym records a payment against your account, the receipt will appear here and you'll be able to download it as a PDF."
        />
      ) : (
        <Card className="overflow-hidden">
          {/* Desktop table */}
          <table className="w-full text-left hidden md:table">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                {['Invoice', 'Date', 'Plan', 'Method', 'Amount', ''].map((h) => (
                  <th key={h} className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-5 font-mono text-xs text-[#FF003C] font-bold">{p.invoiceNo}</td>
                  <td className="px-6 py-5 text-sm text-white/70">{fmtDate(p.date)}</td>
                  <td className="px-6 py-5 text-sm font-bold">{p.planName || '—'}</td>
                  <td className="px-6 py-5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50 bg-white/5 px-3 py-1 rounded-full">
                      {METHOD_LABEL[p.method] || p.method}
                    </span>
                  </td>
                  <td className="px-6 py-5 font-black italic text-lg tabular-nums">{fmtMoney(p.amount)}</td>
                  <td className="px-6 py-5">
                    <button
                      onClick={() => printInvoice(p, member)}
                      aria-label={`Download invoice ${p.invoiceNo}`}
                      className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#FF003C] transition-colors"
                    >
                      <Download className="w-4 h-4" /> Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <ul className="md:hidden divide-y divide-white/5">
            {rows.map((p) => (
              <li key={p.id} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-mono text-[11px] text-[#FF003C] font-bold">{p.invoiceNo}</div>
                    <div className="text-sm font-bold mt-1">{p.planName || 'Membership'}</div>
                    <div className="text-xs text-white/40 mt-1">{fmtDate(p.date)}</div>
                  </div>
                  <div className="text-xl font-black italic tabular-nums">{fmtMoney(p.amount)}</div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    {METHOD_LABEL[p.method] || p.method}
                  </span>
                  <button
                    onClick={() => printInvoice(p, member)}
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50"
                  >
                    <Download className="w-4 h-4" /> Invoice
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
