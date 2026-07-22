const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: 'ap-south-1' });
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'demo-notif-36508@yopmail.com';

exports.handler = async (event) => {
  console.log('Lambda2 triggered. Records:', event.Records.length);

  for (const record of event.Records) {
    let body;
    try {
      body = JSON.parse(record.body);
    } catch {
      console.error('Invalid JSON:', record.body);
      continue;
    }

    // SNS wraps message in Message field
    let snsMessage;
    try {
      snsMessage = body.Message ? JSON.parse(body.Message) : body;
    } catch {
      snsMessage = body;
    }

    const { eventId, eventType, source, payload, processedAt } = snsMessage;

    const toEmail = payload?.email || payload?.userEmail || FROM_EMAIL;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Event Notification</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Event ID</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${eventId}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Event Type</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${eventType}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Source</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${source}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Processed At</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${processedAt}</td></tr>
        </table>
        <h3 style="color: #374151; margin-top: 16px;">Payload</h3>
        <pre style="background: #f3f4f6; padding: 12px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(payload, null, 2)}</pre>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">This is an automated notification from the Event-Driven Workflow system.</p>
      </div>
    `;

    const textBody = `
Event Notification
------------------
Event ID:    ${eventId}
Event Type:  ${eventType}
Source:      ${source}
Processed:   ${processedAt}

Payload:
${JSON.stringify(payload, null, 2)}
    `.trim();

    try {
      const result = await ses.send(new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: { ToAddresses: [toEmail] },
        Message: {
          Subject: { Data: `[Event Workflow] ${eventType} notification`, Charset: 'UTF-8' },
          Body: {
            Text: { Data: textBody, Charset: 'UTF-8' },
            Html: { Data: htmlBody, Charset: 'UTF-8' },
          },
        },
      }));
      console.log('Email sent. MessageId:', result.MessageId, 'To:', toEmail);
    } catch (err) {
      console.error('SES error for event', eventId, ':', err.message);
      // Don't rethrow — allow other records to process; SQS will retry failed messages
    }
  }

  return { statusCode: 200 };
};
