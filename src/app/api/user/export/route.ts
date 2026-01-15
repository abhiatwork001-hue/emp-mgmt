import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Employee, Schedule, AbsenceRecord, Message, ActionLog, VacationRequest } from '@/lib/models';
import archiver from 'archiver';
import dbConnect from '@/lib/db';

export async function GET(request: Request) {
  // Authenticate user
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const userId = (session.user as any).id;

  await dbConnect();

  // Fetch data from DB (parallel queries)
  const [employee, schedules, absences, messages, actionLogs, vacationRequests] = await Promise.all([
    Employee.findById(userId).lean(),
    Schedule.find({ "days.shifts.employees": userId }).sort({ "dateRange.startDate": -1 }).lean(),
    AbsenceRecord.find({ employeeId: userId }).lean(), // Fix: employee -> employeeId
    Message.find({ $or: [{ from: userId }, { to: userId }] }).lean(),
    ActionLog.find({ performedBy: userId }).sort({ createdAt: -1 }).lean(),
    VacationRequest.find({ employeeId: userId }).sort({ createdAt: -1 }).lean(),
  ]);

  const documents = (employee as any)?.documents || [];

  // Prepare JSON strings
  const files: { name: string; content: string }[] = [
    { name: 'employee.json', content: JSON.stringify(employee, null, 2) },
    { name: 'schedules.json', content: JSON.stringify(schedules, null, 2) },
    { name: 'absences.json', content: JSON.stringify(absences, null, 2) },
    { name: 'vacation_requests.json', content: JSON.stringify(vacationRequests, null, 2) },
    { name: 'action_logs.json', content: JSON.stringify(actionLogs, null, 2) },
    { name: 'documents.json', content: JSON.stringify(documents, null, 2) },
    { name: 'messages.json', content: JSON.stringify(messages, null, 2) },
  ];

  // Enhanced HTML viewer with styled sections and interactivity
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Personal Data Export - ${employee?.firstName} ${employee?.lastName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    header h1 { font-size: 2.5em; margin-bottom: 10px; }
    header p { opacity: 0.9; font-size: 1.1em; }
    .content { padding: 40px; }
    .section {
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 20px;
      overflow: hidden;
      border: 1px solid #e9ecef;
    }
    .section-header {
      background: #495057;
      color: white;
      padding: 15px 20px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
    }
    .section-header:hover { background: #343a40; }
    .section-header h2 { font-size: 1.3em; margin: 0; }
    .toggle { font-size: 1.5em; transition: transform 0.3s; }
    .section-header.collapsed .toggle { transform: rotate(-90deg); }
    .section-content {
      padding: 20px;
      max-height: 600px;
      overflow-y: auto;
      transition: max-height 0.3s ease;
    }
    .section-content.hidden { display: none; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #dee2e6;
    }
    th {
      background: #e9ecef;
      font-weight: 600;
      color: #495057;
    }
    tr:hover { background: #f8f9fa; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .badge-danger { background: #f8d7da; color: #721c24; }
    .badge-info { background: #d1ecf1; color: #0c5460; }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin-top: 10px;
    }
    .info-card {
      background: white;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }
    .info-card label {
      display: block;
      font-size: 0.85em;
      color: #6c757d;
      margin-bottom: 5px;
      font-weight: 600;
    }
    .info-card value {
      display: block;
      font-size: 1.1em;
      color: #212529;
    }
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #6c757d;
    }
    .json-view {
      background: #282c34;
      color: #abb2bf;
      padding: 15px;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      line-height: 1.5;
    }
    .download-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1em;
      margin-top: 10px;
    }
    .download-btn:hover { background: #5568d3; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 Personal Data Export</h1>
      <p>${employee?.firstName} ${employee?.lastName} • Exported on ${new Date().toLocaleDateString()}</p>
    </header>
    
    <div class="content">
      <div id="sections"></div>
    </div>
  </div>

  <script>
    const data = {
      employee: ${JSON.stringify(employee)},
      schedules: ${JSON.stringify(schedules)},
      absences: ${JSON.stringify(absences)},
      vacationRequests: ${JSON.stringify(vacationRequests)},
      actionLogs: ${JSON.stringify(actionLogs)},
      documents: ${JSON.stringify(documents)},
      messages: ${JSON.stringify(messages)}
    };

    function createSection(title, content) {
      return \`
        <div class="section">
          <div class="section-header" onclick="toggleSection(this)">
            <h2>\${title}</h2>
            <span class="toggle">▼</span>
          </div>
          <div class="section-content">
            \${content}
          </div>
        </div>
      \`;
    }

    function toggleSection(header) {
      header.classList.toggle('collapsed');
      const content = header.nextElementSibling;
      content.classList.toggle('hidden');
    }

    function renderEmployee(emp) {
      if (!emp) return '<div class="empty-state">No employee data</div>';
      return \`
        <div class="info-grid">
          <div class="info-card"><label>Name</label><value>\${emp.firstName} \${emp.lastName}</value></div>
          <div class="info-card"><label>Email</label><value>\${emp.email}</value></div>
          <div class="info-card"><label>NIF</label><value>\${emp.nif || 'N/A'}</value></div>
          <div class="info-card"><label>Date of Birth</label><value>\${emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString() : 'N/A'}</value></div>
          <div class="info-card"><label>Roles</label><value>\${emp.roles?.join(', ') || 'N/A'}</value></div>
          <div class="info-card"><label>Active</label><value><span class="badge \${emp.isActive ? 'badge-success' : 'badge-danger'}">\${emp.isActive ? 'Active' : 'Inactive'}</span></value></div>
        </div>
        <button class="download-btn" onclick="downloadJSON('employee', data.employee)">Download Raw JSON</button>
      \`;
    }

    function renderSchedules(schedules) {
      if (!schedules || schedules.length === 0) return '<div class="empty-state">No schedules found</div>';
      return \`
        <table>
          <thead>
            <tr>
              <th>Week</th>
              <th>Year</th>
              <th>Date Range</th>
              <th>Status</th>
              <th>Store</th>
            </tr>
          </thead>
          <tbody>
            \${schedules.map(s => \`
              <tr>
                <td>Week \${s.weekNumber}</td>
                <td>\${s.year}</td>
                <td>\${new Date(s.dateRange.startDate).toLocaleDateString()} - \${new Date(s.dateRange.endDate).toLocaleDateString()}</td>
                <td><span class="badge badge-info">\${s.status}</span></td>
                <td>\${s.storeId?.name || 'N/A'}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
        <button class="download-btn" onclick="downloadJSON('schedules', data.schedules)">Download Raw JSON</button>
      \`;
    }

    function renderAbsences(absences) {
      if (!absences || absences.length === 0) return '<div class="empty-state">No absence records</div>';
      return \`
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Status</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            \${absences.map(a => \`
              <tr>
                <td>\${new Date(a.date).toLocaleDateString()}</td>
                <td><span class="badge badge-warning">\${a.type}</span></td>
                <td><span class="badge \${a.status === 'approved' ? 'badge-success' : 'badge-warning'}">\${a.status}</span></td>
                <td>\${a.reason || 'N/A'}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
        <button class="download-btn" onclick="downloadJSON('absences', data.absences)">Download Raw JSON</button>
      \`;
    }

    function renderVacations(vacations) {
      if (!vacations || vacations.length === 0) return '<div class="empty-state">No vacation requests</div>';
      return \`
        <table>
          <thead>
            <tr>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Days</th>
              <th>Status</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            \${vacations.map(v => \`
              <tr>
                <td>\${new Date(v.startDate).toLocaleDateString()}</td>
                <td>\${new Date(v.endDate).toLocaleDateString()}</td>
                <td>\${v.totalDays || 0}</td>
                <td><span class="badge \${v.status === 'approved' ? 'badge-success' : v.status === 'rejected' ? 'badge-danger' : 'badge-warning'}">\${v.status}</span></td>
                <td>\${v.type || 'N/A'}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
        <button class="download-btn" onclick="downloadJSON('vacation_requests', data.vacationRequests)">Download Raw JSON</button>
      \`;
    }

    function renderActionLogs(logs) {
      if (!logs || logs.length === 0) return '<div class="empty-state">No action logs</div>';
      const recent = logs.slice(0, 50);
      return \`
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            \${recent.map(log => \`
              <tr>
                <td>\${new Date(log.createdAt).toLocaleString()}</td>
                <td><span class="badge badge-info">\${log.action}</span></td>
                <td>\${log.targetModel || 'N/A'}</td>
                <td>\${log.details || 'N/A'}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
        <p style="margin-top: 10px; color: #6c757d; font-size: 0.9em;">Showing 50 most recent logs</p>
        <button class="download-btn" onclick="downloadJSON('action_logs', data.actionLogs)">Download Raw JSON</button>
      \`;
    }

    function renderMessages(messages) {
      if (!messages || messages.length === 0) return '<div class="empty-state">No messages</div>';
      return \`
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>From</th>
              <th>To</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            \${messages.map(m => \`
              <tr>
                <td>\${new Date(m.createdAt).toLocaleString()}</td>
                <td>\${m.from?.firstName || 'N/A'}</td>
                <td>\${m.to?.firstName || 'N/A'}</td>
                <td>\${m.content?.substring(0, 100) || 'N/A'}\${m.content?.length > 100 ? '...' : ''}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
        <button class="download-btn" onclick="downloadJSON('messages', data.messages)">Download Raw JSON</button>
      \`;
    }

    function downloadJSON(name, data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`\${name}.json\`;
      a.click();
      URL.revokeObjectURL(url);
    }

    // Render all sections
    const sections = document.getElementById('sections');
    sections.innerHTML = 
      createSection('👤 Personal Information', renderEmployee(data.employee)) +
      createSection('📅 Schedules (' + (data.schedules?.length || 0) + ')', renderSchedules(data.schedules)) +
      createSection('🏖️ Vacation Requests (' + (data.vacationRequests?.length || 0) + ')', renderVacations(data.vacationRequests)) +
      createSection('🤒 Absences (' + (data.absences?.length || 0) + ')', renderAbsences(data.absences)) +
      createSection('📝 Activity Logs (' + (data.actionLogs?.length || 0) + ')', renderActionLogs(data.actionLogs)) +
      createSection('💬 Messages (' + (data.messages?.length || 0) + ')', renderMessages(data.messages));
  </script>
</body>
</html>`;

  // Add HTML file to the zip
  files.push({ name: 'data.html', content: htmlContent });

  // Create a Web ReadableStream
  const stream = new ReadableStream({
    start(controller) {
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('data', (chunk) => controller.enqueue(chunk));
      archive.on('end', () => controller.close());
      archive.on('error', (err) => controller.error(err));

      // Append each file
      files.forEach((file) => {
        archive.append(file.content, { name: file.name });
      });

      // Finalize the archive
      archive.finalize();
    },
  });

  // Return response with appropriate headers
  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="my-data-export.zip"',
    },
  });
}
