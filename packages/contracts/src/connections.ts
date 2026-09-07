import { z } from "zod";

export const connectionSchema = z.object({
  address: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  connectionString: z.string().min(1),
  transport: z.literal("tcp"),
}).superRefine((connection, context) => {
  if (connection.connectionString !== `${connection.address}:${connection.port}`) {
    context.addIssue({
      code: "custom",
      path: ["connectionString"],
      message: "Connection string must be host:port",
    });
  }
});

export const connectionDetailsSchema = z.object({
  local: connectionSchema,
  tor: connectionSchema,
});

export type Connection = z.infer<typeof connectionSchema>;
export type ConnectionDetails = z.infer<typeof connectionDetailsSchema>;

function validateHost(host: string): string {
  const value = host.trim();
  if (!value || /[\s/:]/u.test(value)) {
    throw new Error("Invalid Electrum host");
  }
  return value;
}

export function createConnectionDetails(input: { localHost: string; torHost: string; port: string | number }): ConnectionDetails {
  const port = Number(input.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Invalid Electrum port");
  }

  const makeConnection = (address: string): Connection => ({
    address: validateHost(address),
    port,
    connectionString: `${validateHost(address)}:${port}`,
    transport: "tcp",
  });

  return connectionDetailsSchema.parse({
    local: makeConnection(input.localHost),
    tor: makeConnection(input.torHost),
  });
}
