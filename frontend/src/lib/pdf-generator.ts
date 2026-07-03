// src/lib/pdf-generator.ts
// Client-side PDF generation using browser print API (no external deps needed)
// For production, swap the HTML generation here into a library like @react-pdf/renderer or puppeteer on server

export interface MarksheetPdfData {
  template: any;
  school:   any;
  student:  any;
  exam:     any;
  subjects: any[];
  summary:  any;
  attendance?: any;
  teacherRemarks?: string;
  principalRemarks?: string;
  includePhoto?: boolean;
  includeQrCode?: boolean;
}

/** Generate QR code data URL using Canvas API */
function generateQrPlaceholder(text: string): string {
  // Simple placeholder — in production use `qrcode` npm package
  return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='80' height='80' fill='white'/><text x='40' y='45' text-anchor='middle' font-size='7' fill='black'>QR:${encodeURIComponent(text.slice(0,20))}</text></svg>`;
}

/** Returns the full HTML string for a single marksheet */
export function buildMarksheetHtml(data: MarksheetPdfData): string {
  const { template: t, school, student, exam, subjects, summary, attendance } = data;

  const headerBg   = t?.headerBgColor   ?? '#1a3a6b';
  const headerTxt  = t?.headerTextColor ?? '#ffffff';
  const fontFamily = t?.fontFamily      ?? 'Arial, sans-serif';
  const reportTitle = t?.reportTitle    ?? 'REPORT CARD';

  // Visible table columns
  const tableCols: any[] = Array.isArray(t?.tableColumns)
    ? (t.tableColumns as any[]).filter((c: any) => c.enabled).sort((a: any, b: any) => a.order - b.order)
    : [
        { key: 'subject',        label: 'Subject',         enabled: true },
        { key: 'maxMarks',       label: 'Max Marks',       enabled: true },
        { key: 'marksObtained',  label: 'Marks Obtained',  enabled: true },
        { key: 'grade',          label: 'Grade',           enabled: true },
        { key: 'percentage',     label: '%',               enabled: true },
      ];

  // Student info fields
  const studentFields: any[] = Array.isArray(t?.studentFields)
    ? (t.studentFields as any[]).filter((f: any) => f.enabled).sort((a: any, b: any) => a.order - b.order)
    : [
        { key: 'name',        label: 'Student Name' },
        { key: 'roll',        label: 'Roll Number'  },
        { key: 'admissionNo', label: 'Admission No' },
        { key: 'class',       label: 'Class'        },
        { key: 'dob',         label: 'Date of Birth'},
        { key: 'fatherName',  label: "Father's Name"},
      ];

  const fieldValue = (key: string) => {
    switch (key) {
      case 'name':        return student.name        ?? '';
      case 'roll':        return student.roll        ?? '';
      case 'admissionNo': return student.admissionNo ?? '';
      case 'class':       return student.className   ?? '';
      case 'section':     return '—';
      case 'dob':         return student.dob ? new Date(student.dob).toLocaleDateString('en-IN') : '';
      case 'gender':      return student.gender      ?? '';
      case 'fatherName':  return student.fatherName  ?? '';
      case 'motherName':  return student.motherName  ?? '';
      case 'studentId':   return student.id?.slice(0, 8) ?? '';
      case 'session':     return school?.session     ?? `${exam.year}–${exam.year + 1}`;
      default:            return '';
    }
  };

  const photoField = studentFields.find(f => f.key === 'photo');
  const showPhoto  = data.includePhoto && photoField && student.photoUrl;

  const subjectRows = subjects.map(s => {
    const cols = tableCols.map(col => {
      switch (col.key) {
        case 'subject':       return `<td>${s.subject}</td>`;
        case 'maxMarks':      return `<td style="text-align:center">${s.maxMarks}</td>`;
        case 'marksObtained': return `<td style="text-align:center;font-weight:bold">${s.marksObtained}</td>`;
        case 'passingMarks':  return `<td style="text-align:center">${s.passingMarks}</td>`;
        case 'grade':         return `<td style="text-align:center;font-weight:bold;color:${gradeColor(s.grade)}">${s.grade}</td>`;
        case 'percentage':    return `<td style="text-align:center">${s.percentage}%</td>`;
        case 'remarks':       return `<td style="text-align:center">${s.isPassed ? 'Pass' : 'Fail'}</td>`;
        default:              return '<td>—</td>';
      }
    }).join('');
    const rowBg = !s.isPassed ? 'background:#fff5f5' : '';
    return `<tr style="${rowBg}">${cols}</tr>`;
  }).join('');

  const qrHtml = data.includeQrCode
    ? `<div style="text-align:center;margin-top:12px"><img src="${generateQrPlaceholder(`${student.id}|${exam.type}|${exam.year}`)}" width="80" height="80" alt="QR Code"/><div style="font-size:9px;color:#666;margin-top:2px">Scan to verify</div></div>`
    : '';

  const marginTop    = t?.marginTop    ?? 15;
  const marginBottom = t?.marginBottom ?? 15;
  const marginLeft   = t?.marginLeft   ?? 15;
  const marginRight  = t?.marginRight  ?? 15;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Report Card – ${student.name}</title>
<style>
  * { box-sizing: border-box; margin:0; padding:0; }
  @page {
    size: ${t?.paperSize ?? 'A4'} ${(t?.orientation ?? 'PORTRAIT').toLowerCase()};
    margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
  }
  body { font-family: ${fontFamily}; color: #111; background: white; font-size: 12px; }
  .page { width:100%; max-width:${t?.orientation === 'LANDSCAPE' ? '277mm' : '190mm'}; margin:0 auto; }

  /* Header */
  .header {
    background: ${headerBg};
    color: ${headerTxt};
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    border-radius: 8px 8px 0 0;
    position: relative;
  }
  .header .logo { width:70px; height:70px; object-fit:contain; border-radius:50%; background:white; padding:4px; flex-shrink:0; }
  .header .logo-placeholder { width:70px; height:70px; border-radius:50%; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:28px; flex-shrink:0; }
  .header-text { flex:1; text-align:${t?.headerAlignment ?? 'center'}; }
  .header-text h1 { font-size:20px; font-weight:900; letter-spacing:1px; }
  .header-text p  { font-size:11px; opacity:0.88; margin-top:3px; line-height:1.5; }
  .report-title-bar {
    background: ${adjustColor(headerBg, -20)};
    color: ${headerTxt};
    text-align: center;
    padding: 8px;
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 4px;
    text-transform: uppercase;
  }

  /* Student Info */
  .student-section { display:flex; gap:16px; padding:14px; border:1px solid #ddd; border-top:none; align-items:flex-start; }
  .student-photo { width:80px; height:100px; object-fit:cover; border:2px solid #ddd; border-radius:4px; flex-shrink:0; }
  .student-photo-placeholder { width:80px; height:100px; border:2px solid #ddd; border-radius:4px; flex-shrink:0; background:#f5f5f5; display:flex; align-items:center; justify-content:center; font-size:32px; }
  .student-fields { flex:1; }
  .student-fields table { width:100%; border-collapse:collapse; }
  .student-fields td { padding:4px 8px; font-size:11px; vertical-align:top; }
  .student-fields td:first-child { font-weight:700; width:120px; color:#444; white-space:nowrap; }
  .student-fields td:last-child { color:#111; }

  /* Exam Info Badge */
  .exam-badge { display:flex; gap:8px; padding:8px 14px; background:#f0f4ff; border-left:3px solid ${headerBg}; margin:0 14px; }
  .exam-badge span { font-size:11px; font-weight:700; color:#333; padding:3px 10px; background:${headerBg}; color:${headerTxt}; border-radius:20px; }

  /* Marks Table */
  .marks-section { padding:12px 14px 0; }
  .marks-section h3 { font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:1px; color:#333; margin-bottom:8px; border-bottom:2px solid ${headerBg}; padding-bottom:4px; }
  .marks-table { width:100%; border-collapse:collapse; font-size:11px; }
  .marks-table th { background:${headerBg}; color:${headerTxt}; padding:7px 10px; text-align:left; font-weight:700; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; }
  .marks-table td { padding:6px 10px; border-bottom:1px solid #eee; }
  .marks-table tr:nth-child(even) td { background:#fafafa; }
  .marks-table tr:last-child td { border-bottom:2px solid #ddd; }

  /* Summary */
  .summary-section { display:flex; flex-wrap:wrap; gap:10px; padding:12px 14px; border:1px solid #eee; border-top:none; }
  .summary-card { flex:1; min-width:80px; background:#f9f9f9; border:1px solid #e0e0e0; border-radius:6px; padding:8px 12px; text-align:center; }
  .summary-card .label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#888; }
  .summary-card .value { font-size:18px; font-weight:900; color:${headerBg}; margin-top:2px; }
  .result-pass { color: #16a34a !important; }
  .result-fail { color: #dc2626 !important; }

  /* Remarks */
  .remarks-section { padding:10px 14px; border:1px solid #eee; border-top:none; }
  .remarks-section h4 { font-size:10px; font-weight:700; text-transform:uppercase; color:#555; margin-bottom:6px; }
  .remarks-box { border:1px solid #ddd; border-radius:4px; min-height:40px; padding:8px; font-size:11px; color:#333; background:#fafafa; }

  /* Signatures */
  .signatures-section { display:flex; gap:20px; padding:16px 14px; border:1px solid #eee; border-top:none; justify-content:space-around; }
  .sig-block { text-align:center; flex:1; }
  .sig-block img { max-width:120px; max-height:50px; object-fit:contain; margin-bottom:4px; }
  .sig-line { border-top:1px solid #333; margin:6px auto; width:120px; }
  .sig-block p { font-size:10px; color:#555; margin-top:4px; }

  /* Footer */
  .footer { padding:10px 14px; border:1px solid #ddd; border-top:none; border-radius:0 0 8px 8px; background:#f9f9f9; text-align:center; font-size:10px; color:#666; }

  /* Watermark */
  .watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-45deg); font-size:80px; font-weight:900; color:rgba(0,0,0,0.04); pointer-events:none; white-space:nowrap; z-index:0; }

  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .no-print { display:none !important; }
  }
</style>
</head>
<body>
${t?.showWatermark && t?.watermarkText ? `<div class="watermark">${t.watermarkText}</div>` : ''}
<div class="page">

  <!-- HEADER -->
  <div class="header">
    ${school?.logoUrl
      ? `<img class="logo" src="${school.logoUrl}" alt="School Logo" onerror="this.style.display='none'"/>`
      : `<div class="logo-placeholder">🎓</div>`}
    <div class="header-text">
      <h1>${school?.name ?? 'School Name'}</h1>
      <p>${school?.address ?? ''}</p>
      <p>${[school?.phone, school?.email].filter(Boolean).join(' | ')}</p>
      ${school?.affiliationNo ? `<p>Affiliation No: ${school.affiliationNo}</p>` : ''}
      ${school?.motto ? `<p style="font-style:italic;margin-top:4px">"${school.motto}"</p>` : ''}
    </div>
    ${qrHtml ? `<div style="flex-shrink:0">${qrHtml}</div>` : ''}
  </div>

  <!-- REPORT TITLE BAR -->
  <div class="report-title-bar">${reportTitle}</div>

  <!-- STUDENT INFO -->
  <div class="student-section">
    ${showPhoto
      ? `<img class="student-photo" src="${student.photoUrl}" alt="Student Photo" onerror="this.style.display='none'"/>`
      : (photoField ? `<div class="student-photo-placeholder">👤</div>` : '')}
    <div class="student-fields">
      <table>
        ${studentFields.filter(f => f.key !== 'photo').map(f => `
          <tr>
            <td>${f.label}:</td>
            <td>${fieldValue(f.key)}</td>
          </tr>`).join('')}
      </table>
    </div>
  </div>

  <!-- EXAM BADGE -->
  <div class="exam-badge">
    <span>${exam.type.replace(/_/g, ' ')}</span>
    <span>Academic Year: ${exam.year}–${exam.year + 1}</span>
    ${school?.session ? `<span>${school.session}</span>` : ''}
  </div>

  <!-- MARKS TABLE -->
  <div class="marks-section">
    <h3>Academic Performance</h3>
    <table class="marks-table">
      <thead>
        <tr>${tableCols.map(c => `<th style="width:${c.width ?? 'auto'}">${c.label}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${subjectRows}
      </tbody>
    </table>
  </div>

  <!-- SUMMARY -->
  <div class="summary-section">
    ${t?.showTotal     !== false ? `<div class="summary-card"><div class="label">Total Marks</div><div class="value">${summary.totalMarks}/${summary.totalMax}</div></div>` : ''}
    ${t?.showPercentage !== false ? `<div class="summary-card"><div class="label">Percentage</div><div class="value">${summary.percentage}%</div></div>` : ''}
    ${t?.showGrade      !== false ? `<div class="summary-card"><div class="label">Grade</div><div class="value">${summary.grade}</div></div>` : ''}
    ${t?.showRank       !== false ? `<div class="summary-card"><div class="label">Rank</div><div class="value">${summary.rank ?? '—'}</div></div>` : ''}
    ${t?.showResult     !== false ? `<div class="summary-card"><div class="label">Result</div><div class="value ${summary.result === 'PASS' ? 'result-pass' : 'result-fail'}">${summary.result}</div></div>` : ''}
    ${t?.showAttendance && attendance ? `<div class="summary-card"><div class="label">Attendance</div><div class="value">${attendance.percentage}%</div></div>` : ''}
  </div>

  <!-- REMARKS -->
  ${(t?.showTeacherRemarks || t?.showPrincipalRemarks) ? `
  <div class="remarks-section">
    <div style="display:flex;gap:16px">
      ${t?.showTeacherRemarks !== false ? `
      <div style="flex:1">
        <h4>Class Teacher's Remarks</h4>
        <div class="remarks-box">${data.teacherRemarks ?? ''}</div>
      </div>` : ''}
      ${t?.showPrincipalRemarks !== false ? `
      <div style="flex:1">
        <h4>Principal's Remarks</h4>
        <div class="remarks-box">${data.principalRemarks ?? ''}</div>
      </div>` : ''}
    </div>
  </div>` : ''}

  <!-- SIGNATURES -->
  <div class="signatures-section">
    <div class="sig-block">
      ${t?.classTeacherSignatureUrl ? `<img src="${t.classTeacherSignatureUrl}" alt="Class Teacher Signature"/>` : ''}
      <div class="sig-line"></div>
      <p>Class Teacher</p>
    </div>
    <div class="sig-block">
      ${t?.schoolSealUrl ? `<img src="${t.schoolSealUrl}" alt="School Seal"/>` : ''}
    </div>
    <div class="sig-block">
      ${t?.principalSignatureUrl ? `<img src="${t.principalSignatureUrl}" alt="Principal Signature"/>` : ''}
      <div class="sig-line"></div>
      <p>Principal</p>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    ${t?.footerNote ? `<p style="margin-bottom:4px">${t.footerNote}</p>` : ''}
    ${t?.showGeneratedDate !== false ? `<p>Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>` : ''}
  </div>

</div>
</body>
</html>`;
}

function gradeColor(grade: string): string {
  if (grade === 'A+' || grade === 'A')  return '#16a34a';
  if (grade === 'B+' || grade === 'B')  return '#2563eb';
  if (grade === 'C')                    return '#d97706';
  if (grade === 'D')                    return '#ea580c';
  return '#dc2626';
}

// Simple hex color adjuster
function adjustColor(hex: string, amount: number): string {
  try {
    const num   = parseInt(hex.replace('#', ''), 16);
    const r     = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g     = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b     = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch {
    return hex;
  }
}

/** Open a print dialog for a single marksheet */
export function printMarksheet(data: MarksheetPdfData): void {
  const html   = buildMarksheetHtml(data);
  const win    = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('Please allow popups to print the report card.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 800);
}

/** Download HTML as "PDF" via print-to-PDF */
export function downloadMarksheetAsPdf(data: MarksheetPdfData, filename?: string): void {
  printMarksheet(data);
}
