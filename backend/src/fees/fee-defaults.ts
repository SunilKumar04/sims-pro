export type FeeStructureItem = {
  grade: string;
  tuition: number;
  transport: number;
  lab: number;
  sports: number;
};

const DEFAULT_FEE_STRUCTURE: Record<string, Omit<FeeStructureItem, 'grade'>> = {
  'NURSERY': { tuition: 6000, transport: 1500, lab: 0, sports: 300 },
  'LKG': { tuition: 6500, transport: 1500, lab: 0, sports: 300 },
  'UKG': { tuition: 7000, transport: 1500, lab: 0, sports: 300 },
  '1': { tuition: 7500, transport: 1500, lab: 0, sports: 300 },
  '2': { tuition: 8000, transport: 1500, lab: 0, sports: 300 },
  '3': { tuition: 8500, transport: 1500, lab: 0, sports: 350 },
  '4': { tuition: 9000, transport: 1750, lab: 0, sports: 350 },
  '5': { tuition: 9500, transport: 1750, lab: 0, sports: 400 },
  '12': { tuition: 18000, transport: 2000, lab: 1000, sports: 500 },
  '11': { tuition: 18000, transport: 2000, lab: 1000, sports: 500 },
  '10': { tuition: 15000, transport: 2000, lab: 1000, sports: 500 },
  '9': { tuition: 13500, transport: 2000, lab: 500, sports: 500 },
  '8': { tuition: 12000, transport: 2000, lab: 500, sports: 500 },
  '7': { tuition: 11000, transport: 2000, lab: 500, sports: 500 },
  '6': { tuition: 10000, transport: 2000, lab: 500, sports: 500 },
};

function extractGrade(className: string): string {
  const raw = String(className || '').trim();
  const match = raw.match(/\d+/);
  if (match?.[0]) return match[0].toUpperCase();

  const tokens = raw.split(/[\s-]+/).filter(Boolean);
  const prefixWords = new Set(['CLASS', 'GRADE', 'STD', 'SECTION']);
  const firstMeaningful = tokens.find((token) => !prefixWords.has(token.toUpperCase())) ?? '';
  return firstMeaningful.toUpperCase();
}

function normalizeFeeStructureItem(item: any): FeeStructureItem | null {
  if (!item || typeof item !== 'object') return null;
  const grade = String(item.grade ?? '').trim();
  if (!grade) return null;
  return {
    grade: grade.toUpperCase(),
    tuition: Number(item.tuition) || 0,
    transport: Number(item.transport) || 0,
    lab: Number(item.lab) || 0,
    sports: Number(item.sports) || 0,
  };
}

export function resolveFeeStructureForGrade(
  className: string,
  feeStructure?: unknown,
) {
  const grade = extractGrade(className);
  const structureList = Array.isArray(feeStructure)
    ? feeStructure.map(normalizeFeeStructureItem).filter((item): item is FeeStructureItem => Boolean(item))
    : [];

  const fromSettings = structureList.find((item) => item.grade === grade);
  if (fromSettings) return fromSettings;

  const fallback = DEFAULT_FEE_STRUCTURE[grade] ?? DEFAULT_FEE_STRUCTURE['10'];
  return { grade, ...fallback };
}

export function buildInitialFeeData(
  studentId: string,
  className: string,
  schoolId?: string,
  feeStructure?: unknown,
) {
  const structure = resolveFeeStructureForGrade(className, feeStructure);

  return {
    ...(schoolId ? { schoolId } : {}),
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
