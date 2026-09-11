import { Type, type FunctionDeclaration } from "@google/genai";

/**
 * Built-in function-calling tools exposed to the model.
 * Each tool has a declaration (schema) and an executor.
 */

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "calculate",
    description:
      "Evaluate a mathematical expression precisely. Supports + - * / % ^ parentheses and functions sqrt, abs, round, floor, ceil, sin, cos, tan, log, ln, pow, min, max, pi, e.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        expression: { type: Type.STRING, description: "The expression to evaluate, e.g. '(12.5 * 3) ^ 2 / sqrt(16)'" },
      },
      required: ["expression"],
    },
  },
  {
    name: "get_current_datetime",
    description: "Get the current date and time. Use it whenever the user asks what day or time it is, or for date arithmetic.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        timezone: { type: Type.STRING, description: "IANA timezone such as 'Europe/Paris' or 'UTC'. Defaults to UTC." },
      },
    },
  },
  {
    name: "get_weather",
    description: "Get the current weather and a short forecast for a city.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        city: { type: Type.STRING, description: "City name, optionally with country, e.g. 'Casablanca, Morocco'" },
      },
      required: ["city"],
    },
  },
];

// ---------- calculator (safe, no eval) ----------

type Tok = { t: "num"; v: number } | { t: "op"; v: string } | { t: "id"; v: string } | { t: "("; v: "(" } | { t: ")"; v: ")" } | { t: ","; v: "," };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.eE]/.test(src[j]!)) j++;
      out.push({ t: "num", v: Number(src.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z_0-9]/.test(src[j]!)) j++;
      out.push({ t: "id", v: src.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }
    if ("+-*/%^".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "(") out.push({ t: "(", v: "(" });
    else if (c === ")") out.push({ t: ")", v: ")" });
    else if (c === ",") out.push({ t: ",", v: "," });
    else throw new Error(`Unexpected character '${c}'`);
    i++;
  }
  return out;
}

const FUNCS: Record<string, (...a: number[]) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  log: Math.log10,
  ln: Math.log,
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

export function evaluateExpression(expr: string): number {
  const toks = tokenize(expr);
  let pos = 0;
  const peek = () => toks[pos];
  const take = () => toks[pos++];

  const parseExpr = (): number => {
    let left = parseTerm();
    while (peek()?.t === "op" && (peek()!.v === "+" || peek()!.v === "-")) {
      const op = take()!.v;
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  };
  const parseTerm = (): number => {
    let left = parsePower();
    while (peek()?.t === "op" && ["*", "/", "%"].includes(peek()!.v as string)) {
      const op = take()!.v;
      const right = parsePower();
      left = op === "*" ? left * right : op === "/" ? left / right : left % right;
    }
    return left;
  };
  const parsePower = (): number => {
    const base = parseUnary();
    if (peek()?.t === "op" && peek()!.v === "^") {
      take();
      return Math.pow(base, parsePower());
    }
    return base;
  };
  const parseUnary = (): number => {
    if (peek()?.t === "op" && peek()!.v === "-") {
      take();
      return -parseUnary();
    }
    if (peek()?.t === "op" && peek()!.v === "+") {
      take();
      return parseUnary();
    }
    return parsePrimary();
  };
  const parsePrimary = (): number => {
    const tok = take();
    if (!tok) throw new Error("Unexpected end of expression");
    if (tok.t === "num") return tok.v;
    if (tok.t === "(") {
      const v = parseExpr();
      if (take()?.t !== ")") throw new Error("Missing closing parenthesis");
      return v;
    }
    if (tok.t === "id") {
      if (peek()?.t === "(") {
        take();
        const args: number[] = [];
        if (peek()?.t !== ")") {
          args.push(parseExpr());
          while (peek()?.t === ",") {
            take();
            args.push(parseExpr());
          }
        }
        if (take()?.t !== ")") throw new Error("Missing closing parenthesis");
        const fn = FUNCS[tok.v];
        if (!fn) throw new Error(`Unknown function '${tok.v}'`);
        return fn(...args);
      }
      const c = CONSTS[tok.v];
      if (c === undefined) throw new Error(`Unknown identifier '${tok.v}'`);
      return c;
    }
    throw new Error(`Unexpected token '${tok.v}'`);
  };

  const result = parseExpr();
  if (pos < toks.length) throw new Error("Unexpected trailing input");
  if (!Number.isFinite(result)) throw new Error("Result is not a finite number");
  return result;
}

// ---------- weather (Open-Meteo, no API key) ----------

const WEATHER_CODES: Record<number, string> = {
  0: "clear sky",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "depositing rime fog",
  51: "light drizzle",
  53: "moderate drizzle",
  55: "dense drizzle",
  61: "slight rain",
  63: "moderate rain",
  65: "heavy rain",
  71: "slight snow",
  73: "moderate snow",
  75: "heavy snow",
  80: "rain showers",
  81: "moderate rain showers",
  82: "violent rain showers",
  95: "thunderstorm",
  96: "thunderstorm with hail",
  99: "thunderstorm with heavy hail",
};

async function getWeather(city: string): Promise<unknown> {
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
    { signal: AbortSignal.timeout(8000) },
  );
  const geo = (await geoRes.json()) as { results?: Array<{ name: string; country: string; latitude: number; longitude: number; timezone: string }> };
  const place = geo.results?.[0];
  if (!place) return { error: `Could not find a city named '${city}'` };

  const wRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=3&timezone=auto`,
    { signal: AbortSignal.timeout(8000) },
  );
  const w = (await wRes.json()) as {
    current: { temperature_2m: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number };
    daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; weather_code: number[] };
  };
  return {
    location: `${place.name}, ${place.country}`,
    timezone: place.timezone,
    current: {
      temperatureC: w.current.temperature_2m,
      humidityPercent: w.current.relative_humidity_2m,
      windKmh: w.current.wind_speed_10m,
      condition: WEATHER_CODES[w.current.weather_code] ?? "unknown",
    },
    forecast: w.daily.time.map((day, i) => ({
      day,
      minC: w.daily.temperature_2m_min[i],
      maxC: w.daily.temperature_2m_max[i],
      condition: WEATHER_CODES[w.daily.weather_code[i] ?? -1] ?? "unknown",
    })),
  };
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "calculate": {
      const expression = String(args.expression ?? "");
      try {
        return { expression, result: evaluateExpression(expression) };
      } catch (err) {
        return { expression, error: err instanceof Error ? err.message : "Invalid expression" };
      }
    }
    case "get_current_datetime": {
      const timeZone = typeof args.timezone === "string" && args.timezone ? args.timezone : "UTC";
      try {
        const now = new Date();
        return {
          iso: now.toISOString(),
          timezone: timeZone,
          local: new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "long", timeZone }).format(now),
        };
      } catch {
        return { error: `Unknown timezone '${timeZone}'` };
      }
    }
    case "get_weather":
      try {
        return await getWeather(String(args.city ?? ""));
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Weather lookup failed" };
      }
    default:
      return { error: `Unknown tool '${name}'` };
  }
}
