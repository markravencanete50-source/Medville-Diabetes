const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const statuses = {
 'Email Delivered': 'delivered',
 'Email Bounced': 'bounced',
 'Email Rejected': 'rejected',
 'Email Delivery Delayed': 'delayed',
 'Email Complaint Received': 'complained',
};
const validId = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);

function createHandler(db) {
 return async (event) => {
  const status = statuses[event?.['detail-type']];
  const messageId = event?.detail?.mail?.messageId;
  const id = event?.detail?.mail?.tags?.lead_id?.[0];
  if (status && typeof messageId === 'string') console.info('SES company notification event', { status, messageId });
  if (!status || !validId(id) || typeof messageId !== 'string' || messageId.length > 256) return;
  const table = process.env.LEADS_TABLE;
  if (!table) throw new Error('Lead table unavailable');
  const { Item: lead } = await db.send(new GetCommand({ TableName: table, Key: { id }, ConsistentRead: true }));
  if (!lead || lead.deletedAt) return;
  if (!lead.notificationMessageId) throw new Error('SES message ID not recorded yet');
  if (lead.notificationMessageId !== messageId) return; // An older retry must not overwrite the current status.
  if (status === 'delayed' && lead.notificationStatus === 'delivered') return;
  try {
   await db.send(new UpdateCommand({
    TableName: table,
    Key: { id },
    UpdateExpression: 'SET notificationStatus=:status, notificationUpdatedAt=:at',
    ConditionExpression: 'notificationMessageId=:messageId AND attribute_not_exists(deletedAt)',
    ExpressionAttributeValues: { ':status': status, ':at': event.time || new Date().toISOString(), ':messageId': messageId },
   }));
  } catch (error) {
   if (error?.name === 'ConditionalCheckFailedException') return; // Replaced or removed while the event was processed.
   throw error;
  }
 };
}

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
exports.handler = createHandler(db);
exports.createHandler = createHandler;
