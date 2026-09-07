const metricPattern = /^electrs_index_height\{type="tip"\}\s+([0-9]+(?:\.[0-9]+)?)$/;

export interface ElectrsMetricsClient { getIndexedHeight(): Promise<number> }

export function createElectrsMetricsClient({ host, port, fetchFn = fetch, timeoutMs = 5_000 }: {
  host: string;
  port: number;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}): ElectrsMetricsClient {
  return {
    async getIndexedHeight() {
      let response: Response;
      try {
        response = await fetchFn(`http://${host}:${port}/`, { redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
      } catch {
        throw new Error("Electrs metrics request failed");
      }
      if (!response.ok) throw new Error("Electrs metrics request failed");
      const matches = (await response.text()).split(/\r?\n/).map((line) => metricPattern.exec(line)).filter((match): match is RegExpExecArray => match !== null);
      const match = matches[0];
      if (matches.length !== 1 || !match) throw new Error("Electrs metrics response was invalid");
      const height = Number(match[1]);
      if (!Number.isSafeInteger(height) || height < 0) throw new Error("Electrs metrics response was invalid");
      return height;
    },
  };
}
