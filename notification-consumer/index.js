exports.handler = async (event) => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    console.log('Notification received:', JSON.stringify(body, null, 2));
    console.log('Order ' + body.orderId + ' - Status: ' + body.status);
  }
  return { statusCode: 200 };
};
