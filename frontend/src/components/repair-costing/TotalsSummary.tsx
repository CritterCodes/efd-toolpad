import React from 'react';

type Totals = {
  subtotal?: number;
  discountAmount?: number;
  taxableBase?: number;
  taxAmount?: number;
  total?: number;
  amountDue?: number;
};

type TotalsSummaryProps = {
  totals?: Totals;
};

export default function TotalsSummary({ totals }: TotalsSummaryProps): JSX.Element {
  return (
    <div aria-label="Totals Summary">
      <pre>{JSON.stringify(totals ?? {}, null, 2)}</pre>
    </div>
  );
}


