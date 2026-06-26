const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");

const client = new SQSClient({ region: "ap-south-1" });
const QUEUE_URL = "https://sqs.ap-south-1.amazonaws.com/527055790362/order-processing-queue-production";

async function processOrder(message) {
  const body = JSON.parse(message.Body);
  console.log("Processing order:", JSON.stringify(body));
}

async function poll() {
  console.log("Order consumer started, polling...");
  while (true) {
    try {
      const response = await client.send(new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
      }));

      if (response.Messages && response.Messages.length > 0) {
        for (const msg of response.Messages) {
          await processOrder(msg);
          await client.send(new DeleteMessageCommand({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: msg.ReceiptHandle,
          }));
        }
      }
    } catch (err) {
      console.error("Poll error:", err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

poll();
