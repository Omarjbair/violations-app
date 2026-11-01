export interface ReceiptCitizen {
    national_id: string;
    first_name: string;
    father_name: string;
    last_name: string;
    phone?: string;
}

export interface ReceiptVehicle {
    plate_number: string;
    plate_code: string;
    plate_category?: string;
    make?: string;
    model?: string;
    color?: string;
}

export interface ReceiptViolationType {
    code: string;
    name: string;
}

export interface ReceiptViolation {
    violation_number: string;
    status: string;
    fine_amount: number;
    paid_amount: number;
    violation_date: Date | string;
    location?: string;
    citizen_id?: ReceiptCitizen;
    vehicle_id?: ReceiptVehicle;
    violation_type_id?: ReceiptViolationType;
}

export interface ReceiptPayment {
    receipt_number: string;
    amount: number;
    status: string;
    paid_at: Date | string;
    notes?: string;
    violation_id: ReceiptViolation;
    currency_id: { code: string; name: string };
    branch_id: { code: string; name: string; phone?: string };
    accountant_id?: {
        username: string;
        first_name?: string;
        last_name?: string;
    };
}

function escapeHtml(value: string | null | undefined): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatMoney(value: number): string {
    return Number(value ?? 0).toFixed(2);
}

function formatDate(value: Date | string | undefined): string {
    if (!value) return '-';

    try {
        return new Intl.DateTimeFormat('ar-SY', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(value));
    } catch {
        return new Date(value).toISOString();
    }
}

function fullName(person?: {
    first_name?: string;
    father_name?: string;
    last_name?: string;
}): string {
    if (!person) return '-';

    return [person.first_name, person.father_name, person.last_name]
        .filter(Boolean)
        .join(' ');
}

