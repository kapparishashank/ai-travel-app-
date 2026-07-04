alter table public.settlements
  add column if not exists upi_payment_link text;

comment on column public.settlements.upi_payment_link is
  'Optional UPI deep link prepared for a user-confirmed external settlement. This does not verify payment completion.';
