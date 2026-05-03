import BusinessExpensesModel from '@/app/api/businessExpenses/model';
import RecurringBusinessExpensesModel from './model';
import {
  buildRecurringExpenseRow,
  getNextRecurringOccurrence,
  getOccurrenceDueDates,
  normalizeRecurringExpenseTemplate,
} from '@/services/recurringBusinessExpenses';

export async function generateDueRecurringExpenses({ throughDate = new Date(), createdBy = '' } = {}) {
  const templates = await RecurringBusinessExpensesModel.list({ active: true });
  const generatedExpenses = [];
  const updatedTemplates = [];

  for (const templateLike of templates) {
    const template = normalizeRecurringExpenseTemplate(templateLike);
    const dueDates = getOccurrenceDueDates(template, throughDate);

    for (const occurrenceDate of dueDates) {
      const existing = await BusinessExpensesModel.findRecurringOccurrence(
        template.recurringExpenseID,
        occurrenceDate
      );

      if (existing) {
        continue;
      }

      const expense = await BusinessExpensesModel.create({
        ...buildRecurringExpenseRow(template, occurrenceDate, {
          generatedAt: new Date(),
        }),
        createdBy,
      });
      generatedExpenses.push(expense);
    }

    const nextOccurrenceDate = getNextRecurringOccurrence(
      template,
      dueDates.length > 0
        ? new Date(dueDates[dueDates.length - 1].getTime() + 86400000)
        : template.nextOccurrenceDate || template.startDate
    );

    const updated = await RecurringBusinessExpensesModel.updateByRecurringExpenseID(template.recurringExpenseID, {
      lastGeneratedAt: dueDates.length > 0 ? new Date() : template.lastGeneratedAt,
      nextOccurrenceDate,
    });
    updatedTemplates.push(updated);
  }

  return {
    generatedCount: generatedExpenses.length,
    generatedExpenses,
    templates: updatedTemplates,
  };
}