export function renderPaymentReceipt(payment: ReceiptPayment): string {
    const violation = payment.violation_id;
    const citizen = violation.citizen_id;
    const vehicle = violation.vehicle_id;
    const violationType = violation.violation_type_id;
    const accountant = payment.accountant_id;
    const remaining = Math.max(
        Number(violation.fine_amount) - Number(violation.paid_amount),
        0,
    );
    const vehicleLabel = vehicle
        ? `${escapeHtml(vehicle.plate_number)} - ${escapeHtml(vehicle.plate_code)}${
              vehicle.plate_category
                  ? ` (${escapeHtml(vehicle.plate_category)})`
                  : ''
          }`
        : '-';

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>إيصال دفع ${escapeHtml(payment.receipt_number)}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 32px;
            background: #f3f4f6;
            color: #111827;
            font-family: "Segoe UI", Tahoma, Arial, sans-serif;
        }
        .receipt {
            max-width: 820px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 32px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            border-bottom: 2px solid #111827;
            padding-bottom: 20px;
            margin-bottom: 24px;
        }
        .header h1 { margin: 0 0 6px; font-size: 24px; }
        .header p { margin: 0; color: #4b5563; font-size: 14px; }
        .receipt-number {
            text-align: left;
            font-size: 14px;
            line-height: 1.8;
        }
        .receipt-number strong { display: block; font-size: 18px; }
        .status {
            display: inline-block;
            margin-top: 6px;
            padding: 2px 10px;
            border-radius: 999px;
            background: #dcfce7;
            color: #166534;
            font-size: 12px;
            font-weight: 600;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px 24px;
            margin-bottom: 24px;
        }
        .field { padding: 12px 14px; background: #f9fafb; border-radius: 8px; }
        .field span {
            display: block;
            color: #6b7280;
            font-size: 12px;
            margin-bottom: 4px;
        }
        .field strong { font-size: 15px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th, td { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; text-align: right; }
        th { background: #f3f4f6; font-size: 13px; color: #374151; }
        .total { font-size: 18px; font-weight: 700; color: #065f46; }
        .notes {
            padding: 14px;
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 8px;
            font-size: 14px;
            margin-bottom: 24px;
        }
        .footer {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            border-top: 1px dashed #9ca3af;
            padding-top: 24px;
            margin-top: 32px;
            color: #6b7280;
            font-size: 13px;
        }
        .signature { text-align: center; min-width: 180px; }
        .signature-line {
            margin-top: 40px;
            border-top: 1px solid #9ca3af;
            padding-top: 8px;
        }
        .print-button {
            display: block;
            margin: 24px auto 0;
            padding: 10px 28px;
            border: 0;
            border-radius: 8px;
            background: #111827;
            color: #ffffff;
            font-size: 15px;
            cursor: pointer;
        }
        @media print {
            body { padding: 0; background: #ffffff; }
            .receipt { border: 0; border-radius: 0; padding: 16px; }
            .print-button { display: none; }
        }
        @media (max-width: 640px) {
            body { padding: 12px; }
            .receipt { padding: 18px; }
            .header { flex-direction: column; }
            .receipt-number { text-align: right; }
            .grid { grid-template-columns: 1fr; }
            .footer { flex-direction: column; }
        }
    </style>
</head>
<body>
    <main class="receipt">
        <header class="header">
            <div>
                <h1>نظام إدارة المخالفات المرورية</h1>
                <p>إيصال دفع مخالفة</p>
                <p>الفرع: ${escapeHtml(payment.branch_id.name)} (${escapeHtml(
                    payment.branch_id.code,
                )})</p>
            </div>
            <div class="receipt-number">
                <span>رقم الإيصال</span>
                <strong>${escapeHtml(payment.receipt_number)}</strong>
                <span class="status">${escapeHtml(payment.status)}</span>
            </div>
        </header>

        <section class="grid">
            <div class="field">
                <span>اسم المواطن</span>
                <strong>${escapeHtml(fullName(citizen))}</strong>
            </div>
            <div class="field">
                <span>الرقم الوطني</span>
                <strong>${escapeHtml(citizen?.national_id)}</strong>
            </div>
            <div class="field">
                <span>رقم المركبة</span>
                <strong>${vehicleLabel}</strong>
            </div>
            <div class="field">
                <span>نوع المخالفة</span>
                <strong>${escapeHtml(violationType?.name)} ${
                    violationType?.code
                        ? `(${escapeHtml(violationType.code)})`
                        : ''
                }</strong>
            </div>
            <div class="field">
                <span>رقم المخالفة</span>
                <strong>${escapeHtml(violation.violation_number)}</strong>
            </div>
            <div class="field">
                <span>تاريخ المخالفة</span>
                <strong>${escapeHtml(formatDate(violation.violation_date))}</strong>
            </div>
            <div class="field">
                <span>موقع المخالفة</span>
                <strong>${escapeHtml(violation.location ?? '-')}</strong>
            </div>
            <div class="field">
                <span>تاريخ الدفع</span>
                <strong>${escapeHtml(formatDate(payment.paid_at))}</strong>
            </div>
            <div class="field">
                <span>أمين الصندوق</span>
                <strong>${escapeHtml(
                    fullName(accountant) || accountant?.username,
                )}</strong>
            </div>
            <div class="field">
                <span>هاتف الفرع</span>
                <strong>${escapeHtml(payment.branch_id.phone ?? '-')}</strong>
            </div>
        </section>

        <table>
            <thead>
                <tr>
                    <th>البيان</th>
                    <th>المبلغ</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>قيمة المخالفة</td>
                    <td>${formatMoney(violation.fine_amount)} ${escapeHtml(
                        payment.currency_id.code,
                    )}</td>
                </tr>
                <tr>
                    <td>إجمالي المدفوع للمخالفة</td>
                    <td>${formatMoney(violation.paid_amount)} ${escapeHtml(
                        payment.currency_id.code,
                    )}</td>
                </tr>
                <tr>
                    <td>المبلغ المدفوع بهذا الإيصال</td>
                    <td class="total">${formatMoney(payment.amount)} ${escapeHtml(
                        payment.currency_id.code,
                    )}</td>
                </tr>
                <tr>
                    <td>المبلغ المتبقي</td>
                    <td>${formatMoney(remaining)} ${escapeHtml(
                        payment.currency_id.code,
                    )}</td>
                </tr>
            </tbody>
        </table>

        ${
            payment.notes
                ? `<div class="notes"><strong>ملاحظات:</strong> ${escapeHtml(
                      payment.notes,
                  )}</div>`
                : ''
        }

        <footer class="footer">
            <div>
                <p>هذا الإيصال صادر إلكترونياً عن نظام إدارة المخالفات المرورية.</p>
                <p>العملة: ${escapeHtml(payment.currency_id.name)} (${escapeHtml(
                    payment.currency_id.code,
                )})</p>
            </div>
            <div class="signature">
                <div class="signature-line">توقيع أمين الصندوق</div>
            </div>
        </footer>

        <button class="print-button" type="button" onclick="window.print()">طباعة الإيصال</button>
    </main>
</body>
</html>`;
}
