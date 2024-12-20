const { Kafka, Partitioners } = require("kafkajs");
const {
  SchemaRegistry,
  SchemaType,
} = require("@kafkajs/confluent-schema-registry");
const { faker } = require("@faker-js/faker");

// Kafka Configuration
const kafka = new Kafka({
  clientId: "mock-producer2",
  brokers: ["localhost:9092"], // Replace with your Kafka broker

});

const registry = new SchemaRegistry({
  host: "http://localhost:8081", // Replace with your Schema Registry URL
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});

const topic = "load.orders";

function generateMockData() {
  return {
    id: faker.string.uuid(), // Corrected method
    event_type: "ORDER_CREATED",
    order_created: {
      order_id: faker.string.uuid(),
      load_id: faker.helpers.arrayElement([null, faker.string.uuid()]),
      load_code: faker.helpers.arrayElement([null, faker.string.uuid()]),
      code: faker.helpers.arrayElement([null, faker.lorem.word()]),
      created_by: faker.helpers.arrayElement([null, faker.internet.username()]),
      customer_id: faker.helpers.arrayElement([null, faker.string.uuid()]),
      created_by_user_id: faker.helpers.arrayElement([
        null,
        faker.string.uuid(),
      ]),
      updated_by_user_id: faker.helpers.arrayElement([
        null,
        faker.string.uuid(),
      ]),
      created_at: faker.date.recent().getTime(),
      updated_at: faker.helpers.arrayElement([
        null,
        faker.date.recent().getTime(),
      ]),
    },
  };
}

async function produceMessage() {
  try {
    await producer.connect();
  } catch (err) {
    console.error("Producer connection error:", err);
  }

  // Get schema ID from Schema Registry
  const schema = {
    type: SchemaType.AVRO,
    schema: JSON.stringify({
      type: "record",
      name: "OrderEvent",
      namespace: "net.mastery.load",
      fields: [
        { name: "id", type: "string" },
        { name: "event_type", type: "string" },
        {
          name: "order_created",
          type: [
            "null",
            {
              type: "record",
              name: "OrderCreated",
              fields: [
                {
                  name: "order_id",
                  type: { type: "string", logicalType: "uuid" },
                },
                {
                  name: "load_id",
                  type: ["null", { type: "string", logicalType: "uuid" }],
                },
                {
                  name: "load_code",
                  type: ["null", { type: "string", logicalType: "uuid" }],
                },
                { name: "code", type: ["null", "string"] },
                { name: "created_by", type: ["null", "string"] },
                {
                  name: "customer_id",
                  type: ["null", { type: "string", logicalType: "uuid" }],
                },
                {
                  name: "created_by_user_id",
                  type: ["null", { type: "string", logicalType: "uuid" }],
                },
                {
                  name: "updated_by_user_id",
                  type: ["null", { type: "string", logicalType: "uuid" }],
                },
                {
                  name: "created_at",
                  type: [
                    "null",
                    { type: "long", logicalType: "timestamp-millis" },
                  ],
                },
                {
                  name: "updated_at",
                  type: [
                    "null",
                    { type: "long", logicalType: "timestamp-millis" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  };

  const { id: schemaId } = await registry.register(schema);

  const mockMessage = generateMockData();

  // Encode the message
  const encodedMessage = await registry.encode(schemaId, mockMessage);

  // Send the message to the Kafka topic
  await producer.send({
    topic,
    messages: [
      {
        key: "orderkey001",
        value: encodedMessage,
      },
    ],
  });

  console.log(`Message produced to topic "${topic}":`, mockMessage);

  // Disconnect the producer
  await producer.disconnect();
}

produceMessage().catch(console.error);
