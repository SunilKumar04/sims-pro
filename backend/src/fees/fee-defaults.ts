const DEFAULT_FEE_STRUCTURE: Record<string, { tuition: number; transport: number; lab: number; sports: number }> = {
  '12': { tuition: 18000, transport: 2000, lab: 1000, sports: 500 },
  '11': { tuition: 18000, transport: 2000, lab: 1000, sports: 500 },
  '10': { tuition: 15000, transport: 2000, lab: 1000, sports: 500 },
  '9': { tuition: 13500, transport: 2000, lab: 500, sports: 500 },
  '8': { tuition: 12000, transport: 2000, lab: 500, sports: 500 },
  '7': { tuition: 11000, transport: 2000, lab: 500, sports: 500 },
  '6': { tuition: 10000, transport: 2000, lab: 500, sports: 500 },
};

function extractGrade(className: string): string {
  const match = String(className || '').match(/\d+/);
  return match?.[0] ?? '';
}

export function buildInitialFeeData(studentId: string, className: string) {
  const grade = extractGrade(className);
  const structure =
    DEFAULT_FEE_STRUCTURE[grade] ??
    DEFAULT_FEE_STRUCTURE['10'];

  return {
    studentId,
    term: `Term 1 - ${new Date().getFullYear()}`,
    tuition: structure.tuition,
    transport: structure.transport,
    lab: structure.lab,
    sports: structure.sports,
    amount: structure.tuition + structure.transport + structure.lab + structure.sports,
    paid: 0,
    status: 'PENDING' as const,
    paidDate: null,
    receiptNo: null,
    remarks: 'Auto-created when student was enrolled',
  };
}
