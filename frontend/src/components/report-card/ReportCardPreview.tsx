'use client';
// src/components/report-card/ReportCardPreview.tsx
// Live preview that mirrors the final PDF output

const MOCK_STUDENT = {
  name:        'Rahul Kumar Sharma',
  roll:        '14',
  admissionNo: 'ADM-2024-014',
  className:   '10-A',
  dob:         '2010-06-15',
  gender:      'Male',
  fatherName:  'Ramesh Sharma',
  motherName:  'Sunita Sharma',
  photoUrl:    null as string | null,
};

const MOCK_SUBJECTS = [
  { subject: 'Mathematics',    marksObtained: 87, maxMarks: 100, grade: 'A',  percentage: 87, isPassed: true },
  { subject: 'Science',        marksObtained: 91, maxMarks: 100, grade: 'A+', percentage: 91, isPassed: true },
  { subject: 'English',        marksObtained: 78, maxMarks: 100, grade: 'B+', percentage: 78, isPassed: true },
  { subject: 'Hindi',          marksObtained: 72, maxMarks: 100, grade: 'B+', percentage: 72, isPassed: true },
  { subject: 'Social Studies', marksObtained: 65, maxMarks: 100, grade: 'B',  percentage: 65, isPassed: true },
];

const MOCK_SUMMARY = {
  totalMarks: 393,
  totalMax:   500,
  percentage: 79,
  grade:      'B+',
  result:     'PASS',
  rank:       3,
  classSize:  40,
};

function gradeColor(g: string) {
  if (g === 'A+' || g === 'A')  return '#16a34a';
  if (g === 'B+' || g === 'B')  return '#2563eb';
  if (g === 'C')                 return '#d97706';
  return '#dc2626';
}

interface Props { template: any; studentData?: any; subjectsData?: any[]; summaryData?: any }

