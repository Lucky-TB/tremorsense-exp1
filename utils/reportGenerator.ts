import { RecordingSession, UserProfile } from '@/types';
import { getTremorScore } from './signalProcessing';
import { detectTrend, calculateBaseline, generateTrendAnalysis } from './analysis';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

function getScoreColor(score: number): string {
  if (score <= 25) return '#2D9B8A';
  if (score <= 50) return '#C4A46C';
  if (score <= 75) return '#E8A44C';
  return '#E85D5D';
}

function getScoreStatus(score: number): string {
  if (score <= 25) return 'OPTIMAL';
  if (score <= 50) return 'GOOD';
  if (score <= 75) return 'FAIR';
  return 'ATTENTION';
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function buildScoreChart(sessions: RecordingSession[]): string {
  const recent = sessions.slice(0, 30);
  if (recent.length === 0) return '';

  const scores = recent.map(s => getTremorScore(s.stats));
  const maxScore = Math.max(...scores, 100);
  const chartWidth = 520;
  const chartHeight = 160;
  const barWidth = Math.max(8, Math.min(20, (chartWidth - 40) / recent.length - 4));
  const gap = 4;

  const bars = recent.map((s, i) => {
    const score = scores[i];
    const color = getScoreColor(score);
    const barH = Math.max(3, (score / maxScore) * (chartHeight - 30));
    const x = 30 + i * (barWidth + gap);
    const y = chartHeight - barH - 20;
    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="3" fill="${color}" opacity="0.85"/>`;
  }).reverse().join('');

  // Y-axis labels
  const yLabels = [0, 25, 50, 75, 100].map(v => {
    const y = chartHeight - 20 - ((v / maxScore) * (chartHeight - 30));
    return `<text x="22" y="${y + 4}" text-anchor="end" font-size="9" fill="#8A8A8E">${v}</text>
            <line x1="28" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="#E5E5E0" stroke-width="0.5" stroke-dasharray="3,3"/>`;
  }).join('');

  return `
    <svg width="${chartWidth}" height="${chartHeight}" xmlns="http://www.w3.org/2000/svg">
      ${yLabels}
      ${bars}
    </svg>
  `;
}

function buildSessionTable(sessions: RecordingSession[]): string {
  const rows = sessions.slice(0, 20).map(s => {
    const score = getTremorScore(s.stats);
    const color = getScoreColor(score);
    const status = getScoreStatus(score);
    const context: string[] = [];
    if (s.context?.caffeine) context.push('Caffeine');
    if (s.context?.stress) context.push('Stress');
    if (s.context?.sleepDeprived) context.push('Sleep-deprived');

    return `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #F0F0F0; font-size: 12px; color: #3A3A3A;">
          ${formatDate(s.timestamp)}<br/><span style="color:#8A8A8E; font-size:11px;">${formatTime(s.timestamp)}</span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #F0F0F0; text-align: center;">
          <span style="display: inline-block; background: ${color}15; color: ${color}; font-weight: 700; font-size: 14px; padding: 4px 12px; border-radius: 8px;">
            ${score}
          </span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #F0F0F0; text-align: center;">
          <span style="color: ${color}; font-weight: 600; font-size: 11px; letter-spacing: 0.5px;">${status}</span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #F0F0F0; font-size: 11px; color: #8A8A8E;">
          ${s.duration}s
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #F0F0F0; font-size: 11px; color: #6D6D72;">
          ${context.length > 0 ? context.join(', ') : '—'}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <table style="width: 100%; border-collapse: collapse; border-radius: 12px; overflow: hidden;">
      <thead>
        <tr style="background: #F8F8F6;">
          <th style="padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 700; color: #8A8A8E; letter-spacing: 1px; border-bottom: 2px solid #E8E8E4;">DATE</th>
          <th style="padding: 10px 12px; text-align: center; font-size: 10px; font-weight: 700; color: #8A8A8E; letter-spacing: 1px; border-bottom: 2px solid #E8E8E4;">SCORE</th>
          <th style="padding: 10px 12px; text-align: center; font-size: 10px; font-weight: 700; color: #8A8A8E; letter-spacing: 1px; border-bottom: 2px solid #E8E8E4;">STATUS</th>
          <th style="padding: 10px 12px; text-align: center; font-size: 10px; font-weight: 700; color: #8A8A8E; letter-spacing: 1px; border-bottom: 2px solid #E8E8E4;">DURATION</th>
          <th style="padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 700; color: #8A8A8E; letter-spacing: 1px; border-bottom: 2px solid #E8E8E4;">CONTEXT</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

export async function generateDoctorReport(
  sessions: RecordingSession[],
  profile: UserProfile | null,
): Promise<void> {
  const sorted = [...sessions].sort((a, b) => b.timestamp - a.timestamp);
  const scores = sorted.map(s => getTremorScore(s.stats));
  const latestScore = scores.length > 0 ? scores[0] : null;
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const minScore = scores.length > 0 ? Math.min(...scores) : null;
  const maxScore = scores.length > 0 ? Math.max(...scores) : null;

  const trend = detectTrend(sorted);
  const baseline = calculateBaseline(sorted);
  const trendAnalysis = sorted.length > 0 ? generateTrendAnalysis(sorted) : null;

  const trendLabel = trend === 'increasing' ? 'Increasing' : trend === 'decreasing' ? 'Decreasing' : 'Stable';
  const trendColor = trend === 'increasing' ? '#E8A44C' : trend === 'decreasing' ? '#2D9B8A' : '#8A8A8E';

  const dateRange = sorted.length > 0
    ? `${formatDate(sorted[sorted.length - 1].timestamp)} — ${formatDate(sorted[0].timestamp)}`
    : 'No data';

  const patientName = profile?.name || 'Patient';
  const patientGender = profile?.gender || 'Not specified';
  const patientBirthday = profile?.birthday || 'Not specified';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    @page { margin: 40px; size: A4; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1C1C1E;
      line-height: 1.5;
      background: #FFFFFF;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2D9B8A;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .header-left h1 {
      font-size: 26px;
      font-weight: 300;
      letter-spacing: -0.5px;
      color: #1C1C1E;
    }
    .header-left h1 span { color: #2D9B8A; font-weight: 600; }
    .header-left p {
      font-size: 12px;
      color: #8A8A8E;
      margin-top: 4px;
    }
    .header-right {
      text-align: right;
      font-size: 11px;
      color: #8A8A8E;
      line-height: 1.7;
    }

    .badge {
      display: inline-block;
      background: #2D9B8A12;
      color: #2D9B8A;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 4px 12px;
      border-radius: 6px;
      margin-top: 6px;
    }

    .patient-bar {
      background: #F8F8F6;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      gap: 40px;
      margin-bottom: 28px;
    }
    .patient-field label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1.2px;
      color: #8A8A8E;
      display: block;
      margin-bottom: 2px;
    }
    .patient-field span {
      font-size: 14px;
      font-weight: 500;
      color: #1C1C1E;
    }

    .section-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #8A8A8E;
      margin-bottom: 12px;
      margin-top: 28px;
    }

    .summary-grid {
      display: flex;
      gap: 12px;
      margin-bottom: 8px;
    }
    .stat-card {
      flex: 1;
      background: #FAFAF8;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .stat-card .value {
      font-size: 32px;
      font-weight: 200;
      letter-spacing: -1px;
    }
    .stat-card .label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.8px;
      color: #8A8A8E;
      margin-top: 4px;
    }
    .stat-card .sub {
      font-size: 11px;
      font-weight: 500;
      margin-top: 2px;
    }

    .chart-container {
      background: #FAFAF8;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 8px;
    }
    .chart-container h3 {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #3A3A3A;
    }

    .table-container {
      background: #FFFFFF;
      border: 1px solid #F0F0F0;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .trend-box {
      background: #FAFAF8;
      border-radius: 12px;
      padding: 18px 20px;
      margin-bottom: 8px;
    }
    .trend-box p {
      font-size: 13px;
      color: #3A3A3A;
      line-height: 1.7;
    }
    .trend-box .correlation {
      display: inline-block;
      background: #F0EDE8;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      margin-top: 6px;
      margin-right: 6px;
    }

    .disclaimer {
      background: #FFF5F5;
      border-left: 3px solid #E85D5D;
      border-radius: 8px;
      padding: 16px 20px;
      margin-top: 28px;
    }
    .disclaimer h4 {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.2px;
      color: #E85D5D;
      margin-bottom: 6px;
    }
    .disclaimer p {
      font-size: 12px;
      color: #6D6D72;
      line-height: 1.7;
    }

    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #E8E8E4;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #AEAEB2;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>Tremor<span>Sense</span></h1>
      <p>Tremor Monitoring Report</p>
      <div class="badge">FOR HEALTHCARE PROVIDER</div>
    </div>
    <div class="header-right">
      Generated: ${formatDate(Date.now())}<br/>
      Period: ${dateRange}<br/>
      Total Sessions: ${sorted.length}
    </div>
  </div>

  <!-- Patient Info -->
  <div class="patient-bar">
    <div class="patient-field">
      <label>PATIENT NAME</label>
      <span>${patientName}</span>
    </div>
    <div class="patient-field">
      <label>GENDER</label>
      <span>${patientGender}</span>
    </div>
    <div class="patient-field">
      <label>DATE OF BIRTH</label>
      <span>${patientBirthday}</span>
    </div>
  </div>

  <!-- Summary Stats -->
  <div class="section-title">SUMMARY</div>
  <div class="summary-grid">
    <div class="stat-card">
      <div class="value" style="color: ${latestScore !== null ? getScoreColor(latestScore) : '#8A8A8E'}">
        ${latestScore !== null ? latestScore : '—'}
      </div>
      <div class="label">LATEST SCORE</div>
      ${latestScore !== null ? `<div class="sub" style="color: ${getScoreColor(latestScore)}">${getScoreStatus(latestScore)}</div>` : ''}
    </div>
    <div class="stat-card">
      <div class="value" style="color: ${avgScore !== null ? getScoreColor(avgScore) : '#8A8A8E'}">
        ${avgScore !== null ? avgScore : '—'}
      </div>
      <div class="label">AVERAGE SCORE</div>
    </div>
    <div class="stat-card">
      <div class="value" style="color: #3A3A3A">
        ${minScore !== null ? `${minScore}–${maxScore}` : '—'}
      </div>
      <div class="label">SCORE RANGE</div>
    </div>
    <div class="stat-card">
      <div class="value" style="color: ${trendColor}">
        ${trendLabel}
      </div>
      <div class="label">7-DAY TREND</div>
    </div>
  </div>

  <!-- Score Scale Reference -->
  <div style="display: flex; gap: 8px; margin: 16px 0 0 0;">
    <div style="flex:1; background: #2D9B8A15; border-radius: 8px; padding: 8px; text-align: center;">
      <span style="font-size: 11px; font-weight: 700; color: #2D9B8A;">0–25 OPTIMAL</span>
    </div>
    <div style="flex:1; background: #C4A46C15; border-radius: 8px; padding: 8px; text-align: center;">
      <span style="font-size: 11px; font-weight: 700; color: #C4A46C;">26–50 GOOD</span>
    </div>
    <div style="flex:1; background: #E8A44C15; border-radius: 8px; padding: 8px; text-align: center;">
      <span style="font-size: 11px; font-weight: 700; color: #E8A44C;">51–75 FAIR</span>
    </div>
    <div style="flex:1; background: #E85D5D15; border-radius: 8px; padding: 8px; text-align: center;">
      <span style="font-size: 11px; font-weight: 700; color: #E85D5D;">76–100 ATTENTION</span>
    </div>
  </div>

  <!-- Score Chart -->
  ${sorted.length > 1 ? `
  <div class="section-title">SCORE HISTORY</div>
  <div class="chart-container">
    <h3>Tremor Score Over Time (most recent ${Math.min(sorted.length, 30)} sessions)</h3>
    ${buildScoreChart(sorted)}
  </div>
  ` : ''}

  <!-- Trend Analysis -->
  ${trendAnalysis ? `
  <div class="section-title">ANALYSIS</div>
  <div class="trend-box">
    <p>${trendAnalysis.summary}</p>
    ${trendAnalysis.correlations.length > 0 ? `
      <div style="margin-top: 10px;">
        ${trendAnalysis.correlations.map(c => `
          <span class="correlation">${c.context}: ${c.description}</span>
        `).join('')}
      </div>
    ` : ''}
  </div>
  ` : ''}

  <!-- Session Table -->
  ${sorted.length > 0 ? `
  <div class="section-title">SESSION LOG</div>
  <div class="table-container">
    ${buildSessionTable(sorted)}
  </div>
  ` : ''}

  <!-- Disclaimer -->
  <div class="disclaimer">
    <h4>MEDICAL DISCLAIMER</h4>
    <p>
      This report was generated by TremorSense, a mobile application that measures hand motion using
      smartphone sensors (accelerometer and gyroscope). Tremor scores are algorithmically derived and
      are intended for observational and informational purposes only. This report does not constitute a
      medical diagnosis. Scores may be influenced by device placement, environment, and user movement.
      Clinical assessment by a qualified healthcare professional is essential for diagnosis and treatment decisions.
    </p>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>TremorSense v1.0.0 — Tremor Monitoring App</span>
    <span>Report ID: TS-${Date.now().toString(36).toUpperCase()}</span>
  </div>
</body>
</html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Tremor Report',
      UTI: 'com.adobe.pdf',
    });
  }
}
