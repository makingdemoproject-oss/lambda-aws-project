const { SFNClient, ListExecutionsCommand, DescribeExecutionCommand } = require('@aws-sdk/client-sfn');

const sfn = new SFNClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN;

exports.handler = async () => {
  const allStatuses = ['RUNNING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT', 'ABORTED'];
  const allExecs = [];

  for (const status of allStatuses) {
    try {
      const res = await sfn.send(new ListExecutionsCommand({
        stateMachineArn: STATE_MACHINE_ARN,
        statusFilter: status,
        maxResults: 10,
      }));
      allExecs.push(...(res.executions || []));
    } catch { /* ignore */ }
  }

  allExecs.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  const recent = allExecs.slice(0, 20);

  const detailed = await Promise.all(recent.map(async (exec) => {
    try {
      const d = await sfn.send(new DescribeExecutionCommand({ executionArn: exec.executionArn }));
      const input = JSON.parse(d.input || '{}');
      return {
        executionArn: exec.executionArn,
        name: exec.name,
        status: exec.status,
        startDate: exec.startDate,
        stopDate: exec.stopDate,
        target: input.target || 'ALL',
        product: input.product,
        amount: input.amount,
        orderId: input.orderId,
      };
    } catch { return exec; }
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ executions: detailed }),
  };
};
