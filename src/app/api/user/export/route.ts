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

  // Simple HTML viewer that pretty‑prints each JSON file
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>My Personal Data Export</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h2 { margin-top: 30px; }
    pre { background:#f4f4f4; padding:10px; overflow:auto; }
  </style>
</head>
<body>
  <h1>My Personal Data Export</h1>
  ${files
      .map(
        (f) => `<h2>${f.name}</h2><pre id="${f.name.replace('.json', '')}"></pre>`
      )
      .join('\n')}
  <script>
    const data = {
      ${files.map((f) => `${f.name.replace('.json', '')}: ${f.content}`).join(',\n      ')}
    };
    Object.entries(data).forEach(([key, value]) => {
      const el = document.getElementById(key);
      if (el) el.textContent = JSON.stringify(value, null, 2);
    });
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
