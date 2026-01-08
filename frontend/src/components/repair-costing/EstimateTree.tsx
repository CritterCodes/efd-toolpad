import React from 'react';

type EstimateTreeProps = {
  onAddLineItem?: () => void;
  onAddProcess?: (lineItemId: string) => void;
  onAddStep?: (processId: string) => void;
};

export default function EstimateTree(_props: EstimateTreeProps): JSX.Element {
  return <div aria-label="Estimate Tree" />;
}


