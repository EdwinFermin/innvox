export interface ExpenseReceiptAnalysis {
  amount: number | null;
  date: string | null;
  description: string;
  branchCode: string | null;
  branchId: string | null;
  branchName: string | null;
  expenseTypeFriendlyId: string | null;
  expenseTypeId: string | null;
  expenseTypeName: string | null;
  bankAccountId: string | null;
  bankAccountName: string | null;
  sourceAccountLast4: string | null;
  referenceNumber: string | null;
  confirmationNumber: string | null;
  transferTax: number | null;
  bankName: string | null;
  confidence: number | null;
  extractedText: string | null;
  issues: string[];
}