export default function ReportCardPreview({ template: t, studentData, subjectsData, summaryData }: Props) {
  const student  = studentData  ?? MOCK_STUDENT;
  const subjects = subjectsData ?? MOCK_SUBJECTS;
  const summary  = summaryData  ?? MOCK_SUMMARY;

  const hBg      = t?.headerBgColor   ?? '#1a3a6b';
  const hTxt     = t?.headerTextColor ?? '#ffffff';
  const font     = t?.fontFamily      ?? 'Arial, sans-serif';
  const title    = t?.reportTitle     ?? 'REPORT CARD';
  const align    = (t?.headerAlignment ?? 'center') as 'left' | 'center' | 'right';

  const tableCols: any[] = Array.isArray(t?.tableColumns)
    ? (t.tableColumns as any[]).filter((c: any) => c.enabled).sort((a: any, b: any) => a.order - b.order)
    : [
        { key: 'subject', label: 'Subject' }, { key: 'maxMarks', label: 'Max' },
        { key: 'marksObtained', label: 'Marks' }, { key: 'grade', label: 'Grade' },
        { key: 'percentage', label: '%' },
      ];

  const studentFields: any[] = Array.isArray(t?.studentFields)
    ? (t.studentFields as any[]).filter((f: any) => f.enabled && f.key !== 'photo').sort((a: any, b: any) => a.order - b.order)
    : [
        { key: 'name', label: 'Student Name' }, { key: 'roll', label: 'Roll No' },
        { key: 'admissionNo', label: 'Admission No' }, { key: 'class', label: 'Class' },
        { key: 'fatherName', label: "Father's Name" },
      ];

  const photoField = Array.isArray(t?.studentFields) ? (t.studentFields as any[]).find((f: any) => f.key === 'photo' && f.enabled) : true;
  const showPhoto  = !!photoField;

  const getFieldValue = (key: string) => {
    switch (key) {
      case 'name':        return student.name;
      case 'roll':        return student.roll;
      case 'admissionNo': return student.admissionNo;
      case 'class':       return student.className;
      case 'section':     return '—';
      case 'dob':         return student.dob ? new Date(student.dob).toLocaleDateString('en-IN') : '';
      case 'gender':      return student.gender;
      case 'fatherName':  return student.fatherName;
      case 'motherName':  return student.motherName;
      case 'session':     return t?.academicSession ?? '2025–2026';
      default:            return '—';
    }
  };

  const getCellValue = (colKey: string, s: any) => {
    switch (colKey) {
      case 'subject':       return s.subject;
      case 'maxMarks':      return s.maxMarks;
      case 'marksObtained': return <strong>{s.marksObtained}</strong>;
      case 'passingMarks':  return Math.ceil(s.maxMarks * 0.4);
      case 'grade':         return <strong style={{ color: gradeColor(s.grade) }}>{s.grade}</strong>;
      case 'percentage':    return `${s.percentage}%`;
      case 'remarks':       return s.isPassed ? 'Pass' : 'Fail';
      default:              return '—';
    }
  };

  return (
    <div style={{ fontFamily: font, background: 'white', color: '#111', fontSize: 11, padding: 12, minWidth: 500 }}>

      {/* HEADER */}
      <div style={{ background: hBg, color: hTxt, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: '8px 8px 0 0' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
          {t?.logoUrl ? <img src={t.logoUrl} alt="" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: '50%' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/> : '🎓'}
        </div>
        <div style={{ flex: 1, textAlign: align }}>
          <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1 }}>{t?.schoolName ?? 'Your School Name'}</div>
          <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>{t?.schoolAddress ?? 'School Address, City, State'}</div>
          <div style={{ fontSize: 10, opacity: 0.8, marginTop: 1 }}>
            {[t?.schoolPhone, t?.schoolEmail].filter(Boolean).join(' | ')}
          </div>
          {t?.schoolMotto && <div style={{ fontSize: 9, fontStyle: 'italic', marginTop: 3, opacity: 0.75 }}>"{t.schoolMotto}"</div>}
        </div>
      </div>

      {/* TITLE BAR */}
      <div style={{ background: adjustHex(hBg, -20), color: hTxt, textAlign: 'center', padding: '6px', fontSize: 12, fontWeight: 900, letterSpacing: 4 }}>
        {title}
      </div>

      {/* STUDENT INFO */}
      <div style={{ display: 'flex', gap: 12, padding: '10px 12px', border: '1px solid #ddd', borderTop: 'none', alignItems: 'flex-start' }}>
        {showPhoto && (
          <div style={{ width: 70, height: 88, border: '2px solid #ddd', borderRadius: 4, flexShrink: 0, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
            {student.photoUrl ? <img src={student.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : '👤'}
          </div>
        )}
        <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: 10 }}>
          <tbody>
            {studentFields.map(f => (
              <tr key={f.key}>
                <td style={{ padding: '2px 6px', fontWeight: 700, width: 110, color: '#555', whiteSpace: 'nowrap' }}>{f.label}:</td>
                <td style={{ padding: '2px 6px', color: '#111' }}>{getFieldValue(f.key)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* EXAM BADGE */}
      <div style={{ display: 'flex', gap: 6, padding: '6px 12px', background: '#f0f4ff', borderLeft: `3px solid ${hBg}`, flexWrap: 'wrap' }}>
        {[`FINAL EXAM`, `Year: 2025–2026`].map(b => (
          <span key={b} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: hBg, color: hTxt, borderRadius: 20 }}>{b}</span>
        ))}
      </div>

      {/* MARKS TABLE */}
      <div style={{ padding: '8px 12px 0' }}>
        <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: '#333', marginBottom: 6, borderBottom: `2px solid ${hBg}`, paddingBottom: 3 }}>
          Academic Performance
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr>
              {tableCols.map(c => (
                <th key={c.key} style={{ background: hBg, color: hTxt, padding: '5px 8px', textAlign: c.key === 'subject' ? 'left' : 'center', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjects.map((s, i) => (
              <tr key={s.subject} style={{ background: i % 2 === 1 ? '#fafafa' : 'transparent' }}>
                {tableCols.map(c => (
                  <td key={c.key} style={{ padding: '5px 8px', borderBottom: '1px solid #eee', textAlign: c.key === 'subject' ? 'left' : 'center' }}>
                    {getCellValue(c.key, s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SUMMARY */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 12px', border: '1px solid #eee', borderTop: 'none' }}>
        {[
          t?.showTotal     !== false && { l: 'Total', v: `${summary.totalMarks}/${summary.totalMax}` },
          t?.showPercentage !== false && { l: '%',     v: `${summary.percentage}%` },
          t?.showGrade      !== false && { l: 'Grade', v: summary.grade },
          t?.showRank       !== false && { l: 'Rank',  v: summary.rank ?? '—' },
          t?.showResult     !== false && { l: 'Result', v: summary.result, isResult: true },
        ].filter(Boolean).map((card: any, i) => (
          <div key={i} style={{ flex: 1, minWidth: 60, background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: 6, padding: '5px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>{card.l}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: card.isResult ? (card.v === 'PASS' ? '#16a34a' : '#dc2626') : hBg, marginTop: 1 }}>{card.v}</div>
          </div>
        ))}
      </div>

      {/* REMARKS */}
      {(t?.showTeacherRemarks !== false || t?.showPrincipalRemarks !== false) && (
        <div style={{ padding: '8px 12px', border: '1px solid #eee', borderTop: 'none' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {t?.showTeacherRemarks !== false && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#555', marginBottom: 4 }}>Teacher's Remarks</div>
                <div style={{ border: '1px solid #ddd', borderRadius: 3, minHeight: 28, padding: 5, fontSize: 10, color: '#999', background: '#fafafa' }}>Good performance…</div>
              </div>
            )}
            {t?.showPrincipalRemarks !== false && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#555', marginBottom: 4 }}>Principal's Remarks</div>
                <div style={{ border: '1px solid #ddd', borderRadius: 3, minHeight: 28, padding: 5, fontSize: 10, color: '#999', background: '#fafafa' }}>Promoted to next class…</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SIGNATURES */}
      <div style={{ display: 'flex', gap: 16, padding: '10px 12px', border: '1px solid #eee', borderTop: 'none', justifyContent: 'space-around' }}>
        {[{ l: 'Class Teacher' }, { l: '🏫' }, { l: 'Principal' }].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ borderTop: '1px solid #333', margin: '20px auto 4px', width: 80 }}/>
            <div style={{ fontSize: 9, color: '#555' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div style={{ padding: '6px 12px', border: '1px solid #ddd', borderTop: 'none', borderRadius: '0 0 8px 8px', background: '#f9f9f9', textAlign: 'center', fontSize: 9, color: '#888' }}>
        {t?.footerNote && <div style={{ marginBottom: 2 }}>{t.footerNote}</div>}
        {t?.showGeneratedDate !== false && <div>Generated on: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>}
      </div>

      {/* WATERMARK */}
      {t?.showWatermark && t?.watermarkText && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-45deg)', fontSize: 48, fontWeight: 900, color: 'rgba(0,0,0,0.04)', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 0 }}>
          {t.watermarkText}
        </div>
      )}
    </div>
  );
}

function adjustHex(hex: string, amount: number): string {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const r   = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g   = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b   = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch { return hex; }
}
