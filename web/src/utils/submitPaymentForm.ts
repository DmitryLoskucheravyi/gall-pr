import type { PaymentForm } from '../types/order.types';

export function submitPaymentForm(paymentForm: NonNullable<PaymentForm>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paymentForm.actionUrl;
  form.style.display = 'none';

  for (const [name, value] of Object.entries(paymentForm.fields)) {
    const values = Array.isArray(value) ? value : [value];

    for (const item of values) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = item;
      form.appendChild(input);
    }
  }

  document.body.appendChild(form);
  form.submit();
}
