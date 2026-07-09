const { SFNClient, GetExecutionHistoryCommand, DescribeExecutionCommand } = require('@aws-sdk/client-sfn');

const sfn = new SFNClient({ region: process.env.AWS_REGION || 'ap-south-1' });

exports.handler = async (event) => {
  const arn = event.queryStringParameters?.arn || event.pathParameters?.arn;
  if (!arn) return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'arn required' }) };

  const [desc, hist] = await Promise.all([
    sfn.send(new DescribeExecutionCommand({ executionArn: arn })),
    sfn.send(new GetExecutionHistoryCommand({ executionArn: arn, maxResults: 50, reverseOrder: false })),
  ]);

  const input = JSON.parse(desc.input || '{}');
  const steps = (hist.events || []).map(e => ({
    id: e.id,
    type: e.type,
    timestamp: e.timestamp,
    details: e.stateEnteredEventDetails || e.stateExitedEventDetails || e.taskSucceededEventDetails || e.taskFailedEventDetails || {},
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      executionArn: arn,
      status: desc.status,
      startDate: desc.startDate,
      stopDate: desc.stopDate,
      input,
      output: desc.output ? JSON.parse(desc.output) : null,
      steps,
    }),
  };
};
