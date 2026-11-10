// @vitest-environment jsdom
/**
 * The two steps of the new-repair flow that say what smart intake did. These render for real, so a mistake in the
 * markup fails here instead of at the counter (the round that added them could not open the screens in a browser).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewRepairFlowPiece } from './NewRepairFlowPiece';
import { NewRepairFlowWork, stockCheckMessage } from './NewRepairFlowWork';

vi.mock('@/app/components/repairs/SmartIntakeMic', () => ({ default: () => null }));
vi.mock('@/components/shared/CameraCapture', () => ({ default: () => null }));
// Review imports the total card from the classic form; the checks are what is under test here.
vi.mock('@/app/components/repairs/NewRepairForm', () => ({ TotalCostCard: () => null }));
vi.mock('@/app/components/repairs/PromiseDateSuggestion', () => ({ default: () => null }));

const formData = {
  smartIntakeInput: '14k ring going from 5 to 7', description: '', metalType: 'gold', karat: '14k', goldColor: 'yellow', isRing: true,
  currentRingSize: '5', desiredRingSize: '7', isWholesale: false, customLineItems: [],
  tasks: [
    { id: 1, _id: 'up3', title: 'Size up (1 size) - up to 3mm x 2 mm shank', quantity: 1, price: 60, __aiQuantity: 1, _smartIntakeRuled: 'the ring changes size' },
    { id: 2, _id: 'retip', title: 'Retip prongs', quantity: 4, price: 20, __aiQuantity: 4 },
  ],
  materials: [{ id: 3, _id: 's32', name: '3x2 mm Flat Sizing Stock', category: 'sizing_material', quantity: 1, price: 36.98, _smartIntakeHintType: 'sizing_material' }],
};
const noop = () => {};

describe('the Piece step', () => {
  const piece = (over = {}) => render(
    <NewRepairFlowPiece
      step={1} formData={formData} setFormData={noop} setStep={noop} setSmartIntakeError={noop} setImageDescriptionError={noop}
      appendDictated={noop} onDictationStatus={noop} handleAnalyzeSmartIntake={noop} handleGenerateDescriptionFromImage={noop}
      dictation={{ listening: false, interim: '', error: '' }} analyzingSmartIntake={false} generatingImageDescription={false}
      smartIntakeError="" imageDescriptionError="" picturePreviewUrl="" clientPill={null}
      extractedChips={[{ label: '14k' }, { label: 'yellow gold', assumed: true }, { label: '5 → 7' }]}
      smartIntakeNotes={{ warnings: ['Added "Rhodium Plating": white gold.', '2 pieces: each task and material is counted 2 times.'], assumed: { goldColor: true }, fallback: false }}
      {...over}
    />,
  );

  it('shows what the rulings did, and marks a default as assumed rather than ticked', () => {
    piece();
    expect(screen.getByText('Added "Rhodium Plating": white gold.')).toBeTruthy();
    expect(screen.getByText('2 pieces: each task and material is counted 2 times.')).toBeTruthy();
    expect(screen.getByText('yellow gold (assumed)')).toBeTruthy();
    expect(screen.getByLabelText('yellow gold was assumed, not said. Edit it on the review step')).toBeTruthy();
    expect(screen.getByLabelText('Edit 14k on the review step')).toBeTruthy();
  });

  it('renders with no notes at all (the classic callers pass none)', () => {
    piece({ smartIntakeNotes: undefined, extractedChips: [] });
    expect(screen.getByLabelText('Analyze the sentence')).toBeTruthy();
  });
});

describe('the Work step', () => {
  const work = (over = {}) => {
    const updateItem = vi.fn();
    const removeItem = vi.fn();
    render(
      <NewRepairFlowWork
        step={2} formData={formData} itemCount={3} itemsSubtotal={176.98} canRequestQuote={false} quoteIntent={false}
        patchCustomLaborTask={noop} setAddSheet={noop} setQuoteIntent={noop} setStep={noop}
        updateItem={updateItem} removeItem={removeItem} smartIntakeNotes={{ warnings: [], assumed: {}, fallback: false }} stockCheck={null}
        checks={[]} applyCheck={noop}
        {...over}
      />,
    );
    return { updateItem, removeItem };
  };

  it('a line the rulings added says so; a line that was asked for keeps its tick', () => {
    work();
    expect(screen.getByText('added by rule: the ring changes size')).toBeTruthy();
    expect(screen.getAllByText('from your sentence')).toHaveLength(2); // the retip and the stock
  });

  it('stock that no longer matches the sizes is said, with a one-tap fix', () => {
    const stockCheck = { want: 3, have: 1, moved: 4, line: formData.materials[0], lineQuantity: 3 };
    const { updateItem } = work({ stockCheck });
    expect(screen.getByText(stockCheckMessage(stockCheck))).toBeTruthy();
    fireEvent.click(screen.getByText('Make it 3'));
    expect(updateItem).toHaveBeenCalledWith('materials', 3, 'quantity', 3);
  });

  it('stock that should not be there can be removed; stock that is missing says where to add it', () => {
    const { removeItem } = work({ stockCheck: { want: 0, have: 1, moved: 1, line: formData.materials[0], lineQuantity: 0 } });
    fireEvent.click(screen.getByText('Remove it'));
    expect(removeItem).toHaveBeenCalledWith('materials', 3);
    expect(stockCheckMessage({ want: 2, have: 0, moved: 3 })).toBe('Sizing up 3 sizes needs 2 sizing stock. This ticket has 0.');
    expect(stockCheckMessage({ want: 0, have: 1, moved: 1 })).toBe('Sizing up 1 size needs no sizing stock. This ticket has 1.');
  });

  it('when the AI was down and nothing is on the ticket, the Work step says so', () => {
    work({ formData: { ...formData, tasks: [], materials: [] }, itemCount: 0, smartIntakeNotes: { warnings: [], assumed: {}, fallback: true } });
    expect(screen.getByText(/The AI is unavailable right now/)).toBeTruthy();
  });
});

describe('the Work step, round 3', () => {
  it('shows the rulings\' warnings beside the lines, and a ticket check with its one-tap fix', () => {
    const applyCheck = vi.fn();
    const check = { key: 'rhodium-missing', message: 'White gold gets rhodium plating, and this ticket has none.', action: 'Add rhodium', add: { _id: 'rh' } };
    render(
      <NewRepairFlowWork
        step={2} formData={formData} itemCount={3} itemsSubtotal={176.98} canRequestQuote={false} quoteIntent={false}
        patchCustomLaborTask={noop} setAddSheet={noop} setQuoteIntent={noop} setStep={noop} updateItem={noop} removeItem={noop}
        smartIntakeNotes={{ warnings: ['2 pieces: each task and material is counted 2 times.'], assumed: {}, fallback: false }}
        stockCheck={null} checks={[check]} applyCheck={applyCheck}
      />,
    );
    expect(screen.getByText('2 pieces: each task and material is counted 2 times.')).toBeTruthy();
    expect(screen.getByText(check.message)).toBeTruthy();
    fireEvent.click(screen.getByText('Add rhodium'));
    expect(applyCheck).toHaveBeenCalledWith(check);
  });
});

describe('the checks follow the ticket to Review, round 4', () => {
  it('Review shows the ticket check and the stock check, with their fixes, above everything else', async () => {
    const { NewRepairFlowReview } = await import('./NewRepairFlowReview');
    const applyCheck = vi.fn();
    const updateItem = vi.fn();
    const check = { key: 'rhodium-missing', message: 'White gold gets rhodium plating, and this ticket has none.', action: 'Add rhodium', add: { _id: 'rh' } };
    const stockCheck = { want: 3, have: 1, moved: 4, line: formData.materials[0], lineQuantity: 3 };
    render(
      <NewRepairFlowReview
        step={3} formData={{ ...formData, clientName: 'Test Client', notes: '' }} benchJewelers={[]} getJewelerLabel={() => ''} karatOptions={[]} metalSummary=""
        itemCount={3} itemsSubtotal={176.98} pricingTotals={{}} pricingSettings={null} promiseDateContext={null} rushJobInfo={{}} reviewTotal={176.98}
        setFormData={noop} setShowFullBreakdown={noop} setStep={noop} showFullBreakdown={false} submitMode="create"
        smartIntakeNotes={{ warnings: ['Added "Rhodium Plating": white gold.'], assumed: {}, fallback: false }}
        checks={[check]} applyCheck={applyCheck} stockCheck={stockCheck} updateItem={updateItem} removeItem={noop}
      />,
    );
    expect(screen.getByText(check.message)).toBeTruthy();
    fireEvent.click(screen.getByText('Add rhodium'));
    expect(applyCheck).toHaveBeenCalledWith(check);
    expect(screen.getByText(stockCheckMessage(stockCheck))).toBeTruthy();
    fireEvent.click(screen.getByText('Make it 3'));
    expect(updateItem).toHaveBeenCalledWith('materials', 3, 'quantity', 3);
  });

  it('a check with no fix shows no button, and the stock message never says "sizing up -1 sizes"', async () => {
    const { IntakeChecks } = await import('./IntakeChecks');
    render(<IntakeChecks checks={[{ key: 'metal-1', message: '"Half-Shank — Platinum" is a platinum task, and this ticket is gold. Replace it by hand.' }]} applyCheck={noop} />);
    expect(screen.getByText(/Replace it by hand/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(stockCheckMessage({ want: 0, have: 2, moved: -1 })).toBe('The ring is not going up in size, so it needs no sizing stock. This ticket has 2.');
  });
});
